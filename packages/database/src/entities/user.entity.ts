import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import type { Project } from "./project.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar", nullable: true, default: null })
  passwordHash: string | null;

  @Column({ type: "varchar", default: "user" })
  role: string;

  @Column({ type: "varchar", length: 20, default: "FREE" })
  plan: string;

  @Column({ type: "timestamp", nullable: true })
  planUpdatedAt: Date | null;

  @Index()
  @Column({ type: "varchar", nullable: true, default: null })
  stripeCustomerId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripeSubscriptionId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripePriceId: string | null;

  @Column({ type: "varchar", length: 20, default: "active" })
  planStatus: string;

  @Column({ type: "timestamp", nullable: true, default: null })
  trialEndsAt: Date | null;

  /**
   * `created` timestamp of the last Stripe subscription event applied to this
   * user. Guards against out-of-order webhook delivery: an event whose
   * `created` predates this is ignored (see StripeWebhookService). The DB
   * default (epoch) means every row is non-null in practice, so the first
   * event always matches the conditional `WHERE lastStripeEventAt <= :eventCreated`
   * update. Left nullable (no NOT NULL constraint) so dev `synchronize` can add
   * it to the already-populated users table without a failing `SET NOT NULL`.
   */
  @Column({ type: "timestamp", nullable: true, default: () => "'1970-01-01 00:00:00'" })
  lastStripeEventAt: Date | null;

  @Column({ type: "varchar", unique: true, nullable: true, default: null })
  apiKey: string | null;

  @Column({ type: "varchar", unique: true, nullable: true, default: null })
  googleId: string | null;

  @Column({ type: "varchar", unique: true, nullable: true, default: null })
  githubId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  resetPwdToken: string | null;

  @Column({ type: "timestamp", nullable: true, default: null })
  resetPwdExpires: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany("Project", (project: Project) => project.user)
  projects: Project[];
}
