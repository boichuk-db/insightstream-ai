import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Feedback } from '@insightstream/database';
import { AiService } from './ai.service';
import { AiProcessor } from './ai.processor';
import { AiSweepService } from './ai-sweep.service';
import { AiQueueService, AI_ANALYSIS_QUEUE } from './ai-queue.service';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Feedback]),
    BullModule.registerQueue({ name: AI_ANALYSIS_QUEUE }),
    PlansModule,
  ],
  providers: [AiService, AiProcessor, AiSweepService, AiQueueService],
  exports: [AiService, AiQueueService],
})
export class AiModule {}
