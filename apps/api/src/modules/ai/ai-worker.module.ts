import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '@insightstream/database';
import { AiProcessor } from './ai.processor';
import { AiModule } from './ai.module';
import { AI_ANALYSIS_QUEUE } from './ai-queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback]),
    BullModule.registerQueue({ name: AI_ANALYSIS_QUEUE }),
    AiModule,
  ],
  providers: [AiProcessor],
})
export class AiWorkerModule {}
