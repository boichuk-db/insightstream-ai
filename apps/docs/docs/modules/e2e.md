---
id: e2e
title: apps/e2e
sidebar_position: 5
---

# apps/e2e

Playwright end-to-end suite. No dev server (`next dev`) of its own — `playwright.config.ts`'s `webServer` array starts `pnpm --filter api start` and `pnpm --filter web start` (production builds, not dev mode) against `http://localhost:3001`/`:3000` if nothing is already listening there. Locally (`reuseExistingServer: !process.env.CI`) it happily reuses servers you already have running; in CI it always starts fresh, against apps built earlier in the same job.

## Coverage (`apps/e2e/tests/`)

- `auth/` — login, register, forgot-password.
- `dashboard/` — activity feed, feedback view.
- `invite/` — accept-invite flow.
- `teams/` — two pure API-level authorization suites (no UI): `team-scoped-plans.spec.ts` (plan status requires team membership; `/plans/checkout` is owner-only) and `project-delete-authz.spec.ts` (only an ADMIN-role member — i.e. the owner — can delete a project; a plain MEMBER gets 403). Neither is a functional test of the checkout flow itself.
- `widget/` — a real widget-submission round trip (open → fill → submit → success), driving the actual built widget IIFE, not a mock.

**No billing-flow coverage**: nothing exercises checkout → Stripe webhook → plan change end-to-end. See [`PLAN.md`](https://github.com/boichuk-db/insightstream-ai/blob/main/docs/architecture/PLAN.md) 🔍 Analysis Backlog #2 (web test pyramid), which calls this out explicitly and proposes adding a billing e2e happy path.

## Running locally

Needs the docker-compose Postgres/Redis stack up (`docker compose up -d` — ports 5432/6379, matching the `webServer` env defaults in `playwright.config.ts`), and `apps/web` **built** with `NEXT_PUBLIC_API_URL=http://localhost:3001` — this value is inlined into the client bundle at Next.js build time, not read at runtime, so a `pnpm build` without it (or with a stale build) will silently point the browser at the wrong API. `global-setup.ts` then seeds a test user/team/project directly against the running API before any spec runs, and saves an authenticated `storageState` for reuse across tests.

:::note
This build-time constraint is the same one noted in [`PLAN.md`](https://github.com/boichuk-db/insightstream-ai/blob/main/docs/architecture/PLAN.md) ✔ #7 deferred follow-ups ("local e2e envs: web must be built with `NEXT_PUBLIC_API_URL=http://localhost:3001`").
:::

## CI (`.github/workflows/main.yml`, `e2e` job)

Runs after `ci`/`test` pass. Spins up fresh `postgres:15` and `redis:7-alpine` service containers, installs deps, runs `pnpm build` (with `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WIDGET_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_LANDING_URL` all set for the build), then explicitly runs `pnpm --filter api migration:run` against the fresh Postgres container **before** installing Playwright browsers and running `pnpm --filter e2e test`. Playwright report is uploaded as a build artifact on every run (`if: always()`).

## Where to look

- `apps/e2e/playwright.config.ts` — the `webServer` array (how api/web get started), baseURL, single-worker/no-parallel config.
- `apps/e2e/global-setup.ts` — test user/team/project seeding and the `storageState` auth bootstrap.
- `apps/e2e/fixtures/test-fixtures.ts` — shared Playwright fixtures (e.g. the widget page object used by `widget/submit-feedback.spec.ts`).
- `.github/workflows/main.yml` — the `e2e` job (service containers, build env, migration step).
