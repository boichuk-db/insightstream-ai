import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { ApiThrottlerGuard } from './api-throttler.guard';

const makeContext = (ip: string, user?: { id: string }): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        ips: [],
        user,
        headers: {},
      }),
    }),
    getClass: () => ({}),
    getHandler: () => ({}),
  }) as unknown as ExecutionContext;

describe('ApiThrottlerGuard', () => {
  let guard: ApiThrottlerGuard;

  beforeEach(async () => {
    guard = new ApiThrottlerGuard(
      [{ name: 'default', ttl: 60000, limit: 200 }],
      {} as any,
      {} as Reflector,
    );
    await guard.onModuleInit();
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses userId as key when user is authenticated', async () => {
    const ctx = makeContext('1.2.3.4', { id: 'user-123' });
    const key = await (guard as any).generateKey(ctx, 'suffix', 'default');
    expect(key).toBe('api:user-user-123-suffix');
  });

  it('falls back to IP when user is not authenticated', async () => {
    const ctx = makeContext('5.6.7.8');
    const key = await (guard as any).generateKey(ctx, 'suffix', 'default');
    expect(key).toBe('api:ip-5.6.7.8-suffix');
  });

  it('returns true (fail open) when storage throws a non-throttler error', async () => {
    jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockRejectedValue(new Error('Redis connection refused'));
    const ctx = makeContext('1.2.3.4', { id: 'user-123' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('re-throws ThrottlerException (does not fail open)', async () => {
    const throttlerErr = new ThrottlerException();
    jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockRejectedValue(throttlerErr);
    const ctx = makeContext('1.2.3.4', { id: 'user-123' });
    await expect(guard.canActivate(ctx)).rejects.toBe(throttlerErr);
  });
});
