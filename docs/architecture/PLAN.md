# InsightStream AI — Architecture Plan (Living Document)

> Last updated: **2026-07-03**
> This is the single source of truth for architecture decisions and roadmap. `system-architecture.drawio` holds diagrams only — this file holds the reasoning, priorities and status.
>
> **Update rule:** any change that alters the architecture (new module, new infra piece, a completed roadmap item, a decision reversed) updates this file in the same PR, and bumps the date above. Tasks for future work are pulled from this plan, not invented ad hoc.

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
  - **Deferred (2026-07-03):** the new image is built and pushed to ECR (`insightstream-api:latest`, digest `dd619b2d…`), but the running EC2 container was **not** restarted — the only path in is SSH, which is unavailable (no local key; SSM Session Manager is under the verification gate). No urgency: zero users, and the `internal-trigger` endpoint is already unreachable (schedule + Lambda deleted, still secret-gated). Finish later with `scripts/deploy-api.sh` (verifies `POST /digest/internal-trigger` → 404) once SSH access exists. Until then prod still serves the old image (endpoint returns 401, not 404).

---

## 🔥 Implement Soon

High ROI at the current stage, ordered by priority.

### 1. ~~Remove the duplicate digest scheduler~~ — ✔ Done (2026-07-03)
Code, repo-side infra, and AWS resources removed (see ✔ Completed above for the full teardown). The new image is staged in ECR; the EC2 container restart is **deferred** until SSH access exists (no urgency — endpoint already unreachable, zero users). Item number kept stable — later items reference #4–#10 by number.

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

### 7. Team as Tenant (structural — the big one)
**Problem:** the tenant is ambiguous (user vs team vs project): billing lives on `User`, limits are computed via `project.userId`, WebSocket events go to the owner's room only (**team members' dashboards do not update in realtime — a live bug**), digests email the owner only.
**Action:** make `teamId` required on `Project` (the auto-created personal team makes this nearly free), move billing + limits to `Team`, emit WS events to room `team-{id}`.
**Effort:** ~1 week now vs a quarter after real customers exist. **Type:** structural.

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
| 🟠 | Digest preferences: on/off, frequency, recipients | Recipients-part lands naturally inside Team-as-Tenant (🔥 #7) — digest should go to the team, honoring per-member opt-out |
| 🟠 | Leave team (self) + transfer ownership | Owner leaving is currently unrepresentable |
| ⚪ | In-app notification center | Only when a second notification channel exists (🟡 NotificationDispatcher trigger) |

---

## 🟡 Future Improvements

Adopt when the trigger fires, not before.

### Platform & Infra

| Item | Trigger |
|---|---|
| ECS Fargate / App Runner 🏭 | AWS carries real production traffic **and** manual deploys start hurting. EC2 stays while the goal is learning it the hard way. |
| Automated CD (CodeBuild unblock or GitHub Actions OIDC → ECR → SSM) | Deploying more than ~1×/week, or the first botched manual deploy. |
| ASG + RDS Multi-AZ 🏭 | Paying users on AWS — buy HA with revenue, not before. |
| PgBouncer / RDS Proxy | 2+ API processes in prod (the worker split brings this closer), or the first connection-limit errors (db.t3.micro ≈ 85 connections). |
| CloudFront ×2 + Amplify | The account verification gate lifts (already planned, tracked on the AWS pages). |
| Multi-region | A contractual data-residency demand only. Likely never — eu-north-1 + EU data residency is a GDPR selling point. |
| Observability: OTel tracing + BullMQ queue metrics | More than one process in prod, or the first cross-process debugging pain. |
| Digest fan-out as queue jobs | ~50+ digest-eligible projects (today's serial loop meets the 60s ALB idle timeout). |

### Application

| Item | Trigger |
|---|---|
| Refresh tokens + HttpOnly cookies | Before public launch with real customers; touch the Socket.io handshake auth in the same change. |
| `AIProvider` interface + `PromptBuilderService` | The moment a second provider (Bedrock) is actually usable. From day one of that work: persist raw model output + model version, or providers can never be compared. |
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
- **Current module boundaries** — correct except the tenant fix (🔥 #7). Split identity-auth from widget-key-auth only when auth is next touched anyway.

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

- **2026-07-03** — 🔥 #4 done: self-healing AI sweep. New `AiSweepService` `@Cron('*/5 * * * *')` re-enqueues `sentimentScore IS NULL` feedback in the (15 min, 24 h) window via `AiQueueService`; abandoned rows (>24 h) logged. No jobId dedup (15-min age ⇒ no live job); recovers crash/instance-loss/exhausted-retry loss modes in one idempotent pass — subsumes the retired DLQ. Registered in `AiModule` (now imports `PlansModule`). 6 unit tests (incl. query date-math under fake timers), boot-verified. Index + worker-mode-guard recorded as deliberate follow-ups in the design doc.
- **2026-07-03** — 🔥 #3 done: Stripe webhook idempotency + ordering. New `StripeEvent` log (event id PK → dedup) + `users.lastStripeEventAt` ordering stamp; subscription handlers now apply via an atomic conditional `UPDATE … WHERE "lastStripeEventAt" <= :eventCreated` that ignores stale/out-of-order events (no more resurrecting a canceled plan). Controller delegates to `StripeWebhookService.handleEvent`. Migration `1774840000000-AddStripeEventsAndOrdering`. Seeds the future subscription-history table. ER diagram updated: added the `StripeEvent` entity and `users.lastStripeEventAt` in `system-architecture.drawio`.
- **2026-07-03** — 🔥 #2 closed as ✔ Done: the stated OAuth personal-team gap didn't exist (new OAuth users have gotten a team since `oauthLogin` landed; `ensurePersonalTeam` already lazily backfills stragglers via `GET /teams`). Hardened instead: both `register` and `oauthLogin` now call the idempotent `ensurePersonalTeam()` hook; `createPersonalTeam()` made `private`. Cross-service transaction deliberately skipped (self-healing lazy backfill makes it disproportionate). No code changes to team-creation behavior for the happy path.
- **2026-07-03** — 🔥 #1 done: removed the duplicate digest scheduler (EventBridge → Lambda `digest-trigger` → `/digest/internal-trigger`); weekly digest now fires only from the in-process `@Cron`. Deleted the internal endpoint, `lambda/digest-trigger/`, `INTERNAL_SECRET` wiring, scheduler IAM policy, and the digest-Lambda CloudWatch widget; updated `system-architecture.drawio` (Fullstack, AWS Infrastructure, Request Lifecycle pages). **AWS resources also torn down the same day** (`eu-north-1`): schedule `insightstream-daily-digest`, Lambda `insightstream-digest-trigger`, role `InsightStreamSchedulerRole`; dashboard `InsightStream-Production` re-applied; shared `InsightStreamLambdaRole` kept for `feedback-processor`. Only follow-up: API redeploy on EC2. Item numbering kept stable (later items reference #4–#10).
- **2026-07-03** — Added 📦 Product Backlog (table-stakes features): account/profile gaps (no name field, no change-password, no email verification), project editing (no PATCH — domain change currently requires delete+recreate), feedback search/pagination/tags, digest preferences, leave-team/ownership transfer.
- **2026-07-03** — Added 🔍 Analysis Backlog: GDPR/legal readiness (verified: no delete/export endpoints, no legal pages, no unsubscribe), web test gap (0 tests in apps/web), widget product audit, activation funnel instrumentation, AI eval set, perf pass.
- **2026-07-03** — Added 🎨 UI/UX Roadmap section (design review of `apps/web`: contrast/token defects P0, feed hierarchy and navigation P1, Analytics/Activity P2). Same day: added the Component-library-consolidation package (11 extraction targets from a duplication audit) + a 🟡 trigger for extracting `packages/ui`.
- **2026-07-03** — Roadmap moved out of the drawio file (was page 9) into this file. Diagram file renamed `aws-infrastructure.drawio` → `system-architecture.drawio` (it now covers full-system, auth, deployment, network and ER diagrams, not just AWS). Same day: other diagram pages corrected to match code (validation notes, digest double-scheduling flagged, ER diagram gained `UserProjectLastSeen`, 10 entities total).
