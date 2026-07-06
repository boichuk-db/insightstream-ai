# Guard against duplicate active subscriptions on checkout

> Design spec. Tracks PLAN.md 🔥 #12.

## Problem

`StripeService.createCheckoutSession` (`apps/api/src/modules/stripe/stripe.service.ts:33-54`) creates a new Stripe Checkout Session (`mode: 'subscription'`) unconditionally — it never checks whether the team already has a live subscription. Reproduced live on 2026-07-06: a checkout completed on Stripe's side while no `stripe listen` was running locally, so the webhook that would have synced `team.planStatus`/`stripeSubscriptionId` had nowhere to be delivered. Redoing the checkout afterward — reasonable given the DB showed no subscription — created a **second**, independent subscription for the same team/customer, both real and both billing $9/mo after trial. A real customer double-clicking "Start trial", using two tabs, or retrying after a slow redirect hits the same bug.

## Goal

Before creating a Checkout Session, refuse if the team already has a subscription in a non-terminal state (`active`, `trialing`, `past_due`). Return a clear, typed error instead of silently creating a duplicate.

## Design

### Detection: hybrid local + live check

A new private method on `StripeService`, `assertNoActiveSubscription(team: Team)`, called at the top of `createCheckoutSession` before `createOrGetCustomer`:

1. **Local fast path.** If `team.stripeSubscriptionId` is set and `team.planStatus` is one of `active | trialing | past_due` → throw immediately. Zero extra network calls for the common case (webhook already synced the DB).
2. **Live fallback — closes the exact reproduced race.** If the local check did *not* block, but `team.stripeCustomerId` is already set (a Stripe customer exists from an earlier checkout attempt), call `stripe.subscriptions.list({ customer: team.stripeCustomerId, status: 'all' })` and filter results to the same blocking statuses (`active`, `trialing`, `past_due`). If any match → throw, and `Logger.warn` that the local DB was stale (this is the signal that a webhook-lag race was just caught).
3. If `team.stripeCustomerId` is `null` (brand-new team, never checked out before), skip the live call entirely — nothing can exist yet.

Blocking statuses: `active`, `trialing`, `past_due` (a real subscription still exists and could resume without hitting the checkout endpoint again). Non-blocking: `canceled`, `incomplete_expired`, `unpaid`, or no subscription at all — these represent no live subscription, so re-subscribing is legitimate.

### Error surfaced

Throw `ConflictException('Team already has an active subscription')` from the service layer — matches the existing codebase pattern of services throwing `HttpException` subtypes directly (e.g. `PlanLimitsService`, `TeamsService`), no controller change needed; Nest's exception filter turns it into a 409.

### Frontend

`PricingCards.handleUpgrade` (`apps/web/src/components/billing/PricingCards.tsx:50-67`): the catch branch currently shows a generic "Failed to start checkout. Please try again." toast for every failure. Add a check for a 409 response and show a distinct message pointing the user at the existing billing/portal UI (e.g. "You already have an active subscription — manage it from Billing settings") instead of the generic retry message.

### Explicitly out of scope

- **Plan changes (PRO → BUSINESS) via Checkout.** Today there is no upgrade/downgrade flow at all — only new-subscription checkout and portal-based cancellation. This guard will also block a plan-change attempt made through the checkout endpoint (any active subscription blocks any new checkout, regardless of price). That's correct for this fix's scope; a real upgrade/downgrade flow (subscription update with proration) is separate, larger work, not part of PLAN #12.
- **Self-healing the DB from the live check.** When the live fallback catches a stale-DB race, we only block — we do not write `team.planStatus`/`stripeSubscriptionId` from this code path. Syncing stays the sole responsibility of `StripeWebhookService`'s ordering-guarded handlers; duplicating that logic here would risk fighting the existing `lastStripeEventAt` guard.
- **`createOrGetCustomer` check-then-create race** (two concurrent checkouts minting two Stripe *customers* for one team) — already tracked as a separate, lower-severity deferred item under ✔ #7. Not addressed here.
- **Same-customer concurrent-tab race at payment time.** The guard is check-then-act with no per-team locking or Stripe idempotency key: two near-simultaneous `createCheckoutSession` calls for a team that already has a `stripeCustomerId` can both pass `assertNoActiveSubscription` if neither request's subscription has been created/synced yet when the other runs (e.g., two tabs open, both completing payment before either shows up in Stripe). This guard closes the reproduced webhook-lag race and the simple double-click-after-sync case, not this narrower concurrent-payment variant — fully closing it would need payment-time locking, out of scope here.

## Testing (TDD)

New `apps/api/src/modules/stripe/stripe.service.spec.ts` (no existing spec file for this service):

- Blocks when local state is `active`/`trialing`/`past_due` with `stripeSubscriptionId` set — asserts `stripe.checkout.sessions.create` is never called, and that `stripe.subscriptions.list` is never called either (fast path short-circuits).
- Blocks when local state shows no subscription but `stripeCustomerId` is set and the live `subscriptions.list` mock returns an active subscription (simulates the reproduced webhook-lag race).
- Proceeds (creates a session) when `stripeCustomerId` is `null` — asserts `subscriptions.list` is never called.
- Proceeds when both local and live checks are clear.
- Proceeds when local status is `canceled` and the live list is empty (re-subscribing after cancellation is legitimate).

## Files touched

- `apps/api/src/modules/stripe/stripe.service.ts` — add `assertNoActiveSubscription`, call from `createCheckoutSession`.
- `apps/api/src/modules/stripe/stripe.service.spec.ts` — new.
- `apps/web/src/components/billing/PricingCards.tsx` — distinguish 409 in the checkout error toast.
- `docs/architecture/PLAN.md` — mark 🔥 #12 done, add Changelog entry.
