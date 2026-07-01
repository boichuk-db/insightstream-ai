import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, TeamMember, UserProjectLastSeen } from '@insightstream/database';
import { AiQueueService } from '../ai/ai-queue.service';
import { EventsGateway } from '../events/events.gateway';
import { ProjectsService } from '../projects/projects.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly sqs = new SQSClient({
    region: process.env.AWS_REGION || 'eu-north-1',
  });

  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(UserProjectLastSeen)
    private lastSeenRepo: Repository<UserProjectLastSeen>,
    private aiQueueService: AiQueueService,
    private eventsGateway: EventsGateway,
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
      throw new Error('Content is required');
    }
    // Verify the user owns this project if userId is provided
    if (userId) {
      await this.projectsService.findOne(projectId, userId);
      // Check feedback limit for authenticated user
      const check = await this.planLimitsService.canCreateFeedback(userId);
      const plan = await this.planLimitsService.getUserPlan(userId);
      this.planLimitsService.assertAllowed(check, 'feedbacks this month', plan);
    } else {
      // Public widget — check limit via project owner
      const check =
        await this.planLimitsService.canCreateFeedbackForProject(projectId);
      const project = await this.projectsService.findByOnlyId(projectId);
      if (project) {
        const plan = await this.planLimitsService.getUserPlan(project.userId);
        this.planLimitsService.assertAllowed(
          check,
          'feedbacks this month',
          plan,
        );
      }
    }

    const feedback = this.feedbackRepository.create({
      content,
      projectId,
      source,
      status: 'New',
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    // Determine the owner's AI analysis level
    const ownerId =
      userId || (await this.projectsService.findByOnlyId(projectId))?.userId;
    let aiLevel: string = 'basic';
    if (ownerId) {
      const limits = this.planLimitsService.getLimits(
        await this.planLimitsService.getUserPlan(ownerId),
      );
      aiLevel = limits.aiAnalysis;
    }

    if (aiLevel !== 'none') {
      await this.aiQueueService.addAnalysisJob(
        {
          feedbackId: savedFeedback.id,
          content,
          projectId,
          ownerId: ownerId ?? '',
          aiLevel: aiLevel === 'full' ? 'full' : 'basic',
        },
        10,
      );
    }

    const queueUrl = process.env.SQS_FEEDBACK_QUEUE_URL;
    if (queueUrl) {
      this.sqs
        .send(
          new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({
              feedbackId: savedFeedback.id,
              projectId: savedFeedback.projectId,
              content: savedFeedback.content,
              source: savedFeedback.source,
              createdAt: savedFeedback.createdAt,
            }),
          }),
        )
        .catch((err) => this.logger.error('SQS publish failed', err));
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

    // Check access: direct owner or team member
    if (feedback.project?.userId === userId) return feedback;
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

    this.eventsGateway.emitFeedbackUpdated(userId);

    return saved;
  }

  async reanalyze(id: string, userId: string) {
    const feedback = await this.findOne(id, userId);
    if (!feedback) {
      throw new ForbiddenException('Feedback not found or access denied');
    }

    // Determine the owner's AI analysis level
    const ownerId = userId || feedback.project?.userId;
    let aiLevel: string = 'basic';
    if (ownerId) {
      const limits = this.planLimitsService.getLimits(
        await this.planLimitsService.getUserPlan(ownerId),
      );
      aiLevel = limits.aiAnalysis;
    }

    if (aiLevel === 'none')
      return { success: false, message: 'AI Analysis disabled for your plan' };

    await this.aiQueueService.addAnalysisJob(
      {
        feedbackId: feedback.id,
        content: feedback.content,
        projectId: feedback.projectId,
        ownerId,
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

    this.eventsGateway.emitFeedbackUpdated(userId);

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
