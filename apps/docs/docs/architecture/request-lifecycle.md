---
id: request-lifecycle
title: Request Lifecycle
sidebar_position: 3
---

# Request Lifecycle

![Request Lifecycle](/img/diagrams/request-lifecycle.svg)

The verified path from feedback submission to realtime dashboard update, in 10 numbered steps: (1) the widget submits feedback, (2) `FeedbackPublicController` checks throttle, API key, and origin, (3) `CreatePublicFeedbackDto` validates via the global `ValidationPipe` (content ≤5000 chars), (4) the feedback is saved to PostgreSQL synchronously, (5) a BullMQ job is enqueued on the `ai-analysis` queue if the plan allows AI, (6) `AiProcessor` — running in a separate `WORKER_MODE` process — picks up the job, (7) it calls the Gemini API (`gemini-2.5-flash`), (8) writes the AI result back to PostgreSQL, (9) a Redis-emitter triggers a Socket.io `feedbackUpdated` emit to room `team-{teamId}` — also running in the `WORKER_MODE` process, and (10) the dashboard (`apps/web`) applies the realtime update over WebSocket. Steps 1-5 are synchronous HTTP request/response (the widget gets its 200 OK there); steps 6-10 happen asynchronously after the response has already returned. A separate weekly digest is scheduled in-process via `@Cron` (Mon 09:00), unrelated to end-user feedback submission.
