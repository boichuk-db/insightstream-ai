import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, PlanType } from '@insightstream/database';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService,
    private stripeService: StripeService,
  ) {}

  async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.warn('checkout.session.completed: no userId in metadata');
      return;
    }

    const subscription = await this.stripeService.retrieveSubscription(
      session.subscription as string,
    );
    const priceId = subscription.items.data[0]?.price.id;

    await this.userRepo.update(userId, {
      plan: this.resolvePlan(priceId),
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId ?? null,
      planStatus: 'trialing',
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    });
  }

  async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      this.logger.warn('customer.subscription.updated: no userId in metadata');
      return;
    }
    const priceId = subscription.items.data[0]?.price.id;
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;

    await this.userRepo.update(userId, {
      plan: this.resolvePlan(priceId),
      planStatus: subscription.status,
      stripePriceId: priceId ?? null,
      stripeSubscriptionId: subscription.id,
      trialEndsAt: trialEnd,
    });
  }

  async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
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
    const user = await this.userRepo.findOne({
      where: { stripeCustomerId: customerId },
    });
    if (!user) {
      this.logger.warn(
        `invoice.payment_failed: no user for Stripe customer ${customerId}`,
      );
      return;
    }
    await this.userRepo.update(user.id, { planStatus: 'past_due' });
  }

  private resolvePlan(priceId: string | undefined): PlanType {
    if (!priceId) return PlanType.FREE;
    const ids: Record<string, PlanType> = {
      [this.config.get('STRIPE_PRO_MONTHLY_PRICE_ID') ?? '']: PlanType.PRO,
      [this.config.get('STRIPE_PRO_ANNUAL_PRICE_ID') ?? '']: PlanType.PRO,
      [this.config.get('STRIPE_BUSINESS_MONTHLY_PRICE_ID') ?? '']:
        PlanType.BUSINESS,
      [this.config.get('STRIPE_BUSINESS_ANNUAL_PRICE_ID') ?? '']:
        PlanType.BUSINESS,
    };
    const plan = ids[priceId];
    if (!plan) {
      this.logger.warn(
        `resolvePlan: unrecognized priceId "${priceId}", defaulting to FREE`,
      );
    }
    return plan ?? PlanType.FREE;
  }
}
