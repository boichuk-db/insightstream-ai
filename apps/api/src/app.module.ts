import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EventsModule } from './modules/events/events.module';
import { DigestModule } from './modules/digest/digest.module';
import { PlansModule } from './modules/plans/plans.module';
import { TeamsModule } from './modules/teams/teams.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ActivityModule } from './modules/activity/activity.module';
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

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    }),
    TypeOrmModule.forRoot({
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
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      migrations: [__dirname + '/migrations/**/*.{ts,js}'],
      migrationsRun: true,
    }),
    UsersModule,
    AuthModule,
    FeedbackModule,
    ProjectsModule,
    EventsModule,
    DigestModule,
    PlansModule,
    TeamsModule,
    InvitationsModule,
    CommentsModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
