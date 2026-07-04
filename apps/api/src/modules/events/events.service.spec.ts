import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '@insightstream/database';
import { EventsService } from './events.service';
import { EventsGateway } from './events.gateway';

describe('EventsService', () => {
  let service: EventsService;
  let projectRepo: any;
  let gateway: any;

  beforeEach(async () => {
    projectRepo = { findOne: jest.fn() };
    gateway = { emitFeedbackUpdatedToTeam: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: EventsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('emits once to the project team room', async () => {
    projectRepo.findOne.mockResolvedValue({ id: 'p1', teamId: 't1' });
    await service.emitFeedbackUpdatedForProject('p1');
    expect(gateway.emitFeedbackUpdatedToTeam).toHaveBeenCalledWith('t1');
    expect(gateway.emitFeedbackUpdatedToTeam).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a missing project', async () => {
    projectRepo.findOne.mockResolvedValue(null);
    await service.emitFeedbackUpdatedForProject('p1');
    expect(gateway.emitFeedbackUpdatedToTeam).not.toHaveBeenCalled();
  });
});
