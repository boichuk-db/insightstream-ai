# BullMQ + Redis Async AI Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synchronous/fire-and-forget Gemini calls with a reliable BullMQ queue backed by Redis, with 3-attempt exponential retry.

**Architecture:** `FeedbackService` enqueues jobs via `AiQueueService` (facade). `AiProcessor` (BullMQ WorkerHost) picks jobs from Redis, calls Gemini, updates DB, and emits Socket.io event. Both `create` and `reanalyze` flows go through the queue — `reanalyze` at higher priority (1) than `create` (10).

**Tech Stack:** `@nestjs/bullmq`, `bullmq`, Redis 7 (Docker local / Railway prod)

---

## File Map

| Action | File |
|---|---|
| Modify | `apps/api/src/app.module.ts` |
| Modify | `apps/api/src/modules/ai/ai.module.ts` |
| Create | `apps/api/src/modules/ai/ai-queue.service.ts` |
| Create | `apps/api/src/modules/ai/ai.processor.ts` |
| Create | `apps/api/src/modules/ai/ai.processor.spec.ts` |
| Modify | `apps/api/src/modules/feedback/feedback.service.ts` |
| Modify | `apps/api/src/modules/feedback/feedback.service.spec.ts` |

> **Note:** `EventsModule` is `@Global()` — `EventsGateway` is injectable everywhere without explicit import.
> **Note:** `DigestModule` uses `AiService` directly for digest generation — it stays exported from `AiModule`.

---

### Task 1: Install dependencies

**Files:**
- Modify: `apps/api/package.json` (via pnpm)

- [ ] **Step 1: Install packages**

```bash
cd apps/api && pnpm add @nestjs/bullmq bullmq
```

Expected: packages added, `package.json` updated.

- [ ] **Step 2: Verify install**

```bash
cd apps/api && node -e "require('@nestjs/bullmq'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add @nestjs/bullmq and bullmq dependencies"
```

---

### Task 2: Register BullMQ globally in AppModule

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add BullModule.forRoot to app.module.ts**

Add import at top:
```typescript
import { BullModule } from '@nestjs/bullmq';
```

Add to the `imports` array after `ScheduleModule.forRoot()`:
```typescript
BullModule.forRoot({
  connection: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
}),
```

- [ ] **Step 2: Start Redis locally and verify API boots**

```bash
docker compose up -d redis
cd apps/api && pnpm start:dev
```

Expected: API starts without errors, no Redis connection errors in logs.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): register BullMQ with Redis connection in AppModule"
```

---

### Task 3: Create AiQueueService

**Files:**
- Create: `apps/api/src/modules/ai/ai-queue.service.ts`

- [ ] **Step 1: Create the file**

```typescript
// apps/api/src/modules/ai/ai-queue.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const AI_ANALYSIS_QUEUE = 'ai-analysis';

export interface AnalysisJobData {
  feedbackId: string;
  content: string;
  projectId: string;
  ownerId: string;
  aiLevel: 'basic' | 'full';
}

@Injectable()
export class AiQueueService {
  constructor(
    @InjectQueue(AI_ANALYSIS_QUEUE) private readonly queue: Queue,
  ) {}

  async addAnalysisJob(
    data: AnalysisJobData,
    priority: number = 10,
  ): Promise<void> {
    await this.queue.add('analyze-feedback', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
      priority,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/ai/ai-queue.service.ts
git commit -m "feat(api): add AiQueueService facade for BullMQ job enqueuing"
```

---

### Task 4: Create AiProcessor

**Files:**
- Create: `apps/api/src/modules/ai/ai.processor.ts`
- Create: `apps/api/src/modules/ai/ai.processor.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/ai/ai.processor.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AiProcessor } from './ai.processor';
import { AiService } from './ai.service';
import { EventsGateway } from '../events/events.gateway';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Feedback } from '@insightstream/database';
import { Job } from 'bullmq';
import { AnalysisJobData } from './ai-queue.service';

describe('AiProcessor', () => {
  let processor: AiProcessor;
  let aiService: { analyzeFeedback: jest.Mock };
  let feedbackRepo: { update: jest.Mock };
  let eventsGateway: { emitFeedbackUpdated: jest.Mock };

  beforeEach(async () => {
    aiService = { analyzeFeedback: jest.fn() };
    feedbackRepo = { update: jest.fn().mockResolvedValue({}) };
    eventsGateway = { emitFeedbackUpdated: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProcessor,
        { provide: AiService, useValue: aiService },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    processor = module.get<AiProcessor>(AiProcessor);
  });

  const makeJob = (data: AnalysisJobData) =>
    ({ data, attemptsMade: 0 } as Job<AnalysisJobData>);

  it('updates feedback with full AI analysis and emits event', async () => {
    aiService.analyzeFeedback.mockResolvedValue({
      sentimentScore: 0.9,
      category: 'Feature',
      aiSummary: 'User wants dark mode',
      tags: ['design'],
    });

    await processor.process(
      makeJob({
        feedbackId: 'fb-1',
        content: 'Please add dark mode',
        projectId: 'proj-1',
        ownerId: 'user-1',
        aiLevel: 'full',
      }),
    );

    expect(aiService.analyzeFeedback).toHaveBeenCalledWith('Please add dark mode');
    expect(feedbackRepo.update).toHaveBeenCalledWith('fb-1', {
      sentimentScore: 0.9,
      category: 'Feature',
      aiSummary: 'User wants dark mode',
      tags: ['design'],
    });
    expect(eventsGateway.emitFeedbackUpdated).toHaveBeenCalledWith('user-1');
  });

  it('omits aiSummary and tags when aiLevel is basic', async () => {
    aiService.analyzeFeedback.mockResolvedValue({
      sentimentScore: 0.5,
      category: 'Bug',
      aiSummary: 'Something broke',
      tags: ['crash'],
    });

    await processor.process(
      makeJob({
        feedbackId: 'fb-2',
        content: 'App crashes',
        projectId: 'proj-1',
        ownerId: 'user-1',
        aiLevel: 'basic',
      }),
    );

    expect(feedbackRepo.update).toHaveBeenCalledWith('fb-2', {
      sentimentScore: 0.5,
      category: 'Bug',
      aiSummary: undefined,
      tags: undefined,
    });
  });

  it('throws when Gemini returns null so BullMQ triggers retry', async () => {
    aiService.analyzeFeedback.mockResolvedValue(null);

    await expect(
      processor.process(
        makeJob({
          feedbackId: 'fb-3',
          content: 'test',
          projectId: 'proj-1',
          ownerId: 'user-1',
          aiLevel: 'basic',
        }),
      ),
    ).rejects.toThrow('Gemini returned null for feedback fb-3');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd apps/api && pnpm test --testPathPattern="ai.processor.spec"
```

Expected: FAIL — `Cannot find module './ai.processor'`

- [ ] **Step 3: Create ai.processor.ts**

```typescript
// apps/api/src/modules/ai/ai.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Feedback } from '@insightstream/database';
import { AiService } from './ai.service';
import { EventsGateway } from '../events/events.gateway';
import { AI_ANALYSIS_QUEUE, AnalysisJobData } from './ai-queue.service';

@Processor(AI_ANALYSIS_QUEUE, { concurrency: 3 })
@Injectable()
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    const { feedbackId, content, ownerId, aiLevel } = job.data;

    this.logger.log(
      `Processing AI analysis for feedback ${feedbackId} (attempt ${job.attemptsMade + 1})`,
    );

    const analysis = await this.aiService.analyzeFeedback(content);
    if (!analysis) {
      throw new Error(`Gemini returned null for feedback ${feedbackId}`);
    }

    await this.feedbackRepository.update(feedbackId, {
      sentimentScore: analysis.sentimentScore,
      category: analysis.category,
      aiSummary: aiLevel === 'full' ? analysis.aiSummary : undefined,
      tags: aiLevel === 'full' ? analysis.tags : undefined,
    });

    this.eventsGateway.emitFeedbackUpdated(ownerId);
    this.logger.log(`AI analysis completed for feedback ${feedbackId}`);
  }
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd apps/api && pnpm test --testPathPattern="ai.processor.spec"
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/ai/ai.processor.ts apps/api/src/modules/ai/ai.processor.spec.ts
git commit -m "feat(api): add AiProcessor BullMQ worker with retry and concurrency"
```

---

### Task 5: Update AiModule

**Files:**
- Modify: `apps/api/src/modules/ai/ai.module.ts`

- [ ] **Step 1: Replace ai.module.ts**

```typescript
// apps/api/src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Feedback } from '@insightstream/database';
import { AiService } from './ai.service';
import { AiProcessor } from './ai.processor';
import { AiQueueService, AI_ANALYSIS_QUEUE } from './ai-queue.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Feedback]),
    BullModule.registerQueue({ name: AI_ANALYSIS_QUEUE }),
  ],
  providers: [AiService, AiProcessor, AiQueueService],
  exports: [AiService, AiQueueService],
})
export class AiModule {}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/api && pnpm build
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/ai/ai.module.ts
git commit -m "feat(api): register BullMQ queue and AiProcessor in AiModule"
```

---

### Task 6: Update FeedbackService

**Files:**
- Modify: `apps/api/src/modules/feedback/feedback.service.ts`

- [ ] **Step 1: Replace AiService import and injection**

Replace:
```typescript
import { AiService } from '../ai/ai.service';
```
with:
```typescript
import { AiQueueService } from '../ai/ai-queue.service';
```

In the constructor, replace:
```typescript
private aiService: AiService,
```
with:
```typescript
private aiQueueService: AiQueueService,
```

- [ ] **Step 2: Replace the fire-and-forget block in create()**

Replace the entire `if (aiLevel !== 'none') { ... }` block (lines 76–103) with:

```typescript
    if (aiLevel !== 'none') {
      await this.aiQueueService.addAnalysisJob(
        {
          feedbackId: savedFeedback.id,
          content,
          projectId,
          ownerId: ownerId ?? '',
          aiLevel: aiLevel === 'full' ? 'full' : 'basic',
        },
        10,
      );
    }
```

- [ ] **Step 3: Replace synchronous reanalyze() body**

In `reanalyze()`, replace everything from `if (aiLevel === 'none')` to the final `return { success: false };` with:

```typescript
    if (aiLevel === 'none')
      return { success: false, message: 'AI Analysis disabled for your plan' };

    const ownerId = feedback.project?.userId ?? userId;

    await this.aiQueueService.addAnalysisJob(
      {
        feedbackId: feedback.id,
        content: feedback.content,
        projectId: feedback.projectId,
        ownerId,
        aiLevel: aiLevel === 'full' ? 'full' : 'basic',
      },
      1,
    );

    return { success: true, queued: true };
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/feedback/feedback.service.ts
git commit -m "feat(api): enqueue AI analysis via BullMQ in FeedbackService"
```

---

### Task 7: Update FeedbackService tests

**Files:**
- Modify: `apps/api/src/modules/feedback/feedback.service.spec.ts`

- [ ] **Step 1: Replace AiService mock with AiQueueService**

Replace import:
```typescript
import { AiService } from '../ai/ai.service';
```
with:
```typescript
import { AiQueueService } from '../ai/ai-queue.service';
```

Replace `mockAiService` object:
```typescript
const mockAiQueueService = {
  addAnalysisJob: jest.fn().mockResolvedValue(undefined),
};
```

In `Test.createTestingModule` providers, replace:
```typescript
{
  provide: AiService,
  useValue: mockAiService,
},
```
with:
```typescript
{
  provide: AiQueueService,
  useValue: mockAiQueueService,
},
```

Remove the line:
```typescript
aiService = module.get(AiService);
```

- [ ] **Step 2: Update the create test**

Replace:
```typescript
it('should create feedback and call AI analysis', async () => {
  const content = 'Love the new dark mode!';
  const projectId = 'proj-abc';

  const result = await service.create(projectId, content);

  expect(aiService.analyzeFeedback).toHaveBeenCalledWith(content);
  expect(repo.create).toHaveBeenCalled();
  expect(repo.save).toHaveBeenCalled();
  expect(result.projectId).toBe(projectId);
});
```
with:
```typescript
it('should create feedback and enqueue AI analysis job', async () => {
  const content = 'Love the new dark mode!';
  const projectId = 'proj-abc';

  const result = await service.create(projectId, content);

  expect(mockAiQueueService.addAnalysisJob).toHaveBeenCalledWith(
    expect.objectContaining({ content, projectId, aiLevel: 'full' }),
    10,
  );
  expect(repo.create).toHaveBeenCalled();
  expect(repo.save).toHaveBeenCalled();
  expect(result.projectId).toBe(projectId);
});
```

- [ ] **Step 3: Run all tests**

```bash
cd apps/api && pnpm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/feedback/feedback.service.spec.ts
git commit -m "test(api): update FeedbackService tests to mock AiQueueService"
```

---

### Task 8: Add REDIS_URL env var and verify end-to-end

- [ ] **Step 1: Add REDIS_URL to env files**

In `apps/api/.env` (not committed):
```
REDIS_URL=redis://localhost:6379
```

If there's a `.env.example` tracked by git, add:
```
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 2: Full local run**

```bash
docker compose up -d
pnpm dev
```

Send a test feedback:
```bash
curl -X POST http://localhost:3001/feedback/public \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<your-project-id>","content":"Test BullMQ queue"}'
```

Expected: 201 instantly, AI fields (`sentimentScore`, `category`) populated in DB within a few seconds.

- [ ] **Step 3: Run final checks**

```bash
cd apps/api && pnpm test
pnpm typecheck
pnpm build
```

Expected: all green

- [ ] **Step 4: Add Railway Redis service**

In Railway dashboard: add Redis plugin to the project → copy `REDIS_URL` → add as env var to the API service → redeploy.

- [ ] **Step 5: Commit env example if changed**

```bash
git add .env.example
git commit -m "chore: add REDIS_URL to env example"
```
