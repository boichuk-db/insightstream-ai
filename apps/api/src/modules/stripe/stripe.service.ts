import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '@insightstream/database';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private static readonly BLOCKING_STATUSES = [
    'active',
    'trialing',
    'past_due',
  ];

  constructor(
    private config: ConfigService,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow('STRIPE_SECRET_KEY'));
  }

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

  async createOrGetCustomer(team: Team, ownerEmail: string): Promise<string> {
    if (team.stripeCustomerId) return team.stripeCustomerId;
    const customer = await this.stripe.customers.create({
      email: ownerEmail,
      metadata: { teamId: team.id },
    });
    await this.teamRepo.update(team.id, { stripeCustomerId: customer.id });
    this.logger.log(
      `Created Stripe customer ${customer.id} for team ${team.id}`,
    );
    return customer.id;
  }

  async createCheckoutSession(
    team: Team,
    ownerEmail: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    await this.assertNoActiveSubscription(team);
    const customerId = await this.createOrGetCustomer(team, ownerEmail);
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { teamId: team.id },
      },
      metadata: { teamId: team.id },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return session.url!;
  }

  async createPortalSession(
    stripeCustomerId: string,
    returnUrl: string,
  ): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  async retrieveSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'),
    );
  }
}
