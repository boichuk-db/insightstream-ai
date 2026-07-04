import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team, StripeEvent, PlanType } from '@insightstream/database';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeService } from './stripe.service';

/** Wrap a Stripe object as a webhook Event envelope. */
function makeEvent(
  type: string,
  object: any,
  id = 'evt_1',
  created = 1_700_000_000,
) {
  return { id, type, created, data: { object } } as any;
}

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;
  // Chainable UpdateQueryBuilder stub; every applyIfNewer call funnels here.
  let qb: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };
  let teamRepo: { createQueryBuilder: jest.Mock; findOne: jest.Mock };
  let eventRepo: { findOne: jest.Mock; insert: jest.Mock };
  let stripeService: { retrieveSubscription: jest.Mock };

  beforeEach(async () => {
    qb = {
      update: jest.fn(() => qb),
      set: jest.fn(() => qb),
      where: jest.fn(() => qb),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    teamRepo = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(),
    };
    eventRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue({}),
    };
    stripeService = {
      retrieveSubscription: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          STRIPE_PRO_MONTHLY_PRICE_ID: 'price_pro_monthly',
          STRIPE_PRO_ANNUAL_PRICE_ID: 'price_pro_annual',
          STRIPE_BUSINESS_MONTHLY_PRICE_ID: 'price_biz_monthly',
          STRIPE_BUSINESS_ANNUAL_PRICE_ID: 'price_biz_annual',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookService,
        { provide: getRepositoryToken(Team), useValue: teamRepo },
        { provide: getRepositoryToken(StripeEvent), useValue: eventRepo },
        { provide: StripeService, useValue: stripeService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = module.get<StripeWebhookService>(StripeWebhookService);
  });

  describe('idempotency (dedup)', () => {
    it('skips dispatch entirely when the event id was already processed', async () => {
      eventRepo.findOne.mockResolvedValue({ id: 'evt_1' });
      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_1',
        metadata: { teamId: 't1' },
        items: { data: [] },
      });

      await service.handleEvent(event);

      expect(teamRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(eventRepo.insert).not.toHaveBeenCalled();
    });

    it('records the event after successful handling', async () => {
      const event = makeEvent(
        'customer.subscription.deleted',
        { id: 'sub_1', metadata: { teamId: 't1' }, items: { data: [] } },
        'evt_del',
        1_700_000_500,
      );

      await service.handleEvent(event);

      expect(eventRepo.insert).toHaveBeenCalledWith({
        id: 'evt_del',
        type: 'customer.subscription.deleted',
        subscriptionId: 'sub_1',
        eventCreatedAt: new Date(1_700_000_500 * 1000),
      });
    });
  });

  describe('ordering guard', () => {
    it('gates the update on an IS NULL / <= eventCreated predicate and advances the stamp', async () => {
      const event = makeEvent(
        'customer.subscription.updated',
        {
          id: 'sub_1',
          metadata: { teamId: 't1' },
          status: 'active',
          trial_end: null,
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
        },
        'evt_upd',
        1_700_000_000,
      );

      await service.handleEvent(event);

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: PlanType.PRO,
          planUpdatedAt: new Date(1_700_000_000 * 1000),
          lastStripeEventAt: new Date(1_700_000_000 * 1000),
        }),
      );
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('"lastStripeEventAt" IS NULL'),
        { id: 't1', ts: new Date(1_700_000_000 * 1000) },
      );
    });

    it('does not throw and still records when the update is stale (affected 0)', async () => {
      qb.execute.mockResolvedValue({ affected: 0 });
      const event = makeEvent(
        'customer.subscription.updated',
        {
          id: 'sub_1',
          metadata: { teamId: 't1' },
          status: 'active',
          trial_end: null,
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
        },
        'evt_stale',
      );

      await service.handleEvent(event);

      expect(eventRepo.insert).toHaveBeenCalled();
    });
  });

  describe('checkout.session.completed', () => {
    it('retrieves subscription and applies plan, priceId, trialEndsAt, ordering stamp', async () => {
      stripeService.retrieveSubscription.mockResolvedValue({
        id: 'sub_new',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
        trial_end: 1800000000,
      });
      const event = makeEvent(
        'checkout.session.completed',
        { metadata: { teamId: 't1' }, subscription: 'sub_new' },
        'evt_co',
        1_700_000_100,
      );

      await service.handleEvent(event);

      expect(stripeService.retrieveSubscription).toHaveBeenCalledWith(
        'sub_new',
      );
      expect(qb.set).toHaveBeenCalledWith({
        plan: PlanType.PRO,
        stripeSubscriptionId: 'sub_new',
        stripePriceId: 'price_pro_monthly',
        planStatus: 'trialing',
        trialEndsAt: new Date(1800000000 * 1000),
        planUpdatedAt: new Date(1_700_000_100 * 1000),
        lastStripeEventAt: new Date(1_700_000_100 * 1000),
      });
    });

    it('skips when teamId missing in metadata', async () => {
      const event = makeEvent('checkout.session.completed', {
        metadata: {},
        subscription: 'sub_new',
      });
      await service.handleEvent(event);
      expect(stripeService.retrieveSubscription).not.toHaveBeenCalled();
      expect(teamRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.deleted', () => {
    it('downgrades to FREE and clears Stripe fields', async () => {
      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_1',
        metadata: { teamId: 't1' },
        items: { data: [] },
      });

      await service.handleEvent(event);

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: PlanType.FREE,
          planStatus: 'canceled',
          stripeSubscriptionId: null,
          stripePriceId: null,
          trialEndsAt: null,
        }),
      );
    });

    it('skips update when teamId missing', async () => {
      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_1',
        metadata: {},
        items: { data: [] },
      });
      await service.handleEvent(event);
      expect(teamRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('invoice.payment_failed', () => {
    it('sets planStatus to past_due for the matching customer', async () => {
      teamRepo.findOne.mockResolvedValue({
        id: 't1',
        stripeCustomerId: 'cus_1',
      });
      const event = makeEvent('invoice.payment_failed', {
        customer: 'cus_1',
        subscription: 'sub_1',
      });

      await service.handleEvent(event);

      expect(teamRepo.findOne).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
      });
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ planStatus: 'past_due' }),
      );
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('"lastStripeEventAt"'),
        expect.objectContaining({ id: 't1' }),
      );
    });

    it('skips update when no team found for customer', async () => {
      teamRepo.findOne.mockResolvedValue(null);
      const event = makeEvent('invoice.payment_failed', {
        customer: 'cus_unknown',
      });
      await service.handleEvent(event);
      expect(teamRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('sets plan to BUSINESS and stores trialEndsAt when annual + trialing', async () => {
      const event = makeEvent('customer.subscription.updated', {
        id: 'sub_1',
        metadata: { teamId: 't1' },
        status: 'trialing',
        trial_end: 1800000000,
        items: { data: [{ price: { id: 'price_biz_annual' } }] },
      });

      await service.handleEvent(event);

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: PlanType.BUSINESS,
          planStatus: 'trialing',
          trialEndsAt: new Date(1800000000 * 1000),
        }),
      );
    });

    it('defaults to FREE and warns on unrecognized priceId', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn');
      const event = makeEvent('customer.subscription.updated', {
        id: 'sub_1',
        metadata: { teamId: 't1' },
        status: 'active',
        trial_end: null,
        items: { data: [{ price: { id: 'price_unknown_xyz' } }] },
      });

      await service.handleEvent(event);

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ plan: PlanType.FREE }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unrecognized priceId'),
      );
    });
  });
});
