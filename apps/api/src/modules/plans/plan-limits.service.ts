import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  User,
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
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Feedback) private feedbackRepo: Repository<Feedback>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
  ) {}

  async getUserPlan(userId: string): Promise<PlanType> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return (user?.plan as PlanType) || PlanType.FREE;
  }

  getLimits(plan: PlanType): PlanLimits {
    return PLAN_CONFIGS[plan] || PLAN_CONFIGS[PlanType.FREE];
  }

  async canCreateProject(
    userId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const plan = await this.getUserPlan(userId);
    const limits = this.getLimits(plan);
    const current = await this.projectRepo.count({ where: { userId } });
    return {
      allowed: current < limits.maxProjects,
      current,
      max: limits.maxProjects,
    };
  }

  async canCreateFeedback(
    userId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const plan = await this.getUserPlan(userId);
    const limits = this.getLimits(plan);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const current = await this.feedbackRepo.count({
      where: {
        project: { userId },
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
    return this.canCreateFeedback(project.userId);
  }

  async canUseFeature(
    userId: string,
    feature: keyof PlanLimits,
  ): Promise<boolean> {
    const plan = await this.getUserPlan(userId);
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
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['owner'],
    });
    if (!team) return { allowed: false, current: 0, max: 0 };

    const ownerPlan = (team.owner?.plan as PlanType) || PlanType.FREE;
    const limits = this.getLimits(ownerPlan);
    const current = await this.memberRepo.count({ where: { teamId } });
    return {
      allowed: current < limits.maxTeamMembers,
      current,
      max: limits.maxTeamMembers,
    };
  }

  async getUsageSummary(userId: string) {
    const plan = await this.getUserPlan(userId);
    const limits = this.getLimits(plan);
    const projectCheck = await this.canCreateProject(userId);
    const feedbackCheck = await this.canCreateFeedback(userId);

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
