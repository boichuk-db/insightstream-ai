import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../redis/redis.service';

const mockUsersService = { findOneById: jest.fn() };
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};
const mockConfigService = { get: jest.fn().mockReturnValue('test-secret') };

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      mockConfigService as unknown as ConfigService,
      mockUsersService as unknown as UsersService,
      mockRedisService as unknown as RedisService,
    );
  });

  it('returns the cached user without hitting the database', async () => {
    mockRedisService.get.mockResolvedValue(
      JSON.stringify({ id: '1', email: 'a@b.com', role: 'user' }),
    );

    const result = await strategy.validate({ sub: '1' });

    expect(mockRedisService.get).toHaveBeenCalledWith('user:1');
    expect(mockUsersService.findOneById).not.toHaveBeenCalled();
    expect(result).toEqual({ id: '1', email: 'a@b.com', role: 'user' });
  });

  it('falls back to the database on a cache miss and warms the cache', async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockUsersService.findOneById.mockResolvedValue({
      id: '2',
      email: 'c@d.com',
      role: 'admin',
    });

    const result = await strategy.validate({ sub: '2' });

    expect(mockUsersService.findOneById).toHaveBeenCalledWith('2');
    expect(result).toEqual({ id: '2', email: 'c@d.com', role: 'admin' });
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'user:2',
      JSON.stringify({ id: '2', email: 'c@d.com', role: 'admin' }),
      30,
    );
  });

  it('throws UnauthorizedException when the user is not found in the database', async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockUsersService.findOneById.mockResolvedValue(null);

    await expect(strategy.validate({ sub: '404' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockRedisService.set).not.toHaveBeenCalled();
  });

  it('falls back to the database when RedisService.get rejects', async () => {
    mockRedisService.get.mockRejectedValue(new Error('redis down'));
    mockUsersService.findOneById.mockResolvedValue({
      id: '5',
      email: 'g@h.com',
      role: 'user',
    });

    const result = await strategy.validate({ sub: '5' });

    expect(mockUsersService.findOneById).toHaveBeenCalledWith('5');
    expect(result).toEqual({ id: '5', email: 'g@h.com', role: 'user' });
  });

  it('falls back to the database when the cached value is malformed or for a different user', async () => {
    mockRedisService.get.mockResolvedValue('not valid json');
    mockUsersService.findOneById.mockResolvedValue({
      id: '6',
      email: 'i@j.com',
      role: 'user',
    });

    const result = await strategy.validate({ sub: '6' });

    expect(mockUsersService.findOneById).toHaveBeenCalledWith('6');
    expect(result).toEqual({ id: '6', email: 'i@j.com', role: 'user' });
  });
});
