---
id: timeline
title: Timeline
sidebar_position: 6
---

# Timeline

The project's "big rocks" from the first commit to today — what changed, and why, sourced from `git log` and the design specs under `docs/superpowers/specs/`. This is not a full changelog (see `git log` for that) — it's the handful of decisions that shaped the architecture.

## 2026-03-23 — Bootstrap

Monorepo scaffolded (`064e74d`, `feat(init): bootstrap monorepo infrastructure and core api`) — the pnpm/Turbo workspace and the first version of the NestJS API.

## 2026-03-24 to 2026-03-25 — MVP feature buildout, first deploy

In two days: the Gemini AI analysis pipeline and the embeddable widget, multi-project support with domain whitelisting, and a real-time Kanban board over Socket.io. Then the first production deploy — on **Railway (API) + Vercel (Web) + Supabase (Postgres)**, chosen purely for their free tiers (`59afced`, `feat: prepare for free-tier cloud deployment (Vercel + Railway + Supabase)`). This was the stack for the next three months.

## 2026-03-27 — Auth and monitoring

Google/GitHub OAuth and password-reset added alongside the original email/password auth; Sentry wired into both API and Web the same week. See [Authentication Flow](./architecture/auth-flow).

## 2026-04-08 — Async AI processing

BullMQ + Redis introduced to decouple the (slow, rate-limited) Gemini API call from the feedback-submission request/response cycle — the same queue this project still uses today (see [Request Lifecycle](./architecture/request-lifecycle)). `WidgetThrottlerGuard` (per-IP + per-project rate limiting) shipped the same week.

## 2026-04-09 to 2026-04-10 — E2E suite established

The Playwright end-to-end suite (`apps/e2e`) started here: page objects, auth flow tests, widget-embed tests, CI wiring with a Redis service container.

## 2026-04-15 and 2026-05-14 — Landing page and analytics

`apps/landing` was scaffolded and built out in two pushes: the interactive plan-recommendation quiz and a PostHog provider on 2026-04-15, then the full marketing page (Hero, Pricing, Testimonials, Footer, SEO/sitemap/JSON-LD) and PostHog event tracking on the dashboard (`apps/web`) on 2026-05-14. This is also where `apps/landing`'s standing rule — zero `@insightstream/*` workspace dependencies, fully decoupled from the app/API packages — originates. See [apps/landing](./modules/landing).

## 2026-06-24 — The decision to migrate to AWS

`docs/superpowers/specs/2026-06-24-aws-migration-design.md` states the reason plainly: **"Learning hands-on AWS experience for career/portfolio. Zero AWS experience prior to this migration."** Not a cost or reliability complaint about Railway/Vercel/Supabase — a deliberate choice to trade managed-platform convenience for hands-on infrastructure experience, scoped to stay within the AWS Free Tier. The design mapped 18 AWS services against the existing stack (EC2 for Railway, RDS for Supabase, Amplify for Vercel, SES for SMTP, SSM for Doppler, and so on) and picked an **EC2-centric** approach (over more managed alternatives) specifically because EC2 teaches more (servers, SSH, Security Groups) — that same "EC2/BullMQ/Socket.io/the migration itself are deliberate learning choices" reasoning was later written into `docs/architecture/PLAN.md`'s Project Constraints as a standing rule for the whole project, not just this one decision.

## 2026-06-25 to 2026-06-30 — AWS infrastructure stood up

EC2 deploy scripts, RDS with SSL, the Amplify build config, and the early SQS/SES/Lambda/CodeBuild groundwork landed within a week. An ALB + ACM (for HTTPS) and AWS Budget guardrails followed on 06-30 (`1797971`) — the budget alarm was added *before* any real production traffic, not after a cost scare.

## 2026-06-29 — Stripe billing

Checkout, subscriptions, a 14-day trial, and the billing dashboard shipped as one push (`d7db03b` and the surrounding commits) — the first monetization surface in the product. A security fix landed the same day removing a `PATCH /plans/upgrade` endpoint that bypassed Stripe entirely (`3e798e3`).

## 2026-07-03 — Resilience pass

Two reliability fixes on the same day: the duplicate digest scheduler was removed (single `@Cron` source of truth) and the self-healing AI sweep shipped (`AiSweepService`, re-enqueues feedback whose AI analysis never completed). See `docs/architecture/PLAN.md` ✔#1 and ✔#4 for the full detail already documented there.

## 2026-07-04 to 2026-07-05 — Team as Tenant

The billing tenant moved from an ambiguous `User`/`Project` split to `Team` — the single biggest structural change in the project's history. Billing columns, plan limits, and WebSocket rooms all moved to be team-scoped; verified live in production 2026-07-05 (`287c7f9`). See the [Database ER Diagram](./architecture/er-diagram) for the resulting entity model and `docs/architecture/PLAN.md` ✔#7 for the full reasoning (including what turned out to be stale premises in the original problem statement).

## 2026-07-06 — Amplify live, JWT caching, a real billing bug closed

`apps/web` went live on AWS Amplify running in parallel with Vercel (cutover still pending — see [Ops](./ops)). The same day: a Redis read-through cache for `JwtStrategy.validate()` (the hottest query in the system) shipped, and a real double-billing bug — reproduced live, not hypothetical — was closed with a checkout guard against duplicate active subscriptions.

## 2026-07-09 — Widget versioning, worker process split

`apps/widget`'s S3 URL became versioned (`v1/widget.js`) so a future breaking change won't instantly break every live customer integration. `main.ts` gained its `WORKER_MODE` branch the same day, splitting AI job processing into its own container so sustained AI load can no longer throttle the HTTP API — see [apps/api](./modules/api) and [Request Lifecycle](./architecture/request-lifecycle).

## 2026-07-10 to 2026-07-11 — UI consolidation

A P0/P1 design pass (color contrast, feed hierarchy, navigation consistency) followed by a two-phase component-library consolidation — collapsing 4-5 duplicate implementations of common UI patterns (modals, popovers, tabs, status pickers) into one library under `apps/web/src/components/ui/`.

## 2026-07-11 — Widget rewritten on Preact

`apps/widget` dropped React entirely in favor of Preact, cutting the shipped IIFE bundle from 380 KB (122 KB gzip) to 42.4 KB (12.9 KB gzip) — the widget is the part of the product that runs on *other people's* websites, so its weight is a direct cost to every customer's page-speed score. See [apps/widget](./modules/widget).

## 2026-07-12 — Documentation actualization

This site. `README.md`, `DEPLOYMENT.md`, and `system-architecture.drawio` had all drifted from the stack described above (mid-2026-03 Railway/Vercel/Supabase language was still the *primary* description of the project as late as this date) — see `docs/architecture/PLAN.md` for the roadmap item this closed.
