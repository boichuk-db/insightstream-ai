import { Test, TestingModule } from '@nestjs/testing';
import { AiProcessor } from './ai.processor';
import { AiService } from './ai.service';
import { EventsGateway } from '../events/events.gateway';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Feedback } from '@insightstream/database';
import { Job } from 'bullmq';
import { AnalysisJobData } from './ai-queue.service';

describe('AiProcessor', () => {
  let processor: AiProcessor;
  let aiService: { analyzeFeedback: jest.Mock };
  let feedbackRepo: { update: jest.Mock };
  let eventsGateway: { emitFeedbackUpdated: jest.Mock };

  beforeEach(async () => {
    aiService = { analyzeFeedback: jest.fn() };
    feedbackRepo = { update: jest.fn().mockResolvedValue({}) };
    eventsGateway = { emitFeedbackUpdated: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProcessor,
        { provide: AiService, useValue: aiService },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    processor = module.get<AiProcessor>(AiProcessor);
  });

  const makeJob = (data: AnalysisJobData) =>
    ({ data, attemptsMade: 0 } as Job<AnalysisJobData>);

  it('updates feedback with full AI analysis and emits event', async () => {
    aiService.analyzeFeedback.mockResolvedValue({
      sentimentScore: 0.9,
      category: 'Feature',
      aiSummary: 'User wants dark mode',
      tags: ['design'],
    });

    await processor.process(
      makeJob({
        feedbackId: 'fb-1',
        content: 'Please add dark mode',
        projectId: 'proj-1',
        ownerId: 'user-1',
        aiLevel: 'full',
      }),
    );

    expect(aiService.analyzeFeedback).toHaveBeenCalledWith('Please add dark mode');
    expect(feedbackRepo.update).toHaveBeenCalledWith('fb-1', {
      sentimentScore: 0.9,
      category: 'Feature',
      aiSummary: 'User wants dark mode',
      tags: ['design'],
    });
    expect(eventsGateway.emitFeedbackUpdated).toHaveBeenCalledWith('user-1');
  });

  it('omits aiSummary and tags when aiLevel is basic', async () => {
    aiService.analyzeFeedback.mockResolvedValue({
      sentimentScore: 0.5,
      category: 'Bug',
      aiSummary: 'Something broke',
      tags: ['crash'],
    });

    await processor.process(
      makeJob({
        feedbackId: 'fb-2',
        content: 'App crashes',
        projectId: 'proj-1',
        ownerId: 'user-1',
        aiLevel: 'basic',
      }),
    );

    expect(feedbackRepo.update).toHaveBeenCalledWith('fb-2', {
      sentimentScore: 0.5,
      category: 'Bug',
      aiSummary: undefined,
      tags: undefined,
    });
  });

  it('throws when Gemini returns null so BullMQ triggers retry', async () => {
    aiService.analyzeFeedback.mockResolvedValue(null);

    await expect(
      processor.process(
        makeJob({
          feedbackId: 'fb-3',
          content: 'test',
          projectId: 'proj-1',
          ownerId: 'user-1',
          aiLevel: 'basic',
        }),
      ),
    ).rejects.toThrow('Gemini returned null for feedback fb-3');
  });
});
