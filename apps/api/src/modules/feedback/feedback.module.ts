import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '@insightstream/database';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { FeedbackPublicController } from './feedback.public.controller';
import { AiModule } from '../ai/ai.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback]), AiModule, ProjectsModule],
  providers: [FeedbackService],
  controllers: [FeedbackController, FeedbackPublicController],
})
export class FeedbackModule {}
