import { ExecutionContext } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { WidgetThrottlerGuard } from './widget-throttler.guard';

const makeContext = (ip: string, body: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        ips: [],
        body,
        headers: {},
      }),
    }),
    getClass: () => ({}),
    getHandler: () => ({}),
  }) as unknown as ExecutionContext;

describe('WidgetThrottlerGuard', () => {
  let guard: WidgetThrottlerGuard;

  beforeEach(() => {
    guard = new WidgetThrottlerGuard(
      {} as any,
      {} as ThrottlerStorageService,
      {} as Reflector,
    );
  });

  it('generates ip key from request ip', async () => {
    const ctx = makeContext('1.2.3.4', { apiKey: 'key-abc' });
    // v6 signature: generateKey(context, suffix=tracker, name=throttlerName)
    const key = await (guard as any).generateKey(ctx, 'tracker-suffix', 'widget:ip');
    expect(key).toBe('widget:ip-1.2.3.4-tracker-suffix');
  });

  it('generates apiKey key from request body', async () => {
    const ctx = makeContext('1.2.3.4', { apiKey: 'key-abc' });
    const key = await (guard as any).generateKey(ctx, 'tracker-suffix', 'widget:project');
    expect(key).toBe('widget:project-key-abc-tracker-suffix');
  });

  it('falls back to ip when apiKey missing', async () => {
    const ctx = makeContext('1.2.3.4', {});
    const key = await (guard as any).generateKey(ctx, 'tracker-suffix', 'widget:project');
    expect(key).toBe('widget:project-1.2.3.4-tracker-suffix');
  });

  it('returns true (fail open) when storage throws a non-throttler error', async () => {
    jest.spyOn(guard as any, 'handleRequest').mockRejectedValue(new Error('Redis connection refused'));
    const ctx = makeContext('1.2.3.4', { apiKey: 'key-abc' });
    const result = await guard.canActivate(ctx).catch(() => false);
    expect(result).toBe(true);
  });
});
