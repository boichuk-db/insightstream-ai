---
id: api
title: apps/api
sidebar_position: 1
---

# apps/api

NestJS 11 backend. REST + WebSockets (Socket.io). Port 3001. Runs in two process modes from the same codebase, branched in `main.ts` on `WORKER_MODE=1`:

- **HTTP mode** (default): full Nest app (`AppModule`) — REST controllers, Socket.io gateway, `@Cron` schedulers (AI self-healing sweep, weekly digest).
- **Worker mode**: `WorkerModule` only — no HTTP, no Socket.io server, no `ScheduleModule`. Runs the BullMQ `AiProcessor` consumer (via `AiWorkerModule`), emitting realtime updates through a Redis-emitter relay (`WorkerEventsModule` → `RedisFeedbackEventsPublisher`) instead of a direct Socket.io server. Deployed as a second container (`insightstream-worker`) alongside `insightstream-api`.

## Domain modules (`apps/api/src/modules/`)

- **auth** — JWT (password + Google/GitHub OAuth), 7-day stateless token, no refresh/no server-side logout. `JwtStrategy.validate()` is read-through cached in Redis (TTL 30s, fail-open — cache reads/writes are wrapped so a Redis error just falls through to a DB lookup instead of failing the request).
- **teams** — the billing tenant (not `User`, not `Project`). `ensurePersonalTeam()` lazily backfills a personal team for every user.
- **users** / **invitations** — user CRUD, team invite flow (role-gated).
- **projects** — the thing the widget posts feedback into; `teamId` required, access is membership-only.
- **feedback** — public submission endpoint (throttled, API-key + origin checked) plus the authenticated dashboard CRUD/Kanban surface.
- **ai** — Gemini-backed sentiment/category/summary analysis. `AiModule` holds the shared `AiService`/`AiQueueService`; `AiWorkerModule` (worker-only) adds the `AiProcessor` consumer; `AiSweepModule` (HTTP-only, its own module per the architecture plan) adds `AiSweepService`, a `@Cron` job every 5 minutes that re-enqueues feedback stuck with `sentimentScore IS NULL` for 15min-24h.
- **comments** / **activity** — nested comment threads and the team activity feed.
- **stripe** — Checkout/webhooks/Customer Portal. Webhook dedup via a `StripeEvent` log (Stripe event id as PK — a retry conflicts on insert and is skipped); ordering via an atomic conditional `UPDATE ... WHERE "lastStripeEventAt" IS NULL OR <= eventCreatedAt`. Guards against a team starting a second concurrent subscription.
- **digest** — weekly AI summary email, scheduled in-process via `@Cron('0 9 * * 1')` (HTTP-mode only).
- **mail** — SMTP/Nodemailer wrapper, imported by `digest` and `invitations`.
- **events** — the Socket.io gateway (`EventsModule`, HTTP-mode only); clients join `user-{id}` and `team-{id}` rooms, and dashboards receive feedback updates via a `team-{id}` broadcast.
- **plans** — `PLAN_CONFIGS` + `PlanLimitsService`, the single source of plan/limit truth; a team's effective plan degrades to `FREE` when its subscription is `past_due`/`canceled`.

## Where to look

- `apps/api/src/app.module.ts` — the HTTP-mode module graph.
- `apps/api/src/worker.module.ts` — the worker-mode module graph (deliberately smaller: `AiWorkerModule` + `WorkerEventsModule` only, no `ScheduleModule`).
- `apps/api/src/redis/` — the shared `RedisService` (JWT cache; BullMQ and the Socket.io adapter each have their own separate Redis clients).
- `apps/api/src/data-source.ts` — TypeORM migration data source; **new entities must be added here too**, or `migration:generate` silently misses them (`synchronize` masks this everywhere except prod).
