# Stripe Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe-powered subscriptions (PRO + BUSINESS, monthly + annual, 14-day trial) with a `/dashboard/billing` page, Customer Portal, trial banner, and plan-status gating.

**Architecture:** Stripe Checkout + Customer Portal (hosted) — no custom payment UI. New `StripeModule` in NestJS handles checkout session creation, portal sessions, and webhook event handling. Five new nullable columns on the `users` table track Stripe state. Frontend `/dashboard/billing` page reads plan status from DB (single `GET /plans/status` call) and redirects to Stripe's hosted pages for all payment actions.

**Tech Stack:** `stripe` npm SDK (server only), NestJS `rawBody: true` for webhook signature verification, TanStack Query `queryOptions`, Tailwind + lucide-react on frontend.

---

## File Map

### Create
- `apps/api/src/modules/stripe/stripe.module.ts`
- `apps/api/src/modules/stripe/stripe.service.ts`
- `apps/api/src/modules/stripe/stripe-webhook.service.ts`
- `apps/api/src/modules/stripe/stripe.controller.ts`
- `apps/api/src/modules/stripe/stripe-webhook.controller.ts`
- `apps/api/src/modules/stripe/stripe-webhook.service.spec.ts`
- `apps/api/src/migrations/1774830000000-AddStripeFieldsToUser.ts`
- `apps/web/src/app/dashboard/billing/page.tsx`
- `apps/web/src/components/billing/CurrentPlanCard.tsx`
- `apps/web/src/components/billing/UsageMetrics.tsx`
- `apps/web/src/components/billing/PricingCards.tsx`
- `apps/web/src/components/billing/TrialBanner.tsx`

### Modify
- `packages/database/src/entities/user.entity.ts` — add 5 Stripe columns
- `apps/api/src/modules/plans/plan-limits.service.ts` — respect `planStatus`
- `apps/api/src/modules/plans/plan-limits.service.spec.ts` — update + add tests (create if missing)
- `apps/api/src/app.module.ts` — import `StripeModule`
- `apps/api/src/main.ts` — `rawBody: true`
- `apps/web/src/lib/queries.ts` — add `planStatusQuery` + `PlanStatus` type
- `apps/web/src/components/dashboard/Sidebar.tsx` — add Billing nav link

---

## Task 1: User entity — add Stripe columns

**Files:**
- Modify: `packages/database/src/entities/user.entity.ts`

- [ ] **Step 1: Add 5 columns to User entity**

Open `packages/database/src/entities/user.entity.ts` and add after the `planUpdatedAt` column:

```typescript
@Column({ type: 'varchar', nullable: true, default: null })
stripeCustomerId: string | null;

@Column({ type: 'varchar', nullable: true, default: null })
stripeSubscriptionId: string | null;

@Column({ type: 'varchar', nullable: true, default: null })
stripePriceId: string | null;

@Column({ type: 'varchar', length: 20, default: 'active' })
planStatus: string;

@Column({ type: 'timestamp', nullable: true, default: null })
trialEndsAt: Date | null;
```

- [ ] **Step 2: Verify dev DB syncs without error**

```bash
pnpm dev
```

Expected: API starts on port 3001 without TypeORM errors. TypeORM `synchronize: true` in dev adds the new columns automatically.

- [ ] **Step 3: Commit**

```bash
git add packages/database/src/entities/user.entity.ts
git commit -m "feat(db): add Stripe billing fields to User entity"
```

---

## Task 2: TypeORM migration for production

**Files:**
- Create: `apps/api/src/migrations/1774830000000-AddStripeFieldsToUser.ts`

- [ ] **Step 1: Create migration file**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeFieldsToUser1774830000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "stripeCustomerId" varchar,
        ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" varchar,
        ADD COLUMN IF NOT EXISTS "stripePriceId" varchar,
        ADD COLUMN IF NOT EXISTS "planStatus" varchar(20) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "trialEndsAt" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "stripeCustomerId",
        DROP COLUMN IF EXISTS "stripeSubscriptionId",
        DROP COLUMN IF EXISTS "stripePriceId",
        DROP COLUMN IF EXISTS "planStatus",
        DROP COLUMN IF EXISTS "trialEndsAt"
    `);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/migrations/1774830000000-AddStripeFieldsToUser.ts
git commit -m "feat(api): add migration for Stripe fields on users table"
```

---

## Task 3: Install Stripe SDK

**Files:** `apps/api/package.json` (modified by pnpm)

- [ ] **Step 1: Install stripe package in API**

```bash
pnpm --filter @insightstream/api add stripe
```

Expected: `stripe` appears in `apps/api/package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add stripe SDK"
```

---

## Task 4: StripeService — customer, checkout, portal

**Files:**
- Create: `apps/api/src/modules/stripe/stripe.service.ts`

- [ ] **Step 1: Create StripeService**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@insightstream/database';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(
    private config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow('STRIPE_SECRET_KEY'));
  }

  async createOrGetCustomer(user: User): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId;
    const customer = await this.stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    await this.userRepo.update(user.id, { stripeCustomerId: customer.id });
    this.logger.log(`Created Stripe customer ${customer.id} for user ${user.id}`);
    return customer.id;
  }

  async createCheckoutSession(user: User, priceId: string, successUrl: string, cancelUrl: string): Promise<string> {
    const customerId = await this.createOrGetCustomer(user);
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: user.id },
      },
      metadata: { userId: user.id },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return session.url!;
  }

  async createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/stripe/stripe.service.ts
git commit -m "feat(api): add StripeService with customer, checkout, portal, webhook verification"
```

---

## Task 5: StripeWebhookService — event handlers + tests

**Files:**
- Create: `apps/api/src/modules/stripe/stripe-webhook.service.ts`
- Create: `apps/api/src/modules/stripe/stripe-webhook.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/stripe/stripe-webhook.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, PlanType } from '@insightstream/database';
import { StripeWebhookService } from './stripe-webhook.service';

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;
  let userRepo: { update: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    userRepo = {
      update: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();
    service = module.get<StripeWebhookService>(StripeWebhookService);
  });

  describe('handleSubscriptionDeleted', () => {
    it('downgrades to FREE and clears Stripe fields', async () => {
      const sub = {
        id: 'sub_1',
        metadata: { userId: 'user-1' },
        items: { data: [] },
      } as any;

      await service.handleSubscriptionDeleted(sub);

      expect(userRepo.update).toHaveBeenCalledWith('user-1', {
        plan: PlanType.FREE,
        planStatus: 'canceled',
        stripeSubscriptionId: null,
        stripePriceId: null,
        trialEndsAt: null,
      });
    });

    it('logs warning and returns when userId missing', async () => {
      const sub = { id: 'sub_1', metadata: {}, items: { data: [] } } as any;
      await service.handleSubscriptionDeleted(sub);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailed', () => {
    it('sets planStatus to past_due', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      const invoice = { customer: 'cus_1' } as any;

      await service.handlePaymentFailed(invoice);

      expect(userRepo.update).toHaveBeenCalledWith('user-1', { planStatus: 'past_due' });
    });

    it('logs warning when no user found for customer', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const invoice = { customer: 'cus_unknown' } as any;
      await service.handlePaymentFailed(invoice);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionUpdated', () => {
    beforeEach(() => {
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly';
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_pro_annual';
      process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID = 'price_biz_monthly';
      process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID = 'price_biz_annual';
    });

    it('sets plan to PRO when PRO monthly price', async () => {
      const sub = {
        id: 'sub_1',
        metadata: { userId: 'user-1' },
        status: 'active',
        trial_end: null,
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      } as any;

      await service.handleSubscriptionUpdated(sub);

      expect(userRepo.update).toHaveBeenCalledWith('user-1', expect.objectContaining({
        plan: PlanType.PRO,
        planStatus: 'active',
        stripePriceId: 'price_pro_monthly',
      }));
    });

    it('sets plan to BUSINESS when BUSINESS annual price', async () => {
      const sub = {
        id: 'sub_1',
        metadata: { userId: 'user-1' },
        status: 'trialing',
        trial_end: 1800000000,
        items: { data: [{ price: { id: 'price_biz_annual' } }] },
      } as any;

      await service.handleSubscriptionUpdated(sub);

      expect(userRepo.update).toHaveBeenCalledWith('user-1', expect.objectContaining({
        plan: PlanType.BUSINESS,
        planStatus: 'trialing',
        trialEndsAt: new Date(1800000000 * 1000),
      }));
    });
  });

  describe('handleCheckoutCompleted', () => {
    it('stores subscriptionId and sets trialing status', async () => {
      const session = {
        metadata: { userId: 'user-1' },
        subscription: 'sub_new',
      } as any;

      await service.handleCheckoutCompleted(session);

      expect(userRepo.update).toHaveBeenCalledWith('user-1', {
        stripeSubscriptionId: 'sub_new',
        planStatus: 'trialing',
      });
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm --filter @insightstream/api test stripe-webhook.service.spec
```

Expected: FAIL — `StripeWebhookService` not found.

- [ ] **Step 3: Create StripeWebhookService**

Create `apps/api/src/modules/stripe/stripe-webhook.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, PlanType } from '@insightstream/database';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.warn('checkout.session.completed: no userId in metadata');
      return;
    }
    await this.userRepo.update(userId, {
      stripeSubscriptionId: session.subscription as string,
      planStatus: 'trialing',
    });
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      this.logger.warn('customer.subscription.updated: no userId in metadata');
      return;
    }
    const priceId = subscription.items.data[0]?.price.id;
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

    await this.userRepo.update(userId, {
      plan: this.resolvePlan(priceId),
      planStatus: subscription.status,
      stripePriceId: priceId ?? null,
      stripeSubscriptionId: subscription.id,
      trialEndsAt: trialEnd,
    });
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      this.logger.warn('customer.subscription.deleted: no userId in metadata');
      return;
    }
    await this.userRepo.update(userId, {
      plan: PlanType.FREE,
      planStatus: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
      trialEndsAt: null,
    });
  }

  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const user = await this.userRepo.findOne({ where: { stripeCustomerId: customerId } });
    if (!user) {
      this.logger.warn(`invoice.payment_failed: no user for Stripe customer ${customerId}`);
      return;
    }
    await this.userRepo.update(user.id, { planStatus: 'past_due' });
  }

  private resolvePlan(priceId: string | undefined): PlanType {
    if (!priceId) return PlanType.FREE;
    const ids = {
      [process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '']: PlanType.PRO,
      [process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? '']: PlanType.PRO,
      [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? '']: PlanType.BUSINESS,
      [process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID ?? '']: PlanType.BUSINESS,
    };
    return ids[priceId] ?? PlanType.FREE;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm --filter @insightstream/api test stripe-webhook.service.spec
```

Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/stripe/stripe-webhook.service.ts apps/api/src/modules/stripe/stripe-webhook.service.spec.ts
git commit -m "feat(api): add StripeWebhookService with event handlers and tests"
```

---

## Task 6: PlanLimitsService — respect planStatus

**Files:**
- Modify: `apps/api/src/modules/plans/plan-limits.service.ts`
- Modify/Create: `apps/api/src/modules/plans/plan-limits.service.spec.ts`

- [ ] **Step 1: Write failing tests for getUserPlan**

Create (or add to) `apps/api/src/modules/plans/plan-limits.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, Project, Feedback, TeamMember, Team, PlanType } from '@insightstream/database';
import { PlanLimitsService } from './plan-limits.service';

describe('PlanLimitsService.getUserPlan', () => {
  let service: PlanLimitsService;
  let userRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    userRepo = { findOne: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitsService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Project), useValue: { count: jest.fn() } },
        { provide: getRepositoryToken(Feedback), useValue: { count: jest.fn() } },
        { provide: getRepositoryToken(TeamMember), useValue: { count: jest.fn() } },
        { provide: getRepositoryToken(Team), useValue: { findOne: jest.fn() } },
      ],
    }).compile();
    service = module.get<PlanLimitsService>(PlanLimitsService);
  });

  it('returns FREE when planStatus is past_due, regardless of stored plan', async () => {
    userRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'past_due' });
    expect(await service.getUserPlan('user-1')).toBe(PlanType.FREE);
  });

  it('returns FREE when planStatus is canceled', async () => {
    userRepo.findOne.mockResolvedValue({ plan: 'BUSINESS', planStatus: 'canceled' });
    expect(await service.getUserPlan('user-1')).toBe(PlanType.FREE);
  });

  it('returns actual plan when status is active', async () => {
    userRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'active' });
    expect(await service.getUserPlan('user-1')).toBe(PlanType.PRO);
  });

  it('returns actual plan when status is trialing', async () => {
    userRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'trialing' });
    expect(await service.getUserPlan('user-1')).toBe(PlanType.PRO);
  });

  it('returns FREE when user not found', async () => {
    userRepo.findOne.mockResolvedValue(null);
    expect(await service.getUserPlan('user-1')).toBe(PlanType.FREE);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm --filter @insightstream/api test plan-limits.service.spec
```

Expected: `returns FREE when planStatus is past_due` — FAIL (current implementation ignores planStatus).

- [ ] **Step 3: Update getUserPlan in PlanLimitsService**

In `apps/api/src/modules/plans/plan-limits.service.ts`, replace `getUserPlan`:

```typescript
async getUserPlan(userId: string): Promise<PlanType> {
  const user = await this.userRepo.findOne({ where: { id: userId } });
  const planStatus = user?.planStatus ?? 'active';
  if (planStatus === 'past_due' || planStatus === 'canceled') {
    return PlanType.FREE;
  }
  return (user?.plan as PlanType) || PlanType.FREE;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm --filter @insightstream/api test plan-limits.service.spec
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/plans/plan-limits.service.ts apps/api/src/modules/plans/plan-limits.service.spec.ts
git commit -m "feat(api): gate plan features on planStatus — past_due/canceled treated as FREE"
```

---

## Task 7: Controllers + Module + App wiring

**Files:**
- Create: `apps/api/src/modules/stripe/stripe.controller.ts`
- Create: `apps/api/src/modules/stripe/stripe-webhook.controller.ts`
- Create: `apps/api/src/modules/stripe/stripe.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Create StripeController**

```typescript
// apps/api/src/modules/stripe/stripe.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@insightstream/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StripeService } from './stripe.service';

@Controller('plans')
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Request() req: any, @Body() body: { priceId: string }) {
    if (!body.priceId) throw new BadRequestException('priceId is required');
    const user = await this.userRepo.findOneOrFail({ where: { id: req.user.id } });
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = await this.stripeService.createCheckoutSession(
      user,
      body.priceId,
      `${frontendUrl}/dashboard/billing?success=true`,
      `${frontendUrl}/dashboard/billing`,
    );
    return { url };
  }

  @Get('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(@Request() req: any) {
    const user = await this.userRepo.findOneOrFail({ where: { id: req.user.id } });
    if (!user.stripeCustomerId) {
      throw new BadRequestException('No active subscription');
    }
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = await this.stripeService.createPortalSession(
      user.stripeCustomerId,
      `${frontendUrl}/dashboard/billing`,
    );
    return { url };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getPlanStatus(@Request() req: any) {
    const user = await this.userRepo.findOneOrFail({ where: { id: req.user.id } });
    return {
      plan: user.plan,
      planStatus: user.planStatus ?? 'active',
      trialEndsAt: user.trialEndsAt ?? null,
      stripePriceId: user.stripePriceId ?? null,
      stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    };
  }
}
```

- [ ] **Step 2: Create StripeWebhookController**

```typescript
// apps/api/src/modules/stripe/stripe-webhook.controller.ts
import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private stripeService: StripeService,
    private webhookService: StripeWebhookService,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody!, signature);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.webhookService.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
        await this.webhookService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.webhookService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.payment_failed':
        await this.webhookService.handlePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }
}
```

- [ ] **Step 3: Create StripeModule**

```typescript
// apps/api/src/modules/stripe/stripe.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@insightstream/database';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [StripeService, StripeWebhookService],
  controllers: [StripeController, StripeWebhookController],
})
export class StripeModule {}
```

- [ ] **Step 4: Add StripeModule to AppModule**

In `apps/api/src/app.module.ts`, add the import:

```typescript
import { StripeModule } from './modules/stripe/stripe.module';
```

And add `StripeModule` to the `imports` array (after `ActivityModule`):

```typescript
StripeModule,
```

- [ ] **Step 5: Enable rawBody in main.ts**

In `apps/api/src/main.ts`, change line 10:

```typescript
// Before:
const app = await NestFactory.create(AppModule);

// After:
const app = await NestFactory.create(AppModule, { rawBody: true });
```

- [ ] **Step 6: Start API and verify endpoints are registered**

```bash
pnpm --filter @insightstream/api dev
```

Expected output includes:
```
[Nest] LOG [RouterExplorer] Mapped {/plans/checkout, POST}
[Nest] LOG [RouterExplorer] Mapped {/plans/portal, GET}
[Nest] LOG [RouterExplorer] Mapped {/plans/status, GET}
[Nest] LOG [RouterExplorer] Mapped {/webhooks/stripe, POST}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/stripe/ apps/api/src/app.module.ts apps/api/src/main.ts
git commit -m "feat(api): add StripeModule with checkout, portal, status, and webhook endpoints"
```

---

## Task 8: Env vars — Stripe keys

**Files:** `.env` (local, not committed), Railway dashboard (prod)

- [ ] **Step 1: Create Stripe account and test products**

1. Go to [stripe.com](https://stripe.com) → sign up or log in
2. Make sure you're in **Test Mode** (toggle in top-left)
3. Go to **Products** → **Add product**
4. Create **InsightStream PRO** product:
   - Add price: $9/month recurring → copy Price ID (`price_...`)
   - Add price: $90/year recurring → copy Price ID
5. Create **InsightStream BUSINESS** product:
   - Add price: $29/month recurring → copy Price ID
   - Add price: $290/year recurring → copy Price ID
6. Go to **Developers** → **API keys** → copy **Secret key** (`sk_test_...`)
7. Go to **Developers** → **Webhooks** → **Add endpoint** (use Stripe CLI for local, see step 2)

- [ ] **Step 2: Add env vars to local .env**

Add to `apps/api/.env` (create if missing):

```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PRO_MONTHLY_PRICE_ID=price_YOUR_ID_HERE
STRIPE_PRO_ANNUAL_PRICE_ID=price_YOUR_ID_HERE
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_YOUR_ID_HERE
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_YOUR_ID_HERE
```

Add to `apps/web/.env.local` (create if missing):

```env
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_YOUR_ID_HERE
NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID=price_YOUR_ID_HERE
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_YOUR_ID_HERE
NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_YOUR_ID_HERE
```

- [ ] **Step 3: Install Stripe CLI for local webhook testing**

```bash
# Windows (via scoop):
scoop install stripe

# Or download from https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3001/webhooks/stripe
```

The CLI prints `webhook signing secret: whsec_...` — use this as `STRIPE_WEBHOOK_SECRET` in local env.

---

## Task 9: Frontend — planStatusQuery

**Files:**
- Modify: `apps/web/src/lib/queries.ts`

- [ ] **Step 1: Add PlanStatus type and planStatusQuery**

Add to `apps/web/src/lib/queries.ts`:

```typescript
export interface PlanStatus {
  plan: string;
  planStatus: 'active' | 'trialing' | 'past_due' | 'canceled';
  trialEndsAt: string | null;
  stripePriceId: string | null;
  stripeSubscriptionId: string | null;
}

export const planStatusQuery = queryOptions({
  queryKey: ['planStatus'],
  queryFn: () => api.get<PlanStatus>('/plans/status').then((r) => r.data),
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/queries.ts
git commit -m "feat(web): add planStatusQuery for Stripe billing state"
```

---

## Task 10: TrialBanner component

**Files:**
- Create: `apps/web/src/components/billing/TrialBanner.tsx`

- [ ] **Step 1: Create TrialBanner**

```typescript
// apps/web/src/components/billing/TrialBanner.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { planStatusQuery } from "@/lib/queries";

export function TrialBanner() {
  const router = useRouter();
  const { data } = useQuery(planStatusQuery);

  if (!data || data.planStatus !== "trialing") return null;

  const daysLeft = data.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-indigo-300">
        <Zap className="h-4 w-4" />
        {daysLeft !== null
          ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your PRO trial`
          : "You are on a PRO trial"}
      </div>
      <button
        onClick={() => router.push("/dashboard/billing")}
        className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        Upgrade now →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add TrialBanner to dashboard layout**

Open `apps/web/src/app/dashboard/page.tsx` (or the dashboard layout file if it exists).

Find the outermost wrapper `<div>` that wraps the dashboard content. Add `<TrialBanner />` as the very first child:

```typescript
import { TrialBanner } from "@/components/billing/TrialBanner";

// Inside the return, at the top of the main wrapper:
<div className="...">
  <TrialBanner />
  {/* rest of dashboard */}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/billing/TrialBanner.tsx apps/web/src/app/dashboard/page.tsx
git commit -m "feat(web): add TrialBanner for active trials"
```

---

## Task 11: CurrentPlanCard component

**Files:**
- Create: `apps/web/src/components/billing/CurrentPlanCard.tsx`

- [ ] **Step 1: Create CurrentPlanCard**

```typescript
// apps/web/src/components/billing/CurrentPlanCard.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { planStatusQuery, PlanStatus } from "@/lib/queries";
import { cn } from "@/lib/utils";

function statusLabel(status: PlanStatus["planStatus"]) {
  const map: Record<PlanStatus["planStatus"], string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Payment Failed",
    canceled: "Canceled",
  };
  return map[status];
}

function statusBadgeClass(status: PlanStatus["planStatus"]) {
  if (status === "trialing") return "bg-indigo-500/20 text-indigo-400";
  if (status === "past_due") return "bg-red-500/20 text-red-400";
  if (status === "canceled") return "bg-zinc-500/20 text-zinc-400";
  return "bg-green-500/20 text-green-400";
}

export function CurrentPlanCard() {
  const { data, isLoading } = useQuery(planStatusQuery);

  const handleManage = async () => {
    const res = await api.get<{ url: string }>("/plans/portal");
    window.location.href = res.data.url;
  };

  if (isLoading) {
    return <div className="h-24 animate-pulse bg-brand-surface rounded-xl border border-brand-border" />;
  }
  if (!data) return null;

  const daysLeft =
    data.trialEndsAt && data.planStatus === "trialing"
      ? Math.max(0, Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / 86_400_000))
      : null;

  return (
    <div className="p-5 bg-brand-surface border border-brand-border rounded-xl flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{data.plan}</span>
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              statusBadgeClass(data.planStatus),
            )}
          >
            {statusLabel(data.planStatus)}
          </span>
        </div>
        {daysLeft !== null && (
          <p className="text-sm text-zinc-400">
            Trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
          </p>
        )}
        {data.planStatus === "past_due" && (
          <p className="text-sm text-red-400">
            Payment failed — update your payment method to avoid downgrade to Free
          </p>
        )}
      </div>
      {data.stripeSubscriptionId && (
        <button
          onClick={handleManage}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0"
        >
          Manage subscription →
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/billing/CurrentPlanCard.tsx
git commit -m "feat(web): add CurrentPlanCard with plan status and portal link"
```

---

## Task 12: UsageMetrics component

**Files:**
- Create: `apps/web/src/components/billing/UsageMetrics.tsx`

- [ ] **Step 1: Create UsageMetrics**

```typescript
// apps/web/src/components/billing/UsageMetrics.tsx
"use client";

import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface UsageSummary {
  plan: string;
  projects: { current: number; max: number | null };
  feedbacksThisMonth: { current: number; max: number | null };
}

const usageQuery = queryOptions({
  queryKey: ["planUsage"],
  queryFn: () => api.get<UsageSummary>("/plans/usage").then((r) => r.data),
});

function ProgressBar({ current, max }: { current: number; max: number | null }) {
  const percent = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const isNear = percent >= 80;

  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isNear ? "bg-amber-400" : "bg-indigo-500",
          )}
          style={{ width: max ? `${percent}%` : "0%" }}
        />
      </div>
      <span className="text-xs text-zinc-500">
        {current.toLocaleString()} / {max !== null ? max.toLocaleString() : "∞"}
      </span>
    </div>
  );
}

export function UsageMetrics() {
  const { data, isLoading } = useQuery(usageQuery);

  if (isLoading) {
    return <div className="h-28 animate-pulse bg-brand-surface rounded-xl border border-brand-border" />;
  }
  if (!data) return null;

  return (
    <div className="p-5 bg-brand-surface border border-brand-border rounded-xl flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-zinc-300">Usage this month</h3>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400">Feedback</span>
          <ProgressBar
            current={data.feedbacksThisMonth.current}
            max={data.feedbacksThisMonth.max}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400">Projects</span>
          <ProgressBar current={data.projects.current} max={data.projects.max} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/billing/UsageMetrics.tsx
git commit -m "feat(web): add UsageMetrics with progress bars for billing page"
```

---

## Task 13: PricingCards component

**Files:**
- Create: `apps/web/src/components/billing/PricingCards.tsx`

- [ ] **Step 1: Create PricingCards**

```typescript
// apps/web/src/components/billing/PricingCards.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { planStatusQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PLANS = [
  {
    name: "PRO",
    monthlyPrice: "$9",
    annualPrice: "$90",
    // Next.js statically replaces process.env.NEXT_PUBLIC_* at build time — must reference directly
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
    features: [
      "10,000 feedback/month",
      "5 projects",
      "Full AI analysis",
      "Weekly digest",
      "Data export",
      "Up to 5 team members",
    ],
  },
  {
    name: "BUSINESS",
    monthlyPrice: "$29",
    annualPrice: "$290",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID ?? "",
    features: [
      "Unlimited feedback",
      "Unlimited projects",
      "Full AI analysis",
      "Weekly digest",
      "Data export",
      "Unlimited team members",
    ],
  },
];

export function PricingCards() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const { data: status } = useQuery(planStatusQuery);

  const handleUpgrade = async (priceId: string) => {
    if (!priceId) {
      toast.error("Price ID not configured. Check environment variables.");
      return;
    }
    setLoadingPriceId(priceId);
    try {
      const res = await api.post<{ url: string }>("/plans/checkout", { priceId });
      window.location.href = res.data.url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Upgrade Plan</h3>
        <div className="flex items-center gap-1 bg-brand-border rounded-lg p-1 text-xs">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              billing === "monthly" ? "bg-brand-surface text-white" : "text-zinc-400 hover:text-zinc-300",
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              billing === "annual" ? "bg-brand-surface text-white" : "text-zinc-400 hover:text-zinc-300",
            )}
          >
            Annual <span className="text-indigo-400">–17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const priceId = billing === "monthly" ? plan.monthlyPriceId : plan.annualPriceId;
          const displayPrice = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
          const isCurrentPlan =
            status?.plan === plan.name &&
            (status.planStatus === "active" || status.planStatus === "trialing");

          return (
            <div
              key={plan.name}
              className="p-5 bg-brand-surface border border-brand-border rounded-xl flex flex-col gap-4"
            >
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  {plan.name}
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {displayPrice}
                  <span className="text-sm font-normal text-zinc-400">
                    /{billing === "monthly" ? "mo" : "yr"}
                  </span>
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <span className="text-indigo-400 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(priceId)}
                disabled={isCurrentPlan || loadingPriceId === priceId}
                className={cn(
                  "w-full py-2 rounded-lg text-sm font-medium transition-colors",
                  isCurrentPlan
                    ? "bg-brand-border text-zinc-500 cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-70",
                )}
              >
                {isCurrentPlan
                  ? "Current plan"
                  : loadingPriceId === priceId
                    ? "Redirecting..."
                    : `Start 14-day trial`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/billing/PricingCards.tsx
git commit -m "feat(web): add PricingCards with monthly/annual toggle and Stripe checkout"
```

---

## Task 14: BillingPage

**Files:**
- Create: `apps/web/src/app/dashboard/billing/page.tsx`

- [ ] **Step 1: Create BillingPage**

```typescript
// apps/web/src/app/dashboard/billing/page.tsx
"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMetrics } from "@/components/billing/UsageMetrics";
import { PricingCards } from "@/components/billing/PricingCards";

function SuccessToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("You're now on the new plan! 🎉");
    }
  }, [searchParams]);

  return null;
}

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      <Suspense>
        <SuccessToast />
      </Suspense>
      <div>
        <h1 className="text-xl font-bold text-white">Billing</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your subscription and usage</p>
      </div>
      <CurrentPlanCard />
      <UsageMetrics />
      <PricingCards />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/billing/page.tsx
git commit -m "feat(web): add /dashboard/billing page"
```

---

## Task 15: Sidebar — add Billing nav link

**Files:**
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Add CreditCard import and Billing link**

In `apps/web/src/components/dashboard/Sidebar.tsx`:

Add `CreditCard` to the lucide-react import on line 7:

```typescript
import {
  LogOut,
  Plus,
  Sparkles,
  User,
  LayoutDashboard,
  ChevronDown,
  Check,
  Trash2,
  Settings,
  Users,
  Archive,
  Code,
  Activity,
  CreditCard,
} from "lucide-react";
```

Then in the navigation section, after the `Settings` link (around line 314–325) and before the `Team Settings` link, add:

```typescript
<Link
  href="/dashboard/billing"
  className={cn(
    "flex items-center gap-3 w-full p-2.5 rounded-xl font-medium text-sm transition-colors",
    isActive("/dashboard/billing")
      ? "bg-indigo-500/10 text-indigo-400"
      : "text-zinc-400 hover:text-white hover:bg-brand-border",
  )}
>
  <CreditCard className="h-4 w-4 text-indigo-400" /> Billing
</Link>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/dashboard/Sidebar.tsx
git commit -m "feat(web): add Billing link to sidebar navigation"
```

---

## Task 16: End-to-end manual test

- [ ] **Step 1: Start Stripe CLI webhook listener**

In a terminal:

```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
```

Copy the `whsec_...` signing secret and set it as `STRIPE_WEBHOOK_SECRET` in `apps/api/.env`.

- [ ] **Step 2: Start the app**

```bash
pnpm dev
```

- [ ] **Step 3: Test upgrade flow**

1. Log in at `http://localhost:3000`
2. Open sidebar → click **Billing**
3. Verify `/dashboard/billing` shows current plan (FREE), usage bars, and two pricing cards
4. Click **Start 14-day trial** on PRO
5. Verify redirect to Stripe Checkout (test mode)
6. Enter test card `4242 4242 4242 4242`, any future expiry, any CVC
7. Complete checkout
8. Verify redirect to `/dashboard/billing?success=true`
9. Verify toast: "You're now on the new plan!"
10. Verify CurrentPlanCard shows **PRO / Trial**

- [ ] **Step 4: Test subscription cancellation**

In the Stripe CLI terminal:

```bash
stripe trigger customer.subscription.deleted
```

Expected: user's plan reverts to FREE in DB. Refresh billing page — shows FREE / Canceled.

- [ ] **Step 5: Test payment failure**

```bash
stripe trigger invoice.payment_failed
```

Expected: `planStatus` = `past_due`. Billing page shows payment warning.

- [ ] **Step 6: Test Customer Portal**

On billing page, click **Manage subscription →**
Expected: redirect to Stripe's hosted Customer Portal.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: Stripe billing — checkout, subscriptions, trial, portal, billing page"
```
