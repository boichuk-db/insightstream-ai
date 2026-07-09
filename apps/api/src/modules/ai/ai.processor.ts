import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Feedback } from '@insightstream/database';
import { AiService } from './ai.service';
import {
  FEEDBACK_EVENTS_PUBLISHER,
  FeedbackEventsPublisher,
} from '../events/feedback-events-publisher.token';
import { AI_ANALYSIS_QUEUE, AnalysisJobData } from './ai-queue.service';

@Processor(AI_ANALYSIS_QUEUE, { concurrency: 3 })
@Injectable()
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @Inject(FEEDBACK_EVENTS_PUBLISHER)
    private readonly eventsPublisher: FeedbackEventsPublisher,
  ) {
    super();
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    const { feedbackId, content, aiLevel } = job.data;

    this.logger.log(
      `Processing AI analysis for feedback ${feedbackId} (attempt ${job.attemptsMade + 1})`,
    );

    const analysis = await this.aiService.analyzeFeedback(content);
    if (!analysis) {
      throw new Error(`Gemini returned null for feedback ${feedbackId}`);
    }

    await this.feedbackRepository.update(feedbackId, {
      sentimentScore: analysis.sentimentScore,
      category: analysis.category,
      aiSummary: aiLevel === 'full' ? analysis.aiSummary : undefined,
      tags: aiLevel === 'full' ? analysis.tags : undefined,
    });

    await this.eventsPublisher.emitFeedbackUpdatedForProject(
      job.data.projectId,
    );
    this.logger.log(`AI analysis completed for feedback ${feedbackId}`);
  }
}
