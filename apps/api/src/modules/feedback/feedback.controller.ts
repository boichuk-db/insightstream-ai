import { Controller, Post, Get, Delete, Body, UseGuards, Request, Param } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    if (!body || !body.content) {
      return { 
        statusCode: 400, 
        message: 'Content is required in body', 
        receivedBody: body 
      };
    }
    return this.feedbackService.create(req.user.id, body.content, body.source);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.feedbackService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.feedbackService.findOne(id, req.user.id);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.feedbackService.remove(id, req.user.id);
  }
}
