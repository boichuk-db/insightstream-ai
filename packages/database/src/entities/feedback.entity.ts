import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Project } from './project.entity';
import { FeedbackStatus } from '@insightstream/shared-types';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ type: 'varchar', nullable: true })
  source: string;

  @Column({ type: 'float', nullable: true })
  sentimentScore: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  aiSummary: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'enum', enum: FeedbackStatus, default: FeedbackStatus.PENDING })
  status: FeedbackStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('Project', (project: Project) => project.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid' })
  projectId: string;
}
