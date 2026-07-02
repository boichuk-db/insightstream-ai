import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Project, Feedback, User } from '@insightstream/database';
import { DigestService } from './digest.service';
import { AiService } from '../ai/ai.service';
import { MailService } from '../mail/mail.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { ProjectsService } from '../projects/projects.service';

describe('DigestService', () => {
  let service: DigestService;
  let projectsService: any;
  let projectRepo: any;
  let feedbackRepo: any;

  beforeEach(async () => {
    projectRepo = { findOne: jest.fn(), find: jest.fn() };
    feedbackRepo = { find: jest.fn().mockResolvedValue([]) };
    projectsService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: getRepositoryToken(User), useValue: { find: jest.fn() } },
        {
          provide: AiService,
          useValue: {
            generateWeeklyDigest: jest.fn().mockResolvedValue('<p>ok</p>'),
          },
        },
        { provide: MailService, useValue: { send: jest.fn() } },
        {
          provide: PlanLimitsService,
          useValue: { canUseFeature: jest.fn().mockResolvedValue(true) },
        },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = module.get<DigestService>(DigestService);
  });

  describe('preview', () => {
    it('rejects a caller without access to the project', async () => {
      projectsService.findOne.mockRejectedValue(
        new NotFoundException('Project not found'),
      );
      await expect(service.preview('proj-1', 'stranger')).rejects.toThrow(
        NotFoundException,
      );
      expect(feedbackRepo.find).not.toHaveBeenCalled();
    });

    it('allows a caller with access and returns stats', async () => {
      projectsService.findOne.mockResolvedValue({ id: 'proj-1' });
      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        name: 'My Project',
        user: { id: 'owner-1' },
      });
      feedbackRepo.find.mockResolvedValue([]);
      const result = await service.preview('proj-1', 'member-1');
      expect(projectsService.findOne).toHaveBeenCalledWith(
        'proj-1',
        'member-1',
      );
      expect(result.projectName).toBe('My Project');
    });
  });
});
