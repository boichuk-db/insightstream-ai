# Separate BullMQ Worker Process Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the BullMQ AI-analysis worker (`AiProcessor`) in a second, HTTP-less container so sustained AI load can no longer starve the API's CPU credits.

**Architecture:** One Docker image, one new `WorkerModule` bootstrapped via `NestFactory.createApplicationContext` behind a `WORKER_MODE=1` env flag in `main.ts`. A new `FeedbackEventsPublisher` DI-token abstraction lets `AiProcessor` emit WebSocket updates without depending on a live Socket.io server — the worker publishes through `@socket.io/redis-emitter` into the same Redis channel the API process's `@socket.io/redis-adapter` already listens on. `AiSweepService` (the cron re-enqueue sweep) is physically excluded from the worker via module boundaries, not a runtime `if`.

**Tech Stack:** NestJS 11, `@nestjs/bullmq`, TypeORM, `ioredis`, `@socket.io/redis-emitter` (new), Jest.

**Full design reference:** `docs/superpowers/specs/2026-07-09-separate-bullmq-worker-design.md` — read it before starting; this plan implements it task-by-task.

---

### Task 1: Shared TypeORM config factory

**Files:**
- Create: `apps/api/src/config/database.config.ts`
- Test: `apps/api/src/config/database.config.spec.ts`

Today `apps/api/src/app.module.ts:63-88` inline-defines the `TypeOrmModule.forRoot({...})` options. Both `AppModule` and the new `WorkerModule` need this, but the worker must never run migrations (two containers racing `migrationsRun: true` on the same deploy would be a real bug). Extract a factory that takes an explicit override.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/config/database.config.spec.ts
import { getTypeOrmConfig } from './database.config';

describe('getTypeOrmConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults migrationsRun to true when no override is passed', () => {
    const config = getTypeOrmConfig() as Record<string, unknown>;
    expect(config.migrationsRun).toBe(true);
  });

  it('respects an explicit migrationsRun: false override', () => {
    const config = getTypeOrmConfig({ migrationsRun: false }) as Record<
      string,
      unknown
    >;
    expect(config.migrationsRun).toBe(false);
  });

  it('reads DB connection settings from env vars', () => {
    process.env.DB_HOST = 'db.example.com';
    process.env.DB_PORT = '6543';
    process.env.DB_USERNAME = 'test_user';
    process.env.DB_PASSWORD = 'test_pass';
    process.env.DB_DATABASE = 'test_db';

    const config = getTypeOrmConfig() as Record<string, unknown>;

    expect(config).toMatchObject({
      type: 'postgres',
      host: 'db.example.com',
      port: 6543,
      username: 'test_user',
      password: 'test_pass',
      database: 'test_db',
    });
  });

  it('enables ssl only when DB_SSL=true', () => {
    process.env.DB_SSL = 'true';
    expect(
      (getTypeOrmConfig() as Record<string, unknown>).ssl,
    ).toEqual({ rejectUnauthorized: false });

    process.env.DB_SSL = 'false';
    expect((getTypeOrmConfig() as Record<string, unknown>).ssl).toBe(false);
  });

  it('registers all 11 entities', () => {
    const config = getTypeOrmConfig() as { entities: unknown[] };
    expect(config.entities).toHaveLength(11);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- database.config.spec.ts`
Expected: FAIL with `Cannot find module './database.config'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  User,
  Feedback,
  Project,
  AuditLog,
  Team,
  TeamMember,
  Invitation,
  Comment,
  ActivityEvent,
  UserProjectLastSeen,
  StripeEvent,
} from '@insightstream/database';

export function getTypeOrmConfig(opts?: {
  migrationsRun?: boolean;
}): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'insight_user',
    password: process.env.DB_PASSWORD || 'insight_password',
    database: process.env.DB_DATABASE || 'insightstream_dev',
    entities: [
      User,
      Feedback,
      Project,
      AuditLog,
      Team,
      TeamMember,
      Invitation,
      Comment,
      ActivityEvent,
      UserProjectLastSeen,
      StripeEvent,
    ],
    synchronize: process.env.NODE_ENV !== 'production',
    migrations: [__dirname + '/../migrations/**/*.{ts,js}'],
    migrationsRun: opts?.migrationsRun ?? true,
    ssl:
      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}
```

Note the migrations glob: `__dirname` here is `apps/api/src/config`, so it must climb one level (`/../migrations/**/*.{ts,js}`) to still resolve to `apps/api/src/migrations` — the same directory the original inline config in `app.module.ts` (at `apps/api/src`) pointed to directly.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- database.config.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/config/database.config.ts apps/api/src/config/database.config.spec.ts
git commit -m "refactor(api): extract shared TypeORM config factory"
```

---

### Task 2: Shared BullMQ config factory

**Files:**
- Create: `apps/api/src/config/bull.config.ts`
- Test: `apps/api/src/config/bull.config.spec.ts`

Same problem, smaller surface: `app.module.ts:45-49` inline-defines `BullModule.forRoot({...})`. `WorkerModule` needs the identical connection config.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/config/bull.config.spec.ts
import { getBullConfig } from './bull.config';

describe('getBullConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults to localhost Redis when REDIS_URL is unset', () => {
    delete process.env.REDIS_URL;
    expect(getBullConfig()).toEqual({
      connection: { url: 'redis://localhost:6379' },
    });
  });

  it('reads REDIS_URL from env when set', () => {
    process.env.REDIS_URL = 'redis://redis:6379';
    expect(getBullConfig()).toEqual({
      connection: { url: 'redis://redis:6379' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- bull.config.spec.ts`
Expected: FAIL with `Cannot find module './bull.config'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/config/bull.config.ts
import { BullModuleOptions } from '@nestjs/bullmq';

export function getBullConfig(): BullModuleOptions {
  return {
    connection: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- bull.config.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/config/bull.config.ts apps/api/src/config/bull.config.spec.ts
git commit -m "refactor(api): extract shared BullMQ config factory"
```

---

### Task 3: Wire `AppModule` to the shared factories

**Files:**
- Modify: `apps/api/src/app.module.ts:1-88`

Replace the two inline configs with calls to the factories from Task 1/2. Behavior for the HTTP process is unchanged (`migrationsRun` still defaults to `true`).

- [ ] **Step 1: Update imports**

In `apps/api/src/app.module.ts`, replace this entity import block:

```ts
import {
  User,
  Feedback,
  Project,
  AuditLog,
  Team,
  TeamMember,
  Invitation,
  Comment,
  ActivityEvent,
  UserProjectLastSeen,
  StripeEvent,
} from '@insightstream/database';
```

with:

```ts
import { getTypeOrmConfig } from './config/database.config';
import { getBullConfig } from './config/bull.config';
```

- [ ] **Step 2: Replace the inline `BullModule.forRoot` and `TypeOrmModule.forRoot` calls**

Change:

```ts
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    }),
```

to:

```ts
    BullModule.forRoot(getBullConfig()),
```

Change:

```ts
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'insight_user',
      password: process.env.DB_PASSWORD || 'insight_password',
      database: process.env.DB_DATABASE || 'insightstream_dev',
      entities: [
        User,
        Feedback,
        Project,
        AuditLog,
        Team,
        TeamMember,
        Invitation,
        Comment,
        ActivityEvent,
        UserProjectLastSeen,
        StripeEvent,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      migrations: [__dirname + '/migrations/**/*.{ts,js}'],
      migrationsRun: true,
      ssl:
        process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
```

to:

```ts
    TypeOrmModule.forRoot(getTypeOrmConfig()),
```

- [ ] **Step 3: Run the full API test suite to confirm no regression**

Run: `pnpm --filter api test`
Expected: PASS, same pass count as before this task (this is a pure refactor — no test should newly fail)

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "refactor(api): use shared config factories in AppModule"
```

---

### Task 4: `FeedbackEventsPublisher` token + `EventsModule` wiring

**Files:**
- Create: `apps/api/src/modules/events/feedback-events-publisher.token.ts`
- Modify: `apps/api/src/modules/events/events.module.ts`

This is the interface `AiProcessor` will depend on instead of the concrete `EventsService`, so it works identically whether it's resolved to the real Socket.io gateway (HTTP process) or the Redis-emitter version (worker process, added in Task 6/7).

- [ ] **Step 1: Create the token + interface**

```ts
// apps/api/src/modules/events/feedback-events-publisher.token.ts
export const FEEDBACK_EVENTS_PUBLISHER = Symbol('FEEDBACK_EVENTS_PUBLISHER');

export interface FeedbackEventsPublisher {
  emitFeedbackUpdatedForProject(projectId: string): Promise<void>;
}
```

- [ ] **Step 2: Bind `EventsService` to the token in `EventsModule`**

In `apps/api/src/modules/events/events.module.ts`, add the import and provider binding:

```ts
import { FEEDBACK_EVENTS_PUBLISHER } from './feedback-events-publisher.token';
```

Change the `providers`/`exports` arrays from:

```ts
  providers: [EventsGateway, EventsService],
  exports: [EventsGateway, EventsService],
```

to:

```ts
  providers: [
    EventsGateway,
    EventsService,
    { provide: FEEDBACK_EVENTS_PUBLISHER, useExisting: EventsService },
  ],
  exports: [EventsGateway, EventsService, FEEDBACK_EVENTS_PUBLISHER],
```

`EventsService` already implements the interface's method shape (`emitFeedbackUpdatedForProject(projectId: string): Promise<void>` — `events.service.ts:16`), so no change to the class itself is needed.

- [ ] **Step 3: Run the existing events test suite**

Run: `pnpm --filter api test -- events.service.spec.ts`
Expected: PASS, unchanged

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/events/feedback-events-publisher.token.ts apps/api/src/modules/events/events.module.ts
git commit -m "feat(api): add FeedbackEventsPublisher DI token, bind EventsService to it"
```

---

### Task 5: Add the `@socket.io/redis-emitter` dependency

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install the package**

Run: `pnpm --filter api add @socket.io/redis-emitter@^5.1.0`

- [ ] **Step 2: Verify it landed in `apps/api/package.json` dependencies and the lockfile updated**

Run: `git diff apps/api/package.json pnpm-lock.yaml`
Expected: `apps/api/package.json` gains `"@socket.io/redis-emitter": "^5.1.0"` under `dependencies`; `pnpm-lock.yaml` has a corresponding new entry.

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add @socket.io/redis-emitter dependency"
```

---

### Task 6: `RedisFeedbackEventsPublisher` service

**Files:**
- Create: `apps/api/src/modules/events/redis-feedback-events-publisher.service.ts`
- Test: `apps/api/src/modules/events/redis-feedback-events-publisher.service.spec.ts`

This is the worker-process implementation of `FeedbackEventsPublisher`: same `project.teamId` lookup `EventsService` does, but emits via `@socket.io/redis-emitter` instead of a local Socket.io `Server`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/events/redis-feedback-events-publisher.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '@insightstream/database';
import { RedisFeedbackEventsPublisher } from './redis-feedback-events-publisher.service';

const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));

jest.mock('@socket.io/redis-emitter', () => ({
  Emitter: jest.fn().mockImplementation(() => ({ to: mockTo })),
}));

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({ disconnect: jest.fn() })),
}));

describe('RedisFeedbackEventsPublisher', () => {
  let service: RedisFeedbackEventsPublisher;
  let projectRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    mockEmit.mockClear();
    mockTo.mockClear();
    projectRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisFeedbackEventsPublisher,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
      ],
    }).compile();

    service = module.get(RedisFeedbackEventsPublisher);
  });

  it('emits feedbackUpdated to the project team room via the Redis emitter', async () => {
    projectRepo.findOne.mockResolvedValue({ id: 'proj-1', teamId: 'team-1' });

    await service.emitFeedbackUpdatedForProject('proj-1');

    expect(projectRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
    });
    expect(mockTo).toHaveBeenCalledWith('team-team-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'feedbackUpdated',
      expect.objectContaining({ timestamp: expect.any(Date) }),
    );
  });

  it('no-ops when the project no longer exists', async () => {
    projectRepo.findOne.mockResolvedValue(null);

    await service.emitFeedbackUpdatedForProject('missing-proj');

    expect(mockTo).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- redis-feedback-events-publisher.service.spec.ts`
Expected: FAIL with `Cannot find module './redis-feedback-events-publisher.service'`

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/modules/events/redis-feedback-events-publisher.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Emitter } from '@socket.io/redis-emitter';
import { Project } from '@insightstream/database';
import { FeedbackEventsPublisher } from './feedback-events-publisher.token';

@Injectable()
export class RedisFeedbackEventsPublisher
  implements FeedbackEventsPublisher, OnModuleDestroy
{
  private readonly redisClient: Redis;
  private readonly emitter: Emitter;

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {
    this.redisClient = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379',
    );
    this.emitter = new Emitter(this.redisClient);
  }

  /** Mirrors EventsService.emitFeedbackUpdatedForProject, minus a local Socket.io server. */
  async emitFeedbackUpdatedForProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) return;
    this.emitter
      .to(`team-${project.teamId}`)
      .emit('feedbackUpdated', { timestamp: new Date() });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- redis-feedback-events-publisher.service.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/events/redis-feedback-events-publisher.service.ts apps/api/src/modules/events/redis-feedback-events-publisher.service.spec.ts
git commit -m "feat(api): add RedisFeedbackEventsPublisher for worker-process WS emission"
```

---

### Task 7: `WorkerEventsModule`

**Files:**
- Create: `apps/api/src/worker-events.module.ts`

Binds `FEEDBACK_EVENTS_PUBLISHER` to `RedisFeedbackEventsPublisher` — this is the worker-process counterpart to `EventsModule`'s binding from Task 4.

**Must be `@Global()`.** `AiProcessor` lives inside `AiModule`, which does not (and should not) import `WorkerEventsModule` directly — the whole point of the token is that `AiModule` stays agnostic to which process it's running in. In the real `EventsModule` (Task 4), this works today only because `events.module.ts:9` has `@Global()` — that's what lets `FeedbackModule`/`AiModule` inject `EventsService`/`FEEDBACK_EVENTS_PUBLISHER` without importing `EventsModule` themselves. `WorkerEventsModule` needs the identical `@Global()` treatment, or `AiProcessor` will fail to resolve its dependency at worker-process boot with a "Nest can't resolve dependencies of the AiProcessor" error.

- [ ] **Step 1: Write the module**

```ts
// apps/api/src/worker-events.module.ts
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '@insightstream/database';
import { FEEDBACK_EVENTS_PUBLISHER } from './modules/events/feedback-events-publisher.token';
import { RedisFeedbackEventsPublisher } from './modules/events/redis-feedback-events-publisher.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [
    RedisFeedbackEventsPublisher,
    {
      provide: FEEDBACK_EVENTS_PUBLISHER,
      useExisting: RedisFeedbackEventsPublisher,
    },
  ],
  exports: [FEEDBACK_EVENTS_PUBLISHER],
})
export class WorkerEventsModule {}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/worker-events.module.ts
git commit -m "feat(api): add WorkerEventsModule binding FEEDBACK_EVENTS_PUBLISHER for the worker process"
```

(This module isn't imported anywhere yet — `WorkerModule` in Task 10 wires it in. Typecheck-only is enough here.)

---

### Task 8: `AiProcessor` depends on the token, not `EventsService`

**Files:**
- Modify: `apps/api/src/modules/ai/ai.processor.ts`
- Modify: `apps/api/src/modules/ai/ai.processor.spec.ts`

- [ ] **Step 1: Update the test first to mock the token instead of the concrete class**

Replace the full contents of `apps/api/src/modules/ai/ai.processor.spec.ts` with:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { AiProcessor } from './ai.processor';
import { AiService } from './ai.service';
import { FEEDBACK_EVENTS_PUBLISHER } from '../events/feedback-events-publisher.token';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Feedback } from '@insightstream/database';
import { Job } from 'bullmq';
import { AnalysisJobData } from './ai-queue.service';

describe('AiProcessor', () => {
  let processor: AiProcessor;
  let aiService: { analyzeFeedback: jest.Mock };
  let feedbackRepo: { update: jest.Mock };
  let eventsPublisher: { emitFeedbackUpdatedForProject: jest.Mock };

  beforeEach(async () => {
    aiService = { analyzeFeedback: jest.fn() };
    feedbackRepo = { update: jest.fn().mockResolvedValue({}) };
    eventsPublisher = { emitFeedbackUpdatedForProject: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProcessor,
        { provide: AiService, useValue: aiService },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: FEEDBACK_EVENTS_PUBLISHER, useValue: eventsPublisher },
      ],
    }).compile();

    processor = module.get<AiProcessor>(AiProcessor);
  });

  const makeJob = (data: AnalysisJobData) =>
    ({ data, attemptsMade: 0 }) as Job<AnalysisJobData>;

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
        teamId: 'team-1',
        aiLevel: 'full',
      }),
    );

    expect(aiService.analyzeFeedback).toHaveBeenCalledWith(
      'Please add dark mode',
    );
    expect(feedbackRepo.update).toHaveBeenCalledWith('fb-1', {
      sentimentScore: 0.9,
      category: 'Feature',
      aiSummary: 'User wants dark mode',
      tags: ['design'],
    });
    expect(
      eventsPublisher.emitFeedbackUpdatedForProject,
    ).toHaveBeenCalledWith('proj-1');
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
        teamId: 'team-1',
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
          teamId: 'team-1',
          aiLevel: 'basic',
        }),
      ),
    ).rejects.toThrow('Gemini returned null for feedback fb-3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- ai.processor.spec.ts`
Expected: FAIL — `AiProcessor` still requires the concrete `EventsService` (no provider for it in the test module), Nest throws an "Unable to resolve dependencies" error.

- [ ] **Step 3: Update `AiProcessor`**

In `apps/api/src/modules/ai/ai.processor.ts`, replace:

```ts
import { EventsService } from '../events/events.service';
```

with:

```ts
import { Inject } from '@nestjs/common';
import {
  FEEDBACK_EVENTS_PUBLISHER,
  FeedbackEventsPublisher,
} from '../events/feedback-events-publisher.token';
```

Replace the constructor parameter:

```ts
    private readonly eventsService: EventsService,
```

with:

```ts
    @Inject(FEEDBACK_EVENTS_PUBLISHER)
    private readonly eventsPublisher: FeedbackEventsPublisher,
```

Replace the call site:

```ts
    await this.eventsService.emitFeedbackUpdatedForProject(job.data.projectId);
```

with:

```ts
    await this.eventsPublisher.emitFeedbackUpdatedForProject(job.data.projectId);
```

Note `Injectable` is already imported from `@nestjs/common` at the top of the file — add `Inject` to that existing import instead of a separate line:

```ts
import { Injectable, Inject, Logger } from '@nestjs/common';
```

(and drop the standalone `import { Inject } from '@nestjs/common';` shown above — it was for clarity, fold it into the existing import.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- ai.processor.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/ai/ai.processor.ts apps/api/src/modules/ai/ai.processor.spec.ts
git commit -m "refactor(api): AiProcessor depends on FeedbackEventsPublisher token, not EventsService"
```

---

### Task 9: Move `AiSweepService` into its own module

**Files:**
- Modify: `apps/api/src/modules/ai/ai.module.ts`
- Create: `apps/api/src/modules/ai/ai-sweep.module.ts`
- Modify: `apps/api/src/app.module.ts`

`AiSweepService` (the cron sweep) must never run inside the worker process. Moving it out of `AiModule`'s provider list into its own module, imported only by `AppModule`, makes that a structural guarantee instead of an env-flag `if`.

- [ ] **Step 1: Shrink `AiModule`**

In `apps/api/src/modules/ai/ai.module.ts`, remove the `AiSweepService` import and drop it from `providers`:

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Feedback } from '@insightstream/database';
import { AiService } from './ai.service';
import { AiProcessor } from './ai.processor';
import { AiQueueService, AI_ANALYSIS_QUEUE } from './ai-queue.service';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Feedback]),
    BullModule.registerQueue({ name: AI_ANALYSIS_QUEUE }),
    PlansModule,
  ],
  providers: [AiService, AiProcessor, AiQueueService],
  exports: [AiService, AiQueueService],
})
export class AiModule {}
```

- [ ] **Step 2: Create `AiSweepModule`**

```ts
// apps/api/src/modules/ai/ai-sweep.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '@insightstream/database';
import { AiSweepService } from './ai-sweep.service';
import { AiModule } from './ai.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback]),
    AiModule,
    PlansModule,
  ],
  providers: [AiSweepService],
})
export class AiSweepModule {}
```

- [ ] **Step 3: Wire `AiSweepModule` into `AppModule`**

In `apps/api/src/app.module.ts`, add the import:

```ts
import { AiSweepModule } from './modules/ai/ai-sweep.module';
```

and add `AiSweepModule` to the `imports` array (next to `DigestModule`, the other cron-bearing module):

```ts
    DigestModule,
    AiSweepModule,
```

- [ ] **Step 4: Run the AI module test suite**

Run: `pnpm --filter api test -- ai-sweep.service.spec.ts ai.module`
Expected: PASS — `ai-sweep.service.spec.ts` needs no changes (it tests `AiSweepService` in isolation via `Test.createTestingModule`, not through `AiModule`/`AiSweepModule`), so it should already be green.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/ai/ai.module.ts apps/api/src/modules/ai/ai-sweep.module.ts apps/api/src/app.module.ts
git commit -m "refactor(api): move AiSweepService out of AiModule into AiSweepModule"
```

---

### Task 10: `WorkerModule`

**Files:**
- Create: `apps/api/src/worker.module.ts`

The lightweight root module for the worker process: DB + Redis + the BullMQ consumer + the Redis-emitter WS path. No HTTP, no controllers, no `ScheduleModule`, no `ThrottlerModule`, no the real `EventsModule`.

- [ ] **Step 1: Write the module**

```ts
// apps/api/src/worker.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { getTypeOrmConfig } from './config/database.config';
import { getBullConfig } from './config/bull.config';
import { AiModule } from './modules/ai/ai.module';
import { WorkerEventsModule } from './worker-events.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot(getBullConfig()),
    TypeOrmModule.forRoot(getTypeOrmConfig({ migrationsRun: false })),
    AiModule,
    WorkerEventsModule,
  ],
})
export class WorkerModule {}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/worker.module.ts
git commit -m "feat(api): add WorkerModule for the worker-only process"
```

---

### Task 11: Branch `main.ts` on `WORKER_MODE`

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Split the existing `bootstrap()` into an HTTP path and add a worker path**

Replace the full contents of `apps/api/src/main.ts` with:

```ts
import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { WorkerModule } from './worker.module';
import { SentryExceptionFilter } from './filters/sentry-exception.filter';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

async function bootstrapWorker() {
  const logger = new Logger('WorkerBootstrap');
  await NestFactory.createApplicationContext(WorkerModule);
  logger.log('Worker process started (WORKER_MODE=1) — no HTTP, no WS server');
}

async function bootstrapHttp() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  // CORS:
  // - /feedback/public is called from customer sites → allow any origin here;
  //   per-project origin enforcement happens inside FeedbackPublicController.
  // - Everything else is dashboard-only → FRONTEND_URL + localhost.
  // Auth is Bearer-token (no cookies), so no Allow-Credentials needed.
  // Hand-rolled instead of app.enableCors() so the allow-list can branch on
  // req.path; Nest's CorsOptionsDelegate could do this too, but a plain
  // middleware keeps the two branches (public route vs. everything else)
  // easy to read side by side.
  // Comma-separated so Vercel + Amplify can both be allowed during a
  // staged cutover, without an app restart to swap a single value.
  const frontendUrls = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const PUBLIC_FEEDBACK_PATH = '/feedback/public';
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (!origin) return next();

    let allowed =
      req.path === PUBLIC_FEEDBACK_PATH ||
      req.path.startsWith(`${PUBLIC_FEEDBACK_PATH}/`);
    if (!allowed) {
      try {
        const { hostname } = new URL(origin);
        allowed =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          frontendUrls.includes(origin);
      } catch {
        allowed = false;
      }
    }

    if (allowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      );
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  await app.listen(process.env.PORT ?? 3001);
}

async function bootstrap() {
  if (process.env.WORKER_MODE === '1') {
    await bootstrapWorker();
    return;
  }
  await bootstrapHttp();
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
```

This is a pure reorganization of the existing `bootstrap()` body into `bootstrapHttp()` plus a new `bootstrapWorker()` branch — no line inside the CORS middleware, WS adapter setup, or `app.listen()` call changes.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat(api): branch main.ts bootstrap on WORKER_MODE"
```

---

### Task 12: Manual local verification (both processes boot for real)

**Files:** none (verification only — this is the step that a unit test can't cover, since `TypeOrmModule.forRoot` needs a real Postgres and `BullModule.forRoot` needs a real Redis).

- [ ] **Step 1: Ensure local Postgres + Redis are running**

Run: `docker compose up -d && docker compose ps`
Expected: the `postgres` and `redis` services (`docker-compose.yml:3,15`) both report state `running`/`Up`.

- [ ] **Step 2: Build the API once so both bootstrap paths use the same compiled output**

Run: `pnpm --filter api build`
Expected: `apps/api/dist/main.js` produced, no build errors.

- [ ] **Step 3: Start the HTTP process and confirm it still boots clean**

Run (from `apps/api`): `node dist/main`
Expected console output includes `Nest application successfully started` and no `WORKER_MODE` log line. Stop with Ctrl+C once confirmed.

- [ ] **Step 4: Start the worker process and confirm it boots without an HTTP server**

Run (from `apps/api`): `WORKER_MODE=1 node dist/main` (PowerShell: `$env:WORKER_MODE='1'; node dist/main`)
Expected console output includes `Worker process started (WORKER_MODE=1) — no HTTP, no WS server` and does **not** include `Nest application successfully started` (that message is Nest's HTTP-bootstrap-only log) or any `Mapped {route}` controller-route logs. Confirm no process is listening on port 3001 (`curl http://localhost:3001` from another terminal should fail to connect while only the worker is running).

- [ ] **Step 5: End-to-end smoke: submit feedback, confirm AI analysis still lands and a WS update still fires**

With the worker process running (`WORKER_MODE=1`) in one terminal and the HTTP process (`node dist/main`, no env override) running in another, plus the web app (`pnpm --filter web dev`) pointed at the local API:
1. Open the dashboard in a browser, keep it on a project's feedback feed.
2. Submit a piece of feedback for that project (via the widget or `POST /feedback/public`).
3. Confirm in the worker terminal's logs: `Processing AI analysis for feedback ...` then `AI analysis completed for feedback ...`.
4. Confirm the feedback feed updates in the browser **without a manual refresh** — this is the proof that `RedisFeedbackEventsPublisher` (worker process) successfully published through Redis and the HTTP process's `RedisIoAdapter` delivered it to the connected client.

Expected: the feed updates live. If it doesn't, check that both processes point at the same `REDIS_URL` and that `@socket.io/redis-emitter`'s `Emitter` room/event names (`team-${teamId}`, `feedbackUpdated`) match `EventsGateway.emitFeedbackUpdatedToTeam` exactly (`apps/api/src/modules/events/events.gateway.ts:71-75`).

- [ ] **Step 6: Full verification suite**

Run: `pnpm typecheck && pnpm lint && pnpm --filter api test`
Expected: all green, 0 errors (per this project's verification mandate — do not report this task done without pasting this output).

---

### Task 13: `docker-run.sh` — second container for the worker

**Files:**
- Modify: `scripts/docker-run.sh`

- [ ] **Step 1: Add the worker container block**

At the end of `scripts/docker-run.sh` (after the existing `insightstream-api` block, before the final `echo` line), add:

```bash
docker stop insightstream-worker 2>/dev/null || true
docker rm insightstream-worker 2>/dev/null || true

docker run -d \
  --name insightstream-worker \
  --network insightstream-net \
  --restart unless-stopped \
  --log-driver=json-file \
  --log-opt max-size=10m \
  -e NODE_ENV=production \
  -e WORKER_MODE=1 \
  -e REDIS_URL=redis://redis:6379 \
  -e DB_SSL=true \
  -e DB_HOST="$DB_HOST" \
  -e DB_PORT="$DB_PORT" \
  -e DB_USERNAME="$DB_USERNAME" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  -e DB_DATABASE="$DB_DATABASE" \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  $IMAGE

echo "Worker started: $(docker ps --filter name=insightstream-worker --format '{{.Status}}')"
```

No `-p` flag (the worker exposes no HTTP port). Deliberately no `JWT_SECRET`, `FRONTEND_URL`, `GITHUB_*`/`GOOGLE_*`, `STRIPE_*`, `SES_FROM_EMAIL`, or rate-limit env vars — `WorkerModule` never imports the modules that read them.

- [ ] **Step 2: Shell-lint the script**

Run: `bash -n scripts/docker-run.sh`
Expected: no syntax errors (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add scripts/docker-run.sh
git commit -m "feat(infra): deploy the AI worker as a second container"
```

**Note:** this step changes the deploy script only. Actually running it against the live EC2 instance (which restarts the real `insightstream-api` container and starts a new `insightstream-worker` one) is a deploy action — confirm with the user before running `scripts/deploy-api.sh` / triggering this on the real host, per this project's convention of not taking irreversible/production-affecting actions without explicit confirmation.

---

### Task 14: Update `docs/architecture/PLAN.md`

**Files:**
- Modify: `docs/architecture/PLAN.md`

Per this repo's own update rule: an architecture change (new module boundary, a completed 🔥 roadmap item) updates `PLAN.md` in the same PR.

- [ ] **Step 1: Get today's date**

Run: `date +%Y-%m-%d`
Use the output everywhere `<DATE>` appears below.

- [ ] **Step 2: Mark item #5 done**

In `docs/architecture/PLAN.md`, replace the `### 5. Separate BullMQ worker process` section (currently):

```markdown
### 5. Separate BullMQ worker process
**Problem:** the AI worker (concurrency 3) shares one Node process and the t3.micro's burstable CPU credits with HTTP + WebSocket — sustained AI load silently throttles the API.
**Action:** same Docker image, a `WORKER_MODE` env flag boots only the queue consumer; run it as a second container. Zero new infra; teaches process separation hands-on. 🎓
**Effort:** ~1 day. **Type:** performance isolation.
```

with:

```markdown
### 5. ~~Separate BullMQ worker process~~ — ✔ Done (<DATE>)
**Problem:** the AI worker (concurrency 3) shared one Node process and the t3.micro's burstable CPU credits with HTTP + WebSocket — sustained AI load could silently throttle the API.
**What was done:** `apps/api/src/main.ts` now branches on `WORKER_MODE=1` — worker mode calls `NestFactory.createApplicationContext(WorkerModule)` (no HTTP, no Socket.io, no `ScheduleModule`) instead of the full HTTP bootstrap. New `WorkerModule` (`apps/api/src/worker.module.ts`) imports only `TypeOrmModule`/`BullModule` (via new shared `getTypeOrmConfig`/`getBullConfig` factories — the worker passes `migrationsRun: false` so both containers never race migrations on deploy), `AiModule`, and a new `WorkerEventsModule`. `AiSweepService` (the cron sweep) was moved out of `AiModule` into its own `AiSweepModule`, imported only by `AppModule` — the worker process cannot boot it even by accident. Since a worker process never has a live Socket.io server, `AiProcessor` no longer depends on the concrete `EventsService`; it depends on a new `FeedbackEventsPublisher` DI token instead. The HTTP process binds the token to the existing `EventsService` (unchanged behavior); the worker process binds it to a new `RedisFeedbackEventsPublisher`, which emits through `@socket.io/redis-emitter` into the same Redis channel `@socket.io/redis-adapter` already uses — same room (`team-{id}`) and event name (`feedbackUpdated`), so the dashboard client sees no difference. Deployed as a second `docker run` (`insightstream-worker`, no `-p`, no HTTP-only env vars) alongside the existing `insightstream-api` container in `scripts/docker-run.sh`. Design: `docs/superpowers/specs/2026-07-09-separate-bullmq-worker-design.md`.
**Type:** performance isolation.
```

- [ ] **Step 3: Add a Changelog entry**

At the top of the `## Changelog` section in `docs/architecture/PLAN.md`, add a new bullet (matching the existing style of the entries below it):

```markdown
- **<DATE>** — 🔥 #5 done: separate BullMQ worker process. `main.ts` branches on `WORKER_MODE=1` into a lightweight `NestFactory.createApplicationContext(WorkerModule)` path (no HTTP/WS/cron) instead of the full `AppModule` HTTP bootstrap. New `FeedbackEventsPublisher` DI token decouples `AiProcessor` from the concrete `EventsService`: the HTTP process binds it to `EventsService` (unchanged), the worker process binds it to a new `RedisFeedbackEventsPublisher` that emits via `@socket.io/redis-emitter` into the same Redis channel the existing `@socket.io/redis-adapter` subscribes to — same room/event names, transparent to the client. `AiSweepService` moved out of `AiModule` into its own `AiSweepModule` (imported only by `AppModule`) so the cron sweep structurally cannot run in the worker process. Shared `getTypeOrmConfig`/`getBullConfig` factories replace the config previously inlined in `app.module.ts`; the worker passes `migrationsRun: false` to avoid two containers racing migrations on deploy. Deployed as a second `docker run` block (`insightstream-worker`) in `scripts/docker-run.sh`. Design: `docs/superpowers/specs/2026-07-09-separate-bullmq-worker-design.md`.
```

- [ ] **Step 4: Bump the "Last updated" date at the top of the file**

Change:

```markdown
> Last updated: **2026-07-09**
```

to (using the same date from Step 1 — if it's still 2026-07-09, this line needs no change):

```markdown
> Last updated: **<DATE>**
```

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/PLAN.md
git commit -m "docs: mark separate BullMQ worker process done in PLAN.md (#5)"
```

---

## Post-plan verification checklist (do not report the whole feature done without this)

- [ ] `pnpm typecheck` — 0 errors, paste output
- [ ] `pnpm lint` — 0 errors, paste output
- [ ] `pnpm --filter api test` — all green, paste summary line
- [ ] Task 12's manual dual-process boot + live-feed smoke test actually performed and confirmed working (not assumed)
- [ ] Explicit user confirmation obtained before running `scripts/deploy-api.sh` / restarting the real EC2 containers
