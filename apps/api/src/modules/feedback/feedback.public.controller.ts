import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { UsersService } from '../users/users.service';

@Controller('feedback/public')
export class FeedbackPublicController {
  constructor(
    private feedbackService: FeedbackService,
    private usersService: UsersService,
  ) {}

  @Post()
  async createPublic(@Body() body: { apiKey: string; content: string; source?: string }) {
    if (!body.apiKey || !body.apiKey.trim()) {
      throw new UnauthorizedException('API Key is required');
    }

    const user = await this.usersService.findOneByApiKey(body.apiKey);
    if (!user) {
      throw new UnauthorizedException('Invalid API Key');
    }

    return this.feedbackService.create(user.id, body.content, body.source || 'Widget');
  }
}
