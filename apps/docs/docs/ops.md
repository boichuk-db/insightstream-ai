---
id: ops
title: Ops
sidebar_position: 4
---

# Ops

## Local dev secrets

Local `.env` values are sourced via [Doppler](https://doppler.com) (`doppler.yaml` → project `insightstream-ai`, config `dev`). Root `pnpm dev` runs `doppler run -- turbo dev` — you need `doppler login` once, and the Doppler CLI installed, before `pnpm dev` will work.

## Production deployment

| App | Platform | Trigger |
|---|---|---|
| API | AWS EC2 (behind an ALB) | Manual today — `scripts/deploy-api.sh`: local `docker build` → push to ECR → sync deploy scripts to EC2 over `scp` → SSH runs `docker-run.sh`, which pulls `:latest` and restarts **two** containers on the same instance (`insightstream-api` for HTTP/WS, `insightstream-worker` with `WORKER_MODE=1` for the BullMQ AI queue) plus a shared `redis` container. The script then verifies the deploy itself (health check + a removed-endpoint check). CodeBuild automation is provisioned (quota unblocked 2026-07-05) but not yet wired up — see [Deployment Pipeline](./architecture/deploy-pipeline). |
| Web | Vercel (live) + AWS Amplify (parallel run, cutover pending) | Push to `main` on both |
| Widget | S3 (`v1/widget.js`) | `scripts/deploy-widget.sh`: builds `apps/widget`, uploads `dist/widget.iife.js` to `s3://insightstream-widget/v1/widget.js`, verifies the object is live with the right content-type |

Database: AWS RDS PostgreSQL, private subnet, SSL required, migrated from Supabase 2026-06-30 (old Supabase project still exists, not decommissioned). A timed restore drill (`PLAN.md` #10) ran 2026-07-11: restored the latest automated snapshot to a throwaway instance, RTO **7m17s**, data verified matching prod row-for-row. The drill also confirmed the real gap — backup retention is **1 day** and the instance is **not Multi-AZ**, so worst-case RPO once real customer traffic exists is "time since last nightly snapshot" (up to ~24h), not the near-zero gap the drill happened to observe. Retention window is still unaddressed — see `PLAN.md` #10 before relying on this for real customer data.

## Secrets (names only — see SSM Parameter Store / Doppler for values)

API container (`docker-run.sh`, sourced from SSM `/insightstream/prod/*` via `ssm-env.sh`): `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE`, `JWT_SECRET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`, `AWS_REGION`, `SES_FROM_EMAIL`, `FRONTEND_URL` (comma-separated — Vercel + Amplify, during the parallel-run window), `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/4 price IDs. Worker container gets a subset (`DB_*`, `GEMINI_API_KEY`, `REDIS_URL`) — no HTTP-only vars.

Web (Vercel + Amplify env vars, `NEXT_PUBLIC_*`): API URL, widget URL, `NEXT_PUBLIC_SENTRY_DSN`, 4 Stripe price IDs.

Note: email is **AWS SES** (`SES_FROM_EMAIL` + `AWS_REGION`, `apps/api/src/modules/mail/mail.service.ts`), not SMTP — `apps/api/README.md`'s documented `SMTP_*` vars are unused by any code path and stale.

## Known operational gaps

- No graceful shutdown (`app.enableShutdownHooks()`) anywhere in `apps/api` — a `docker stop` on redeploy sends `SIGTERM` then `SIGKILL` with no drain period, hard-killing an in-flight AI job instead of draining it (bounded by the self-healing AI sweep re-enqueueing it later).
- Neither the `insightstream-api` nor the `insightstream-worker` container receives `SENTRY_DSN` via `docker-run.sh`'s `-e` flags — crash loops in either process are invisible to Sentry, visible only via `docker logs`/restart counts.
- SES is still in sandbox (200 emails/24h, 1/sec). Production access was requested 2026-07-11 (AWS case opened, responded same-day); AWS explicitly recommended a verified domain identity over per-address verification. Deliberately parked — no domain purchased yet, and replying without one risks a straight rejection.
- ACM certificate + HTTPS listener on the ALB is blocked for the same reason (no domain owned) — but is also likely redundant once unblocked, since `insightstream-api-proxy` (API Gateway) already gives the API free HTTPS and is what both Vercel and Amplify prod use.

Full detail and the reasoning behind every item above lives in [`PLAN.md`](https://github.com/boichuk-db/insightstream-ai/blob/main/docs/architecture/PLAN.md) — this page is a summary, not a substitute.
