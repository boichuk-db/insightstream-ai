import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions, ThrottlerStorageService } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class WidgetThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(WidgetThrottlerGuard.name);

  constructor(
    options: ThrottlerOptions[],
    storageService: ThrottlerStorageService,
    reflector: Reflector,
  ) {
    super(options as any, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (err: unknown) {
      // Fail open: if Redis is down, allow the request through
      if (!(err instanceof Error && err.name === 'ThrottlerException')) {
        this.logger.error('ThrottlerStorage unavailable, failing open', err);
        return true;
      }
      throw err;
    }
  }

  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const req = context.switchToHttp().getRequest();
    const ip: string = (req.ips?.length ? req.ips[0] : req.ip) ?? 'unknown';

    if (name === 'widget:project') {
      const apiKey: string = req.body?.apiKey ?? ip;
      return `widget:project-${apiKey}-${suffix}`;
    }

    return `widget:ip-${ip}-${suffix}`;
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }
}
