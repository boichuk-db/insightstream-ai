import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import type { Team } from "./team.entity";
import type { User } from "./user.entity";
import { TeamRole } from "./team-member.entity";

export enum InvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
}

@Entity("invitations")
export class Invitation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  teamId: string;

  @ManyToOne("Team", { onDelete: "CASCADE" })
  @JoinColumn({ name: "teamId" })
  team: Team;

  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "varchar", default: TeamRole.MEMBER })
  role: TeamRole;

  @Column({ type: "uuid", unique: true })
  @Index()
  token: string;

  @Column({ type: "varchar", default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Column({ type: "uuid" })
  invitedById: string;

  @ManyToOne("User")
  @JoinColumn({ name: "invitedById" })
  invitedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "timestamp" })
  expiresAt: Date;
}
