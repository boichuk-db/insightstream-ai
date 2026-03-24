import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import type { Project } from './project.entity';

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

  @OneToMany('Project', (project: Project) => project.user)
  projects: Project[];
}
