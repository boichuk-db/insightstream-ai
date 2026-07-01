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
import { EventsGateway } from '../events/events.gateway';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: any;
  let lastSeenRepo: any;
  let eventsGateway: any;
  let mockAiQueueService: any;
  let mockProjectsService: any;

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

    const mockEventsGateway = {
      emitFeedbackUpdated: jest.fn(),
    };

    mockProjectsService = {
      findOne: jest.fn().mockResolvedValue({ userId: 'user-abc' }),
      findByOnlyId: jest.fn().mockResolvedValue({ userId: 'user-abc' }),
    };

    const mockLastSeenRepo = {
      upsert: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const mockPlanLimitsService = {
      canCreateFeedback: jest.fn().mockResolvedValue(true),
      canCreateFeedbackForProject: jest.fn().mockResolvedValue(true),
      getUserPlan: jest.fn().mockResolvedValue('pro'),
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
          provide: EventsGateway,
          useValue: mockEventsGateway,
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
    eventsGateway = module.get(EventsGateway);
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
        expect.objectContaining({ content, projectId, aiLevel: 'full' }),
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
