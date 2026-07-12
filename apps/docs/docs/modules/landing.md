---
id: landing
title: apps/landing
sidebar_position: 4
---

# apps/landing

Marketing/landing page. Next.js 16, port 3002, deployed on Vercel. Deliberately **zero `@insightstream/*` dependencies** (confirmed in `apps/landing/package.json`) — fully decoupled from the app/API workspace packages.

## Routes (`apps/landing/src/app/`)

Only two real pages — confirmed by `sitemap.ts`, which lists exactly these two URLs:

- `/` (`page.tsx`) — the marketing homepage: `Hero`, `Trust`, `Problem`, `Solution`, `Features`, `Pricing`, `QuizCta`, `Testimonials`, `Footer` sections.
- `/quiz` — the interactive plan-recommendation quiz.

`robots.ts` and `sitemap.ts` are the only other routes, both metadata-only.

### CTAs and the app boundary

Every "get started" CTA is a plain `<a href>` to `${APP_URL}/` (`apps/landing/src/lib/constants.ts`, defaulting to `https://app.insightstream.ai`) — landing never imports app/API code, it just links out to it:

- Hero primary CTA links to `${APP_URL}/`. Its label is **A/B tested** via a PostHog feature flag (`landing-hero-cta`, `useFeatureFlagVariantKey`): "Start Free" (control) vs. "Try for Free — No Card Needed" (variant-b). The headline itself (`landing-hero-headline`) is separately A/B tested.
- Hero secondary CTA ("Find my plan →") and the footer "Quiz" link go to `/quiz`.
- Pricing section CTA is "Get Started Free" for the free plan, **"Start 14-day Trial"** for paid plans — both link to `${APP_URL}/?plan={planType}`.
- Quiz result screen (`QuizResult.tsx`) links to `${APP_URL}/?plan={recommendation}` — same pattern. The `plan` query param is UI pre-selection only, not server-enforced; actual plan assignment happens at signup/checkout in `apps/web`/`apps/api`.

## Note

The footer "Pricing" link (`Footer.tsx`) currently points at `${APP_URL}/dashboard/billing` — a login-gated dashboard route, not a public pricing page. This is a known, deliberately deferred product decision — see [`PLAN.md`](https://github.com/boichuk-db/insightstream-ai/blob/main/docs/architecture/PLAN.md) ✔ #7 ("Team as Tenant") deferred follow-ups.

PostHog (`posthog-js` + `posthog-js/react`) is wired in for more than pageview analytics: `PostHogProvider.tsx` initializes it (EU host by default, session recording with `maskAllInputs: true`, autocapture on), and it also drives the two Hero A/B tests above and the `quiz_started` / `quiz_step_completed` / `quiz_completed` funnel events fired from `quiz/page.tsx`.

## Where to look

- `apps/landing/src/lib/constants.ts` — `APP_URL` resolution (`NEXT_PUBLIC_APP_URL` env var, falls back to the production app URL).
- `apps/landing/src/components/sections/Hero.tsx` — the two PostHog-driven A/B tests.
- `apps/landing/src/components/sections/Footer.tsx` — the login-gated pricing link.
- `apps/landing/src/components/quiz/QuizResult.tsx` + `apps/landing/src/lib/quiz.utils.ts` (`recommendPlan`) — quiz scoring and the `?plan=` handoff to the app.
- `apps/landing/src/components/providers/PostHogProvider.tsx` — PostHog init, gracefully no-ops if `NEXT_PUBLIC_POSTHOG_KEY` is unset.
