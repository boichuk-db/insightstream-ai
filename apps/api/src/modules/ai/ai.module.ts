import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Feedback } from '@insightstream/database';
import { AiService } from './ai.service';
import { AiProcessor } from './ai.processor';
import { AiQueueService, AI_ANALYSIS_QUEUE } from './ai-queue.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Feedback]),
    BullModule.registerQueue({ name: AI_ANALYSIS_QUEUE }),
  ],
  providers: [AiService, AiProcessor, AiQueueService],
  exports: [AiService, AiQueueService],
})
export class AiModule {}
