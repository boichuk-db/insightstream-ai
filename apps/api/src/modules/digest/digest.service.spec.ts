import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Project, Feedback, TeamMember } from '@insightstream/database';
import { DigestService } from './digest.service';
import { AiService } from '../ai/ai.service';
import { MailService } from '../mail/mail.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { ProjectsService } from '../projects/projects.service';

describe('DigestService', () => {
  let service: DigestService;
  let projectsService: any;
  let projects: any;
  let feedbacks: any;
  let memberRepo: any;
  let mail: any;
  let planLimits: any;

  beforeEach(async () => {
    projects = { findOne: jest.fn(), find: jest.fn() };
    feedbacks = { find: jest.fn().mockResolvedValue([]) };
    memberRepo = { find: jest.fn().mockResolvedValue([]) };
    projectsService = { findOne: jest.fn() };
    mail = { send: jest.fn() };
    planLimits = { canUseFeature: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: getRepositoryToken(Project), useValue: projects },
        { provide: getRepositoryToken(Feedback), useValue: feedbacks },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        {
          provide: AiService,
          useValue: {
            generateWeeklyDigest: jest.fn().mockResolvedValue('<p>ok</p>'),
          },
        },
        { provide: MailService, useValue: mail },
        { provide: PlanLimitsService, useValue: planLimits },
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
      expect(feedbacks.find).not.toHaveBeenCalled();
    });

    it('allows a caller with access and returns stats', async () => {
      projectsService.findOne.mockResolvedValue({ id: 'proj-1' });
      projects.findOne.mockResolvedValue({
        id: 'proj-1',
        name: 'My Project',
        teamId: 't1',
      });
      feedbacks.find.mockResolvedValue([]);
      const result = await service.preview('proj-1', 'member-1');
      expect(projectsService.findOne).toHaveBeenCalledWith(
        'proj-1',
        'member-1',
      );
      expect(result.projectName).toBe('My Project');
    });

    it('throws when the team plan does not include the digest', async () => {
      projectsService.findOne.mockResolvedValue({ id: 'proj-1' });
      projects.findOne.mockResolvedValue({
        id: 'proj-1',
        name: 'My Project',
        teamId: 't1',
      });
      planLimits.canUseFeature.mockResolvedValue(false);
      await expect(service.preview('proj-1', 'member-1')).rejects.toThrow(
        /Pro and Business plans/,
      );
      expect(planLimits.canUseFeature).toHaveBeenCalledWith(
        't1',
        'weeklyDigest',
      );
    });
  });

  describe('runDigest', () => {
    it('sends the digest to every team member', async () => {
      projects.find.mockResolvedValue([
        { id: 'p1', name: 'Proj', teamId: 't1' },
      ]);
      planLimits.canUseFeature.mockResolvedValue(true);
      feedbacks.find.mockResolvedValue([{ content: 'x', sentimentScore: 0.2 }]);
      memberRepo.find.mockResolvedValue([
        { userId: 'u1', user: { email: 'a@x.dev' } },
        { userId: 'u2', user: { email: 'b@x.dev' } },
      ]);
      const res = await service.runDigest();
      expect(mail.send).toHaveBeenCalledTimes(2);
      expect(planLimits.canUseFeature).toHaveBeenCalledWith(
        't1',
        'weeklyDigest',
      );
      expect(res.sent).toBe(1);
      expect(res.skipped).toBe(0);
    });

    it('skips projects whose team plan lacks the digest', async () => {
      projects.find.mockResolvedValue([
        { id: 'p1', name: 'Proj', teamId: 't1' },
      ]);
      planLimits.canUseFeature.mockResolvedValue(false);
      const res = await service.runDigest();
      expect(mail.send).not.toHaveBeenCalled();
      expect(res.skipped).toBe(1);
    });

    it('skips projects with no feedbacks this week', async () => {
      projects.find.mockResolvedValue([
        { id: 'p1', name: 'Proj', teamId: 't1' },
      ]);
      planLimits.canUseFeature.mockResolvedValue(true);
      feedbacks.find.mockResolvedValue([]);
      const res = await service.runDigest();
      expect(mail.send).not.toHaveBeenCalled();
      expect(res.skipped).toBe(1);
    });

    it('skips (not crashes) when no member has an email', async () => {
      projects.find.mockResolvedValue([
        { id: 'p1', name: 'Proj', teamId: 't1' },
      ]);
      planLimits.canUseFeature.mockResolvedValue(true);
      feedbacks.find.mockResolvedValue([{ content: 'x', sentimentScore: 0.2 }]);
      memberRepo.find.mockResolvedValue([{ userId: 'u1', user: undefined }]);
      const res = await service.runDigest();
      expect(mail.send).not.toHaveBeenCalled();
      expect(res.skipped).toBe(1);
    });

    it('does not let an error in one project kill the whole run', async () => {
      projects.find.mockResolvedValue([
        { id: 'p1', name: 'Broken', teamId: 't1' },
        { id: 'p2', name: 'Fine', teamId: 't2' },
      ]);
      planLimits.canUseFeature.mockResolvedValue(true);
      feedbacks.find.mockImplementation(({ where }: any) => {
        if (where.projectId === 'p1') {
          return Promise.reject(new Error('boom'));
        }
        return Promise.resolve([{ content: 'x', sentimentScore: 0.2 }]);
      });
      memberRepo.find.mockResolvedValue([
        { userId: 'u1', user: { email: 'a@x.dev' } },
      ]);
      const res = await service.runDigest();
      expect(res.sent).toBe(1);
      expect(res.skipped).toBe(1);
      expect(mail.send).toHaveBeenCalledTimes(1);
    });
  });
});
