import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '@insightstream/database';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(
    private config: ConfigService,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow('STRIPE_SECRET_KEY'));
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
