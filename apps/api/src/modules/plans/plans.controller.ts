import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanLimitsService } from './plan-limits.service';
import { TeamMember, PLAN_CONFIGS } from '@insightstream/database';

@Controller('plans')
export class PlansController {
  constructor(
    private planLimitsService: PlanLimitsService,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
  ) {}

  @Get()
  getAllPlans() {
    return Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
      type: key,
      ...config,
      maxProjects: config.maxProjects === Infinity ? null : config.maxProjects,
      maxFeedbacksPerMonth:
        config.maxFeedbacksPerMonth === Infinity
          ? null
          : config.maxFeedbacksPerMonth,
    }));
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Request() req: any, @Query('teamId') teamId: string) {
    if (!teamId) throw new BadRequestException('teamId is required');
    const member = await this.memberRepo.findOne({
      where: { teamId, userId: req.user.id },
    });
    if (!member) throw new ForbiddenException('Not a member of this team');
    const summary = await this.planLimitsService.getUsageSummary(teamId);
    return {
      ...summary,
      projects: {
        ...summary.projects,
        max: summary.projects.max === Infinity ? null : summary.projects.max,
      },
      feedbacksThisMonth: {
        ...summary.feedbacksThisMonth,
        max:
          summary.feedbacksThisMonth.max === Infinity
            ? null
            : summary.feedbacksThisMonth.max,
      },
    };
  }
}
