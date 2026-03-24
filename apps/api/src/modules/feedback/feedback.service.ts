import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '@insightstream/database';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private aiService: AiService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(projectId: string, content: string, source?: string) {
    if (!content) {
      throw new Error('Content is required');
    }
    
    try {
      const feedback = this.feedbackRepository.create({
        content,
        projectId,
        source,
        status: 'New',
      });

      // Save initial feedback immediately to avoid waiting for AI
      const savedFeedback = await this.feedbackRepository.save(feedback);

      // Trigger AI analysis in the background without 'await'
      this.aiService.analyzeFeedback(content).then(async (analysis) => {
        if (analysis) {
          await this.feedbackRepository.update(savedFeedback.id, {
            sentimentScore: analysis.sentimentScore,
            category: analysis.category,
            aiSummary: analysis.aiSummary,
            tags: analysis.tags,
          });
          
          // Fetch the project to get the userId for the socket event
          const updatedWithProject = await this.feedbackRepository.findOne({
            where: { id: savedFeedback.id },
            relations: ['project']
          });
          
          if (updatedWithProject?.project?.userId) {
            this.eventsGateway.emitFeedbackUpdated(updatedWithProject.project.userId);
          }
        }
      }).catch(err => console.error('Background AI Analysis failed:', err));

      return savedFeedback;
    } catch (error) {
      console.error('Feedback creation error:', error);
      throw error;
    }
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
      relations: ['project']
    });
  }

  async remove(id: string, userId: string) {
    const feedback = await this.findOne(id, userId);
    if (!feedback) {
      throw new Error('Feedback not found or access denied');
    }
    await this.feedbackRepository.remove(feedback);
    return { success: true };
  }

  async updateStatus(id: string, status: string, userId: string): Promise<Feedback> {
    try {
      console.log(`[FeedbackService] UPDATE REQUEST: FeedBackId=${id}, NewStatus=${status}, UserID=${userId}`);
      
      const feedback = await this.feedbackRepository.findOne({ 
        where: { id },
        relations: ['project']
      });

      if (!feedback) {
        console.error(`[FeedbackService] ERROR: Feedback ${id} not found in database.`);
        throw new Error('Feedback not found');
      }

      console.log(`[FeedbackService] Record found. Project Owner ID: ${feedback.project?.userId}`);

      if (feedback.project?.userId !== userId) {
        console.error(`[FeedbackService] SECURITY ERROR: User ${userId} is NOT OWNER ${feedback.project?.userId}`);
        throw new Error('Access denied');
      }

      feedback.status = status;
      const saved = await this.feedbackRepository.save(feedback);
      
      console.log(`[FeedbackService] Successfully saved. New Status: ${saved.status}`);
      
      // Notify via sockets
      this.eventsGateway.emitFeedbackUpdated(userId);
      
      return saved;
    } catch (error) {
      console.error('[FeedbackService] CRITICAL UPDATE ERROR:', error.message);
      throw error;
    }
  }
}
