import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  Project,
  Feedback,
  TeamMember,
  Team,
  PlanType,
  PLAN_CONFIGS,
  PlanLimits,
} from '@insightstream/database';

@Injectable()
export class PlanLimitsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Feedback) private feedbackRepo: Repository<Feedback>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
  ) {}

  /** Effective plan of a team; past_due/canceled degrade to FREE. */
  async getTeamPlan(teamId: string): Promise<PlanType> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    const planStatus = team?.planStatus ?? 'active';
    if (planStatus === 'past_due' || planStatus === 'canceled') {
      return PlanType.FREE;
    }
    return (team?.plan as PlanType) || PlanType.FREE;
  }

  getLimits(plan: PlanType): PlanLimits {
    return PLAN_CONFIGS[plan] || PLAN_CONFIGS[PlanType.FREE];
  }

  async canCreateProject(
    teamId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const current = await this.projectRepo.count({ where: { teamId } });
    return {
      allowed: current < limits.maxProjects,
      current,
      max: limits.maxProjects,
    };
  }

  async canCreateFeedback(
    teamId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const current = await this.feedbackRepo.count({
      where: {
        project: { teamId },
        createdAt: MoreThanOrEqual(startOfMonth),
      },
      relations: ['project'],
    });

    return {
      allowed: current < limits.maxFeedbacksPerMonth,
      current,
      max: limits.maxFeedbacksPerMonth,
    };
  }

  async canCreateFeedbackForProject(
    projectId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) {
      return { allowed: false, current: 0, max: 0 };
    }
    return this.canCreateFeedback(project.teamId);
  }

  async canUseFeature(
    teamId: string,
    feature: keyof PlanLimits,
  ): Promise<boolean> {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'none';
    if (typeof value === 'number') return value > 0;
    return false;
  }

  async canInviteMember(
    teamId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const current = await this.memberRepo.count({ where: { teamId } });
    return {
      allowed: current < limits.maxTeamMembers,
      current,
      max: limits.maxTeamMembers,
    };
  }

  async getUsageSummary(teamId: string) {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const projectCheck = await this.canCreateProject(teamId);
    const feedbackCheck = await this.canCreateFeedback(teamId);

    return {
      plan,
      planName: PLAN_CONFIGS[plan].name,
      price: PLAN_CONFIGS[plan].price,
      projects: { current: projectCheck.current, max: limits.maxProjects },
      feedbacksThisMonth: {
        current: feedbackCheck.current,
        max: limits.maxFeedbacksPerMonth,
      },
      features: {
        aiAnalysis: limits.aiAnalysis,
        weeklyDigest: limits.weeklyDigest,
        widgetCustomization: limits.widgetCustomization,
        dataExport: limits.dataExport,
      },
    };
  }

  assertAllowed(
    check: { allowed: boolean; current: number; max: number },
    resourceName: string,
    plan: string,
  ) {
    if (!check.allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PlanLimitExceeded',
        message: `Your ${PLAN_CONFIGS[plan as PlanType]?.name || plan} plan allows ${check.max} ${resourceName}. Upgrade for more.`,
        currentPlan: plan,
        limit: check.max,
        current: check.current,
      });
    }
  }
}
