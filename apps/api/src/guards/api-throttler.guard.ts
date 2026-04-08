import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ApiThrottlerGuard.name);

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (err: unknown) {
      // Fail open: if Redis is down, allow the request through
      if (!(err instanceof ThrottlerException)) {
        this.logger.error('ThrottlerStorage unavailable, failing open', err);
        return true;
      }
      throw err;
    }
  }

  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    _name: string,
  ): string {
    const req = context.switchToHttp().getRequest();
    const ip: string = (req.ips?.length ? req.ips[0] : req.ip) ?? 'unknown';

    if (req.user?.id) {
      return `api:user-${req.user.id}-${suffix}`;
    }

    return `api:ip-${ip}-${suffix}`;
  }
}
