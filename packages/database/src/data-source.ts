import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Feedback } from './entities/feedback.entity';
import { Project } from './entities/project.entity';
import { AuditLog } from './entities/audit-log.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'insight_user',
  password: process.env.DB_PASSWORD || 'insight_password',
  database: process.env.DB_DATABASE || 'insightstream_dev',
  synchronize: process.env.NODE_ENV !== 'production', // Dev only
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, Feedback, Project, AuditLog],
  migrations: [],
  subscribers: [],
});
