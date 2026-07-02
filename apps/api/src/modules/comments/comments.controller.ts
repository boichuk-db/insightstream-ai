import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('feedbacks/:feedbackId/comments')
  async create(
    @Param('feedbackId') feedbackId: string,
    @Body() body: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.commentsService.create(feedbackId, req.user.id, body.content);
  }

  @Get('feedbacks/:feedbackId/comments')
  async findByFeedback(
    @Param('feedbackId') feedbackId: string,
    @Request() req: any,
  ) {
    const comments = await this.commentsService.findByFeedback(
      feedbackId,
      req.user.id,
    );
    return comments.map((c) => ({
      id: c.id,
      content: c.content,
      userId: c.userId,
      userEmail: c.user?.email,
      createdAt: c.createdAt,
    }));
  }

  @Delete('comments/:commentId')
  async remove(@Param('commentId') commentId: string, @Request() req: any) {
    await this.commentsService.remove(commentId, req.user.id);
    return { success: true };
  }
}
