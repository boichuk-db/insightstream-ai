import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project, TeamMember } from '@insightstream/database';
import { EventsService } from './events.service';
import { EventsGateway } from './events.gateway';

describe('EventsService', () => {
  let service: EventsService;
  let projectRepo: any;
  let memberRepo: any;
  let gateway: any;

  beforeEach(async () => {
    projectRepo = { findOne: jest.fn() };
    memberRepo = { find: jest.fn().mockResolvedValue([]) };
    gateway = { emitFeedbackUpdated: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: EventsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('emits to the owner for a personal project', async () => {
    projectRepo.findOne.mockResolvedValue({
      id: 'p1',
      userId: 'owner-1',
      teamId: null,
    });
    await service.emitFeedbackUpdatedForProject('p1');
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledTimes(1);
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledWith('owner-1');
  });

  it('emits to owner and all team members exactly once each', async () => {
    projectRepo.findOne.mockResolvedValue({
      id: 'p1',
      userId: 'owner-1',
      teamId: 'team-1',
    });
    memberRepo.find.mockResolvedValue([
      { userId: 'owner-1' },
      { userId: 'member-2' },
      { userId: 'member-3' },
    ]);
    await service.emitFeedbackUpdatedForProject('p1');
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledTimes(3);
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledWith('member-2');
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledWith('member-3');
  });

  it('does nothing when project not found', async () => {
    projectRepo.findOne.mockResolvedValue(null);
    await service.emitFeedbackUpdatedForProject('missing');
    expect(gateway.emitFeedbackUpdated).not.toHaveBeenCalled();
  });
});
