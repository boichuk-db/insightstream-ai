import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  ForbiddenException,
  Headers,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { ProjectsService } from '../projects/projects.service';

@Controller('feedback/public')
export class FeedbackPublicController {
  constructor(
    private feedbackService: FeedbackService,
    private projectsService: ProjectsService,
  ) {}

  @Post()
  async createPublic(
    @Body() body: { apiKey: string; content: string; source?: string },
    @Headers('origin') origin?: string,
  ) {
    if (!body.apiKey || !body.apiKey.trim()) {
      throw new UnauthorizedException('API Key is required');
    }

    const project = await this.projectsService.findByApiKey(body.apiKey);
    if (!project) {
      throw new UnauthorizedException('Invalid API Key');
    }

    if (project.domain) {
      if (!origin) {
        throw new ForbiddenException(
          'Direct API access is not allowed. Requests must originate from the whitelisted domain.',
        );
      }

      try {
        const originUrl = new URL(origin);
        const isLocalhost =
          originUrl.hostname === 'localhost' ||
          originUrl.hostname === '127.0.0.1';

        // Support exact match or subdomains
        const isAuthorized =
          originUrl.hostname === project.domain ||
          originUrl.hostname.endsWith(`.${project.domain}`);

        if (!isLocalhost && !isAuthorized) {
          throw new ForbiddenException(
            `Origin '${originUrl.hostname}' is not whitelisted for this project.`,
          );
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        throw new ForbiddenException('Invalid Origin header');
      }
    }

    return this.feedbackService.create(
      project.id,
      body.content,
      undefined,
      body.source || 'Widget',
    );
  }
}
