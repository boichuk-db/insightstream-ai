import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import {
  Feedback,
  TeamMember,
  UserProjectLastSeen,
} from '@insightstream/database';
import { ProjectsService } from '../projects/projects.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { AiQueueService } from '../ai/ai-queue.service';
import { EventsService } from '../events/events.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: any;
  let lastSeenRepo: any;
  let eventsService: any;
  let mockAiQueueService: any;
  let mockProjectsService: any;
  let mockPlanLimitsService: any;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((feedback) =>
          Promise.resolve({ id: 'uuid-123', ...feedback }),
        ),
      update: jest.fn().mockResolvedValue({}),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue({ success: true }),
      createQueryBuilder: jest.fn(),
    };

    mockAiQueueService = {
      addAnalysisJob: jest.fn().mockResolvedValue(undefined),
    };

    const mockEventsService = {
      emitFeedbackUpdatedForProject: jest.fn().mockResolvedValue(undefined),
    };

    mockProjectsService = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'proj-abc', teamId: 'team-abc', userId: 'user-abc' }),
      findByOnlyId: jest
        .fn()
        .mockResolvedValue({ id: 'proj-abc', teamId: 'team-abc', userId: 'user-abc' }),
    };

    const mockLastSeenRepo = {
      upsert: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockPlanLimitsService = {
      canCreateFeedback: jest
        .fn()
        .mockResolvedValue({ allowed: true, current: 0, max: 100 }),
      canCreateFeedbackForProject: jest
        .fn()
        .mockResolvedValue({ allowed: true, current: 0, max: 100 }),
      getTeamPlan: jest.fn().mockResolvedValue('pro'),
      assertAllowed: jest.fn(),
      getLimits: jest.fn().mockReturnValue({ aiAnalysis: 'full' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: mockRepo, // Reuse mockRepo for simplicity in types
        },
        {
          provide: getRepositoryToken(UserProjectLastSeen),
          useValue: mockLastSeenRepo,
        },
        {
          provide: AiQueueService,
          useValue: mockAiQueueService,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: PlanLimitsService,
          useValue: mockPlanLimitsService,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    repo = module.get(getRepositoryToken(Feedback));
    lastSeenRepo = module.get(getRepositoryToken(UserProjectLastSeen));
    eventsService = module.get(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create feedback and enqueue AI analysis job', async () => {
      const content = 'Love the new dark mode!';
      const projectId = 'proj-abc';

      const result = await service.create(projectId, content);

      expect(mockAiQueueService.addAnalysisJob).toHaveBeenCalledWith(
        expect.objectContaining({
          content,
          projectId,
          teamId: 'team-abc',
          aiLevel: 'full',
        }),
        10,
      );
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.projectId).toBe(projectId);
    });

    it('should throw error if content is missing', async () => {
      await expect(service.create('user-1', '')).rejects.toThrow(
        'Content is required',
      );
    });

    it('enforces the feedback limit against the project team, not the creator', async () => {
      mockProjectsService.findOne.mockResolvedValue({
        id: 'p1',
        teamId: 't1',
        userId: 'creator',
      });
      mockPlanLimitsService.canCreateFeedback.mockResolvedValue({
        allowed: true,
        current: 0,
        max: 100,
      });
      mockPlanLimitsService.getTeamPlan.mockResolvedValue('FREE');
      mockPlanLimitsService.getLimits.mockReturnValue({ aiAnalysis: 'basic' });

      await service.create('p1', 'hello', 'creator');

      expect(mockPlanLimitsService.canCreateFeedback).toHaveBeenCalledWith(
        't1',
      );
      expect(mockPlanLimitsService.getTeamPlan).toHaveBeenCalledWith('t1');
    });

    it('throws NotFoundException for a public-widget submission to a nonexistent project', async () => {
      mockProjectsService.findByOnlyId.mockResolvedValue(null);
      mockPlanLimitsService.canCreateFeedbackForProject.mockResolvedValue({
        allowed: false,
        current: 0,
        max: 0,
      });

      await expect(service.create('missing-proj', 'hello')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
      expect(mockAiQueueService.addAnalysisJob).not.toHaveBeenCalled();
    });
  });

  describe('reanalyze', () => {
    it('enqueues with teamId taken from the feedback project at priority 1', async () => {
      repo.findOne.mockResolvedValue({
        id: 'fb-1',
        content: 'slow dashboard',
        projectId: 'proj-abc',
        project: { userId: 'user-abc', teamId: 'team-abc' },
      });

      const result = await service.reanalyze('fb-1', 'user-abc');

      expect(mockPlanLimitsService.getTeamPlan).toHaveBeenCalledWith(
        'team-abc',
      );
      expect(mockAiQueueService.addAnalysisJob).toHaveBeenCalledWith(
        {
          feedbackId: 'fb-1',
          content: 'slow dashboard',
          projectId: 'proj-abc',
          teamId: 'team-abc',
          aiLevel: 'full',
        },
        1,
      );
      expect(result).toEqual({ success: true, queued: true });
    });

    it('throws when the feedback project has no teamId instead of enqueuing', async () => {
      repo.findOne.mockResolvedValue({
        id: 'fb-1',
        content: 'orphaned',
        projectId: 'proj-abc',
        project: { userId: 'user-abc' }, // access check passes, but no teamId
      });

      await expect(service.reanalyze('fb-1', 'user-abc')).rejects.toThrow(
        'Feedback not found or access denied',
      );
      expect(mockAiQueueService.addAnalysisJob).not.toHaveBeenCalled();
    });
  });

  describe('findByProject', () => {
    it('should return feedback for the project, newest first, capped at 500', async () => {
      const projectId = 'proj-abc';
      const userId = 'user-abc';
      const mockFeedbacks = [{ id: 'fb-2' }, { id: 'fb-1' }];
      repo.find.mockResolvedValue(mockFeedbacks);

      const result = await service.findByProject(projectId, userId);

      const mockProjectsService = (service as any).projectsService;
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        projectId,
        userId,
      );
      expect(repo.find).toHaveBeenCalledWith({
        where: { projectId },
        order: { createdAt: 'DESC' },
        take: 500,
      });
      expect(result).toBe(mockFeedbacks);
    });

    it('should propagate access-denied error and not query feedback', async () => {
      const mockProjectsService = (service as any).projectsService;
      mockProjectsService.findOne.mockRejectedValueOnce(
        new NotFoundException('Project not found'),
      );

      await expect(service.findByProject('proj-x', 'user-y')).rejects.toThrow(
        'Project not found',
      );
      expect(repo.find).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should successfully remove feedback if it exists', async () => {
      const fbId = 'uuid-123';
      const userId = 'user-abc';

      repo.findOne.mockResolvedValue({ id: fbId, project: { userId } });

      const result = await service.remove(fbId, userId);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: fbId },
        relations: ['project'],
      });
      expect(repo.remove).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw error if feedback not found during removal', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('wrong-id', 'user-1')).rejects.toThrow(
        'Feedback not found or access denied',
      );
    });
  });

  describe('markSeen', () => {
    it('upserts last-seen record for user + project', async () => {
      const upsertSpy = jest
        .spyOn(lastSeenRepo, 'upsert')
        .mockResolvedValue({} as any);
      await service.markSeen('user-1', 'proj-1');
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', projectId: 'proj-1' }),
        { conflictPaths: ['userId', 'projectId'] },
      );
    });
  });

  describe('getLastSeen', () => {
    it('returns seenAt date when record exists', async () => {
      const date = new Date('2026-01-01');
      jest
        .spyOn(lastSeenRepo, 'findOne')
        .mockResolvedValue({ userId: 'u', projectId: 'p', seenAt: date });
      const result = await service.getLastSeen('u', 'p');
      expect(result).toEqual(date);
    });

    it('returns null when no record exists', async () => {
      jest.spyOn(lastSeenRepo, 'findOne').mockResolvedValue(null);
      const result = await service.getLastSeen('u', 'p');
      expect(result).toBeNull();
    });
  });

  describe('getTrends', () => {
    it('returns categories grouped by count descending', async () => {
      jest
        .spyOn(mockProjectsService, 'findOne')
        .mockResolvedValue({ userId: 'u' } as any);
      const rawResults = [
        { name: 'Bug', count: '9' },
        { name: 'UX', count: '14' },
      ];
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rawResults),
      };
      jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb as any);
      const result = await service.getTrends('proj-1', 'user-1');
      expect(result[0].count).toBe(9);
      expect(result[0].name).toBe('Bug');
      expect(result.every((r) => typeof r.emoji === 'string')).toBe(true);
    });
  });
});
