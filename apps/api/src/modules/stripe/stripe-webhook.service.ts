import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, StripeEvent, PlanType } from '@insightstream/database';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';

/** Fields a subscription webhook applies to a team, minus the ordering stamp. */
type TeamPlanFields = Partial<
  Pick<
    Team,
    | 'plan'
    | 'planStatus'
    | 'stripeSubscriptionId'
    | 'stripePriceId'
    | 'trialEndsAt'
  >
>;

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(StripeEvent)
    private eventRepo: Repository<StripeEvent>,
    private config: ConfigService,
    private stripeService: StripeService,
  ) {}

  /**
   * Single entry point for verified webhooks. Idempotent (dedup by event id)
   * and order-safe (per-team, an event older than the last applied one is
   * ignored). Records every handled event so retries and reorders are inert.
   */
  async handleEvent(event: Stripe.Event): Promise<void> {
    if (await this.eventRepo.findOne({ where: { id: event.id } })) {
      this.logger.log(
        `Duplicate Stripe event ${event.id} (${event.type}) ignored`,
      );
      return;
    }

    const eventCreatedAt = new Date(event.created * 1000);
    let subscriptionId: string | null = null;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : null;
        await this.handleCheckoutCompleted(session, eventCreatedAt);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        subscriptionId = subscription.id;
        await this.handleSubscriptionUpdated(subscription, eventCreatedAt);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        subscriptionId = subscription.id;
        await this.handleSubscriptionDeleted(subscription, eventCreatedAt);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        subscriptionId = this.extractInvoiceSubscription(invoice);
        await this.handlePaymentFailed(invoice, eventCreatedAt);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
        return;
    }

    await this.recordEvent(event, subscriptionId, eventCreatedAt);
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    eventCreatedAt: Date,
  ): Promise<void> {
    const teamId = session.metadata?.teamId;
    if (!teamId) {
      this.logger.warn('checkout.session.completed: no teamId in metadata');
      return;
    }

    const subscription = await this.stripeService.retrieveSubscription(
      session.subscription as string,
    );
    const priceId = subscription.items.data[0]?.price.id;

    await this.applyIfNewer(teamId, eventCreatedAt, {
      plan: this.resolvePlan(priceId),
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId ?? null,
      planStatus: 'trialing',
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    });
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    eventCreatedAt: Date,
  ): Promise<void> {
    const teamId = subscription.metadata?.teamId;
    if (!teamId) {
      this.logger.warn('customer.subscription.updated: no teamId in metadata');
      return;
    }
    const priceId = subscription.items.data[0]?.price.id;

    await this.applyIfNewer(teamId, eventCreatedAt, {
      plan: this.resolvePlan(priceId),
      planStatus: subscription.status,
      stripePriceId: priceId ?? null,
      stripeSubscriptionId: subscription.id,
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    });
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
    eventCreatedAt: Date,
  ): Promise<void> {
    const teamId = subscription.metadata?.teamId;
    if (!teamId) {
      this.logger.warn('customer.subscription.deleted: no teamId in metadata');
      return;
    }
    await this.applyIfNewer(teamId, eventCreatedAt, {
      plan: PlanType.FREE,
      planStatus: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
      trialEndsAt: null,
    });
  }

  private async handlePaymentFailed(
    invoice: Stripe.Invoice,
    eventCreatedAt: Date,
  ): Promise<void> {
    const customerId = invoice.customer as string;
    const team = await this.teamRepo.findOne({
      where: { stripeCustomerId: customerId },
    });
    if (!team) {
      this.logger.warn(
        `invoice.payment_failed: no team for Stripe customer ${customerId}`,
      );
      return;
    }
    await this.applyIfNewer(team.id, eventCreatedAt, {
      planStatus: 'past_due',
    });
  }

  /**
   * Atomic ordering guard: apply the plan fields (and advance the ordering
   * stamp) only when this event is not older than the last one already
   * applied. The `IS NULL OR "lastStripeEventAt" <= :eventCreatedAt` predicate
   * makes the check-and-set a single statement, so concurrent out-of-order
   * deliveries cannot resurrect a stale state; the `IS NULL` arm lets the very
   * first event through for rows that never carried a stamp.
   */
  private async applyIfNewer(
    teamId: string,
    eventCreatedAt: Date,
    fields: TeamPlanFields,
  ): Promise<void> {
    const result = await this.teamRepo
      .createQueryBuilder()
      .update(Team)
      .set({
        ...fields,
        planUpdatedAt: eventCreatedAt,
        lastStripeEventAt: eventCreatedAt,
      })
      .where(
        'id = :id AND ("lastStripeEventAt" IS NULL OR "lastStripeEventAt" <= :ts)',
        { id: teamId, ts: eventCreatedAt },
      )
      .execute();
    if (!result.affected) {
      this.logger.warn(
        `Stale or missing team for Stripe event at ${eventCreatedAt.toISOString()} (team ${teamId}) — skipped`,
      );
    }
  }

  private async recordEvent(
    event: Stripe.Event,
    subscriptionId: string | null,
    eventCreatedAt: Date,
  ): Promise<void> {
    try {
      await this.eventRepo.insert({
        id: event.id,
        type: event.type,
        subscriptionId,
        eventCreatedAt,
      });
    } catch (err: any) {
      // A concurrent duplicate delivery recorded it first — safe to ignore.
      this.logger.debug(
        `Stripe event ${event.id} already recorded: ${err.message}`,
      );
    }
  }

  private extractInvoiceSubscription(invoice: Stripe.Invoice): string | null {
    const sub = (invoice as { subscription?: string | { id: string } | null })
      .subscription;
    if (!sub) return null;
    return typeof sub === 'string' ? sub : sub.id;
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
