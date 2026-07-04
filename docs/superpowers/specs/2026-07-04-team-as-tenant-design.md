# Team as Tenant — Design (PLAN 🔥 #7)

> Date: 2026-07-04
> Status: approved by user, pending implementation plan
> Source: `docs/architecture/PLAN.md` item #7 (structural)

## Problem

The tenant is ambiguous (user vs team vs project):

- Billing lives on `User` (`plan`, `planStatus`, `stripe*`, `trialEndsAt`, `lastStripeEventAt`); Stripe customer/checkout metadata is keyed by `userId`.
- Limits are computed per creator, not per tenant: `canCreateProject` counts `WHERE userId`, feedback limit goes through `project.userId`. An admin teammate who creates a project via `POST /teams/:id/projects` spends **their own** plan, not the team owner's. An owner of two teams shares one limit across both.
- `Project.teamId` is nullable (`onDelete: SET NULL`) and orphan projects are still minted: `POST /projects` doesn't pass `teamId`, and `findAllByUser` auto-creates a teamless "Default Project". `ensurePersonalTeam` heals lazily only on `GET /teams`.
- `GET /projects` returns only `WHERE userId` — a team member does not see team projects in the main dashboard list.
- Weekly digest emails the project owner only, gated on the owner's plan.

**Stale premise corrected:** PLAN #7 claims "WebSocket events go to the owner's room only — a live bug". Not true anymore: `EventsService.emitFeedbackUpdatedForProject` already fans out to every team member, and all emit sites (feedback create / status change / bulk archive, `ai.processor`) go through it. The `team-{id}` room is a refactor (1 emit instead of N member queries + N emits per event), not a bug fix.

## Decision

Make `Team` the tenant. Full billing move to `Team` (not the "payer=owner" half-measure): with zero production users this is the cheapest moment; the PLAN's own framing is "~1 week now vs a quarter after real customers exist".

## Design

### 1. Data model

`Team` gains the billing columns moved from `User`:

| Column | Notes |
|---|---|
| `plan` | varchar(20), default `FREE` |
| `planUpdatedAt` | timestamp, nullable |
| `planStatus` | varchar(20), default `active` |
| `stripeCustomerId` | varchar, nullable, indexed |
| `stripeSubscriptionId` | varchar, nullable |
| `stripePriceId` | varchar, nullable |
| `trialEndsAt` | timestamp, nullable |
| `lastStripeEventAt` | timestamp, **nullable + epoch default** — same pattern as on `User` (dev `synchronize` cannot `SET NOT NULL` on a populated table) |

`User` loses all of the above.

`Project`:

- `teamId` → **NOT NULL**, FK `onDelete: CASCADE` (was `SET NULL`). Downstream cascade already exists: project → feedback `CASCADE`.
- `userId` **stays** as creator attribution (createdBy semantics, documented in the entity). Access control no longer uses it. Its `CASCADE` on user delete is left as-is; revisit in the GDPR delete-account spec.

**Team deletion:** with CASCADE, deleting a team would wipe its projects + feedback. Service guard: **a team that still has projects cannot be deleted** — delete projects explicitly first. `GET /teams` (via `ensurePersonalTeam`) keeps guaranteeing every user ≥ 1 team.

### 2. PlanLimitsService — key change userId → teamId

- `getUserPlan(userId)` → `getTeamPlan(teamId)`: reads `team.plan`; `past_due`/`canceled` → `FREE`.
- `canCreateProject(teamId)` — counts projects `WHERE teamId`.
- `canCreateFeedback(teamId)` — monthly count via `project.teamId`.
- `canCreateFeedbackForProject(projectId)` — resolves `project.teamId`.
- `canUseFeature(teamId, feature)`, `getUsageSummary(teamId)`.
- `canInviteMember(teamId)` — simplifies: plan from the team directly, no owner join.
- AI-level resolution in `feedback.service`, `ai-sweep.service`, digest: `getTeamPlan(project.teamId)` instead of the owner's plan.
- `GET /plans/usage?teamId=` with a membership check; frontend passes `activeTeamId`.

### 3. Projects API

- `POST /projects`: `teamId` **required** in the DTO; caller must have role ≥ **ADMIN** in that team (same policy as the existing `POST /teams/:teamId/projects`; both paths call one service method and stay equivalent).
- `GET /projects?teamId=` — the active team's projects (membership check). Fixes "member doesn't see team projects".
- `findOne` access = **membership in `project.teamId` only**; the `project.userId === caller` shortcut is removed. Behavior change: a creator removed from the team loses access — that is the tenant model.
- "Default Project" auto-creation stays (onboarding + e2e depend on it) but creates the project **inside the user's personal team**.

### 4. Stripe / billing

- Customer per **team**: `createOrGetCustomer(team)` — owner's email, metadata `{ teamId }`.
- `POST /stripe/checkout { priceId, teamId }` and the portal: allowed for the team **OWNER only**. Subscription metadata → `teamId`.
- Webhooks: resolve the team by `stripeCustomerId` / metadata; apply via the same atomic conditional `UPDATE … WHERE "lastStripeEventAt" IS NULL OR <= :eventCreated` — now on `teams`. `StripeEvent` dedup log unchanged.
- Frontend: billing tab / PricingCards / trial banner operate on `activeTeam`; billing actions visible to the owner only (`userRole` from `useTeam` already exists).

### 5. WebSocket

- On connect: join `user-{id}` (kept for future personal events) **and** `team-{teamId}` for every membership.
- `EventsService.emitFeedbackUpdatedForProject` → single emit to `team-{project.teamId}`; the per-event member query goes away.
- Known limitation (accepted, YAGNI): membership changes while a socket is live don't rebuild rooms until reconnect.

### 6. Digest

- Gate on the **project team's plan**.
- Recipients: **every member** of the project's team (individual sends via the existing mail service).
- Per-member opt-out is out of scope (Product Backlog: notification preferences).

### 7. Migration & dev environment

One TypeORM migration, in order:

1. Add billing columns to `teams` (nullable / with defaults).
2. For every user without an **owned** team: create a personal team + OWNER membership.
3. Copy billing fields user → their oldest owned team.
4. Backfill `projects.teamId` = creator's personal team `WHERE teamId IS NULL`.
5. `ALTER projects.teamId SET NOT NULL`; replace the FK with `ON DELETE CASCADE`.
6. Drop billing columns from `users`.

**Dev caveat (has bitten before):** local dev uses `synchronize`, which does not run migrations — `SET NOT NULL` fails on a populated local DB with NULL `teamId` rows. Local path: reset the dev DB (data is worthless) or run a one-off backfill script. Always rebuild `packages/database` dist after entity edits.

**`ensurePersonalTeam` fix:** it must look for an **owned** team (`ownerId = userId`), not the first membership — today an invited user gets someone else's team back as their "personal" one. The orphan-project migration branch inside it becomes dead after the migration and is removed.

### 8. Testing & verification

- Unit: `PlanLimitsService` (team-keyed counters + plan resolution), `StripeWebhookService` (team resolve + ordering guard on `teams.lastStripeEventAt`), digest recipients, `EventsService`/gateway room join.
- E2E: update specs that create projects (teamId now required end-to-end).
- End-to-end verification before "done": boot the app, signup → create project → submit feedback → hit limits → checkout (Stripe test mode) → webhook → team plan changes; realtime update visible on a second member's dashboard.

## Explicit decisions (approved 2026-07-04)

- Full billing move to `Team` — not the payer=owner variant.
- Digest to **all team members** (no opt-out yet).
- Team with projects **cannot be deleted** (no cascade-with-confirm).
- Project creation requires role ≥ **ADMIN**.
- `Project.userId` kept as attribution only.

## Out of scope

- Notification preferences / digest opt-out (Product Backlog).
- Leave team / ownership transfer (Product Backlog).
- Cross-service transaction around signup + team creation (PLAN #2 rationale stands).
- Live socket room rebuild on membership change.

## PLAN.md follow-up

On completion: mark #7 ✔ Done in `docs/architecture/PLAN.md` (with the stale-premise note about the WS bug), bump the date, update the ER diagram in `system-architecture.drawio` (billing fields on `teams`, `projects.teamId` NOT NULL).
