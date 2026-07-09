import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { getTypeOrmConfig } from './config/database.config';
import { getBullConfig } from './config/bull.config';
import { AiModule } from './modules/ai/ai.module';
import { WorkerEventsModule } from './worker-events.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot(getBullConfig()),
    TypeOrmModule.forRoot(getTypeOrmConfig({ migrationsRun: false })),
    AiModule,
    WorkerEventsModule,
  ],
})
export class WorkerModule {}
