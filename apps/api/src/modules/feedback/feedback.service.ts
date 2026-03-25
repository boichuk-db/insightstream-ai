import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '@insightstream/database';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private aiService: AiService,
    private eventsGateway: EventsGateway,
    private projectsService: ProjectsService,
  ) {}

  async create(projectId: string, content: string, userId: string, source?: string) {
    // Verify the user owns this project — throws NotFoundException if not
    await this.projectsService.findOne(projectId, userId);

    const feedback = this.feedbackRepository.create({
      content,
      projectId,
      source,
      status: 'New',
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    // Trigger AI analysis in background
    this.aiService.analyzeFeedback(content).then(async (analysis) => {
      if (analysis) {
        await this.feedbackRepository.update(savedFeedback.id, {
          sentimentScore: analysis.sentimentScore,
          category: analysis.category,
          aiSummary: analysis.aiSummary,
          tags: analysis.tags,
        });
        this.eventsGateway.emitFeedbackUpdated(userId);
      }
    }).catch(err => this.logger.error('Background AI analysis failed', err));

    return savedFeedback;
  }

  async findAllByUser(userId: string) {
    return this.feedbackRepository.find({
      where: { project: { userId } },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.feedbackRepository.findOne({
      where: { id, project: { userId } },
      relations: ['project'],
    });
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
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!feedback) {
      throw new ForbiddenException('Feedback not found');
    }

    if (feedback.project?.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    feedback.status = status;
    const saved = await this.feedbackRepository.save(feedback);

    this.eventsGateway.emitFeedbackUpdated(userId);

    return saved;
  }
}
