# Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Redis-backed rate limiting to the NestJS API — strict limits on the public widget endpoint (per-IP + per-apiKey) and auth endpoints (per-IP), with a global authenticated API limit.

**Architecture:** Use `@nestjs/throttler` with `@nest-lab/throttler-storage-redis`. Two custom guards (`WidgetThrottlerGuard`, `ApiThrottlerGuard`) extend the base `ThrottlerGuard` to generate composite Redis keys. `ThrottlerModule` is registered globally in `AppModule` reusing the existing `REDIS_URL` env var. Auth endpoint limits are applied via `@Throttle()` decorators on the controller.

**Tech Stack:** `@nestjs/throttler ^6`, `@nest-lab/throttler-storage-redis`, Redis (existing `REDIS_URL`), NestJS 11, Jest

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/api/src/guards/widget-throttler.guard.ts` | Rate limit widget endpoint by IP + apiKey |
| Create | `apps/api/src/guards/api-throttler.guard.ts` | Rate limit authenticated API by userId or IP |
| Create | `apps/api/src/guards/widget-throttler.guard.spec.ts` | Unit tests for WidgetThrottlerGuard |
| Create | `apps/api/src/guards/api-throttler.guard.spec.ts` | Unit tests for ApiThrottlerGuard |
| Modify | `apps/api/src/app.module.ts` | Register ThrottlerModule + global ApiThrottlerGuard |
| Modify | `apps/api/src/modules/feedback/feedback.public.controller.ts` | Apply WidgetThrottlerGuard |
| Modify | `apps/api/src/modules/auth/auth.controller.ts` | Apply @Throttle on login + register |
| Modify | `apps/api/src/main.ts` | Set Express trust proxy |

---

## Task 1: Install packages

- [ ] **Step 1: Install throttler packages**

```bash
cd apps/api && pnpm add @nestjs/throttler @nest-lab/throttler-storage-redis
```

Expected output: packages added to `apps/api/package.json` and `pnpm-lock.yaml`.

- [ ] **Step 2: Verify install**

```bash
cd apps/api && node -e "require('@nestjs/throttler'); require('@nest-lab/throttler-storage-redis'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: install @nestjs/throttler and redis storage adapter"
```

---

## Task 2: WidgetThrottlerGuard — tests first

**Files:**
- Create: `apps/api/src/guards/widget-throttler.guard.spec.ts`
- Create: `apps/api/src/guards/widget-throttler.guard.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/guards/widget-throttler.guard.spec.ts`:

```typescript
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
    const key = await (guard as any).generateKey(ctx, 'widget:ip', 'suffix');
    expect(key).toBe('widget:ip-1.2.3.4-suffix');
  });

  it('generates apiKey key from request body', async () => {
    const ctx = makeContext('1.2.3.4', { apiKey: 'key-abc' });
    const key = await (guard as any).generateKey(ctx, 'widget:project', 'suffix');
    expect(key).toBe('widget:project-key-abc-suffix');
  });

  it('falls back to ip when apiKey missing', async () => {
    const ctx = makeContext('1.2.3.4', {});
    const key = await (guard as any).generateKey(ctx, 'widget:project', 'suffix');
    expect(key).toBe('widget:project-1.2.3.4-suffix');
  });

  it('returns true (fail open) when storage throws a non-throttler error', async () => {
    jest.spyOn(guard as any, 'handleRequest').mockRejectedValue(new Error('Redis connection refused'));
    const ctx = makeContext('1.2.3.4', { apiKey: 'key-abc' });
    const result = await guard.canActivate(ctx).catch(() => false);
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && pnpm test -- --testPathPattern=widget-throttler --no-coverage
```

Expected: FAIL — `Cannot find module './widget-throttler.guard'`

- [ ] **Step 3: Implement WidgetThrottlerGuard**

Create `apps/api/src/guards/widget-throttler.guard.ts`:

```typescript
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

  protected async generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): Promise<string> {
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
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd apps/api && pnpm test -- --testPathPattern=widget-throttler --no-coverage
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/guards/widget-throttler.guard.ts apps/api/src/guards/widget-throttler.guard.spec.ts
git commit -m "feat: add WidgetThrottlerGuard with IP + apiKey composite keys"
```

---

## Task 3: ApiThrottlerGuard — tests first

**Files:**
- Create: `apps/api/src/guards/api-throttler.guard.spec.ts`
- Create: `apps/api/src/guards/api-throttler.guard.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/guards/api-throttler.guard.spec.ts`:

```typescript
import { ExecutionContext } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
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

  beforeEach(() => {
    guard = new ApiThrottlerGuard(
      {} as any,
      {} as ThrottlerStorageService,
      {} as Reflector,
    );
  });

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
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && pnpm test -- --testPathPattern=api-throttler --no-coverage
```

Expected: FAIL — `Cannot find module './api-throttler.guard'`

- [ ] **Step 3: Implement ApiThrottlerGuard**

Create `apps/api/src/guards/api-throttler.guard.ts`:

```typescript
import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions, ThrottlerStorageService } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ApiThrottlerGuard.name);

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

  protected async generateKey(
    context: ExecutionContext,
    suffix: string,
    _name: string,
  ): Promise<string> {
    const req = context.switchToHttp().getRequest();
    const ip: string = (req.ips?.length ? req.ips[0] : req.ip) ?? 'unknown';

    if (req.user?.id) {
      return `api:user-${req.user.id}-${suffix}`;
    }

    return `api:ip-${ip}-${suffix}`;
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd apps/api && pnpm test -- --testPathPattern=api-throttler --no-coverage
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/guards/api-throttler.guard.ts apps/api/src/guards/api-throttler.guard.spec.ts
git commit -m "feat: add ApiThrottlerGuard with userId/IP key strategy"
```

---

## Task 4: Register ThrottlerModule in AppModule

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add ThrottlerModule import and global guard**

Open `apps/api/src/app.module.ts` and apply these changes:

Add to imports at the top of the file:
```typescript
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { ApiThrottlerGuard } from './guards/api-throttler.guard';
```

Add `ThrottlerModule.forRoot()` to the `imports` array (after `BullModule.forRoot`):
```typescript
ThrottlerModule.forRoot({
  throttlers: [
    {
      name: 'default',
      ttl: 60000,
      limit: parseInt(process.env.API_GLOBAL_LIMIT ?? '200', 10),
    },
  ],
  storage: new ThrottlerStorageRedisService(
    process.env.REDIS_URL ?? 'redis://localhost:6379',
  ),
}),
```

Add to the `providers` array:
```typescript
{
  provide: APP_GUARD,
  useClass: ApiThrottlerGuard,
},
```

- [ ] **Step 2: Build to verify no compile errors**

```bash
cd apps/api && pnpm build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat: register ThrottlerModule globally with Redis storage"
```

---

## Task 5: Apply WidgetThrottlerGuard to public feedback endpoint

**Files:**
- Modify: `apps/api/src/modules/feedback/feedback.public.controller.ts`

- [ ] **Step 1: Add guard and throttle decorators**

Open `apps/api/src/modules/feedback/feedback.public.controller.ts`.

Add to imports:
```typescript
import { UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { WidgetThrottlerGuard } from '../../guards/widget-throttler.guard';
```

Replace the `@Controller('feedback/public')` class decorator block — add `@UseGuards` and `@Throttle` on the `createPublic` method:

```typescript
@Post()
@UseGuards(WidgetThrottlerGuard)
@Throttle({
  'widget:ip': {
    ttl: 60000,
    limit: parseInt(process.env.WIDGET_IP_LIMIT ?? '20', 10),
  },
  'widget:project': {
    ttl: 60000,
    limit: parseInt(process.env.WIDGET_PROJECT_LIMIT ?? '300', 10),
  },
})
async createPublic(
  @Body() body: { apiKey: string; content: string; source?: string },
  @Headers('origin') origin?: string,
) {
```

- [ ] **Step 2: Build to verify no compile errors**

```bash
cd apps/api && pnpm build 2>&1 | tail -20
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/feedback/feedback.public.controller.ts
git commit -m "feat: apply WidgetThrottlerGuard to public feedback endpoint"
```

---

## Task 6: Apply @Throttle to auth endpoints

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Add @Throttle decorators to login and register**

Open `apps/api/src/modules/auth/auth.controller.ts`.

Add to imports:
```typescript
import { Throttle } from '@nestjs/throttler';
```

Add `@Throttle` decorator above `@Post('register')`:
```typescript
@Throttle({ default: { ttl: 60000, limit: parseInt(process.env.AUTH_REGISTER_LIMIT ?? '5', 10) } })
@Post('register')
async register(@Body() body: any) {
```

Add `@Throttle` decorator above `@Post('login')`:
```typescript
@Throttle({ default: { ttl: 60000, limit: parseInt(process.env.AUTH_LOGIN_LIMIT ?? '10', 10) } })
@Post('login')
@HttpCode(HttpStatus.OK)
async login(@Body() body: any) {
```

- [ ] **Step 2: Build to verify**

```bash
cd apps/api && pnpm build 2>&1 | tail -20
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.controller.ts
git commit -m "feat: apply rate limits to login (10/min) and register (5/min)"
```

---

## Task 7: Set trust proxy in main.ts

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Add trust proxy before app.listen()**

Open `apps/api/src/main.ts`. Add this line immediately before the `await app.listen(...)` call:

```typescript
app.getHttpAdapter().getInstance().set('trust proxy', 1);
```

The file should end like:
```typescript
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  await app.listen(process.env.PORT ?? 3001);
```

- [ ] **Step 2: Build to verify**

```bash
cd apps/api && pnpm build 2>&1 | tail -20
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat: set express trust proxy for Railway X-Forwarded-For"
```

---

## Task 8: Manual smoke test + run all tests

- [ ] **Step 1: Run all API tests**

```bash
cd apps/api && pnpm test --no-coverage
```

Expected: all tests pass including the new guard specs.

- [ ] **Step 2: Start API locally and smoke test**

```bash
# Terminal 1
docker compose up -d
cd apps/api && pnpm dev
```

```bash
# Terminal 2 — send 21 requests to widget endpoint, last one should be 429
for i in $(seq 1 21); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/feedback/public \
    -H "Content-Type: application/json" \
    -d '{"apiKey":"invalid-but-triggers-limit","content":"test"}')
  echo "Request $i: $STATUS"
done
```

Expected: first 20 return 401 (invalid key, but not rate limited), request 21 returns 429.

> **Note:** The 401 before 429 is correct — rate limiting fires after auth check in NestJS guard chain. The throttler guard runs first (before controller logic), so you will see 429 on request 21 regardless of apiKey validity.

- [ ] **Step 3: Verify response headers on 429**

```bash
curl -v -X POST http://localhost:3001/feedback/public \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"test","content":"test"}' 2>&1 | grep -E "< HTTP|Retry-After|x-ratelimit"
```

Expected: `HTTP/1.1 429`, `Retry-After: 60` header present.

- [ ] **Step 4: Final commit if everything passes**

```bash
git add .
git commit -m "chore: rate limiting implementation complete"
```

---

## Environment Variables to Add

Add these to `.env` files (Railway dashboard for prod):

```
WIDGET_IP_LIMIT=20
WIDGET_PROJECT_LIMIT=300
AUTH_LOGIN_LIMIT=10
AUTH_REGISTER_LIMIT=5
API_GLOBAL_LIMIT=200
```
