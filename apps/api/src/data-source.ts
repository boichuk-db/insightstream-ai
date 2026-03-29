import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  User,
  Feedback,
  Project,
  AuditLog,
  Team,
  TeamMember,
  Invitation,
  Comment,
  ActivityEvent,
} from '@insightstream/database';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'insight_user',
  password: process.env.DB_PASSWORD || 'insight_password',
  database: process.env.DB_DATABASE || 'insightstream_dev',
  synchronize: false,
  logging: false,
  entities: [
    User,
    Feedback,
    Project,
    AuditLog,
    Team,
    TeamMember,
    Invitation,
    Comment,
    ActivityEvent,
  ],
  migrations: [__dirname + '/migrations/**/*.{ts,js}'],
});
