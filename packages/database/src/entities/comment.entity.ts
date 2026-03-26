import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Feedback } from './feedback.entity';
import type { User } from './user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  feedbackId: string;

  @ManyToOne('Feedback', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feedbackId' })
  feedback: Feedback;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
