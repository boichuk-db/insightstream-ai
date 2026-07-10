import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '@insightstream/database';
import { AiProcessor } from './ai.processor';
import { AiModule } from './ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback]), AiModule],
  providers: [AiProcessor],
})
export class AiWorkerModule {}
