import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, PlanType } from '@insightstream/database';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
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
      [process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '']: PlanType.PRO,
      [process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? '']: PlanType.PRO,
      [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? '']: PlanType.BUSINESS,
      [process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID ?? '']: PlanType.BUSINESS,
    };
    return ids[priceId] ?? PlanType.FREE;
  }
}
