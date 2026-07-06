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

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => mockStripeInstance),
);

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

    // Setup default return values for mocks
    mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_1' });
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_1',
    });
    mockStripeInstance.subscriptions.list.mockResolvedValue({ data: [] });
    mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://portal.stripe.com',
    });

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
  });
});
