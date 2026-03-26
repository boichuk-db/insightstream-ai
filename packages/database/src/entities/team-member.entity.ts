import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import type { Team } from './team.entity';
import type { User } from './user.entity';

export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export const ROLE_HIERARCHY: Record<TeamRole, number> = {
  [TeamRole.OWNER]: 4,
  [TeamRole.ADMIN]: 3,
  [TeamRole.MEMBER]: 2,
  [TeamRole.VIEWER]: 1,
};

export function hasMinRole(userRole: TeamRole, requiredRole: TeamRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

@Entity('team_members')
@Unique(['teamId', 'userId'])
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  teamId: string;

  @ManyToOne('Team', (t: Team) => t.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', default: TeamRole.MEMBER })
  role: TeamRole;

  @CreateDateColumn()
  joinedAt: Date;
}
