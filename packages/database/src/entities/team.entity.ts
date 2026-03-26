import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import type { User } from './user.entity';
import type { TeamMember } from './team-member.entity';
import type { Project } from './project.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany('TeamMember', (tm: TeamMember) => tm.team)
  members: TeamMember[];

  @OneToMany('Project', (p: Project) => p.team)
  projects: Project[];
}
