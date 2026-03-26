import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanLimitsService } from './plan-limits.service';
import { PlanType, PlanConfig, PLAN_CONFIGS } from '@insightstream/database';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@insightstream/database';
import { ForbiddenException } from '@nestjs/common';

@Controller('plans')
export class PlansController {
  constructor(
    private planLimitsService: PlanLimitsService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Get()
  getAllPlans() {
    return (Object.entries(PLAN_CONFIGS) as [string, PlanConfig][]).map(([key, config]) => ({
      type: key,
      ...config,
      maxProjects: config.maxProjects === Infinity ? null : config.maxProjects,
      maxFeedbacksPerMonth: config.maxFeedbacksPerMonth === Infinity ? null : config.maxFeedbacksPerMonth,
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
        max: summary.feedbacksThisMonth.max === Infinity ? null : summary.feedbacksThisMonth.max,
      },
    };
  }

  @Patch('upgrade')
  @UseGuards(JwtAuthGuard)
  async upgradePlan(@Request() req: any, @Body() body: { plan: string }) {
    const newPlan = body.plan as PlanType;
    if (!PLAN_CONFIGS[newPlan]) {
      throw new ForbiddenException('Invalid plan type');
    }

    await this.userRepo.update(req.user.id, {
      plan: newPlan,
      planUpdatedAt: new Date(),
    });

    return { success: true, plan: newPlan };
  }
}
