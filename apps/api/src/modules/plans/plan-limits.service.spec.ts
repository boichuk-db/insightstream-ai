import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import {
  Project,
  Feedback,
  TeamMember,
  Team,
  PlanType,
} from '@insightstream/database';
import { PlanLimitsService } from './plan-limits.service';

const repoMock = () => ({
  findOne: jest.fn(),
  count: jest.fn(),
});

describe('PlanLimitsService (team-keyed)', () => {
  let service: PlanLimitsService;
  let teamRepo: ReturnType<typeof repoMock>;
  let projectRepo: ReturnType<typeof repoMock>;
  let feedbackRepo: ReturnType<typeof repoMock>;
  let memberRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    teamRepo = repoMock();
    projectRepo = repoMock();
    feedbackRepo = repoMock();
    memberRepo = repoMock();
    const module = await Test.createTestingModule({
      providers: [
        PlanLimitsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: getRepositoryToken(Team), useValue: teamRepo },
      ],
    }).compile();
    service = module.get(PlanLimitsService);
  });

  describe('getTeamPlan', () => {
    it('returns the team plan', async () => {
      teamRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'active' });
      expect(await service.getTeamPlan('t1')).toBe(PlanType.PRO);
    });
    it('degrades past_due to FREE', async () => {
      teamRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'past_due' });
      expect(await service.getTeamPlan('t1')).toBe(PlanType.FREE);
    });
    it('degrades canceled to FREE', async () => {
      teamRepo.findOne.mockResolvedValue({
        plan: 'BUSINESS',
        planStatus: 'canceled',
      });
      expect(await service.getTeamPlan('t1')).toBe(PlanType.FREE);
    });
    it('keeps the paid plan while trialing', async () => {
      teamRepo.findOne.mockResolvedValue({
        plan: 'PRO',
        planStatus: 'trialing',
      });
      expect(await service.getTeamPlan('t1')).toBe(PlanType.PRO);
    });
    it('defaults to FREE for a missing team', async () => {
      teamRepo.findOne.mockResolvedValue(null);
      expect(await service.getTeamPlan('t1')).toBe(PlanType.FREE);
    });
  });

  describe('canCreateProject', () => {
    it('counts projects by teamId against the team plan', async () => {
      teamRepo.findOne.mockResolvedValue({ plan: 'FREE', planStatus: 'active' });
      projectRepo.count.mockResolvedValue(1); // FREE maxProjects === 1
      const res = await service.canCreateProject('t1');
      expect(projectRepo.count).toHaveBeenCalledWith({ where: { teamId: 't1' } });
      expect(res.allowed).toBe(false);
    });
  });

  describe('canCreateFeedback', () => {
    it('counts this month feedback via project.teamId', async () => {
      teamRepo.findOne.mockResolvedValue({ plan: 'FREE', planStatus: 'active' });
      feedbackRepo.count.mockResolvedValue(0);
      const res = await service.canCreateFeedback('t1');
      expect(feedbackRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ project: { teamId: 't1' } }),
        }),
      );
      expect(res.allowed).toBe(true);
    });
  });

  describe('canCreateFeedbackForProject', () => {
    it('resolves project.teamId and delegates', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'p1', teamId: 't1' });
      teamRepo.findOne.mockResolvedValue({ plan: 'FREE', planStatus: 'active' });
      feedbackRepo.count.mockResolvedValue(0);
      const res = await service.canCreateFeedbackForProject('p1');
      expect(res.allowed).toBe(true);
    });
    it('disallows for a missing project', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      const res = await service.canCreateFeedbackForProject('p1');
      expect(res.allowed).toBe(false);
    });
  });

  describe('canInviteMember', () => {
    it('uses the team plan directly (no owner join)', async () => {
      teamRepo.findOne.mockResolvedValue({ id: 't1', plan: 'FREE', planStatus: 'active' });
      memberRepo.count.mockResolvedValue(1); // FREE maxTeamMembers === 1
      const res = await service.canInviteMember('t1');
      expect(res.allowed).toBe(false);
    });
    it('disallows for a missing team', async () => {
      teamRepo.findOne.mockResolvedValue(null);
      memberRepo.count.mockResolvedValue(0);
      const res = await service.canInviteMember('t1');
      expect(res).toEqual({ allowed: false, current: 0, max: 0 });
    });
  });

  it('assertAllowed throws ForbiddenException with plan payload', () => {
    let thrown: ForbiddenException | undefined;
    try {
      service.assertAllowed(
        { allowed: false, current: 1, max: 1 },
        'projects',
        PlanType.FREE,
      );
    } catch (e) {
      thrown = e as ForbiddenException;
    }
    expect(thrown).toBeInstanceOf(ForbiddenException);
    expect(thrown!.getResponse()).toMatchObject({
      error: 'PlanLimitExceeded',
      currentPlan: PlanType.FREE,
      limit: 1,
      current: 1,
    });
  });
});
