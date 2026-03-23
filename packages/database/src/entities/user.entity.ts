import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Feedback } from './feedback.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'varchar', default: 'user' })
  role: string;

  @Column({ type: 'boolean', default: false })
  isPro: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Feedback, feedback => feedback.user)
  feedbacks: Feedback[];
}
