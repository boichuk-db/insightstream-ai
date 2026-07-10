import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '@insightstream/database';
import { Redis } from 'ioredis';
import { RedisFeedbackEventsPublisher } from './redis-feedback-events-publisher.service';

const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));

jest.mock('@socket.io/redis-emitter', () => ({
  Emitter: jest.fn().mockImplementation(() => ({ to: mockTo })),
}));

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({ disconnect: jest.fn() })),
}));

describe('RedisFeedbackEventsPublisher', () => {
  let service: RedisFeedbackEventsPublisher;
  let projectRepo: { findOne: jest.Mock };
  let mockClient: { disconnect: jest.Mock };

  beforeEach(async () => {
    mockEmit.mockClear();
    mockTo.mockClear();
    (Redis as unknown as jest.Mock).mockClear();
    projectRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisFeedbackEventsPublisher,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
      ],
    }).compile();

    service = module.get(RedisFeedbackEventsPublisher);
    mockClient = (Redis as unknown as jest.Mock).mock.results[0].value;
  });

  it('emits feedbackUpdated to the project team room via the Redis emitter', async () => {
    projectRepo.findOne.mockResolvedValue({ id: 'proj-1', teamId: 'team-1' });

    await service.emitFeedbackUpdatedForProject('proj-1');

    expect(projectRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
    });
    expect(mockTo).toHaveBeenCalledWith('team-team-1');
    expect(mockEmit).toHaveBeenCalledWith(
      'feedbackUpdated',
      expect.objectContaining({ timestamp: expect.any(Date) }),
    );
  });

  it('no-ops when the project no longer exists', async () => {
    projectRepo.findOne.mockResolvedValue(null);

    await service.emitFeedbackUpdatedForProject('missing-proj');

    expect(mockTo).not.toHaveBeenCalled();
  });

  describe('onModuleDestroy', () => {
    it('disconnects the Redis client', () => {
      service.onModuleDestroy();

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });
});
