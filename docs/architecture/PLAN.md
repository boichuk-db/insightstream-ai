# InsightStream AI — Architecture Plan (Living Document)

> Last updated: **2026-07-06**
> This is the single source of truth for architecture decisions and roadmap. `system-architecture.drawio` holds diagrams only — this file holds the reasoning, priorities and status.
>
> **Update rule:** any change that alters the architecture (new module, new infra piece, a completed roadmap item, a decision reversed) updates this file in the same PR, and bumps the date above. Tasks for future work are pulled from this plan, not invented ad hoc.
>
> **AWS verification note (2026-07-05):** the new-account verification gate is confirmed lifted for CodeBuild, Amplify, and Bedrock (real API calls succeeded — see 🔥 #11 and the `AIProvider` row in 🟡). CloudFront (`CreateDistribution`) is still blocked with the same error as before — the gate is per-service, not account-wide.

## Project Constraints

The filter every roadmap item must pass:

1. **Infrastructure cost as close to zero as possible** (free tier where feasible).
2. **Learning modern backend/cloud architecture hands-on is a first-class goal.** EC2 (not Fargate), BullMQ, Socket.io, and the AWS migration itself are **deliberate learning choices** — not oversights to optimize away. Each item below that names one of these carries its graduation trigger instead of a "replace with managed service" recommendation.
3. **No enterprise complexity before it pays for itself.**
4. **An item enters 🔥 Implement Soon only if it fixes a real, current problem.** Everything else goes to 🟡 Future with an explicit adoption trigger.

## Status Legend

| Symbol | Meaning |
|---|---|
| ✔ | Done — implemented and verified in code |
| 🔥 | Implement Soon — high ROI at the current stage |
| 🟡 | Future — adopt only when its named trigger fires |
| 🎓 | Learning experiment — intentionally non-optimal tech, kept for its learning value |
| 🏭 | Production recommendation — what a revenue-stage product would do |
| ⛔ | Retired — recommendation from an earlier review, dropped with reason |

---

## ✔ Completed

Previously recommended or already existed — do not re-recommend these.

- **Global `ValidationPipe` + DTOs** on feedback/auth/comments (commit `326914e`) — public feedback content capped at 5000 chars.
- **`WidgetThrottlerGuard`** — per-IP (20/min) + per-project (300/min) rate limits on the public endpoint.
- **Redis Socket.io adapter + user rooms** — realtime is already horizontally scalable.
- **Centralized plan rules** — `PLAN_CONFIGS` + `PlanLimitsService` as the single source of plan truth.
- **Widget Shadow DOM style isolation** — no Tailwind preflight leaking into host pages.
- **Security baseline** — private RDS + layered Security Groups, secrets in SSM, CloudWatch alarms + SNS + Budgets.
- **Stripe webhook idempotency + ordering** (2026-07-03) — new `StripeEvent` log (event id PK) dedups retries/replays; new nullable `users.lastStripeEventAt` stamp + an atomic conditional `UPDATE … WHERE "lastStripeEventAt" IS NULL OR "lastStripeEventAt" <= :eventCreated` in every subscription handler ignores stale/out-of-order events (no more resurrecting a canceled plan). Dispatch centralized in `StripeWebhookService.handleEvent`. Seeds the future subscription-history table. Migration `1774840000000` (column added nullable — NOT NULL breaks dev `synchronize` on the populated `users` table).
- **Self-healing AI sweep** (2026-07-03) — `AiSweepService` `@Cron('*/5 * * * *')` re-enqueues `sentimentScore IS NULL` feedback in the (15 min, 24 h) window through the existing `AiQueueService`; rows still null past 24 h are logged as abandoned. Recovers every AI-analysis loss mode (crash, instance loss, exhausted retries) with one idempotent sweep — the 15-min age threshold guarantees no live job, so no jobId dedup needed. Registered in `AiModule` (now imports `PlansModule`). Boot-verified (`Nest application successfully started`, `ScheduleModule` up, no DI error) and unit-tested (6 tests, incl. query date-math under fake timers). Subsumes the retired standalone DLQ.
- **Single digest scheduler** (2026-07-03) — removed the duplicate EventBridge → Lambda `digest-trigger` → `/digest/internal-trigger` path; the weekly digest now fires only from the in-process `@Cron` (Mon 09:00). Deleted the `internal-trigger` endpoint, `lambda/digest-trigger/`, the `INTERNAL_SECRET` env wiring, the scheduler IAM policy file, and the digest-Lambda CloudWatch widget. Re-introduce external scheduling only at multi-instance, with leader election or a queue job.
  - **AWS teardown done (2026-07-03), `eu-north-1`:** deleted EventBridge Scheduler schedule `insightstream-daily-digest` (cron `0 9 * * ? *`), Lambda `insightstream-digest-trigger`, and its dedicated invoke role `InsightStreamSchedulerRole` (inline policy `InvokeDigestLambda`); re-applied the `InsightStream-Production` CloudWatch dashboard. No digest CloudWatch alarm existed and the `INTERNAL_SECRET` SSM param was already absent — nothing to delete there. **Kept** `InsightStreamLambdaRole` — it is shared with the surviving `feedback-processor` Lambda.
  - ~~**Deferred (2026-07-03):** EC2 container restart pending SSH access.~~ **Closed 2026-07-05** — `scripts/deploy-api.sh` run with the recovered `insightstream-key-v2` key as part of the Team-as-Tenant deploy: new image live, `POST /digest/internal-trigger` → 404 verified through the ALB.
- **Team as Tenant** (2026-07-05) — the tenant is now `Team`, not `User` or `Project`. Billing columns (`plan`, `planUpdatedAt`, `planStatus`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `trialEndsAt`, `lastStripeEventAt`) moved `users` → `teams`; migration `1774910000000-TeamAsTenant` backfills a personal team per user, copies billing to the oldest owned team, backfills `projects.teamId`, then applies `SET NOT NULL` + FK `CASCADE` and drops the old `users` billing columns. `PlanLimitsService` keyed by `teamId` (`getTeamPlan` degrades past_due/canceled → FREE); limits now counted per team, closing "admin teammate spends their own plan" and "owner of two teams shares one limit". Projects: `teamId` required, role ≥ ADMIN to create/delete, access = membership only (creator shortcut removed in both projects and feedback). Stripe customer/checkout/webhooks per team with an ordering guard on `teams.lastStripeEventAt`; legacy pre-migration subscriptions resolved via `stripeCustomerId` fallback; checkout/portal owner-only. Digest gated by team plan, delivered to every team member. WS clients join `team-{id}` rooms — one emit per event replaces the prior per-member fan-out (**stale premise**: the WS-to-owner-only bug named in the original #7 write-up had already been fixed by `EventsService` fan-out; this is a simplification, not a fix). `ensurePersonalTeam` now finds an owned team (fixed an invited-user bug); team deletion is atomic-guarded (owner-only, refuses while projects exist). `plan` dropped from JWT/login/IUser. Web fully team-scoped (`TeamProvider`, teamId in query keys, billing UI owner-gated). 13 commits, `6b8a4e7..3b018a2`; typecheck/lint/test green, e2e 11/11. **Deferred:** see Changelog entry same date.

---

## 🔥 Implement Soon

High ROI at the current stage, ordered by priority.

### 1. ~~Remove the duplicate digest scheduler~~ — ✔ Done (2026-07-03)
Code, repo-side infra, and AWS resources removed (see ✔ Completed above for the full teardown). ~~EC2 container restart deferred until SSH access exists.~~ Closed 2026-07-05 with the Team-as-Tenant deploy (`deploy-api.sh`, internal-trigger 404 verified). Item number kept stable — later items reference #4–#10 by number.

### 2. ~~Fix the OAuth personal-team gap~~ — ✔ Done (2026-07-03)
**Original premise was stale:** `oauthLogin()` has created a personal team for new Google/GitHub users since the OAuth feature first landed (commit `4169358`) — there was never a gap for new OAuth signups. The idempotent `TeamsService.ensurePersonalTeam()` (which also migrates orphan `teamId IS NULL` projects) already served as a lazy backfill via `GET /teams`.
**What was done:** hardened rather than re-implemented — both signup paths (`register` + `oauthLogin`) now call the single idempotent `ensurePersonalTeam()` hook instead of the raw `createPersonalTeam()`, removing the duplication and the double-team risk; `createPersonalTeam()` is now `private` so the safe hook is the only entry point. No proactive DB migration written: the lazy heal already covers stragglers and there are zero production users.
**Deliberately skipped:** wrapping `user.create` + team creation in a cross-service DB transaction — the lazy `ensurePersonalTeam` heal makes the transient teamless state self-recovering, so a transaction is disproportionate plumbing at this stage (constraint #3). Revisit if signups ever run under real concurrency.
**Type:** defect fix (mostly pre-existing).

### 3. ~~Stripe webhook idempotency + ordering~~ — ✔ Done (2026-07-03)
Dedup via a new `StripeEvent` log (Stripe event id as PK → recording an event is an idempotent insert; retries/replays are inert). Ordering via a new `users.lastStripeEventAt` stamp (nullable, epoch DB default): every subscription mutation is a single **atomic conditional** `UPDATE … WHERE "lastStripeEventAt" IS NULL OR "lastStripeEventAt" <= :eventCreated`, so an out-of-order or delayed event (`updated` after `deleted`) can no longer resurrect a canceled plan — and the check-and-set being one statement closes the race under concurrent delivery. (Column left **nullable** deliberately: a NOT NULL variant makes dev `synchronize` fail with `SET NOT NULL` on the already-populated `users` table; the `IS NULL` arm keeps the guard correct for any un-stamped row.) Dispatch centralized in `StripeWebhookService.handleEvent(event)`; the controller just verifies the signature and delegates. Migration `1774840000000-AddStripeEventsAndOrdering`. Seeds the future subscription-history table.

### 4. ~~Self-healing AI sweep~~ — ✔ Done (2026-07-03)
**Problem:** pending AI jobs live only in Redis (a container on the same EC2 instance). Instance loss or a crash means analyses silently never happen.
**Done:** new `AiSweepService` (`apps/api/src/modules/ai/ai-sweep.service.ts`), a `@Cron('*/5 * * * *')` sweep that re-enqueues `sentimentScore IS NULL` feedback created in the **(15 min, 24 h)** window via the existing `AiQueueService` (job data reconstructed from the row + owner plan, cached per run; `aiLevel: 'none'` skipped). Idempotent by nature — the 15-min age threshold guarantees no live job exists, so **no jobId dedup**; makes queue durability, DLQ, and crash recovery largely moot. Rows still `NULL` past 24 h are logged as **abandoned** (bounded poison-message cost, no schema change). Design + plan: `docs/superpowers/specs/2026-07-03-self-healing-ai-sweep-design.md`. **Deferred (design follow-ups):** a partial index `feedbacks (createdAt) WHERE sentimentScore IS NULL` (YAGNI at current scale) and, when the worker splits (#5), the `ai-sweep` cron must not boot in `WORKER_MODE`.
**Type:** resilience.

### 5. Separate BullMQ worker process
**Problem:** the AI worker (concurrency 3) shares one Node process and the t3.micro's burstable CPU credits with HTTP + WebSocket — sustained AI load silently throttles the API.
**Action:** same Docker image, a `WORKER_MODE` env flag boots only the queue consumer; run it as a second container. Zero new infra; teaches process separation hands-on. 🎓
**Effort:** ~1 day. **Type:** performance isolation.

### 6. Redis cache for the JWT user lookup
**Problem:** `JwtStrategy.validate()` reads Postgres on every authenticated request — the hottest query in the system, and it negates the stateless-JWT scaling rationale.
**Action:** cache the user by id in Redis with a 30–60s TTL. Revocation latency = TTL. Composes cleanly with the future refresh-token work.
**Effort:** hours. **Type:** performance.

### 7. ~~Team as Tenant (structural — the big one)~~ — ✔ Done (2026-07-05)
Full implementation detail in ✔ Completed above. **Stale premise:** the original problem statement below named "WS events to the owner's room only — a live bug" as a driver; that was already fixed by `EventsService` fan-out before this work started, so the `team-{id}` room change shipped as a simplification (one emit vs per-member fan-out), not a bug fix. Original problem statement, for context: the tenant was ambiguous (user vs team vs project) — billing lived on `User`, limits were computed via `project.userId`, digests emailed the owner only.
**Deferred follow-ups** (deliberate, not oversights):
- Fold pending-invitation counting into `PlanLimitsService.canInviteMember` and have invitations delegate (today: two implementations of the invite limit).
- `createOrGetCustomer` check-then-create race — two concurrent checkouts can mint two Stripe customers.
- `planUpdatedAt` is stamped on every applied webhook incl. `payment_failed` (semantic drift if it ever drives "plan changed" logic).
- `TeamContext` value not memoized — all consumers re-render on any provider query update; fine at current scale.
- Landing footer "Pricing" now lands on a login-gated route (no public pricing page anymore) — product decision pending.
- `apps/e2e/tsconfig.json` lacks `"types": ["node"]` — ~323 pre-existing noise errors on `tsc`.
- UI e2e for team-switch-on-billing-tab. **Manual Stripe test-mode checkout verification — ✔ done 2026-07-06:** initial check found `boichuk.db's Team` had `plan=PRO, planStatus=active` with no real `stripeCustomerId`/`stripeSubscriptionId` (a manually-set flag) — explained why `CurrentPlanCard`'s "Manage subscription →" button stayed hidden (correct behavior, not a bug, since it's gated on a real subscription). Did a real local test-mode checkout (via `stripe listen`) to confirm properly: button now appears, routes to the Stripe Customer Portal, cancellation is there. Surfaced a real, separate bug along the way — see 🔥 #12 (duplicate-subscription checkout guard).
- Local e2e envs: web must be **built** with `NEXT_PUBLIC_API_URL=http://localhost:3001`; DB env overrides for the docker-compose stack.
**Type:** structural.

### 8. Widget: versioned URL now, weight later
**Problem:** `widget.iife.js` is a 380 KB React bundle served from an unversioned S3 URL — any breaking change instantly breaks every customer site with no rollback; the weight hurts customers' page scores (the widget *is* the product).
**Action:** publish to `/v1/widget.js` immediately (compat + rollback story). Next widget cycle: Preact or vanilla TS, target under 30 KB gzipped.
**Effort:** hours now + a future cycle. **Type:** product surface.

### 9. Delete the SQS → Lambda stub
**Problem:** a second async system fire-and-forgets from `FeedbackService` to a `console.log` Lambda — extra infra, IAM, and a failure mode for zero shipped features. Its learning value is already captured.
**Action:** remove the SQS publish, queue, and Lambda. The seam (right after `feedbackRepository.save()`) stays in the code; re-add a consumer when the first real one (Slack, analytics) is committed.
**Effort:** hours. **Type:** simplification.

### 10. Ops checklist
- Verify **SES production access** — in sandbox mode SES only delivers to verified addresses; customer digests would silently fail.
- One timed **RDS restore drill**; write down the RPO/RTO actually achieved.
- **ACM certificate + HTTPS listener on the ALB** now — do not wait for the CloudFront verification unblock.

**Effort:** hours each. **Type:** operational readiness.

### 11. ~~Amplify deploy for `apps/web`~~ — ✔ Done (2026-07-06)
**Context:** the new-account verification gate lifted for Amplify (confirmed 2026-07-05 via a real `create-app` call) — the last piece before starting the real Vercel → AWS cutover for the frontend.
**What was built:** Amplify app `insightstream-web` (`d4bl0rp7zigqy`, platform `WEB_COMPUTE`) connected to the GitHub repo via a classic PAT, branch `main` auto-building on push. Env vars (`NEXT_PUBLIC_*` — API URL, Sentry DSN, widget URL, 4 Stripe price IDs) sourced from SSM/`infra/aws-ids.txt` where they already existed as the API-side equivalents. `FRONTEND_URL` in SSM is now a comma-separated list (Vercel + Amplify) for the parallel-run window; both `main.ts`'s hand-rolled CORS and `EventsGateway`'s Socket.io CORS were changed to parse it as a list instead of one exact string.
**Detour — discovered a pre-existing HTTPS proxy already solves the API's mixed-content problem:** Amplify serves over HTTPS by default, but the ALB is HTTP-only (no ACM cert possible on `*.elb.amazonaws.com` without a domain, and CloudFront — the free-HTTPS option — is the one service still gate-blocked, see the 🟡 row below). Built a VPC Link + private API Gateway integration to solve this, which hit a silent `503` despite fully correct config (VPC Link `AVAILABLE`, ENIs `in-use`, SG open, target healthy) — then a Lambda Function URL fallback hit the same wall (`403` on public unauthenticated invoke, but a direct authenticated `aws lambda invoke` worked perfectly). Both looked like the same per-service account restriction pattern as CloudFront, just surfacing differently. Turned out moot: `insightstream-api-proxy` (`xs07k9al3m`), a plain `HTTP_PROXY`/`ConnectionType: INTERNET` API Gateway straight to the ALB's public DNS (no VPC Link needed at all, since the ALB is already internet-facing), has existed since 2026-07-01 and is what Vercel prod already uses — nobody had recorded it here. The VPC Link/API Gateway and Lambda proxy built today were deleted; `NEXT_PUBLIC_API_URL` points at the existing gateway, whose CORS allow-list got the new Amplify domain added alongside Vercel's.
**Also required:** `amplify.yml`'s `appRoot: .` defeated Next.js SSR auto-detection (`AMPLIFY_MONOREPO_APP_ROOT` — set as an app env var, since CLI-created apps don't get it from the console's monorepo checkbox — must match `appRoot`, which must be the app's own directory; paths in the buildspec become relative to it, not the repo root, once set) — three failed builds before landing on `appRoot: apps/web` + `baseDirectory: .next`. Root `.npmrc` (`node-linker=hoisted`) was then needed because pnpm's symlinked `node_modules` doesn't survive Amplify's SSR runtime-bundling step for monorepos (AWS's own FAQ names this exact fix) — workspace-wide typecheck/lint/test re-verified green after the switch. `useSocket.ts` dropped its `transports: ["websocket"]` override so Socket.io falls back to polling (API Gateway HTTP APIs don't support WS upgrade).
**Verified:** build succeeded, `https://main.d4bl0rp7zigqy.amplifyapp.com` serves real SSR content (`200`, full RSC payload), CORS preflight from that origin against the API Gateway returns the correct `Access-Control-Allow-Origin`, Vercel confirmed still unaffected.
**Deliberately not done:** DNS/env cutover away from Vercel — staying in the parallel-run window per the existing staged-decommission plan.
**Type:** infra migration, unblocks old-infra decommission step 3.

### 12. Guard against duplicate active subscriptions on checkout
**Problem, found 2026-07-06 during manual Stripe test-mode checkout verification:** `StripeService.createCheckoutSession` (`apps/api/src/modules/stripe/stripe.service.ts:33-54`) and `StripeController.createCheckout` (`stripe.controller.ts:48-66`) never check whether the team already has an active/trialing subscription before creating a new Checkout Session in `mode: 'subscription'`. Reproduced live: a checkout completed successfully on Stripe's side (real subscription created) before our webhook had anywhere to be delivered (no `stripe listen` running locally at the time); redoing the checkout afterward — reasonable given our DB showed no subscription — created a **second**, independent subscription for the same team, both real and both billing $9/mo after the trial. Confirmed via the Stripe Customer Portal: two concurrent "InsightStream PRO" subscriptions, same customer, same payment method. A real customer double-clicking "Start trial", using two tabs, or retrying after a slow redirect would hit the exact same bug — real double-billing, not hypothetical.
**Action:** before creating a Checkout Session, check `team.stripeSubscriptionId`/`planStatus` — if there's already an active/trialing subscription, redirect to the billing portal (or just no-op / return a clear error) instead of creating a new one. Related to the already-deferred `createOrGetCustomer` check-then-create race under ✔ #7 (that one duplicates the *customer*; this one duplicates the *subscription* under one customer, and is the more severe of the two since it directly causes double-billing).
**Type:** correctness / billing-integrity defect.

---

## 🎨 UI/UX Roadmap

From the 2026-07-03 design review (screenshots + `apps/web` code audit). Full visual spec with token tables, contrast math and before/after mockups: Claude Artifact "InsightStream — UI/UX Audit & Design Scheme". Ordered by priority; P0 items are defects (unreadable UI / misleading data), not polish.

### P0 — Color system & contrast (~1 day)
**Problem:** one `--brand-muted` token serves both decorative elements and secondary *text*. As text it fails WCAG hard: `#2e4d4a` on dark surface `#0e1515` = 2.0:1, `#8ab0ae` on white = 2.4:1 (norm 4.5:1) — the dark theme is near-unreadable. Status colors are hardcoded dark-theme Tailwind shades (`text-amber-300` etc.) that wash out on light theme (~1.5:1). `AnalyticsOverview` charts embed dark-only grays (`#262626` grid, `#737373` ticks, `#171717` cursor) — broken in light theme.
**Action:**
- Split `--brand-muted` → `--brand-fg-muted` (secondary text, ≥4.5:1: light `#5b7975`, dark `#8aa8a4`) + keep `--brand-muted` for non-text only.
- Add semantic tokens `--status-success/warning/danger/info` with light/dark pairs; `Badge`, `lib/colors.ts` and all inline `*-300/-400` classes consume tokens.
- Chart grid/tick/cursor colors from tokens, not literals.
- Dark theme borders `#182222` → `#243232` (cards currently invisible against surface).
- **Sentiment honesty:** never render "0%" for feedback with no analysis — show an "Analyzing…" chip until `sentimentScore` exists.

### P1 — Feed hierarchy & typography (~1 day)
**Problem:** badge row sits *above* feedback text (secondary dominates primary); category shown twice per row (badge + "• Category" line); sentiment shown as a bare percentage; 9–11px text everywhere compounds the contrast problem; the "new" counter is a red pill (reads as an error, permanently at 42).
**Action:** content-first row layout, single meta line below; drop duplicate category line; sentiment as word + bar ("Positive", not "95%"); minimum text size 12px (11px only for uppercase tracked labels); new-counter in brand accent, cleared by Mark-all-read.

### P1 — Navigation & shell consistency (~0.5 day)
**Problem:** top-level pages (Analytics/Activity/Settings) have a "←" back button although they're reached from the sidebar; page width jumps (Feedback full-width vs others `max-w-6xl`); avatar circle overlaps the Sign Out button; "Upgrade" appears twice (trial banner + sidebar footer); radius scale is arbitrary (lg/xl/2xl/full mixed at one level).
**Action:** back button only on drill-down pages; one page container everywhere; fix footer overlap; single Upgrade CTA; radius scale 8px controls / 12px cards / 16px modals; remove or reduce decorative glow blobs (invisible in light, muddy in dark).

### P2 — Analytics 2.0 (~1–2 days)
**Problem:** two charts + ~60% dead space; no KPI summary; sentiment trend interpolates across uneven date gaps (Mar 25 → Jul 01 reads as a continuous trend — it lies).
**Action:** KPI stat row (total, new/week, % negative, top category), period selector (7/30/90d), time axis bucketed by week with visible gaps, AI Digest preview + history on the page.

### P2 — Activity Log & Embed polish (~1 day)
**Problem:** flat undated event list; "Real-time updates enabled" badge while data actually polls every 30s; Embed tab renders API key in plain text and a `localhost:8080` snippet URL.
**Action:** group events by day, add event-type/project filter, honest update label; mask API key with reveal+copy; snippet always uses the production widget URL (pairs with 🔥 #8 versioned widget URL).

### P1 — Component library consolidation (~2–3 days, can run parallel to the packages above)
**Goal:** a real internal UI library in `apps/web/src/components/ui` — one implementation per pattern, every primitive with a Storybook story. Extraction to a `packages/ui` workspace package is **not** part of this (trigger below). Found duplications, ordered by payoff:

| # | Extract | Replaces (today) |
|---|---|---|
| 1 | `WidgetConfigForm` + `buildWidgetSnippet()` util | `WidgetGeneratorModal` and `EmbedTab` duplicate ~200 lines: identical `COLORS/SHAPES/POSITIONS/FRAMEWORKS` consts and 3 copy-pasted html/react/angular snippet templates |
| 2 | `ConfirmDialog` (built on `Modal`) | 3 competing patterns: native `confirm()` (TeamTab, KanbanBoard, KanbanCard), hand-rolled modal in Sidebar (delete project), nothing on `Modal` |
| 3 | `CommentThread` (uses `useComments`) | CommentsPanel has its own useQuery/useMutation copy of what `useComments` + inline UI in FeedbackFeedItem already do |
| 4 | `StatusSelect` + single `STATUS_CONFIG` source | status colors/lists defined 4×: `badge.tsx STATUS_COLORS`, `lib/colors.ts STATUS_COLORS`, `FeedbackFeedItem STATUSES`, `KanbanCard STATUSES` — each with its own picker UI |
| 5 | `Popover` primitive (click-outside + anchor + AnimatePresence) | 4 independent implementations: `Dropdown`, `Select`, `FilterChips.DropdownChip`, FeedbackFeedItem status picker |
| 6 | `Tabs` (underline) / `SegmentedControl` / `ChoiceCard` | 5 tab-ish patterns: StatusTabs, settings tab bar (inline), ModeButton group, Feed/Kanban + ColorTheme selectable cards, EmbedTab framework switcher |
| 7 | `Drawer` + shared `Overlay` | CommentsPanel side panel, Sidebar mobile backdrop, Sidebar delete modal, Modal — each rolls its own `fixed inset-0 bg-black/50-60 backdrop-blur` |
| 8 | `FormField` (label + required mark + leading icon) | repeated label/input/icon blocks in CreateProjectModal, CreateTeamModal, CreateTeamProjectModal, auth pages |
| 9 | `Button size="xs"` variant | ad-hoc `px-3 py-1.5 rounded-lg border…` mini-buttons (Mark all read, Export CSV, Re-analyze, Delete) bypassing `Button` |
| 10 | `Eyebrow`/`MicroLabel` | 16 hand-rolled `uppercase tracking-wider` labels at 9–11px across 10 files (ties into the P1 typography scale) |
| 11 | `NavItem` | 4 copy-pasted sidebar `Link` blocks |

**Discipline rules that make it a library, not a folder:**
- Every `ui/` primitive has a `.stories.tsx` (Storybook is already set up — currently stories exist mostly for composites, not primitives).
- No raw Tailwind status colors (`text-amber-300`…) inside components — only tokens from the P0 package.
- User-facing errors go through `sonner` toasts, never `alert()` — currently 13 `alert()` call sites next to an installed toast system.
- A component may live outside `ui/` only if it is used by exactly one page.

**Component strengths to keep:** shared `Section`/`Badge`/`Button`/`EmptyState` primitives, skeleton loaders, CSS-variable theming architecture (the fix extends it, doesn't replace it), AI Trends bar concept, Feed/Kanban view toggle.

---

## 🔍 Analysis Backlog

Audits that produce roadmap items, not roadmap items themselves. Each entry: what to analyze → what it outputs. Ordered by risk to a real launch. (Added 2026-07-03 after verifying the gaps in code.)

### 1. GDPR & legal readiness — the launch blocker
**Verified gaps:** no privacy policy or terms pages in `apps/web`; `UsersController` exposes only `GET /me` — **no account deletion, no data export**; digest emails have no unsubscribe mechanism (`grep unsubscribe` → 0 hits in `apps/api`). Meanwhile the plan sells "EU data residency as a GDPR feature".
**Analysis:** map every place user/customer PII lives (User, Feedback content, Stripe customer, PostHog, Sentry, SES) → produce: delete-account endpoint spec (cascade rules vs Stripe/S3), data-export endpoint spec, privacy/terms pages, unsubscribe link in digests, cookie-consent decision for PostHog.
**When:** before the first non-test customer. Cheap now (~days), reputation-expensive later.

### 2. Web test pyramid — the empty middle
**Verified state:** `apps/api` — 14 spec files (incl. Stripe webhooks — good); `apps/e2e` — 7 Playwright specs (auth, feedback, activity, invite, widget submit); `apps/web` — **zero tests of any kind**. Untested high-logic surfaces: feed filtering (`FeedbackFeed`), plan-usage hooks, `useComments`, kanban drag reducers. E2E has no billing flow (checkout → webhook → plan change).
**Analysis:** pick the 5–7 web units where a regression silently corrupts UX, define the testing approach (Vitest + Testing Library), add a billing e2e happy path.
**When:** before the component-library refactor above — refactoring 11 components with zero web tests is how regressions ship.

### 3. Widget product audit — the product is a stub
**Verified state:** the entire widget is one `App.tsx`: text-only textarea, hardcoded Railway URL fallback, no page context captured (URL, viewport, UA — data that would sharpen AI categorization), no retry/offline handling, no keyboard/screen-reader support, no i18n. PLAN 🔥 #8 covers only bundle size/versioning.
**Analysis:** competitive teardown (Canny/Featurebase/Sleekplan widgets) + spec: metadata capture, optional email field, category hint, a11y pass — feeds the planned Preact rewrite so it's designed once, not twice.
**When:** together with the 🔥 #8 widget cycle.

### 4. Activation funnel & event taxonomy
**Verified state:** PostHog is wired but captures only ~5 events (`$pageview`, `user_signed_up`, `dashboard_viewed`, 2 pricing events). The funnel signup → project created → widget installed → first feedback → first AI insight → team invited is **not instrumented**, so activation/drop-off is invisible. Nothing in the dashboard guides a fresh user to install the widget.
**Analysis:** define the activation metric + event naming scheme, instrument the funnel, spec an onboarding checklist for the empty dashboard.
**When:** before spending effort on growth; data collection has lead time — instrument early.

### 5. AI quality evaluation
**Verified state:** no eval set; raw Gemini responses not persisted (already a 🟡 trigger); sentiment thresholds (0.4/0.6) and category set are unvalidated guesses; digest quality is unmeasured.
**Analysis:** hand-label ~100 feedback items as a golden set → measure category accuracy + sentiment agreement → decide if prompts/thresholds need work. Prereq for ever comparing Gemini vs Bedrock (🟡 AIProvider item).
**When:** when AI output quality first gets questioned by a user — or before the Bedrock experiment, whichever comes first.

### 6. Web performance & bundle audit (low)
Framer-motion + Recharts + full Lucide in the dashboard bundle; no measured Web Vitals. Cheap Lighthouse/`next build` analyze pass; act only if numbers are bad. Dashboard-behind-login makes this low-stakes — the widget (already tracked) is the perf surface that matters.

---

## 📦 Product Backlog — table-stakes features

Baseline features users assume exist. Gaps verified against the actual API surface and entities on 2026-07-03 (`grep` over controllers + `user.entity.ts`). Grouped by area; 🔴 = expected before real users, 🟠 = soon after, ⚪ = when demand appears.

### Account & Profile
Current state: `User` entity has **no `name` field at all** (email is the only identity); `UsersController` = `GET /me` only; auth has forgot/reset password but **no change-password while logged in**; no email verification on register; Profile tab in Settings is read-only (email + member since).

| Pri | Feature | Notes |
|---|---|---|
| 🔴 | `name` (+ `avatarUrl`) on User + `PATCH /users/me` + editable Profile tab | Comments, activity log and team lists currently identify everyone by raw email |
| 🔴 | Change password (logged in, requires current password) | Must handle OAuth-only users (`passwordHash: null`) with a "set password" variant |
| 🔴 | Delete account | Already in 🔍 GDPR item — same work, listed here for completeness |
| 🟠 | Email verification on register | Also unblocks trusting `email` for digests/invites; SES sandbox exit (🔥 #10) is a prereq |
| 🟠 | Change email (with re-verification) | |
| ⚪ | Sessions list / "log out everywhere" | Rides on the refresh-token work in 🟡 |
| ⚪ | Link/unlink OAuth providers | `googleId`/`githubId` exist; no management UI |

### Project management
Current state: projects support create / list / get / **delete only** — no `PATCH /projects/:id`.

| Pri | Feature | Notes |
|---|---|---|
| 🔴 | Edit project: rename + change domain | **Today a customer who changes their website domain must delete the project and lose all feedback** — the domain is the CORS whitelist. Worst gap in the product |
| 🔴 | API key regenerate/rotate | Compromised key currently = delete project. Do together with the 🟡 "hash project API keys" item (same settings rework) |
| 🟠 | Multiple domains per project | staging + production is the normal case for the target customer |

### Feedback workflow
Current state: no search anywhere (API `GET /feedback` takes no query); no pagination (the dashboard loads every row — degrades with volume, ties into 🟡 usage-counters); bulk ops = `bulk-archive` only; tags are AI-written only (`ai.processor`), no user add/edit/remove.

| Pri | Feature | Notes |
|---|---|---|
| 🟠 | Server-side search | Do together with 🟡 `jsonb` tags + status enum migration (same query rework) |
| 🟠 | Pagination / infinite scroll | Same rework as search; blocks nothing today with seed-scale data |
| 🟠 | Manual tag editing | Filters for tags already exist — users just can't create them |
| ⚪ | Bulk status change / bulk delete with selection UI | |
| ⚪ | Feedback detail page (own URL, deep-linkable from digest emails) | Digest links currently can only point at the whole dashboard |

### Team & notifications
Current state: team rename/delete, member remove, role change, invitations — all exist. Missing: self-service leave, ownership transfer, and **any** notification preferences (weekly digest goes to owner, hardcoded).

| Pri | Feature | Notes |
|---|---|---|
| 🟠 | Digest preferences: on/off, frequency, per-member opt-out | Recipients-to-team landed with ✔ #7 (digest now emails every team member); on/off, frequency, and per-member opt-out still open |
| 🟠 | Leave team (self) + transfer ownership | Owner leaving is currently unrepresentable |
| ⚪ | In-app notification center | Only when a second notification channel exists (🟡 NotificationDispatcher trigger) |

---

## 🟡 Future Improvements

Adopt when the trigger fires, not before.

### Platform & Infra

| Item | Trigger |
|---|---|
| ECS Fargate / App Runner 🏭 | AWS carries real production traffic **and** manual deploys start hurting. EC2 stays while the goal is learning it the hard way. |
| Automated CD (CodeBuild unblock or GitHub Actions OIDC → ECR → SSM) | Deploying more than ~1×/week, or the first botched manual deploy. CodeBuild itself is confirmed technically unblocked (2026-07-05, quota 0→15) — this row is now a business-priority trigger, not a feasibility one. |
| ASG + RDS Multi-AZ 🏭 | Paying users on AWS — buy HA with revenue, not before. |
| PgBouncer / RDS Proxy | 2+ API processes in prod (the worker split brings this closer), or the first connection-limit errors (db.t3.micro ≈ 85 connections). |
| CloudFront ×2 (S3 widget CDN + ALB API HTTPS) | Still blocked (confirmed 2026-07-05: `CreateDistribution` → same `AccessDenied` as before) — needs its own support ticket citing this exact error. Lower urgency than before for the API side: `insightstream-api-proxy` (API Gateway, `INTERNET`-type integration straight to the ALB) already gives the API free HTTPS with no domain needed (✔ #11) — CloudFront's remaining value here is mainly the widget CDN + a bit of edge caching, not solving a live gap. |
| Multi-region | A contractual data-residency demand only. Likely never — eu-north-1 + EU data residency is a GDPR selling point. |
| Observability: OTel tracing + BullMQ queue metrics | More than one process in prod, or the first cross-process debugging pain. |
| Digest fan-out as queue jobs | ~50+ digest-eligible projects (today's serial loop meets the 60s ALB idle timeout). |

### Application

| Item | Trigger |
|---|---|
| Refresh tokens + HttpOnly cookies | Before public launch with real customers; touch the Socket.io handshake auth in the same change. |
| `AIProvider` interface + `PromptBuilderService` | The moment a second provider (Bedrock) is actually usable. From day one of that work: persist raw model output + model version, or providers can never be compared. Permission gate confirmed lifted 2026-07-05 (`invoke-model` now returns normal validation errors, not "Operation not allowed") — remaining work is just picking a model/inference-profile that's on-demand-eligible in `eu-north-1`. |
| Hash project API keys | Next rework of project settings. Downgraded from HIGH in earlier reviews: the key is public in customer page source by design; the origin whitelist + throttles are the real controls. |
| Usage counters table | Plan-limit `COUNT` appears in the slow-query log (~100k feedback rows). Also fixes the check-then-act race on limits. |
| Subscription history table | First billing dispute or churn-analytics need (the webhook-idempotency work seeds it). |
| Per-project daily AI spend ceiling | First real traffic. Rate limits protect the API, not the Gemini bill. |
| `jsonb` tags + status enum | When building tag filtering (`simple-array` cannot be indexed usefully). |
| Domain events / event bus | A second real consumer of the feedback lifecycle exists. |
| `NotificationDispatcher` | A second channel (Slack / in-app) is committed. |
| Generic cache layer | Only if the targeted caches (JWT user, plan lookups) prove insufficient. |
| Extract `packages/ui` workspace package | A second React consumer of the components appears (e.g. a marketing site or admin app). Until then the library lives in `apps/web/src/components/ui` — moving it earlier buys build complexity for zero reuse. The widget is **not** a future consumer: its 30 KB budget (🔥 #8) forbids sharing React dashboard components. |

---

## ✅ Keep As-Is

Deliberate decisions and why they stay.

### Architecture & Data
- **Modular NestJS monolith** — one developer; module seams give all the evolution room needed. Microservices at this size would be malpractice.
- **PostgreSQL + TypeORM + real FKs**, shared entities via `@insightstream/database` — relational fits the domain; FK integrity is doing real work daily.
- **BullMQ** 🎓 — teaches queue semantics hands-on. The *seam* matters, not the tech; revisit (→ SQS) only if consolidating fully on AWS after cutover.
- **Socket.io + Redis adapter** — the hard part is already done; scales horizontally today. No reason to touch it.
- **`PLAN_CONFIGS` + `PlanLimitsService`** — single source of plan truth. Caveat to remember: `JSON.stringify(Infinity)` → `null`; audit any endpoint that serializes plan configs to the frontend.
- **Current AI flow** (queue → Gemini → write-back → WS emit) — the shape is right; the worker split (🔥 #5) changes *where* it runs, not the flow.
- **Current module boundaries** — correct; the tenant fix (✔ #7) is done. Split identity-auth from widget-key-auth only when auth is next touched anyway.

### Platform & Practices
- **EC2 + manual Docker deploy** 🎓 — the intentional learning path (VPC, SGs, ALB, SSM the hard way). Graduation trigger: the Fargate item in 🟡.
- **The AWS migration overall** 🎓 — the learning goal itself. One discipline: two production stacks must not coexist indefinitely — set a cutover-or-park decision date.
- **JWT bearer auth** — fine until launch hardening (then refresh tokens + cookies from 🟡). The lookup cache (🔥 #6) removes its main runtime cost.
- **Hand-rolled CORS middleware** — explicit, readable, and the public-vs-dashboard branch logic is documented in code. No need for `enableCors()`.
- **Single region eu-north-1** — EU data residency is a GDPR feature, not a limitation.
- **Monorepo + Turbo + CI** (lint / typecheck / test / e2e) — the strongest part of the developer experience. Do not touch.
- **Honest diagram culture** — STUB labels, soft-FK notation, verification dates in `system-architecture.drawio`. Keep it; the update rule at the top of this file exists to protect it.

---

## ⛔ Retired Recommendations

From earlier reviews — kept for history, with reasons.

- **EventEmitter2 domain-event bus** — same process, same failure domain: decoupling theater. The durable seam is the queue.
- **Generic cache-aside layer** — invalidation bugs pre-PMF; two targeted caches deliver ~90% of the value.
- **`NotificationDispatcher` now** — email is the only channel; an abstraction with one implementation is dead weight.
- **`PaymentProvider` abstraction** — one provider, and webhooks couple deeply anyway; Stripe lock-in is acceptable.
- **Soft delete everywhere** — GDPR favors hard deletes for user data; revisit per-entity only if an undo feature is requested.
- **ASG + Multi-AZ now** — no production traffic on AWS yet; moved to 🟡 behind a revenue trigger.
- **Separate `AIAnalysis` entity** — columns on `Feedback` are fine until re-analysis / versioning becomes a feature.
- **`LocalStrategy` for password login** — cosmetic Passport uniformity; the inline bcrypt path works.
- **Standalone Dead Letter Queue** — subsumed by the self-healing sweep (🔥 #4), which recovers all loss modes, not just exhausted retries.
- **Numeric architecture ratings (X/10 scores)** — theater on a pre-revenue solo project; dropped from this plan, replaced by "does it solve a real problem" as the only test.

---

## Changelog

- **2026-07-06** — Manual Stripe test-mode checkout verification done (closes the deferred item under ✔ #7): confirmed the "Manage subscription" button and Stripe Customer Portal cancel flow both work correctly for a real subscription. Surfaced a real billing-integrity bug along the way — no guard against creating a second Checkout Session when a team already has an active/trialing subscription, reproduced live as two concurrent real subscriptions for one team/customer. Added 🔥 #12 to fix it (not fixed yet, deliberately deferred to track separately). Also fixed a doc inaccuracy from earlier the same day: Stripe CLI's webhook signing secret is stable across `stripe listen` restarts (tied to the account's CLI endpoint), not regenerated each time — corrected in `README.md`.
- **2026-07-06** — 🔥 #11 done: Amplify deploy for `apps/web`. App `insightstream-web` (`d4bl0rp7zigqy`, `WEB_COMPUTE`) connected to GitHub, auto-building `main`. Discovered and reused a pre-existing (2026-07-01, previously untracked) API Gateway `insightstream-api-proxy` — plain `INTERNET`-type `HTTP_PROXY` straight to the ALB's public DNS, already what Vercel prod uses for HTTPS — instead of a new VPC Link + API Gateway (hit a silent `503` despite correct config) or a Lambda Function URL fallback (public invoke `403`'d, authenticated invoke worked fine); both looked like the same per-service account restriction as CloudFront. `FRONTEND_URL` now a comma-separated list (Vercel + Amplify) for the parallel-run window; `main.ts` and `EventsGateway` CORS updated to match; `useSocket.ts` dropped its websocket-only transport override so Socket.io falls back to polling (API Gateway HTTP APIs don't support WS upgrade). `amplify.yml` needed `appRoot: apps/web` (not `.`) + an `AMPLIFY_MONOREPO_APP_ROOT` env var for Next.js SSR auto-detection, paths relative to that appRoot, and a root `.npmrc` (`node-linker=hoisted`) for Amplify's SSR bundling step to survive pnpm's symlinked `node_modules` (AWS FAQ's documented fix) — three failed builds before all pieces landed. Verified: build succeeded, branch URL serves real SSR content, CORS preflight from the Amplify origin correct, Vercel confirmed unaffected. `infra/aws-ids.txt` updated (Amplify app id/URL, the newly-tracked API Gateway). DNS/env cutover away from Vercel deliberately not done — still in the staged parallel-run window.
- **2026-07-05** — AWS verification gate partially lifted: confirmed via real CLI calls (not re-checking old errors) — CodeBuild concurrent-build quota 0→15 (real build reached `BUILD` phase), Amplify `create-app` succeeded (test app created then deleted), Bedrock `invoke-model`/`list-foundation-models` now return normal errors instead of "Operation not allowed". CloudFront `CreateDistribution` still returns the same `AccessDenied` — confirmed the gate is per-service, needs its own support ticket. Added 🔥 #11 (Amplify deploy for `apps/web`); updated the CloudFront/Amplify 🟡 row and the `AIProvider` Bedrock note accordingly. Not yet re-tested: CloudShell, SSM Session Manager.
- **2026-07-05** — 🔥 #7 done: Team as Tenant. Billing (`plan`, `planUpdatedAt`, `planStatus`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `trialEndsAt`, `lastStripeEventAt`) moved `users` → `teams` (migration `1774910000000-TeamAsTenant`: personal-team backfill, billing copied to oldest owned team, `projects.teamId` backfilled + `SET NOT NULL` + FK `CASCADE`, old `users` columns dropped); `PlanLimitsService` keyed by team; projects require `teamId` (role ≥ ADMIN create/delete, membership-only access — creator shortcut removed in projects and feedback); Stripe per-team with a legacy-`stripeCustomerId` fallback for pre-migration subscriptions; digest sent to every team member; WS emits to `team-{id}` rooms (one emit, not per-member fan-out — **not** a bug fix, see stale-premise note in 🔥 #7); `plan` dropped from JWT/login/IUser; web fully team-scoped (`TeamProvider`, teamId in query keys). 13 commits `6b8a4e7..3b018a2`; typecheck/lint/test green; e2e 11/11 (new specs `project-delete-authz`, `team-scoped-plans`). Deferred follow-ups (invite-limit dedup, Stripe-customer race, `planUpdatedAt` semantic drift, `TeamContext` memoization, gated pricing page, e2e tsconfig noise, UI e2e for team-switch-on-billing, manual Stripe checkout verification, local e2e env docs) recorded in 🔥 #7 above. ER diagram updated: billing columns moved `users` → `teams`, `projects.teamId` now required (FK `CASCADE`).
- **2026-07-03** — 🔥 #4 done: self-healing AI sweep. New `AiSweepService` `@Cron('*/5 * * * *')` re-enqueues `sentimentScore IS NULL` feedback in the (15 min, 24 h) window via `AiQueueService`; abandoned rows (>24 h) logged. No jobId dedup (15-min age ⇒ no live job); recovers crash/instance-loss/exhausted-retry loss modes in one idempotent pass — subsumes the retired DLQ. Registered in `AiModule` (now imports `PlansModule`). 6 unit tests (incl. query date-math under fake timers), boot-verified. Index + worker-mode-guard recorded as deliberate follow-ups in the design doc.
- **2026-07-03** — 🔥 #3 done: Stripe webhook idempotency + ordering. New `StripeEvent` log (event id PK → dedup) + `users.lastStripeEventAt` ordering stamp; subscription handlers now apply via an atomic conditional `UPDATE … WHERE "lastStripeEventAt" <= :eventCreated` that ignores stale/out-of-order events (no more resurrecting a canceled plan). Controller delegates to `StripeWebhookService.handleEvent`. Migration `1774840000000-AddStripeEventsAndOrdering`. Seeds the future subscription-history table. ER diagram updated: added the `StripeEvent` entity and `users.lastStripeEventAt` in `system-architecture.drawio`.
- **2026-07-03** — 🔥 #2 closed as ✔ Done: the stated OAuth personal-team gap didn't exist (new OAuth users have gotten a team since `oauthLogin` landed; `ensurePersonalTeam` already lazily backfills stragglers via `GET /teams`). Hardened instead: both `register` and `oauthLogin` now call the idempotent `ensurePersonalTeam()` hook; `createPersonalTeam()` made `private`. Cross-service transaction deliberately skipped (self-healing lazy backfill makes it disproportionate). No code changes to team-creation behavior for the happy path.
- **2026-07-03** — 🔥 #1 done: removed the duplicate digest scheduler (EventBridge → Lambda `digest-trigger` → `/digest/internal-trigger`); weekly digest now fires only from the in-process `@Cron`. Deleted the internal endpoint, `lambda/digest-trigger/`, `INTERNAL_SECRET` wiring, scheduler IAM policy, and the digest-Lambda CloudWatch widget; updated `system-architecture.drawio` (Fullstack, AWS Infrastructure, Request Lifecycle pages). **AWS resources also torn down the same day** (`eu-north-1`): schedule `insightstream-daily-digest`, Lambda `insightstream-digest-trigger`, role `InsightStreamSchedulerRole`; dashboard `InsightStream-Production` re-applied; shared `InsightStreamLambdaRole` kept for `feedback-processor`. Only follow-up: API redeploy on EC2. Item numbering kept stable (later items reference #4–#10).
- **2026-07-03** — Added 📦 Product Backlog (table-stakes features): account/profile gaps (no name field, no change-password, no email verification), project editing (no PATCH — domain change currently requires delete+recreate), feedback search/pagination/tags, digest preferences, leave-team/ownership transfer.
- **2026-07-03** — Added 🔍 Analysis Backlog: GDPR/legal readiness (verified: no delete/export endpoints, no legal pages, no unsubscribe), web test gap (0 tests in apps/web), widget product audit, activation funnel instrumentation, AI eval set, perf pass.
- **2026-07-03** — Added 🎨 UI/UX Roadmap section (design review of `apps/web`: contrast/token defects P0, feed hierarchy and navigation P1, Analytics/Activity P2). Same day: added the Component-library-consolidation package (11 extraction targets from a duplication audit) + a 🟡 trigger for extracting `packages/ui`.
- **2026-07-03** — Roadmap moved out of the drawio file (was page 9) into this file. Diagram file renamed `aws-infrastructure.drawio` → `system-architecture.drawio` (it now covers full-system, auth, deployment, network and ER diagrams, not just AWS). Same day: other diagram pages corrected to match code (validation notes, digest double-scheduling flagged, ER diagram gained `UserProjectLastSeen`, 10 entities total).
