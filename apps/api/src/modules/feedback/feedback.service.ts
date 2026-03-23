import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '@insightstream/database';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async create(userId: string, content: string, source?: string) {
    if (!content) {
      throw new Error('Content is required');
    }
    
    try {
      const feedback = this.feedbackRepository.create({
        content,
        userId,
        source,
      });
      return await this.feedbackRepository.save(feedback);
    } catch (error) {
      console.error('Feedback creation error:', error);
      throw error;
    }
  }

  async findAllByUser(userId: string) {
    return this.feedbackRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.feedbackRepository.findOne({ where: { id, userId } });
  }
}
