# Self-healing AI sweep — Design

> Date: 2026-07-03
> Roadmap item: `docs/architecture/PLAN.md` → 🔥 Implement Soon #4
> Type: resilience

## Problem

Pending AI-analysis jobs live only in Redis, a container on the same EC2 instance
as the API. If the instance is lost or the process crashes, in-flight jobs vanish
and the affected feedback is **never** analyzed — `sentimentScore` stays `NULL`
forever, silently. The current queue has retries (`attempts: 3`) but no recovery
for jobs that disappear entirely with Redis, nor for jobs that exhaust their
retries and sit in the failed set.

## Goal

A periodic sweep that re-enqueues feedback whose analysis never landed. Idempotent
by nature, it covers every loss mode at once (crash, instance loss, exhausted
retries), making a dedicated DLQ and queue-durability work unnecessary at this
stage (see PLAN ⛔ "Standalone Dead Letter Queue — subsumed by the self-healing
sweep").

## Decisions (locked)

- **Give-up policy: 24h window.** The sweep only re-enqueues feedback created
  within the last 24h. A `NULL`-sentiment row older than 24h is declared
  *abandoned* — logged, not retried. This bounds the cost of a poison message
  (Gemini deterministically returning `null` for some content) **without a new
  column** — it is purely a range in the `WHERE` clause.
- **No jobId dedup needed.** The retry window of a normal job is ~3 attempts ×
  5s exponential backoff ≈ 35s. A feedback still `NULL` and older than the 15-min
  age threshold therefore has **no** active or waiting job — it either completed
  (→ not `NULL`, excluded) or failed terminally (→ in the failed set, no live
  job). So re-enqueue cannot collide with a live job; a duplicate analysis would
  in any case be harmless (it overwrites the same row).
- **`aiLevel: 'none'` is skipped** even though it is currently unreachable (FREE
  plan is `aiAnalysis: 'basic'`). Kept for resilience against a future plan-config
  change, mirroring `FeedbackService.create`.

## Architecture

New `AiSweepService` in `apps/api/src/modules/ai/ai-sweep.service.ts`, registered
in `AiModule`. `ScheduleModule` is already bootstrapped app-wide (the digest cron
uses it).

```
@Cron('*/5 * * * *', { name: 'ai-sweep' })   // every 5 minutes
```

### Sweep query (single DB round-trip + batch cap)

```
SELECT feedback + feedback.project.userId
WHERE  sentimentScore IS NULL
  AND  createdAt <  now() - 15 min   -- guarantees no live job
  AND  createdAt >  now() - 24 h     -- give-up window
ORDER BY createdAt ASC
LIMIT 100                            -- ceiling per run; no re-enqueue storm
```

A separate cheap `COUNT` of `sentimentScore IS NULL AND createdAt <= now() - 24h`
is logged as `WARN: N feedback abandoned (never analyzed)` for observability —
loss is surfaced, not silent.

### Per-row logic

For each candidate, reconstruct `AnalysisJobData`:

- `feedbackId`, `content`, `projectId` — from the row.
- `ownerId` — `feedback.project.userId`.
- `aiLevel` — via `PlanLimitsService.getLimits(getUserPlan(ownerId)).aiAnalysis`,
  with a **per-run `Map<ownerId, PlanType>` cache** so `users` is read once per
  owner, not once per feedback.

If `aiLevel === 'none'` → skip. Otherwise call the existing
`AiQueueService.addAnalysisJob(data, 10)`.

## Data flow

```
@Cron (every 5m, API process)
  └─ AiSweepService.sweep()
       ├─ query NULL-sentiment feedback in (15m, 24h) window, LIMIT 100
       ├─ COUNT + WARN abandoned (> 24h)
       └─ for each: resolve aiLevel (cached) → AiQueueService.addAnalysisJob
                                                     │
                                            (existing) AiProcessor.process
                                                     └─ Gemini → write-back → WS emit
```

## Error handling

- The whole `sweep()` body is wrapped so one bad row / lookup cannot abort the
  run; per-row failures are logged and the loop continues.
- `addAnalysisJob` failures (Redis down) are logged; the next tick retries — the
  sweep is self-correcting by design.

## Testing (TDD)

Unit tests for `AiSweepService` with mocked `feedbackRepository`,
`AiQueueService`, `PlanLimitsService`:

1. `NULL` in-window → `addAnalysisJob` called with correctly reconstructed data.
2. `NULL` older than 24h → **not** enqueued; counted/logged as abandoned.
3. Fresher than 15 min → not selected (query boundary).
4. `aiLevel: 'none'` → skipped, not enqueued.
5. Plan cache — multiple feedback for one owner triggers a single `getUserPlan`.

## Out of scope / follow-ups

- **Duplicated enqueue logic.** "Compute `aiLevel` + enqueue" now exists in three
  places (`FeedbackService.create`, `FeedbackService.reanalyze`, sweep). Extracting
  a shared helper is deliberately **not** part of this task — flagged for a later
  cleanup.
- **Worker split (PLAN 🔥 #5) dependency.** The sweep is a *producer* and must run
  in the API process. When the queue consumer is split into a `WORKER_MODE`
  container, the `ai-sweep` cron must **not** boot in worker mode (otherwise two
  processes sweep). Record this in the #5 design.
- **Poison-message hard cap via a column** (`aiAttempts`) — rejected now as
  disproportionate (constraint #3); the 24h window bounds cost without schema
  change. Revisit only if abandoned counts become material.
