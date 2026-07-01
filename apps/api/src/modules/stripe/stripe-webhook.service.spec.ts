import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, PlanType } from '@insightstream/database';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeService } from './stripe.service';

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;
  let userRepo: { update: jest.Mock; findOne: jest.Mock };
  let stripeService: { retrieveSubscription: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    userRepo = {
      update: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
    };
    stripeService = {
      retrieveSubscription: jest.fn(),
    };
    configService = {
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
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: StripeService, useValue: stripeService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = module.get<StripeWebhookService>(StripeWebhookService);
  });

  describe('handleCheckoutCompleted', () => {
    it('retrieves subscription and sets plan, priceId, trialEndsAt', async () => {
      stripeService.retrieveSubscription.mockResolvedValue({
        id: 'sub_new',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
        trial_end: 1800000000,
      });
      const session = {
        metadata: { userId: 'user-1' },
        subscription: 'sub_new',
      } as any;

      await service.handleCheckoutCompleted(session);

      expect(stripeService.retrieveSubscription).toHaveBeenCalledWith('sub_new');
      expect(userRepo.update).toHaveBeenCalledWith('user-1', {
        plan: PlanType.PRO,
        stripeSubscriptionId: 'sub_new',
        stripePriceId: 'price_pro_monthly',
        planStatus: 'trialing',
        trialEndsAt: new Date(1800000000 * 1000),
      });
    });

    it('sets trialEndsAt to null when subscription has no trial', async () => {
      stripeService.retrieveSubscription.mockResolvedValue({
        id: 'sub_new',
        items: { data: [{ price: { id: 'price_biz_annual' } }] },
        trial_end: null,
      });
      const session = {
        metadata: { userId: 'user-1' },
        subscription: 'sub_new',
      } as any;

      await service.handleCheckoutCompleted(session);

      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ trialEndsAt: null }),
      );
    });

    it('logs warning and skips when userId missing', async () => {
      const session = { metadata: {}, subscription: 'sub_new' } as any;
      await service.handleCheckoutCompleted(session);
      expect(stripeService.retrieveSubscription).not.toHaveBeenCalled();
      expect(userRepo.update).not.toHaveBeenCalled();
    });
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

    it('logs warning and skips update when userId missing', async () => {
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

      expect(userRepo.update).toHaveBeenCalledWith('user-1', {
        planStatus: 'past_due',
      });
    });

    it('skips update when no user found for customer', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const invoice = { customer: 'cus_unknown' } as any;
      await service.handlePaymentFailed(invoice);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionUpdated', () => {
    it('sets plan to PRO when PRO monthly price', async () => {
      const sub = {
        id: 'sub_1',
        metadata: { userId: 'user-1' },
        status: 'active',
        trial_end: null,
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      } as any;

      await service.handleSubscriptionUpdated(sub);

      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          plan: PlanType.PRO,
          planStatus: 'active',
          stripePriceId: 'price_pro_monthly',
        }),
      );
    });

    it('sets plan to BUSINESS and stores trialEndsAt when annual + trialing', async () => {
      const sub = {
        id: 'sub_1',
        metadata: { userId: 'user-1' },
        status: 'trialing',
        trial_end: 1800000000,
        items: { data: [{ price: { id: 'price_biz_annual' } }] },
      } as any;

      await service.handleSubscriptionUpdated(sub);

      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          plan: PlanType.BUSINESS,
          planStatus: 'trialing',
          trialEndsAt: new Date(1800000000 * 1000),
        }),
      );
    });

    it('defaults to FREE and warns on unrecognized priceId', async () => {
      const warnSpy = jest.spyOn(
        (service as any).logger,
        'warn',
      );
      const sub = {
        id: 'sub_1',
        metadata: { userId: 'user-1' },
        status: 'active',
        trial_end: null,
        items: { data: [{ price: { id: 'price_unknown_xyz' } }] },
      } as any;

      await service.handleSubscriptionUpdated(sub);

      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ plan: PlanType.FREE }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unrecognized priceId'),
      );
    });
  });
});
