import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiQueueService, AI_ANALYSIS_QUEUE } from './ai-queue.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: AI_ANALYSIS_QUEUE }),
  ],
  providers: [AiService, AiQueueService],
  exports: [AiService, AiQueueService],
})
export class AiModule {}
