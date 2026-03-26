import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import type { User } from './user.entity';
import type { Team } from './team.entity';
import type { Feedback } from './feedback.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  domain: string;

  @Column({ type: 'uuid', unique: true })
  apiKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('User', (user: User) => user.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  teamId: string | null;

  @ManyToOne('Team', (team: Team) => team.projects, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @OneToMany('Feedback', (feedback: Feedback) => feedback.project)
  feedbacks: Feedback[];
}
