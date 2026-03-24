import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { Feedback } from '@insightstream/database';
import { AiService } from '../ai/ai.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: any;
  let aiService: any;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation(dto => dto),
      save: jest.fn().mockImplementation(feedback => Promise.resolve({ id: 'uuid-123', ...feedback })),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: mockRepo,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    repo = module.get(getRepositoryToken(Feedback));
    aiService = module.get(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create feedback and call AI analysis', async () => {
      const content = 'Love the new dark mode!';
      const userId = 'user-abc';
      
      const result = await service.create(userId, content);

      expect(aiService.analyzeFeedback).toHaveBeenCalledWith(content);
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.sentimentScore).toBe(0.85);
      expect(result.userId).toBe(userId);
    });

    it('should throw error if content is missing', async () => {
      await expect(service.create('user-1', '')).rejects.toThrow('Content is required');
    });
  });

  describe('remove', () => {
    it('should successfully remove feedback if it exists', async () => {
      const fbId = 'uuid-123';
      const userId = 'user-abc';
      
      repo.findOne.mockResolvedValue({ id: fbId, userId });
      
      const result = await service.remove(fbId, userId);
      
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: fbId, userId } });
      expect(repo.remove).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw error if feedback not found during removal', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('wrong-id', 'user-1')).rejects.toThrow('Feedback not found or access denied');
    });
  });
});
