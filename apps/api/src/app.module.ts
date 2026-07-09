import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { ApiThrottlerGuard } from './guards/api-throttler.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EventsModule } from './modules/events/events.module';
import { DigestModule } from './modules/digest/digest.module';
import { AiSweepModule } from './modules/ai/ai-sweep.module';
import { PlansModule } from './modules/plans/plans.module';
import { TeamsModule } from './modules/teams/teams.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ActivityModule } from './modules/activity/activity.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { RedisModule } from './redis/redis.module';
import { getTypeOrmConfig } from './config/database.config';
import { getBullConfig } from './config/bull.config';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot(getBullConfig()),
    RedisModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: parseInt(process.env.API_GLOBAL_LIMIT ?? '200', 10),
        },
      ],
      storage: new ThrottlerStorageRedisService(
        process.env.REDIS_URL ?? 'redis://localhost:6379',
      ),
    }),
    TypeOrmModule.forRoot(getTypeOrmConfig()),
    UsersModule,
    AuthModule,
    FeedbackModule,
    ProjectsModule,
    EventsModule,
    DigestModule,
    AiSweepModule,
    PlansModule,
    TeamsModule,
    InvitationsModule,
    CommentsModule,
    ActivityModule,
    StripeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiThrottlerGuard,
    },
  ],
})
export class AppModule {}
