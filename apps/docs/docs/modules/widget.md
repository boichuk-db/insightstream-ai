---
id: widget
title: apps/widget
sidebar_position: 3
---

# apps/widget

The embeddable feedback widget — the product's actual distribution surface. Vite build, Preact (not React), IIFE bundle, Shadow DOM style isolation.

Rewritten on Preact 2026-07-11 to hit a &lt;30 KB gzip budget: 42.4 KB raw / 12.9 KB gzip, down from a 380 KB / 122 KB gzip React bundle. Tailwind is still used internally — compiled and injected as inline `<style>` text inside the shadow root, so none of it leaks onto the host page.

Dev server runs on Vite's default port 5173 (`vite.config.ts` sets no `server.port` override) — not 8080.

:::warning Live footgun: silent fallback to a dead Railway URL
`App.tsx` resolves its API base URL as `window.InsightStreamConfig?.apiUrl || import.meta.env.VITE_API_URL || "https://api-production-05c4.up.railway.app"` — a legacy Railway host, not the current AWS ALB. Any embed that doesn't set `apiUrl` and wasn't built with `VITE_API_URL` silently points at a dead host instead of failing loudly. See [`PLAN.md`](https://github.com/boichuk-db/insightstream-ai/blob/main/docs/architecture/PLAN.md) 🔍 Analysis Backlog #3 (widget product audit) — that entry is scheduled "together with the 🔥 #8 widget cycle," which is now done, so it's due for a look.
:::

## Deployment

Served from S3 (`insightstream-widget` bucket, `eu-north-1`) at a **versioned** URL — `v1/widget.js` (major-version-only; a future breaking change ships under `v2/widget.js`, `v1` stays frozen). Deployed via `scripts/deploy-widget.sh` (build → upload `apps/widget/dist/widget.iife.js` → verify GET returns 200 + a JS content-type). Deploy is manual by design, not automated in CI. CloudFront in front of S3 is planned but still blocked by the AWS new-account verification gate (see [AWS Infrastructure](../architecture/aws-infra)). Rollback is git-based — there's no immutable per-build history in S3, so a bad deploy is fixed by checking out the last known-good commit and re-running the script.

## Structure (`apps/widget/src/`)

- `App.tsx` — the whole widget UI (trigger → panel → form → success), Preact function component, plain CSS transitions/keyframes (no framer-motion — dropped in the Preact rewrite; `index.css` and inline comments in `App.tsx` call this out explicitly).
- `icons.tsx` — 5 hand-copied inline SVGs (path data from `lucide-react`, ISC-licensed) instead of pulling in `preact/compat` + the React-targeted icon package: `MessageSquareIcon`, `SendIcon`, `XIcon`, `CheckCircleIcon`, `SparklesIcon`.
- `main.tsx` — mount entry point. Creates a host `<div id="insight-stream-widget-root">`, attaches an **open-mode** Shadow DOM to it (open so host-page devtools and the Playwright e2e suite can reach inside), injects the compiled CSS (via Vite's `?inline` import) as a `<style>` tag inside the shadow root, then renders `<App />` into a container inside the shadow root.
- `index.css` — Tailwind entry, compiled and shipped as a string (not a stylesheet link) for the Shadow DOM injection above.

## Integration contract

POSTs `{apiKey, content, source: "Widget"}` to `POST /feedback/public` on `apps/api`'s `feedback` module (`FeedbackPublicController`, validated by `CreatePublicFeedbackDto`: `apiKey`/`content` required, `content` capped at 5000 chars, `source` optional and capped at 50 chars). Rate-limited per-IP (20/min, default `WIDGET_IP_LIMIT`) and per-project (300/min, default `WIDGET_PROJECT_LIMIT`) by `WidgetThrottlerGuard`, which fails open (allows the request) if the Redis throttler storage is unavailable. The controller also enforces per-project origin whitelisting: if the project has a `domain` set, the request's `Origin` header must match that domain (or a subdomain, or `localhost`/`127.0.0.1`) or it's rejected with 403.

## Where to look

- `apps/widget/src/App.tsx:68-71` — the API-base-URL fallback chain (see the warning above).
- `apps/widget/vite.config.ts` — no `server.port` override, hence the Vite default of 5173.
- `scripts/deploy-widget.sh` — the build → S3 upload → verify flow.
- `apps/api/src/modules/feedback/feedback.public.controller.ts` + `dto/create-public-feedback.dto.ts` — the public submission contract.
- `apps/api/src/guards/widget-throttler.guard.ts` — the per-IP/per-project rate limits and fail-open behavior.
