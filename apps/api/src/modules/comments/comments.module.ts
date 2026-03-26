import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment, Feedback, TeamMember } from '@insightstream/database';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Feedback, TeamMember]),
    ActivityModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
