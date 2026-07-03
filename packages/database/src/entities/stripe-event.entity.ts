import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from "typeorm";

/**
 * Log of processed Stripe webhook events.
 *
 * The Stripe event id is the primary key, so recording an event is an
 * idempotent insert — a retry of the same event conflicts on the PK and is
 * skipped (dedup). Also seeds the future subscription-history table.
 */
@Entity("stripe_events")
export class StripeEvent {
  @PrimaryColumn({ type: "varchar" })
  id: string;

  @Column({ type: "varchar" })
  type: string;

  @Index()
  @Column({ type: "varchar", nullable: true, default: null })
  subscriptionId: string | null;

  /** The event's own `created` timestamp (Stripe delivery-order clock). */
  @Column({ type: "timestamp" })
  eventCreatedAt: Date;

  @CreateDateColumn()
  processedAt: Date;
}
