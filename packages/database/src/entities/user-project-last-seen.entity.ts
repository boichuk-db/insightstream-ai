import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("user_project_last_seen")
export class UserProjectLastSeen {
  @PrimaryColumn({ type: "uuid" })
  userId: string;

  @PrimaryColumn({ type: "uuid" })
  projectId: string;

  @Column({ type: "timestamptz" })
  seenAt: Date;
}
