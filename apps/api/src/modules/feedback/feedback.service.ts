import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, TeamMember } from '@insightstream/database';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';
import { ProjectsService } from '../projects/projects.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    private aiService: AiService,
    private eventsGateway: EventsGateway,
    private projectsService: ProjectsService,
    private planLimitsService: PlanLimitsService,
  ) {}

  async create(projectId: string, content: string, userId?: string, source?: string) {
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
      const check = await this.planLimitsService.canCreateFeedbackForProject(projectId);
      const project = await this.projectsService.findByOnlyId(projectId);
      if (project) {
        const plan = await this.planLimitsService.getUserPlan(project.userId);
        this.planLimitsService.assertAllowed(check, 'feedbacks this month', plan);
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
    const ownerId = userId || (await this.projectsService.findByOnlyId(projectId))?.userId;
    let aiLevel: string = 'basic';
    if (ownerId) {
      const limits = this.planLimitsService.getLimits(await this.planLimitsService.getUserPlan(ownerId));
      aiLevel = limits.aiAnalysis;
    }

    if (aiLevel !== 'none') {
      // Trigger AI analysis in background
      this.aiService.analyzeFeedback(content).then(async (analysis) => {
        if (analysis) {
          await this.feedbackRepository.update(savedFeedback.id, {
            sentimentScore: analysis.sentimentScore,
            category: analysis.category,
            aiSummary: aiLevel === 'full' ? analysis.aiSummary : undefined,
            tags: aiLevel === 'full' ? analysis.tags : undefined,
          });

          if (userId) {
            this.eventsGateway.emitFeedbackUpdated(userId);
          } else {
            const project = await this.projectsService.findByOnlyId(projectId);
            if (project?.userId) {
              this.eventsGateway.emitFeedbackUpdated(project.userId);
            }
          }
        }
      }).catch(err => this.logger.error('Background AI analysis failed', err));
    }

    return savedFeedback;
  }

  async findAllByUser(userId: string) {
    return this.feedbackRepository.find({
      where: { project: { userId } },
      relations: ['project'],
      order: { createdAt: 'DESC' },
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

  async updateStatus(id: string, status: string, userId: string): Promise<Feedback> {
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
      const limits = this.planLimitsService.getLimits(await this.planLimitsService.getUserPlan(ownerId));
      aiLevel = limits.aiAnalysis;
    }

    if (aiLevel === 'none') return { success: false, message: 'AI Analysis disabled for your plan' };

    try {
      const analysis = await this.aiService.analyzeFeedback(feedback.content);
      if (analysis) {
        await this.feedbackRepository.update(feedback.id, {
          sentimentScore: analysis.sentimentScore,
          category: analysis.category,
          aiSummary: aiLevel === 'full' ? analysis.aiSummary : undefined,
          tags: aiLevel === 'full' ? analysis.tags : undefined,
        });

        this.eventsGateway.emitFeedbackUpdated(userId);
        return { success: true };
      }
    } catch (err) {
      this.logger.error(`Manual AI analysis failed for feedback ${id}`, err);
      throw new Error('AI Analysis failed. Please try again later.');
    }

    return { success: false };
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
}
