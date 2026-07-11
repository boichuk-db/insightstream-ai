---
id: full-arch
title: Full Architecture
sidebar_position: 1
---

# Full Architecture

![Full Architecture](/img/diagrams/full-arch.svg)

Monorepo + runtime + external services in one view: the three frontends (`apps/web`, `apps/widget`, `apps/landing`), the NestJS API's six modules (Auth, Feedback, Billing, AI/BullMQ worker, Digest, Events Gateway), the two compile-time-only shared packages (`@insightstream/database`, `@insightstream/shared-types` — plus `packages/config` for build-time ESLint/TS only), the data layer (PostgreSQL, Redis), and the external services each module talks to (Google/GitHub OAuth, Stripe, Google Gemini). Cross-cutting CI/CD (GitHub Actions) and monitoring (Sentry) apply across web+api+widget. See [Request Lifecycle](./request-lifecycle) for the verified per-feedback data flow.
