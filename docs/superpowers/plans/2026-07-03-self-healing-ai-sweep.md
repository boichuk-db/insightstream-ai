# Self-healing AI sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A periodic cron that re-enqueues feedback whose AI analysis never landed (`sentimentScore IS NULL`), recovering every loss mode (crash, instance loss, exhausted retries) with one idempotent sweep.

**Architecture:** New `AiSweepService` in the `ai` module runs `@Cron` every 5 min. It selects `NULL`-sentiment feedback created in the (15 min, 24 h) window via a single TypeORM `find`, reconstructs the `AnalysisJobData` (resolving `aiLevel` from the owner's plan, cached per run), and re-enqueues through the existing `AiQueueService`. Rows older than 24 h are logged as abandoned, not retried. No jobId dedup — the 15-min age threshold guarantees no live job exists.

**Tech Stack:** NestJS 11, `@nestjs/schedule` (`@Cron`), TypeORM, BullMQ, Jest.

**Design doc:** `docs/superpowers/specs/2026-07-03-self-healing-ai-sweep-design.md`

---

## File Structure

- **Create** `apps/api/src/modules/ai/ai-sweep.service.ts` — the sweep service (cron + query + re-enqueue).
- **Create** `apps/api/src/modules/ai/ai-sweep.service.spec.ts` — unit tests.
- **Modify** `apps/api/src/modules/ai/ai.module.ts` — import `PlansModule`, register `AiSweepService`.
- **Modify** `docs/architecture/PLAN.md` — mark 🔥 #4 done, add changelog entry, bump date.

Facts locked from codebase inspection:
- `AnalysisJobData` = `{ feedbackId, content, projectId, ownerId, aiLevel: 'basic' | 'full' }` (`ai-queue.service.ts`).
- `AiQueueService.addAnalysisJob(data, priority = 10)` exists and is exported.
- `PlanLimitsService.getUserPlan(userId): Promise<PlanType>` and `getLimits(plan).aiAnalysis: 'none' | 'basic' | 'full'` exist; `PlansModule` exports `PlanLimitsService`.
- `Feedback` entity: `sentimentScore` (nullable), `createdAt`, `projectId`, and `project` relation whose `project.userId` is the owner.
- `ScheduleModule.forRoot()` is already registered app-wide in `app.module.ts` — no scheduler bootstrapping needed.

---

## Task 1: `AiSweepService` (cron + sweep logic)

**Files:**
- Create: `apps/api/src/modules/ai/ai-sweep.service.ts`
- Test: `apps/api/src/modules/ai/ai-sweep.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/ai/ai-sweep.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Feedback, PlanType } from '@insightstream/database';
import { AiSweepService } from './ai-sweep.service';
import { AiQueueService } from './ai-queue.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

describe('AiSweepService', () => {
  let service: AiSweepService;
  let feedbackRepo: { find: jest.Mock; count: jest.Mock };
  let aiQueue: { addAnalysisJob: jest.Mock };
  let planLimits: { getUserPlan: jest.Mock; getLimits: jest.Mock };

  const makeFeedback = (over: Partial<Feedback> = {}): Feedback =>
    ({
      id: 'fb-1',
      content: 'hello',
      projectId: 'proj-1',
      sentimentScore: null,
      project: { userId: 'owner-1' },
      ...over,
    }) as unknown as Feedback;

  beforeEach(async () => {
    feedbackRepo = { find: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) };
    aiQueue = { addAnalysisJob: jest.fn().mockResolvedValue(undefined) };
    planLimits = {
      getUserPlan: jest.fn().mockResolvedValue(PlanType.FREE),
      getLimits: jest.fn().mockReturnValue({ aiAnalysis: 'basic' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSweepService,
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: AiQueueService, useValue: aiQueue },
        { provide: PlanLimitsService, useValue: planLimits },
      ],
    }).compile();

    service = module.get(AiSweepService);
  });

  it('re-enqueues a NULL-sentiment feedback with reconstructed job data', async () => {
    feedbackRepo.find.mockResolvedValue([makeFeedback()]);

    await service.sweep();

    expect(aiQueue.addAnalysisJob).toHaveBeenCalledWith(
      {
        feedbackId: 'fb-1',
        content: 'hello',
        projectId: 'proj-1',
        ownerId: 'owner-1',
        aiLevel: 'basic',
      },
      10,
    );
  });

  it('queries only feedback within the (15m, 24h) window, oldest first, capped at 100', async () => {
    await service.sweep();

    expect(feedbackRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['project'],
        order: { createdAt: 'ASC' },
        take: 100,
      }),
    );
  });

  it('warns about feedback abandoned beyond the 24h window and does not enqueue it', async () => {
    feedbackRepo.count.mockResolvedValue(3);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await service.sweep();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('3'));
    expect(aiQueue.addAnalysisJob).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("skips feedback whose owner plan has aiAnalysis 'none'", async () => {
    feedbackRepo.find.mockResolvedValue([makeFeedback()]);
    planLimits.getLimits.mockReturnValue({ aiAnalysis: 'none' });

    await service.sweep();

    expect(aiQueue.addAnalysisJob).not.toHaveBeenCalled();
  });

  it('looks up the owner plan once for multiple feedback of the same owner', async () => {
    feedbackRepo.find.mockResolvedValue([
      makeFeedback({ id: 'fb-1' } as Partial<Feedback>),
      makeFeedback({ id: 'fb-2' } as Partial<Feedback>),
    ]);

    await service.sweep();

    expect(planLimits.getUserPlan).toHaveBeenCalledTimes(1);
    expect(aiQueue.addAnalysisJob).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- ai-sweep.service`
Expected: FAIL — `Cannot find module './ai-sweep.service'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/src/modules/ai/ai-sweep.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, LessThanOrEqual } from 'typeorm';
import { Feedback, PlanType } from '@insightstream/database';
import { AiQueueService } from './ai-queue.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 100;

@Injectable()
export class AiSweepService {
  private readonly logger = new Logger(AiSweepService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly aiQueueService: AiQueueService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  /** Every 5 minutes: re-enqueue feedback whose AI analysis never landed. */
  @Cron('*/5 * * * *', { name: 'ai-sweep' })
  async sweep(): Promise<void> {
    const now = Date.now();
    const staleBefore = new Date(now - FIFTEEN_MIN_MS);
    const windowStart = new Date(now - TWENTY_FOUR_H_MS);

    try {
      const abandoned = await this.feedbackRepository.count({
        where: {
          sentimentScore: IsNull(),
          createdAt: LessThanOrEqual(windowStart),
        },
      });
      if (abandoned > 0) {
        this.logger.warn(
          `${abandoned} feedback abandoned (never analyzed, older than 24h)`,
        );
      }

      const candidates = await this.feedbackRepository.find({
        where: {
          sentimentScore: IsNull(),
          createdAt: Between(windowStart, staleBefore),
        },
        relations: ['project'],
        order: { createdAt: 'ASC' },
        take: BATCH_LIMIT,
      });

      const planCache = new Map<string, PlanType>();
      let requeued = 0;

      for (const fb of candidates) {
        try {
          const ownerId = fb.project?.userId;
          if (!ownerId) continue;

          if (!planCache.has(ownerId)) {
            planCache.set(
              ownerId,
              await this.planLimitsService.getUserPlan(ownerId),
            );
          }
          const aiLevel = this.planLimitsService.getLimits(
            planCache.get(ownerId)!,
          ).aiAnalysis;
          if (aiLevel === 'none') continue;

          await this.aiQueueService.addAnalysisJob(
            {
              feedbackId: fb.id,
              content: fb.content,
              projectId: fb.projectId,
              ownerId,
              aiLevel: aiLevel === 'full' ? 'full' : 'basic',
            },
            10,
          );
          requeued++;
        } catch (err) {
          this.logger.error(
            `Sweep failed to re-enqueue feedback ${fb.id}`,
            err as Error,
          );
        }
      }

      if (requeued > 0) {
        this.logger.log(
          `Self-healing sweep re-enqueued ${requeued} feedback for AI analysis`,
        );
      }
    } catch (err) {
      this.logger.error('AI sweep run failed', err as Error);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- ai-sweep.service`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/ai/ai-sweep.service.ts apps/api/src/modules/ai/ai-sweep.service.spec.ts
git commit -m "feat(ai): self-healing sweep service re-enqueues stuck feedback"
```

---

## Task 2: Wire `AiSweepService` into `AiModule`

**Files:**
- Modify: `apps/api/src/modules/ai/ai.module.ts`

- [ ] **Step 1: Register the service and its dependency**

Replace the contents of `apps/api/src/modules/ai/ai.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Feedback } from '@insightstream/database';
import { AiService } from './ai.service';
import { AiProcessor } from './ai.processor';
import { AiSweepService } from './ai-sweep.service';
import { AiQueueService, AI_ANALYSIS_QUEUE } from './ai-queue.service';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Feedback]),
    BullModule.registerQueue({ name: AI_ANALYSIS_QUEUE }),
    PlansModule,
  ],
  providers: [AiService, AiProcessor, AiSweepService, AiQueueService],
  exports: [AiService, AiQueueService],
})
export class AiModule {}
```

- [ ] **Step 2: Verify the app boots and DI resolves**

Run: `pnpm --filter api build`
Expected: build succeeds — confirms `PlansModule` import causes no circular-dependency error and `AiSweepService` dependencies resolve at compile time.

- [ ] **Step 3: Boot the API to confirm the scheduler registers the cron**

Run (requires local Postgres + Redis — `docker compose up -d` first):
`pnpm --filter api start` and watch startup logs.
Expected: process starts with no Nest DI error and no scheduler error; the `ai-sweep` job registers. Stop with Ctrl-C after a clean boot line appears.

If Postgres/Redis are unavailable, state that explicitly and rely on the `build` step + unit tests as the DI/logic evidence.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/ai/ai.module.ts
git commit -m "feat(ai): register self-healing sweep in AiModule"
```

---

## Task 3: Verification + roadmap update

**Files:**
- Modify: `docs/architecture/PLAN.md`

- [ ] **Step 1: Full verification gate**

Run: `pnpm typecheck && pnpm lint && pnpm --filter api test`
Expected: all pass. Paste the actual tail of the output — no "done" without it (project Verification Mandate).

- [ ] **Step 2: Mark 🔥 #4 done in `PLAN.md`**

In `docs/architecture/PLAN.md`:
- Change the `### 4. Self-healing AI sweep` heading to `### 4. ~~Self-healing AI sweep~~ — ✔ Done (2026-07-03)` and append a one-line result: cron `AiSweepService` every 5 min re-enqueues `NULL`-sentiment feedback in the (15 min, 24 h) window; older rows logged as abandoned; no dedup (age threshold guarantees no live job).
- Add the same as a ✔ Completed bullet.
- Add a Changelog entry dated 2026-07-03 describing the sweep.
- Bump the `> Last updated:` date to 2026-07-03 (already current — confirm).

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/PLAN.md
git commit -m "docs: mark PLAN #4 (self-healing AI sweep) done"
```

---

## Notes for the implementer

- **Do not** add jobId dedup — the design deliberately relies on the 15-min age threshold, not BullMQ dedup (which would block the 24h re-enqueue for failed jobs).
- **Do not** extract the shared "compute aiLevel + enqueue" helper here — the 3-way duplication (`create`, `reanalyze`, sweep) is flagged as a separate follow-up in the spec.
- **Worker split (PLAN #5) dependency:** when the queue consumer moves to a `WORKER_MODE` container, ensure the `ai-sweep` cron does **not** boot there. Out of scope for this plan; recorded so #5's design accounts for it.
