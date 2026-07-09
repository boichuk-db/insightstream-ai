# Separate BullMQ Worker Process — Design

> Status: approved (brainstorming), pending implementation plan.
> Related: `docs/architecture/PLAN.md` 🔥 #5.

## Problem

The AI worker (`AiProcessor`, `@Processor(AI_ANALYSIS_QUEUE, { concurrency: 3 })`) runs inside the same Node process as HTTP + WebSocket, sharing the t3.micro's burstable CPU credits. Sustained AI load silently throttles the API. The plan calls for the same Docker image, booting only the queue consumer via a `WORKER_MODE` env flag, run as a second container.

## Architecture

One Docker image (`apps/api/Dockerfile` unchanged). `apps/api/src/main.ts` branches on `process.env.WORKER_MODE === '1'`:

- **HTTP mode (default, unchanged):** `NestFactory.create(AppModule)` — Express, Socket.io (`RedisIoAdapter`), all controllers, guards, cron jobs.
- **Worker mode:** `NestFactory.createApplicationContext(WorkerModule)` — no HTTP server, no Socket.io gateway, no `ScheduleModule`. Just DB + Redis + the BullMQ consumer.

```
main.ts
├─ bootstrapHttp()   → NestFactory.create(AppModule), app.listen()
└─ bootstrapWorker() → NestFactory.createApplicationContext(WorkerModule)
```

### WorkerModule

New `apps/api/src/worker.module.ts`:

```ts
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

Deliberately excluded: `ScheduleModule`, `EventsModule` (the real Socket.io gateway), `ThrottlerModule`, all `*Controller`s, `APP_GUARD`. This is what keeps the worker process lighter than the API process — the stated goal of #5, not just a formal env-flag split.

## WS emission from the worker — `FeedbackEventsPublisher` abstraction

`AiProcessor` currently injects the concrete `EventsService`, which calls `EventsGateway.emitFeedbackUpdatedToTeam(teamId)` — `this.server` (a real Socket.io `Server` instance) only exists because `main.ts` calls `app.listen()` and wires `RedisIoAdapter`. A worker process using `createApplicationContext` never creates that server, so the concrete gateway path would throw.

Fix: introduce a DI-token abstraction so `AiProcessor` doesn't know which process it's running in.

`apps/api/src/modules/events/feedback-events-publisher.token.ts`:
```ts
export const FEEDBACK_EVENTS_PUBLISHER = Symbol('FEEDBACK_EVENTS_PUBLISHER');
export interface FeedbackEventsPublisher {
  emitFeedbackUpdatedForProject(projectId: string): Promise<void>;
}
```

- `EventsModule` (HTTP process, unchanged behavior) adds `{ provide: FEEDBACK_EVENTS_PUBLISHER, useExisting: EventsService }` to its providers/exports. `EventsService` already structurally satisfies the interface — no change to its implementation.
- New `apps/api/src/modules/events/redis-feedback-events-publisher.service.ts` (worker process only): looks up `project.teamId` via `TypeOrmModule.forFeature([Project])` (same query `EventsService` does today), then emits through an `Emitter` from `@socket.io/redis-emitter` connected to `REDIS_URL`. It publishes to the same Redis pub/sub channel that `@socket.io/redis-adapter` (already used by `RedisIoAdapter` in the HTTP process) subscribes to, targeting the same room (`team-${teamId}`) and event name (`feedbackUpdated`) — the client-side contract is unchanged.
- New `apps/api/src/worker-events.module.ts` (`WorkerEventsModule`, worker process only): provides `{ provide: FEEDBACK_EVENTS_PUBLISHER, useClass: RedisFeedbackEventsPublisher }` plus `TypeOrmModule.forFeature([Project])`.
- `AiProcessor` changes from `private readonly eventsService: EventsService` to `@Inject(FEEDBACK_EVENTS_PUBLISHER) private readonly eventsPublisher: FeedbackEventsPublisher`, call site becomes `this.eventsPublisher.emitFeedbackUpdatedForProject(...)`.

New dependency: `@socket.io/redis-emitter` (emit-only client for Socket.io's Redis adapter protocol; same major-version family as the already-used `@socket.io/redis-adapter@^8.3.0` / `socket.io@^4.8.3`).

No other call site of `EventsService.emitFeedbackUpdatedForProject` changes — `FeedbackService` (3 call sites) keeps injecting the concrete `EventsService` directly, since it only ever runs in the HTTP process.

## AiSweepService stays API-only

`AiSweepService` (`@Cron('*/5 * * * *')`) is currently a provider inside `AiModule`, alongside `AiProcessor`. It must not run in the worker process (PLAN.md's own note), and must not run twice if it did.

- Move `AiSweepService` out of `AiModule`'s `providers` into a new `apps/api/src/modules/ai/ai-sweep.module.ts` (`AiSweepModule`), importing `AiModule` (for the exported `AiQueueService`), `PlansModule`, `TypeOrmModule.forFeature([Feedback])`.
- `AppModule` imports `AiSweepModule` directly (next to `DigestModule`, the other cron-bearing module).
- `WorkerModule` imports only `AiModule`, never `AiSweepModule`.
- Belt-and-suspenders: `WorkerModule` also never imports `ScheduleModule`, so even if `AiSweepService` were accidentally pulled in, its `@Cron` decorator would have no `SchedulerRegistry` to register against.

`AiModule` itself shrinks to `AiService`, `AiProcessor`, `AiQueueService` (drop `AiSweepService` from its `providers`).

## Shared config, no duplication

`TypeOrmModule.forRoot(...)` and `BullModule.forRoot(...)` are inline in `app.module.ts` today. Extract:

- `apps/api/src/config/database.config.ts` — `getTypeOrmConfig(opts?: { migrationsRun?: boolean }): TypeOrmModuleOptions`, defaulting `migrationsRun: true` (today's behavior for `AppModule`). `WorkerModule` calls `getTypeOrmConfig({ migrationsRun: false })`.
- `apps/api/src/config/bull.config.ts` — `getBullConfig(): BullModuleOptions`, identical `connection.url` logic used by both.

**Why `migrationsRun: false` matters for the worker:** if both containers ran with `migrationsRun: true`, every deploy would race two processes attempting to run pending migrations concurrently. Only the API (HTTP) process runs migrations; the worker assumes the schema is already current.

`app.module.ts` switches its inline `TypeOrmModule.forRoot({...})` / `BullModule.forRoot({...})` to `TypeOrmModule.forRoot(getTypeOrmConfig())` / `BullModule.forRoot(getBullConfig())` — no behavior change for the API process.

## Deployment (`scripts/docker-run.sh`)

Second `docker run` block, same `$IMAGE`, no `-p` (no HTTP to expose):

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
```

Deliberately omitted env vars the worker never reads: `JWT_SECRET`, `FRONTEND_URL`, `GITHUB_*`/`GOOGLE_*` OAuth, `STRIPE_*`, `SES_FROM_EMAIL`, rate-limit tunables, `PORT`. `deploy-api.sh` needs no changes — it only builds/pushes the image; `docker-run.sh` (already the thing that starts both `redis` and `insightstream-api` containers) grows one more block, same pattern.

## Testing

- `ai.processor.spec.ts`: mock `FEEDBACK_EVENTS_PUBLISHER` token instead of the concrete `EventsService`.
- New `redis-feedback-events-publisher.service.spec.ts`: verify project lookup + `emitter.to(...).emit(...)` call shape (mock `@socket.io/redis-emitter`'s `Emitter`).
- New boot-verification test/step for `WorkerModule` (mirrors the self-healing-sweep boot check): `NestFactory.createApplicationContext(WorkerModule)` resolves without DI errors, and does not require a listening port.
- Existing `ai-sweep.service.spec.ts` moves conceptually under `AiSweepModule` but the spec file itself doesn't need to move — it tests the service in isolation already.

## Out of scope (deliberate)

- Migrating `docker-run.sh` to `docker-compose` — stays as direct `docker run` calls, matching existing prod convention.
- Health checks / process supervision beyond Docker's `--restart unless-stopped` (matches the existing `insightstream-api` container).
- Consolidating the app's 4 independent Redis connections (BullMQ, Socket.io adapter, `RedisService` cache, throttler storage) — out of scope for this item, unaffected by the split.
- Autoscaling or multiple worker replicas — one worker container, same as today's one API container.

## Files touched (expected)

- `apps/api/src/main.ts` — branch on `WORKER_MODE`
- `apps/api/src/worker.module.ts` — new
- `apps/api/src/worker-events.module.ts` — new
- `apps/api/src/modules/events/feedback-events-publisher.token.ts` — new
- `apps/api/src/modules/events/redis-feedback-events-publisher.service.ts` — new
- `apps/api/src/modules/events/events.module.ts` — add token binding
- `apps/api/src/modules/ai/ai.module.ts` — drop `AiSweepService`
- `apps/api/src/modules/ai/ai-sweep.module.ts` — new
- `apps/api/src/modules/ai/ai.processor.ts` — inject token instead of `EventsService`
- `apps/api/src/app.module.ts` — use shared config factories, import `AiSweepModule`
- `apps/api/src/config/database.config.ts` — new
- `apps/api/src/config/bull.config.ts` — new
- `apps/api/package.json` — add `@socket.io/redis-emitter`
- `scripts/docker-run.sh` — second container block
- `apps/api/src/modules/ai/ai.processor.spec.ts` — update mock
- `apps/api/src/modules/events/redis-feedback-events-publisher.service.spec.ts` — new
