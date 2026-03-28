import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import type { User } from "./user.entity";

export enum ActivityAction {
  MEMBER_JOINED = "member_joined",
  MEMBER_REMOVED = "member_removed",
  MEMBER_ROLE_CHANGED = "member_role_changed",
  FEEDBACK_STATUS_CHANGED = "feedback_status_changed",
  COMMENT_ADDED = "comment_added",
  PROJECT_CREATED = "project_created",
  PROJECT_DELETED = "project_deleted",
  INVITATION_SENT = "invitation_sent",
}

@Entity("activity_events")
export class ActivityEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  @Index()
  teamId: string;

  @Column({ type: "uuid", nullable: true })
  @Index()
  projectId: string | null;

  @Column({ type: "uuid" })
  actorId: string;

  @ManyToOne("User")
  @JoinColumn({ name: "actorId" })
  actor: User;

  @Column({ type: "varchar" })
  action: ActivityAction;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
