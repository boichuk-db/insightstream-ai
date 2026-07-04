import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import type { User } from "./user.entity";
import type { TeamMember } from "./team-member.entity";
import type { Project } from "./project.entity";

@Entity("teams")
export class Team {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "uuid" })
  ownerId: string;

  @ManyToOne("User")
  @JoinColumn({ name: "ownerId" })
  owner: User;

  @Column({ type: "varchar", length: 20, default: "FREE" })
  plan: string;

  @Column({ type: "timestamp", nullable: true })
  planUpdatedAt: Date | null;

  @Column({ type: "varchar", length: 20, default: "active" })
  planStatus: string;

  @Index()
  @Column({ type: "varchar", nullable: true, default: null })
  stripeCustomerId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripeSubscriptionId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripePriceId: string | null;

  @Column({ type: "timestamp", nullable: true, default: null })
  trialEndsAt: Date | null;

  /**
   * `created` of the last Stripe subscription event applied to this team.
   * Ordering guard for out-of-order webhooks (see StripeWebhookService).
   * Nullable + epoch DB default so dev `synchronize` never needs a
   * `SET NOT NULL` on a populated table.
   */
  @Column({ type: "timestamp", nullable: true, default: () => "'1970-01-01 00:00:00'" })
  lastStripeEventAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany("TeamMember", (tm: TeamMember) => tm.team)
  members: TeamMember[];

  @OneToMany("Project", (p: Project) => p.team)
  projects: Project[];
}
