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

  async createCheckoutSession(
    user: User,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
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

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'),
    );
  }
}
