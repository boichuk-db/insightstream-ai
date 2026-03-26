import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('feedbacks/:feedbackId/comments')
  async create(
    @Param('feedbackId') feedbackId: string,
    @Body() body: { content: string },
    @Request() req: any,
  ) {
    return this.commentsService.create(feedbackId, req.user.id, body.content);
  }

  @Get('feedbacks/:feedbackId/comments')
  async findByFeedback(@Param('feedbackId') feedbackId: string) {
    const comments = await this.commentsService.findByFeedback(feedbackId);
    return comments.map(c => ({
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
