import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '@insightstream/database';
import { AiService } from '../ai/ai.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private aiService: AiService,
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
      });

      // Analyze feedback content using AI
      const analysis = await this.aiService.analyzeFeedback(content);
      if (analysis) {
        feedback.sentimentScore = analysis.sentimentScore;
        feedback.category = analysis.category;
        feedback.aiSummary = analysis.aiSummary;
        feedback.tags = analysis.tags;
      }

      return await this.feedbackRepository.save(feedback);
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
}
