# Architecture Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope `GET /feedback` to a single project (with a supporting index and a safety cap), and make Socket.io horizontally-scalable via a Redis adapter — per `docs/superpowers/specs/2026-06-30-architecture-hardening-design.md`.

**Architecture:** Backend: `FeedbackService.findAllByUser` (all-projects, unbounded) is replaced by `findByProject` (single project, `LIMIT 500`, backed by a new composite index). `GET /feedback` becomes `GET /feedback?projectId=X`. Frontend: `feedbacksQuery` becomes a parameterized query keyed by `projectId`; both consumers (`dashboard/page.tsx` and `dashboard/archive/page.tsx`) drop their client-side `projectId` filter since the server now does it. Separately, `RedisIoAdapter` is wired into Nest's WebSocket layer so `EventsGateway.emitFeedbackUpdated` reaches clients regardless of which API instance they're connected to.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL, Socket.io 4.8 + `@socket.io/redis-adapter` + `ioredis`, Next.js 16 / TanStack Query 5.

**Note on scope vs. spec:** while mapping files for this plan, found a second consumer of `feedbacksQuery` not listed in the spec — `apps/web/src/app/dashboard/archive/page.tsx` does the exact same all-projects-fetch + client-side-filter pattern as the dashboard. It's covered here (Task 6) as a direct extension of the approved design — same query, same fix — not a scope change.

---

## File Structure

| File | Change |
|---|---|
| `packages/database/src/entities/feedback.entity.ts` | Add composite `@Index(['projectId', 'createdAt'])` |
| `apps/api/src/migrations/1774835000000-AddFeedbackProjectCreatedAtIndex.ts` | New migration creating the index |
| `apps/api/src/modules/feedback/feedback.service.ts` | Replace `findAllByUser` with `findByProject(projectId, userId)` |
| `apps/api/src/modules/feedback/feedback.service.spec.ts` | Tests for `findByProject` |
| `apps/api/src/modules/feedback/feedback.controller.ts` | `GET /feedback` requires `?projectId=` |
| `apps/web/src/lib/queries.ts` | `feedbacksQuery` becomes `feedbacksQuery(projectId)` |
| `apps/web/src/app/dashboard/page.tsx` | Use scoped query, drop client-side projectId filter |
| `apps/web/src/app/dashboard/archive/page.tsx` | Same as above |
| `apps/api/src/adapters/redis-io.adapter.ts` | New: `RedisIoAdapter` (Socket.io + Redis pub/sub) |
| `apps/api/src/main.ts` | Wire `RedisIoAdapter`, fail-fast on bootstrap error |
| `apps/api/package.json` | Add `@socket.io/redis-adapter`, `ioredis` |

---

## Task 1: Composite Index on `feedbacks`

**Files:**
- Modify: `packages/database/src/entities/feedback.entity.ts`
- Create: `apps/api/src/migrations/1774835000000-AddFeedbackProjectCreatedAtIndex.ts`

- [ ] **Step 1: Add the composite index to the entity**

In `packages/database/src/entities/feedback.entity.ts`, add `Index` to the import and a class-level `@Index` decorator:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import type { Project } from "./project.entity";

@Index(["projectId", "createdAt"])
@Entity("feedbacks")
export class Feedback {
```

(Rest of the class is unchanged.)

- [ ] **Step 2: Write the migration**

Create `apps/api/src/migrations/1774835000000-AddFeedbackProjectCreatedAtIndex.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedbackProjectCreatedAtIndex1774835000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feedbacks_projectId_createdAt"
        ON "feedbacks" ("projectId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_feedbacks_projectId_createdAt"
    `);
  }
}
```

- [ ] **Step 3: Run the migration against local Postgres and verify**

Run:
```bash
docker compose up -d
pnpm --filter api migration:run
```
Expected: output includes `AddFeedbackProjectCreatedAtIndex1774835000000` under "migrations executed".

Verify the index exists:
```bash
docker compose exec postgres psql -U insight_user -d insightstream_dev -c "\d feedbacks"
```
Expected: `IDX_feedbacks_projectId_createdAt` listed under "Indexes".

- [ ] **Step 4: Commit**

```bash
git add packages/database/src/entities/feedback.entity.ts apps/api/src/migrations/1774835000000-AddFeedbackProjectCreatedAtIndex.ts
git commit -m "perf(db): add composite index on feedbacks(projectId, createdAt)"
```

---

## Task 2: `FeedbackService.findByProject`

**Files:**
- Modify: `apps/api/src/modules/feedback/feedback.service.ts:114-120`
- Test: `apps/api/src/modules/feedback/feedback.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

In `apps/api/src/modules/feedback/feedback.service.spec.ts`, add `NotFoundException` to the imports:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { Feedback, TeamMember } from '@insightstream/database';
import { ProjectsService } from '../projects/projects.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { AiQueueService } from '../ai/ai-queue.service';
import { EventsGateway } from '../events/events.gateway';
```

Add a new `describe` block right after the `describe('create', ...)` block (before `describe('remove', ...)`):

```typescript
  describe('findByProject', () => {
    it('should return feedback for the project, newest first, capped at 500', async () => {
      const projectId = 'proj-abc';
      const userId = 'user-abc';
      const mockFeedbacks = [{ id: 'fb-2' }, { id: 'fb-1' }];
      repo.find.mockResolvedValue(mockFeedbacks);

      const result = await service.findByProject(projectId, userId);

      const mockProjectsService = (service as any).projectsService;
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        projectId,
        userId,
      );
      expect(repo.find).toHaveBeenCalledWith({
        where: { projectId },
        order: { createdAt: 'DESC' },
        take: 500,
      });
      expect(result).toBe(mockFeedbacks);
    });

    it('should propagate access-denied error and not query feedback', async () => {
      const mockProjectsService = (service as any).projectsService;
      mockProjectsService.findOne.mockRejectedValueOnce(
        new NotFoundException('Project not found'),
      );

      await expect(
        service.findByProject('proj-x', 'user-y'),
      ).rejects.toThrow('Project not found');
      expect(repo.find).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter api test -- feedback.service.spec.ts`
Expected: FAIL — `service.findByProject is not a function`

- [ ] **Step 3: Implement `findByProject`**

In `apps/api/src/modules/feedback/feedback.service.ts`, replace the `findAllByUser` method (lines 114-120):

```typescript
  async findAllByUser(userId: string) {
    return this.feedbackRepository.find({
      where: { project: { userId } },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }
```

with:

```typescript
  async findByProject(projectId: string, userId: string): Promise<Feedback[]> {
    await this.projectsService.findOne(projectId, userId);

    return this.feedbackRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }
```

(`findAllByTeam`, directly below it, is unchanged — it's unused dead code, out of scope per the design doc.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter api test -- feedback.service.spec.ts`
Expected: PASS, all tests green

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors (note: `feedback.controller.ts` still calls the now-removed `findAllByUser` at this point — Task 3 fixes that; if typecheck fails here on the controller, that's expected and resolved in the next task)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/feedback/feedback.service.ts apps/api/src/modules/feedback/feedback.service.spec.ts
git commit -m "refactor(api): replace findAllByUser with project-scoped findByProject"
```

---

## Task 3: Controller — require `projectId`

**Files:**
- Modify: `apps/api/src/modules/feedback/feedback.controller.ts`

- [ ] **Step 1: Update the controller**

In `apps/api/src/modules/feedback/feedback.controller.ts`, add `Query` to the imports:

```typescript
import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
} from '@nestjs/common';
```

Replace the `findAll` method:

```typescript
  @Get()
  async findAll(@Request() req: any) {
    return this.feedbackService.findAllByUser(req.user.id);
  }
```

with:

```typescript
  @Get()
  async findAll(@Request() req: any, @Query('projectId') projectId: string) {
    if (!projectId) {
      return { statusCode: 400, message: 'projectId is required' };
    }
    return this.feedbackService.findByProject(projectId, req.user.id);
  }
```

- [ ] **Step 2: Typecheck, lint, and test**

Run: `pnpm typecheck && pnpm lint && pnpm --filter api test`
Expected: no errors, all tests pass (this resolves the expected typecheck failure from Task 2 Step 5)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/feedback/feedback.controller.ts
git commit -m "feat(api): require projectId on GET /feedback"
```

---

## Task 4: Frontend — parameterize `feedbacksQuery`

**Files:**
- Modify: `apps/web/src/lib/queries.ts:15-18`

- [ ] **Step 1: Replace the static query with a parameterized one**

In `apps/web/src/lib/queries.ts`, replace:

```typescript
export const feedbacksQuery = queryOptions({
  queryKey: ["feedbacks"],
  queryFn: () => api.get<IFeedback[]>("/feedback").then((r) => r.data),
});
```

with:

```typescript
export const feedbacksQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["feedbacks", projectId],
    queryFn: () =>
      api
        .get<IFeedback[]>("/feedback", { params: { projectId } })
        .then((r) => r.data),
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/queries.ts
git commit -m "feat(web): parameterize feedbacksQuery by projectId"
```

(Typecheck is deferred to Task 6, since Tasks 5 and 6 are the only call sites and both need updating before the web app typechecks cleanly.)

---

## Task 5: Frontend — `dashboard/page.tsx`

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx:50-72`

- [ ] **Step 1: Reorder hooks and switch to the scoped query**

In `apps/web/src/app/dashboard/page.tsx`, replace lines 50-72:

```typescript
  const { data: userProfile } = useQuery(userProfileQuery);

  // Real-time updates via socket — single source of truth for feedbacks invalidation
  useSocket(userProfile?.id, () => {
    queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
  });

  const { data: projects } = useQuery(projectsQuery);

  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  const {
    data: allFeedbacks,
    isLoading,
    isError,
  } = useQuery(feedbacksQuery);

  const feedbacks =
    allFeedbacks?.filter(
      (fb: any) =>
        fb.projectId === activeProject?.id && fb.status !== "Archived",
    ) || [];
```

with:

```typescript
  const { data: userProfile } = useQuery(userProfileQuery);

  const { data: projects } = useQuery(projectsQuery);

  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  // Real-time updates via socket — single source of truth for feedbacks invalidation
  useSocket(userProfile?.id, () => {
    queryClient.invalidateQueries({
      queryKey: ["feedbacks", activeProject?.id],
    });
  });

  const {
    data: projectFeedbacks,
    isLoading,
    isError,
  } = useQuery({
    ...feedbacksQuery(activeProject?.id ?? ""),
    enabled: !!activeProject?.id,
  });

  const feedbacks =
    projectFeedbacks?.filter((fb: any) => fb.status !== "Archived") || [];
```

Everything below this point (`AnalyticsOverview`, `KanbanBoard`, etc.) already reads from the `feedbacks` variable name and needs no further changes.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/page.tsx
git commit -m "feat(web): scope dashboard feedback query to active project"
```

---

## Task 6: Frontend — `dashboard/archive/page.tsx`

**Files:**
- Modify: `apps/web/src/app/dashboard/archive/page.tsx:28-47`

- [ ] **Step 1: Apply the same change as Task 5**

In `apps/web/src/app/dashboard/archive/page.tsx`, replace lines 28-47:

```typescript
  const { activeTeam } = useTeam();

  const { data: userProfile } = useQuery(userProfileQuery);

  useSocket(userProfile?.id, () => {
    queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
  });

  const { data: projects } = useQuery(projectsQuery);

  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  const { data: allFeedbacks, isLoading } = useQuery(feedbacksQuery);

  const archivedFeedbacks =
    allFeedbacks?.filter(
      (fb: any) =>
        fb.projectId === activeProject?.id && fb.status === "Archived",
    ) || [];
```

with:

```typescript
  const { activeTeam } = useTeam();

  const { data: userProfile } = useQuery(userProfileQuery);

  const { data: projects } = useQuery(projectsQuery);

  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  useSocket(userProfile?.id, () => {
    queryClient.invalidateQueries({
      queryKey: ["feedbacks", activeProject?.id],
    });
  });

  const { data: projectFeedbacks, isLoading } = useQuery({
    ...feedbacksQuery(activeProject?.id ?? ""),
    enabled: !!activeProject?.id,
  });

  const archivedFeedbacks =
    projectFeedbacks?.filter((fb: any) => fb.status === "Archived") || [];
```

The rest of the file (pagination UI, restore/delete mutations) reads from `archivedFeedbacks` and needs no further changes.

- [ ] **Step 2: Typecheck and lint the web app**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors — this is the point where both `feedbacksQuery` call sites are updated, so the web app typechecks cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/archive/page.tsx
git commit -m "feat(web): scope archive page feedback query to active project"
```

---

## Task 7: Socket.io Redis Adapter

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/adapters/redis-io.adapter.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Add dependencies**

In `apps/api/package.json`, in the `dependencies` block, add (keeping alphabetical order):

```json
    "@sentry/nestjs": "^10.47.0",
    "@socket.io/redis-adapter": "^8.3.0",
    "bcrypt": "^6.0.0",
    "bullmq": "^5.73.1",
    "dotenv": "^16.5.0",
    "express": "^5.2.1",
    "ioredis": "^5.4.1",
    "nodemailer": "^8.0.4",
```

Run:
```bash
pnpm install
```
Expected: lockfile updates, install succeeds.

- [ ] **Step 2: Write `RedisIoAdapter`**

Create `apps/api/src/adapters/redis-io.adapter.ts`:

```typescript
import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        pubClient.once('ready', resolve);
        pubClient.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        subClient.once('ready', resolve);
        subClient.once('error', reject);
      }),
    ]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Connected to Redis for Socket.io adapter');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

- [ ] **Step 3: Wire it into `main.ts` with fail-fast bootstrap**

In `apps/api/src/main.ts`, add the import:

```typescript
import { RedisIoAdapter } from './adapters/redis-io.adapter';
```

Inside `bootstrap()`, right after `const app = await NestFactory.create(AppModule, { rawBody: true });`, add:

```typescript
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
```

At the bottom of the file, replace:

```typescript
bootstrap();
```

with:

```typescript
bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
```

- [ ] **Step 4: Typecheck, lint, and test**

Run: `pnpm typecheck && pnpm lint && pnpm --filter api test`
Expected: no errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/src/adapters/redis-io.adapter.ts apps/api/src/main.ts
git commit -m "feat(api): add Redis adapter for Socket.io horizontal scaling"
```

---

## Task 8: Manual Verification

**Files:** none (manual smoke test, no automated coverage — adapter wiring and cross-instance pub/sub aren't unit-testable, per the design doc)

- [ ] **Step 1: Start dependencies**

```bash
docker compose up -d
```
Expected: `postgres` and `redis` containers running (`docker compose ps`).

- [ ] **Step 2: Start two API instances on different ports**

Terminal A:
```bash
PORT=3001 pnpm --filter api start:dev
```
Terminal B:
```bash
PORT=3002 pnpm --filter api start:dev
```
Expected: both log `Connected to Redis for Socket.io adapter` on startup.

- [ ] **Step 3: Connect two browser tabs to different instances**

Open the web app twice (`NEXT_PUBLIC_API_URL` pointed at `:3001` in one tab's network config, `:3002` in the other — e.g. via two separate `.env.local` runs, or a quick manual override in browser devtools `localStorage`/network proxy). Log in as the same user in both tabs, select the same project.

- [ ] **Step 4: Trigger an update on instance A, observe on instance B**

In the tab connected to `:3001`, submit feedback (Manual Input box). Expected: the tab connected to `:3002` receives the `feedbackUpdated` socket event and its Kanban board refreshes — confirming the event crossed instances via Redis pub/sub, not just in-process `Server.to()`.

- [ ] **Step 5: Verify the projectId scoping fix**

In the dashboard, create feedback in Project A, then switch to Project B in the sidebar. Expected: Project B's Kanban board does not show Project A's feedback, and the network tab shows `GET /feedback?projectId=<id>` per project switch (confirm via browser devtools).

- [ ] **Step 6: Stop the second instance**

```bash
# Ctrl+C in Terminal B
```

This step has no commit — it's verification only.

---

## Self-Review Notes

- **Spec coverage:** Redis adapter (§2 of spec) → Task 7. Query scope + index + cap (§3) → Tasks 1-6. SQS stub (§4, no changes) → correctly excluded. `findAllByTeam` and empty `apps/api/lambda/*` dirs → correctly left untouched per spec's "Поза scope" list.
- **Type consistency:** `findByProject(projectId: string, userId: string): Promise<Feedback[]>` (Task 2) matches the controller call `this.feedbackService.findByProject(projectId, req.user.id)` (Task 3) and the test assertions (Task 2). `feedbacksQuery(projectId: string)` (Task 4) matches both call sites `feedbacksQuery(activeProject?.id ?? "")` (Tasks 5, 6).
- **Ordering:** Task 4 (queries.ts) intentionally leaves the web app type-broken until Task 6 completes both call sites — flagged inline so whoever executes this doesn't stop and debug a transient, expected typecheck failure.
