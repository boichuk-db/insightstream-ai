import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Comment, Feedback, TeamMember } from '@insightstream/database';
import { CommentsService } from './comments.service';
import { ActivityService } from '../activity/activity.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepo: any;
  let feedbackRepo: any;
  let memberRepo: any;

  beforeEach(async () => {
    commentRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((c) => Promise.resolve({ id: 'c1', ...c })),
      remove: jest.fn(),
    };
    feedbackRepo = { findOne: jest.fn() };
    memberRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getRepositoryToken(Comment), useValue: commentRepo },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: ActivityService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  describe('findByFeedback', () => {
    it('throws NotFoundException when feedback does not exist', async () => {
      feedbackRepo.findOne.mockResolvedValue(null);
      await expect(service.findByFeedback('fb-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for a user who is neither owner nor team member', async () => {
      feedbackRepo.findOne.mockResolvedValue({
        id: 'fb-1',
        project: { id: 'p1', userId: 'owner-1', teamId: null },
      });
      await expect(service.findByFeedback('fb-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
      expect(commentRepo.find).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for non-member of a team project', async () => {
      feedbackRepo.findOne.mockResolvedValue({
        id: 'fb-1',
        project: { id: 'p1', userId: 'owner-1', teamId: 'team-1' },
      });
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.findByFeedback('fb-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns comments for the project owner', async () => {
      feedbackRepo.findOne.mockResolvedValue({
        id: 'fb-1',
        project: { id: 'p1', userId: 'owner-1', teamId: null },
      });
      commentRepo.find.mockResolvedValue([{ id: 'c1' }]);
      const result = await service.findByFeedback('fb-1', 'owner-1');
      expect(result).toEqual([{ id: 'c1' }]);
      expect(commentRepo.find).toHaveBeenCalledWith({
        where: { feedbackId: 'fb-1' },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    });

    it('returns comments for a team member', async () => {
      feedbackRepo.findOne.mockResolvedValue({
        id: 'fb-1',
        project: { id: 'p1', userId: 'owner-1', teamId: 'team-1' },
      });
      memberRepo.findOne.mockResolvedValue({ id: 'm1' });
      commentRepo.find.mockResolvedValue([{ id: 'c1' }]);
      const result = await service.findByFeedback('fb-1', 'member-1');
      expect(result).toEqual([{ id: 'c1' }]);
      expect(memberRepo.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-1', userId: 'member-1' },
      });
    });
  });
});
