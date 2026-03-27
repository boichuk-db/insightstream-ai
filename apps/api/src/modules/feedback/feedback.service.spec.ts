import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { Feedback, TeamMember } from '@insightstream/database';
import { ProjectsService } from '../projects/projects.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { AiService } from '../ai/ai.service';
import { EventsGateway } from '../events/events.gateway';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: any;
  let aiService: any;
  let eventsGateway: any;

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
    };

    const mockAiService = {
      analyzeFeedback: jest.fn().mockResolvedValue({
        sentimentScore: 0.85,
        category: 'Feature Request',
        aiSummary: 'User wants more features',
        tags: ['features', 'growth'],
      }),
    };

    const mockEventsGateway = {
      emitFeedbackUpdated: jest.fn(),
    };

    const mockProjectsService = {
      findOne: jest.fn().mockResolvedValue({ userId: 'user-abc' }),
      findByOnlyId: jest.fn().mockResolvedValue({ userId: 'user-abc' }),
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
          provide: AiService,
          useValue: mockAiService,
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
    aiService = module.get(AiService);
    eventsGateway = module.get(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create feedback and call AI analysis', async () => {
      const content = 'Love the new dark mode!';
      const projectId = 'proj-abc';

      const result = await service.create(projectId, content);

      expect(aiService.analyzeFeedback).toHaveBeenCalledWith(content);
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
});
