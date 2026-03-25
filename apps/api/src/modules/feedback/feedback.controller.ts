import { Controller, Post, Get, Delete, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post()
  async create(@Request() req: any, @Body() body: { content: string; projectId: string; source?: string }) {
    if (!body?.content || !body?.projectId) {
      return { statusCode: 400, message: 'Content and projectId are required' };
    }
    return this.feedbackService.create(body.projectId, body.content, req.user.id, body.source);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.feedbackService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.feedbackService.findOne(id, req.user.id);
  }

  @Patch(':id/status')
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.feedbackService.updateStatus(id, status, req.user.id);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.feedbackService.remove(id, req.user.id);
  }
}
