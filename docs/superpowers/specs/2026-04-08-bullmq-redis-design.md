# BullMQ + Redis: Async AI Analysis Queue

**Date:** 2026-04-08  
**Status:** Approved

## Problem

AI analysis (Gemini) in `feedback.service.ts` has two issues:
1. `create` flow uses fire-and-forget `.then()` — no retry on Gemini failure, jobs lost on restart
2. `reanalyze` flow is synchronous — user waits for Gemini in HTTP request

## Solution

BullMQ queue backed by Redis. API enqueues jobs instantly, a worker processes them with retry logic.

## Architecture

### New files

```
apps/api/src/modules/ai/
  ai.processor.ts       — BullMQ worker: processes jobs, calls Gemini, updates DB
  ai-queue.service.ts   — facade: addAnalysisJob() used by FeedbackService
```

### Modified files

```
apps/api/src/modules/ai/ai.module.ts      — register BullMQ queue
apps/api/src/modules/feedback/feedback.service.ts — replace .then() and reanalyze() with queue
apps/api/src/app.module.ts                — register BullMQModule with Redis connection
```

### New dependency

```
@nestjs/bullmq, bullmq
```

## Job Schema

**Name:** `analyze-feedback`

**Data:**
```typescript
{
  feedbackId: string
  content: string
  projectId: string
  ownerId: string       // for emitFeedbackUpdated after completion
  aiLevel: 'basic' | 'full'
}
```

**Options:**
```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  // retries: 5s → 10s → 20s
  removeOnComplete: { age: 3600 },   // keep 1h
  removeOnFail: { age: 86400 },      // keep 24h for debug
}
```

## Priority

| Trigger | Priority |
|---|---|
| `reanalyze` (user-initiated) | 1 (high) |
| `create` (widget/API) | 10 (low) |

## Worker Configuration

- `concurrency: 3` — max 3 parallel Gemini requests
- Same NestJS process as API (not a separate service)

## Error Handling

- After 3 failed attempts → job moves to `failed` state in Redis (kept 24h)
- Feedback remains in DB without AI fields — no user-facing error
- Each failure logged via `Logger.error` → captured by Sentry

## Redis

- Local: Docker (`redis:7-alpine`, port 6379) — already in docker-compose.yml
- Production: separate Railway Redis service, `REDIS_URL` env var

## Out of Scope

- Dead letter queue
- Bull Board admin UI
- Webhook on failure
- Job status endpoint (`GET /feedback/:id/ai-status`)
