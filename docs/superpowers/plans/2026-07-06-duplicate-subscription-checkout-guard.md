# Duplicate-Subscription Checkout Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `StripeService.createCheckoutSession` from creating a second Stripe subscription for a team that already has one active/trialing/past_due, closing both the "double-click / two tabs" case and the reproduced webhook-lag race where the local DB hadn't yet synced.

**Architecture:** A new private guard method, `assertNoActiveSubscription(team)`, runs at the top of `createCheckoutSession` before any Stripe write. It does a zero-cost local check first (`team.stripeSubscriptionId` + `team.planStatus`), then — only if the team already has a Stripe customer and the local check didn't block — one live `stripe.subscriptions.list` call as a fallback. Any match throws `ConflictException` (409), which Nest's exception filter already turns into an HTTP error with no controller changes needed. The frontend's checkout error handler gets a 409-specific message pointing at the billing portal instead of a generic retry toast.

**Tech Stack:** NestJS 11, TypeORM, Stripe Node SDK, Jest (`ts-jest`), Next.js/React (web), axios.

Spec: `docs/superpowers/specs/2026-07-06-duplicate-subscription-checkout-guard-design.md`

---

## Task 1: Backend guard — local fast-path block

**Files:**
- Create: `apps/api/src/modules/stripe/stripe.service.spec.ts`
- Modify: `apps/api/src/modules/stripe/stripe.service.ts:1-54`

- [ ] **Step 1: Write the test file with mocks and the first test**

Create `apps/api/src/modules/stripe/stripe.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { Team } from '@insightstream/database';
import { StripeService } from './stripe.service';

const mockStripeInstance = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  subscriptions: { list: jest.fn(), retrieve: jest.fn() },
  billingPortal: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
};

jest.mock('stripe', () => jest.fn().mockImplementation(() => mockStripeInstance));

describe('StripeService', () => {
  let service: StripeService;
  let teamRepo: { update: jest.Mock };

  const baseTeam = (overrides: Partial<Team> = {}): Team =>
    ({
      id: 'team_1',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      planStatus: 'active',
      ...overrides,
    }) as Team;

  beforeEach(async () => {
    jest.clearAllMocks();
    teamRepo = { update: jest.fn() };
    const configService = { getOrThrow: jest.fn(() => 'sk_test_123') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: getRepositoryToken(Team), useValue: teamRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = module.get<StripeService>(StripeService);
  });

  describe('createCheckoutSession — duplicate subscription guard', () => {
    it('blocks when local state already shows an active subscription', async () => {
      const team = baseTeam({
        stripeSubscriptionId: 'sub_existing',
        planStatus: 'active',
      });

      await expect(
        service.createCheckoutSession(
          team,
          'owner@x.com',
          'price_1',
          'https://s',
          'https://c',
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockStripeInstance.subscriptions.list).not.toHaveBeenCalled();
      expect(
        mockStripeInstance.checkout.sessions.create,
      ).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- src/modules/stripe/stripe.service.spec.ts`
Expected: FAIL — `createCheckoutSession` currently calls `checkout.sessions.create` unconditionally, so the "not.toHaveBeenCalled()" assertion on it fails (and no `ConflictException` is thrown).

- [ ] **Step 3: Add the guard method and wire it in**

In `apps/api/src/modules/stripe/stripe.service.ts`, change the import line and add the method, then call it from `createCheckoutSession`:

```ts
import { Injectable, Logger, ConflictException } from '@nestjs/common';
```

Add as a class member, above `createCheckoutSession`:

```ts
  private static readonly BLOCKING_STATUSES = ['active', 'trialing', 'past_due'];

  private async assertNoActiveSubscription(team: Team): Promise<void> {
    if (
      team.stripeSubscriptionId &&
      StripeService.BLOCKING_STATUSES.includes(team.planStatus)
    ) {
      throw new ConflictException('Team already has an active subscription');
    }

    if (!team.stripeCustomerId) return;

    const subscriptions = await this.stripe.subscriptions.list({
      customer: team.stripeCustomerId,
      status: 'all',
    });
    const hasLiveSubscription = subscriptions.data.some((sub) =>
      StripeService.BLOCKING_STATUSES.includes(sub.status),
    );
    if (hasLiveSubscription) {
      this.logger.warn(
        `Blocked duplicate checkout for team ${team.id}: local DB showed no active subscription but Stripe customer ${team.stripeCustomerId} has one`,
      );
      throw new ConflictException('Team already has an active subscription');
    }
  }
```

Change `createCheckoutSession`'s first line from:

```ts
    const customerId = await this.createOrGetCustomer(team, ownerEmail);
```

to:

```ts
    await this.assertNoActiveSubscription(team);
    const customerId = await this.createOrGetCustomer(team, ownerEmail);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- src/modules/stripe/stripe.service.spec.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/stripe/stripe.service.ts apps/api/src/modules/stripe/stripe.service.spec.ts
git commit -m "feat: block checkout when team has an active subscription locally"
```

---

## Task 2: Backend guard — live fallback for the webhook-lag race

**Files:**
- Modify: `apps/api/src/modules/stripe/stripe.service.spec.ts`

- [ ] **Step 1: Add the failing test**

Add inside the same `describe('createCheckoutSession — duplicate subscription guard', ...)` block, after the first `it`:

```ts
    it('blocks via the live fallback when local DB is stale (webhook-lag race)', async () => {
      const team = baseTeam({
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: null,
        planStatus: 'canceled',
      });
      mockStripeInstance.subscriptions.list.mockResolvedValue({
        data: [{ status: 'active' }],
      });

      await expect(
        service.createCheckoutSession(
          team,
          'owner@x.com',
          'price_1',
          'https://s',
          'https://c',
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockStripeInstance.subscriptions.list).toHaveBeenCalledWith({
        customer: 'cus_1',
        status: 'all',
      });
      expect(
        mockStripeInstance.checkout.sessions.create,
      ).not.toHaveBeenCalled();
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- src/modules/stripe/stripe.service.spec.ts`
Expected: This test should already PASS if Task 1's implementation is complete (the live-fallback branch was written in Task 1 Step 3). If it fails, re-check that `assertNoActiveSubscription` in `stripe.service.ts` includes the `stripeCustomerId` / `subscriptions.list` branch exactly as written in Task 1 Step 3 — do not skip ahead without it.

- [ ] **Step 3: Confirm both tests pass together**

Run: `pnpm --filter api test -- src/modules/stripe/stripe.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/stripe/stripe.service.spec.ts
git commit -m "test: cover the webhook-lag duplicate-subscription race"
```

---

## Task 3: Backend guard — pass-through scenarios

**Files:**
- Modify: `apps/api/src/modules/stripe/stripe.service.spec.ts`

- [ ] **Step 1: Add the three pass-through tests**

Add after the previous two tests in the same `describe` block:

```ts
    it('skips the live check and proceeds when the team has no Stripe customer yet', async () => {
      const team = baseTeam({ stripeCustomerId: null, planStatus: 'canceled' });
      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_new' });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout',
      });

      const url = await service.createCheckoutSession(
        team,
        'owner@x.com',
        'price_1',
        'https://s',
        'https://c',
      );

      expect(url).toBe('https://checkout');
      expect(mockStripeInstance.subscriptions.list).not.toHaveBeenCalled();
    });

    it('proceeds when both local and live checks are clear', async () => {
      const team = baseTeam({
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: null,
        planStatus: 'canceled',
      });
      mockStripeInstance.subscriptions.list.mockResolvedValue({ data: [] });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout',
      });

      const url = await service.createCheckoutSession(
        team,
        'owner@x.com',
        'price_1',
        'https://s',
        'https://c',
      );

      expect(url).toBe('https://checkout');
    });

    it('proceeds after cancellation when the live list is empty', async () => {
      const team = baseTeam({
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_old',
        planStatus: 'canceled',
      });
      mockStripeInstance.subscriptions.list.mockResolvedValue({ data: [] });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout',
      });

      const url = await service.createCheckoutSession(
        team,
        'owner@x.com',
        'price_1',
        'https://s',
        'https://c',
      );

      expect(url).toBe('https://checkout');
    });
```

- [ ] **Step 2: Run the full guard test suite**

Run: `pnpm --filter api test -- src/modules/stripe/stripe.service.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 3: Run the full API test suite to check for regressions**

Run: `pnpm --filter api test`
Expected: All suites pass, including the pre-existing `stripe-webhook.service.spec.ts`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/stripe/stripe.service.spec.ts
git commit -m "test: cover checkout pass-through when no subscription exists"
```

---

## Task 4: Frontend — distinct message on 409

**Files:**
- Modify: `apps/web/src/components/billing/PricingCards.tsx:1-9, 50-67`

- [ ] **Step 1: Import axios and update the catch branch**

In `apps/web/src/components/billing/PricingCards.tsx`, add to the top imports:

```ts
import axios from "axios";
```

Replace the `handleUpgrade` function's `catch` block:

```ts
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setLoadingPriceId(null);
    }
```

with:

```ts
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          "You already have an active subscription — manage it from Billing settings.",
        );
      } else {
        toast.error("Failed to start checkout. Please try again.");
      }
      setLoadingPriceId(null);
    }
```

- [ ] **Step 2: Typecheck the web app**

Run: `pnpm --filter web typecheck`
Expected: No errors.

- [ ] **Step 3: Manual verification (no web test harness exists yet — see PLAN.md Analysis Backlog #2)**

Read the modified `handleUpgrade` function back and confirm: `axios.isAxiosError(err)` narrows `err` before accessing `.response`, and the non-409 branch preserves the exact original message so existing behavior for other failures (network error, 500, etc.) is unchanged.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/billing/PricingCards.tsx
git commit -m "fix: show a clearer message when checkout is blocked by an existing subscription"
```

---

## Task 5: Full verification and PLAN.md update

**Files:**
- Modify: `docs/architecture/PLAN.md`

- [ ] **Step 1: Run full verification**

Run: `pnpm typecheck && pnpm lint && pnpm --filter api test`
Expected: All green. Paste actual output before proceeding — do not mark this task done on assumption.

- [ ] **Step 2: Update `docs/architecture/PLAN.md`**

Change the header date (line 3) from:

```
> Last updated: **2026-07-06**
```

Leave as-is if already `2026-07-06` (it already is).

Replace the `### 12. Guard against duplicate active subscriptions on checkout` heading and problem statement (keep the existing **Problem** paragraph verbatim) by adding a strikethrough + done marker, matching the style of items #1-#11 above it. Change:

```
### 12. Guard against duplicate active subscriptions on checkout
```

to:

```
### 12. ~~Guard against duplicate active subscriptions on checkout~~ — ✔ Done (2026-07-06)
```

After the existing **Action** paragraph, add:

```
**What was done:** `StripeService.createCheckoutSession` now calls a new `assertNoActiveSubscription(team)` guard before creating any Stripe resource. Fast path: blocks locally when `team.stripeSubscriptionId` is set and `team.planStatus` is `active`/`trialing`/`past_due`. Live fallback (closes the exact reproduced race): if the local check passes but `team.stripeCustomerId` already exists, one `stripe.subscriptions.list` call checks Stripe directly — catches the case where a webhook hasn't yet synced the local DB. Either path throws `ConflictException` (409). Frontend (`PricingCards.tsx`) shows a distinct "manage it from Billing settings" message on 409 instead of the generic retry toast. Deliberately out of scope: plan-change/upgrade-downgrade flow (still blocked by this guard — a real proration-based upgrade flow is separate future work) and self-healing the DB from the live-check path (sync stays the webhook handler's job). Design: `docs/superpowers/specs/2026-07-06-duplicate-subscription-checkout-guard-design.md`.
```

**Do not move this item out of the 🔥 Implement Soon section.** Items #1, #2, #3, #4, #7, and #11 all stay physically in place under 🔥 with a strikethrough heading + "— ✔ Done" note (only the separate ✔ Completed section near the top of the file gets a *new short bullet* for the few structurally significant items — this one is not big enough to warrant that; the in-place strikethrough is the whole update). Item numbering stays stable, matching the file's own stated convention.

Add a new line to the **Changelog** section (top of the list, right after the header), dated `2026-07-06`:

```
- **2026-07-06** — 🔥 #12 done: guard against duplicate active subscriptions on checkout. New `StripeService.assertNoActiveSubscription` blocks `createCheckoutSession` when the team already has an `active`/`trialing`/`past_due` subscription — a fast local check plus a live `stripe.subscriptions.list` fallback that specifically closes the webhook-lag race reproduced the same day (checkout succeeds on Stripe before the webhook arrives, so the local DB briefly shows no subscription). Either path throws a 409; `PricingCards.tsx` now shows a distinct message pointing at Billing settings instead of a generic retry toast. 5 new unit tests in `stripe.service.spec.ts`. Design: `docs/superpowers/specs/2026-07-06-duplicate-subscription-checkout-guard-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/PLAN.md
git commit -m "docs: mark PLAN #12 done - duplicate-subscription checkout guard"
```

---

## Self-Review Checklist (for whoever executes this plan)

- [ ] All 5 new tests in `stripe.service.spec.ts` pass together with the pre-existing `stripe-webhook.service.spec.ts`.
- [ ] `pnpm typecheck && pnpm lint` clean across the whole monorepo (not just the touched packages).
- [ ] `PricingCards.tsx` still shows the original generic message for non-409 failures (network error, 500) — only the 409 path changed.
- [ ] `docs/architecture/PLAN.md` #12 moved to ✔ Completed with the strikethrough convention, Changelog entry added, item number left stable.
