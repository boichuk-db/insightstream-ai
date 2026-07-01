import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanLimitsService } from './plan-limits.service';
import { User, PlanType, PLAN_CONFIGS } from '@insightstream/database';

@Controller('plans')
export class PlansController {
  constructor(
    private planLimitsService: PlanLimitsService,
    @InjectRepository(User) private userRepo: Repository<User>,
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
  async getUsage(@Request() req: any) {
    const summary = await this.planLimitsService.getUsageSummary(req.user.id);
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
