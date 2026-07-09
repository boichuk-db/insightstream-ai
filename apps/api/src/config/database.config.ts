import { TypeOrmModuleOptions } from '@nestjs/typeorm';
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
  UserProjectLastSeen,
  StripeEvent,
} from '@insightstream/database';

export function getTypeOrmConfig(opts?: {
  migrationsRun?: boolean;
}): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'insight_user',
    password: process.env.DB_PASSWORD || 'insight_password',
    database: process.env.DB_DATABASE || 'insightstream_dev',
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
      UserProjectLastSeen,
      StripeEvent,
    ],
    synchronize: process.env.NODE_ENV !== 'production',
    migrations: [__dirname + '/../migrations/**/*.{ts,js}'],
    migrationsRun: opts?.migrationsRun ?? true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}
