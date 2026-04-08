import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const AI_ANALYSIS_QUEUE = 'ai-analysis';

export interface AnalysisJobData {
  feedbackId: string;
  content: string;
  projectId: string;
  ownerId: string;
  aiLevel: 'basic' | 'full';
}

@Injectable()
export class AiQueueService {
  constructor(
    @InjectQueue(AI_ANALYSIS_QUEUE) private readonly queue: Queue,
  ) {}

  async addAnalysisJob(
    data: AnalysisJobData,
    priority: number = 10,
  ): Promise<void> {
    await this.queue.add('analyze-feedback', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
      priority,
    });
  }
}
