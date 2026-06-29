import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  User,
  Project,
  Feedback,
  TeamMember,
  Team,
  PlanType,
} from '@insightstream/database';
import { PlanLimitsService } from './plan-limits.service';

describe('PlanLimitsService.getUserPlan', () => {
  let service: PlanLimitsService;
  let userRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    userRepo = { findOne: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitsService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(Project),
          useValue: { count: jest.fn() },
        },
        {
          provide: getRepositoryToken(Feedback),
          useValue: { count: jest.fn() },
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: { count: jest.fn() },
        },
        {
          provide: getRepositoryToken(Team),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<PlanLimitsService>(PlanLimitsService);
  });

  it('returns FREE when planStatus is past_due, regardless of stored plan', async () => {
    userRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'past_due' });
    expect(await service.getUserPlan('user-1')).toBe(PlanType.FREE);
  });

  it('returns FREE when planStatus is canceled', async () => {
    userRepo.findOne.mockResolvedValue({
      plan: 'BUSINESS',
      planStatus: 'canceled',
    });
    expect(await service.getUserPlan('user-1')).toBe(PlanType.FREE);
  });

  it('returns actual plan when status is active', async () => {
    userRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'active' });
    expect(await service.getUserPlan('user-1')).toBe(PlanType.PRO);
  });

  it('returns actual plan when status is trialing', async () => {
    userRepo.findOne.mockResolvedValue({
      plan: 'PRO',
      planStatus: 'trialing',
    });
    expect(await service.getUserPlan('user-1')).toBe(PlanType.PRO);
  });

  it('returns FREE when user not found', async () => {
    userRepo.findOne.mockResolvedValue(null);
    expect(await service.getUserPlan('user-1')).toBe(PlanType.FREE);
  });
});
