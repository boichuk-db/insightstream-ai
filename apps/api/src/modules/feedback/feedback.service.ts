import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Feedback,
  TeamMember,
  UserProjectLastSeen,
} from '@insightstream/database';
import { AiQueueService } from '../ai/ai-queue.service';
import { EventsService } from '../events/events.service';
import { ProjectsService } from '../projects/projects.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(UserProjectLastSeen)
    private lastSeenRepo: Repository<UserProjectLastSeen>,
    private aiQueueService: AiQueueService,
    private eventsService: EventsService,
    private projectsService: ProjectsService,
    private planLimitsService: PlanLimitsService,
  ) {}

  async create(
    projectId: string,
    content: string,
    userId?: string,
    source?: string,
  ) {
    if (!content) {
      throw new BadRequestException('Content is required');
    }
    // Verify the user owns this project if userId is provided
    let teamId: string | null = null;
    if (userId) {
      const project = await this.projectsService.findOne(projectId, userId);
      teamId = project.teamId;
      const check = await this.planLimitsService.canCreateFeedback(teamId);
      const plan = await this.planLimitsService.getTeamPlan(teamId);
      this.planLimitsService.assertAllowed(check, 'feedbacks this month', plan);
    } else {
      // Public widget — limits belong to the project's team
      const check =
        await this.planLimitsService.canCreateFeedbackForProject(projectId);
      const project = await this.projectsService.findByOnlyId(projectId);
      if (!project) throw new NotFoundException('Project not found');
      teamId = project.teamId;
      const plan = await this.planLimitsService.getTeamPlan(teamId);
      this.planLimitsService.assertAllowed(check, 'feedbacks this month', plan);
    }

    const feedback = this.feedbackRepository.create({
      content,
      projectId,
      source,
      status: 'New',
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    await this.eventsService.emitFeedbackUpdatedForProject(projectId);

    // Determine the team's AI analysis level
    let aiLevel: string = 'basic';
    if (teamId) {
      const limits = this.planLimitsService.getLimits(
        await this.planLimitsService.getTeamPlan(teamId),
      );
      aiLevel = limits.aiAnalysis;
    }

    if (aiLevel !== 'none' && teamId) {
      await this.aiQueueService.addAnalysisJob(
        {
          feedbackId: savedFeedback.id,
          content,
          projectId,
          teamId,
          aiLevel: aiLevel === 'full' ? 'full' : 'basic',
        },
        10,
      );
    }

    return savedFeedback;
  }

  async findByProject(projectId: string, userId: string): Promise<Feedback[]> {
    // Verify caller has access to this project
    await this.projectsService.findOne(projectId, userId);

    return this.feedbackRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  async findAllByTeam(teamId: string) {
    return this.feedbackRepository.find({
      where: { project: { teamId } },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string) {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!feedback) return null;

    // Access = membership in the project's team only
    if (feedback.project?.teamId) {
      const member = await this.memberRepo.findOne({
        where: { teamId: feedback.project.teamId, userId },
      });
      if (member) return feedback;
    }
    return null;
  }

  async remove(id: string, userId: string) {
    const feedback = await this.findOne(id, userId);
    if (!feedback) {
      throw new ForbiddenException('Feedback not found or access denied');
    }
    await this.feedbackRepository.remove(feedback);
    return { success: true };
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
  ): Promise<Feedback> {
    const feedback = await this.findOne(id, userId);
    if (!feedback) {
      throw new ForbiddenException('Feedback not found or access denied');
    }

    feedback.status = status;
    const saved = await this.feedbackRepository.save(feedback);

    await this.eventsService.emitFeedbackUpdatedForProject(feedback.projectId);

    return saved;
  }

  async reanalyze(id: string, userId: string) {
    const feedback = await this.findOne(id, userId);
    if (!feedback) {
      throw new ForbiddenException('Feedback not found or access denied');
    }

    // Determine the team's AI analysis level
    const teamId = feedback.project?.teamId;
    if (!teamId) {
      throw new ForbiddenException('Feedback not found or access denied');
    }

    const limits = this.planLimitsService.getLimits(
      await this.planLimitsService.getTeamPlan(teamId),
    );
    const aiLevel: string = limits.aiAnalysis;
    if (aiLevel === 'none')
      return { success: false, message: 'AI Analysis disabled for your plan' };

    await this.aiQueueService.addAnalysisJob(
      {
        feedbackId: feedback.id,
        content: feedback.content,
        projectId: feedback.projectId,
        teamId,
        aiLevel: aiLevel === 'full' ? 'full' : 'basic',
      },
      1,
    );

    return { success: true, queued: true };
  }

  async bulkArchive(projectId: string, userId: string) {
    // Check if the user has access to the project
    const project = await this.projectsService.findOne(projectId, userId);
    if (!project) {
      throw new ForbiddenException('Project not found or access denied');
    }

    // Update statuses
    const result = await this.feedbackRepository
      .createQueryBuilder()
      .update(Feedback)
      .set({ status: 'Archived' })
      .where('projectId = :projectId', { projectId })
      .andWhere('status IN (:...statuses)', { statuses: ['Done', 'Rejected'] })
      .execute();

    await this.eventsService.emitFeedbackUpdatedForProject(projectId);

    return { success: true, count: result.affected || 0 };
  }

  private readonly CATEGORY_EMOJI: Record<string, string> = {
    UX: '🧭',
    Bug: '🐛',
    API: '🔌',
    Performance: '🚀',
    Feature: '✨',
    General: '💬',
    Navigation: '🧭',
    Auth: '🔐',
    Billing: '💳',
    Dashboard: '📊',
  };

  async markSeen(userId: string, projectId: string): Promise<void> {
    await this.lastSeenRepo.upsert(
      { userId, projectId, seenAt: new Date() },
      { conflictPaths: ['userId', 'projectId'] },
    );
  }

  async getLastSeen(userId: string, projectId: string): Promise<Date | null> {
    const record = await this.lastSeenRepo.findOne({
      where: { userId, projectId },
    });
    return record?.seenAt ?? null;
  }

  async getTrends(
    projectId: string,
    userId: string,
  ): Promise<{ name: string; emoji: string; count: number }[]> {
    await this.projectsService.findOne(projectId, userId);
    const raw = await this.feedbackRepository
      .createQueryBuilder('f')
      .select('f.category', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('f.projectId = :projectId', { projectId })
      .andWhere('f.category IS NOT NULL')
      .andWhere("f.status != 'Rejected'")
      .groupBy('f.category')
      .orderBy('count', 'DESC')
      .limit(6)
      .getRawMany();

    return raw.map((r) => ({
      name: r.name,
      emoji: this.CATEGORY_EMOJI[r.name] ?? '📝',
      count: parseInt(r.count, 10),
    }));
  }
}
