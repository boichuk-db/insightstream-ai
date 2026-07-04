import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Between, LessThan } from 'typeorm';
import { Feedback, PlanType } from '@insightstream/database';
import { AiSweepService } from './ai-sweep.service';
import { AiQueueService } from './ai-queue.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

describe('AiSweepService', () => {
  let service: AiSweepService;
  let feedbackRepo: { find: jest.Mock; count: jest.Mock };
  let aiQueue: { addAnalysisJob: jest.Mock };
  let planLimits: { getTeamPlan: jest.Mock; getLimits: jest.Mock };

  const makeFeedback = (over: Partial<Feedback> = {}): Feedback =>
    ({
      id: 'fb-1',
      content: 'hello',
      projectId: 'proj-1',
      sentimentScore: null,
      project: { teamId: 'team-1' },
      ...over,
    }) as unknown as Feedback;

  beforeEach(async () => {
    feedbackRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    aiQueue = { addAnalysisJob: jest.fn().mockResolvedValue(undefined) };
    planLimits = {
      getTeamPlan: jest.fn().mockResolvedValue(PlanType.FREE),
      getLimits: jest.fn().mockReturnValue({ aiAnalysis: 'basic' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSweepService,
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: AiQueueService, useValue: aiQueue },
        { provide: PlanLimitsService, useValue: planLimits },
      ],
    }).compile();

    service = module.get(AiSweepService);
  });

  it('re-enqueues a NULL-sentiment feedback with reconstructed job data', async () => {
    feedbackRepo.find.mockResolvedValue([makeFeedback()]);

    await service.sweep();

    expect(aiQueue.addAnalysisJob).toHaveBeenCalledWith(
      {
        feedbackId: 'fb-1',
        content: 'hello',
        projectId: 'proj-1',
        teamId: 'team-1',
        aiLevel: 'basic',
      },
      10,
    );
  });

  it('queries only feedback within the (15m, 24h) window, oldest first, capped at 100', async () => {
    await service.sweep();

    expect(feedbackRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['project'],
        order: { createdAt: 'ASC' },
        take: 100,
      }),
    );
  });

  it('warns about feedback abandoned beyond the 24h window and does not enqueue it', async () => {
    feedbackRepo.count.mockResolvedValue(3);
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await service.sweep();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('3'));
    expect(aiQueue.addAnalysisJob).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("skips feedback whose owner plan has aiAnalysis 'none'", async () => {
    feedbackRepo.find.mockResolvedValue([makeFeedback()]);
    planLimits.getLimits.mockReturnValue({ aiAnalysis: 'none' });

    await service.sweep();

    expect(aiQueue.addAnalysisJob).not.toHaveBeenCalled();
  });

  it('looks up the owner plan once for multiple feedback of the same owner', async () => {
    feedbackRepo.find.mockResolvedValue([
      makeFeedback({ id: 'fb-1' } as Partial<Feedback>),
      makeFeedback({ id: 'fb-2' } as Partial<Feedback>),
    ]);

    await service.sweep();

    expect(planLimits.getTeamPlan).toHaveBeenCalledTimes(1);
    expect(aiQueue.addAnalysisJob).toHaveBeenCalledTimes(2);
  });

  it('scopes find to the (15m, 24h) window and count to strictly older than 24h', async () => {
    const now = new Date('2026-07-03T12:00:00.000Z').getTime();
    jest.useFakeTimers().setSystemTime(now);

    await service.sweep();

    const windowStart = new Date(now - 24 * 60 * 60 * 1000);
    const staleBefore = new Date(now - 15 * 60 * 1000);

    expect(feedbackRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sentimentScore: IsNull(),
          createdAt: Between(windowStart, staleBefore),
        },
      }),
    );
    expect(feedbackRepo.count).toHaveBeenCalledWith({
      where: {
        sentimentScore: IsNull(),
        createdAt: LessThan(windowStart),
      },
    });

    jest.useRealTimers();
  });
});
