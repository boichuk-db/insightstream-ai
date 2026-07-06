jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

import { Redis } from 'ioredis';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    disconnect: jest.Mock;
  };

  beforeEach(() => {
    (Redis as unknown as jest.Mock).mockClear();
    service = new RedisService();
    mockClient = (Redis as unknown as jest.Mock).mock.results[0].value;
  });

  describe('get', () => {
    it('returns the value from the client', async () => {
      mockClient.get.mockResolvedValue('cached-value');

      const result = await service.get('some-key');

      expect(mockClient.get).toHaveBeenCalledWith('some-key');
      expect(result).toBe('cached-value');
    });

    it('returns null when the client throws (fail-open)', async () => {
      mockClient.get.mockRejectedValue(new Error('connection refused'));

      const result = await service.get('some-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('sets the value with the given TTL in seconds', async () => {
      mockClient.set.mockResolvedValue('OK');

      await service.set('some-key', 'some-value', 30);

      expect(mockClient.set).toHaveBeenCalledWith(
        'some-key',
        'some-value',
        'EX',
        30,
      );
    });

    it('resolves without throwing when the client throws (fail-open)', async () => {
      mockClient.set.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.set('some-key', 'some-value', 30),
      ).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('deletes the key', async () => {
      mockClient.del.mockResolvedValue(1);

      await service.del('some-key');

      expect(mockClient.del).toHaveBeenCalledWith('some-key');
    });

    it('resolves without throwing when the client throws (fail-open)', async () => {
      mockClient.del.mockRejectedValue(new Error('connection refused'));

      await expect(service.del('some-key')).resolves.toBeUndefined();
    });
  });
});
