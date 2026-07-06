# JWT User-Lookup Redis Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache `JwtStrategy.validate()`'s `{id, email, role}` result in Redis (30s TTL) so most authenticated requests skip the Postgres user lookup, without weakening auth when Redis is unavailable.

**Architecture:** A new `@Global()` `RedisModule` wraps one `ioredis` client in a `RedisService` with three primitives (`get`/`set`/`del`) that never throw — client errors are caught, logged, and treated as a miss/no-op. `JwtStrategy.validate()` becomes read-through: check cache, fall back to `UsersService.findOneById`, warm the cache on miss. No invalidation beyond TTL.

**Tech Stack:** NestJS 11, `ioredis` (already a dependency, already used by the Socket.io adapter/BullMQ/throttler storage in this app), Jest.

**Spec:** `docs/superpowers/specs/2026-07-06-jwt-user-lookup-redis-cache-design.md`

---

## File Structure

- `apps/api/src/redis/redis.service.ts` — new. Wraps one `ioredis` client; `get`/`set`/`del`, fail-open.
- `apps/api/src/redis/redis.service.spec.ts` — new.
- `apps/api/src/redis/redis.module.ts` — new. `@Global()`, provides + exports `RedisService`.
- `apps/api/src/modules/auth/jwt.strategy.ts` — modified. Read-through cache in `validate()`.
- `apps/api/src/modules/auth/jwt.strategy.spec.ts` — new (no existing spec file for this strategy).
- `apps/api/src/app.module.ts` — modified. Import `RedisModule` once, alongside the other root-level module imports.
- `docs/architecture/PLAN.md` — modified. Mark 🔥 #6 done, add Changelog entry.

---

### Task 1: `RedisService` — get/set/del, fail-open

**Files:**
- Create: `apps/api/src/redis/redis.service.ts`
- Test: `apps/api/src/redis/redis.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/src/redis/redis.service.spec.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx jest redis/redis.service.spec.ts`
Expected: FAIL — `Cannot find module './redis.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/redis/redis.service.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(redisUrl);
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(
        `get failed for key "${key}": ${(error as Error).message}`,
      );
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `set failed for key "${key}": ${(error as Error).message}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(
        `del failed for key "${key}": ${(error as Error).message}`,
      );
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx jest redis/redis.service.spec.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/redis/redis.service.ts apps/api/src/redis/redis.service.spec.ts
git commit -m "feat(api): add fail-open RedisService (get/set/del)"
```

---

### Task 2: `RedisModule` — global provider

**Files:**
- Create: `apps/api/src/redis/redis.module.ts`

- [ ] **Step 1: Write the module**

```typescript
// apps/api/src/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

No test needed — this is a declarative wiring file with no logic; its behavior is exercised by Task 4's `JwtStrategy` tests (which mock `RedisService` directly, not through the module) and by boot verification in Task 6.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/redis/redis.module.ts
git commit -m "feat(api): add global RedisModule"
```

---

### Task 3: Wire `RedisModule` into `AppModule`

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add the import**

In `apps/api/src/app.module.ts`, add the import statement near the other module imports (after the last `import ... from './modules/...'` line, before the `@Module` decorator):

```typescript
import { RedisModule } from './redis/redis.module';
```

Add `RedisModule` to the `imports` array inside `@Module({...})` — place it right after `BullModule.forRoot({...})` since both configure Redis-adjacent infrastructure:

```typescript
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    }),
    RedisModule,
```

- [ ] **Step 2: Verify the app still boots**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): import RedisModule at the app root"
```

---

### Task 4: `JwtStrategy` read-through cache

**Files:**
- Modify: `apps/api/src/modules/auth/jwt.strategy.ts:20-28`
- Test: `apps/api/src/modules/auth/jwt.strategy.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/src/modules/auth/jwt.strategy.spec.ts
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx jest modules/auth/jwt.strategy.spec.ts`
Expected: FAIL — constructor arity mismatch (`JwtStrategy` doesn't accept a third argument yet) and/or cache assertions failing since `RedisService` isn't wired in yet.

- [ ] **Step 3: Update the implementation**

```typescript
// apps/api/src/modules/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../redis/redis.service';

const USER_CACHE_TTL_SECONDS = 30;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'super_secret_key',
    });
  }

  async validate(payload: any) {
    const cacheKey = `user:${payload.sub}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        'User no longer exists. Please re-authenticate.',
      );
    }

    const result = { id: user.id, email: user.email, role: user.role };
    void this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      USER_CACHE_TTL_SECONDS,
    );
    return result;
  }
}
```

Note: `redisService.set` is fire-and-forget (`void`, not awaited) per the spec — the response never waits on the cache write. The call itself still happens synchronously when `validate()` runs, so the test in Step 1 can assert `mockRedisService.set` was called without awaiting it — only the underlying promise's settlement is un-awaited, not the call.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx jest modules/auth/jwt.strategy.spec.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Update `AuthModule` provider wiring**

`JwtStrategy` is already provided via `providers: [AuthService, JwtStrategy, GoogleStrategy, GitHubStrategy]` in `apps/api/src/modules/auth/auth.module.ts` — Nest resolves the new `RedisService` constructor param automatically once `RedisModule` is global (Task 3), so **no change needed** in `auth.module.ts`. Confirm by re-running the full test suite in Step 6.

- [ ] **Step 6: Run the full auth test suite**

Run: `cd apps/api && npx jest modules/auth`
Expected: PASS — all `auth.service.spec.ts` and `jwt.strategy.spec.ts` tests green.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/auth/jwt.strategy.ts apps/api/src/modules/auth/jwt.strategy.spec.ts
git commit -m "feat(api): read-through Redis cache for JwtStrategy.validate"
```

---

### Task 5: Update `PLAN.md`

**Files:**
- Modify: `docs/architecture/PLAN.md`

- [ ] **Step 1: Mark 🔥 #6 done**

Find this block (currently around line 77):

```markdown
### 6. Redis cache for the JWT user lookup
**Problem:** `JwtStrategy.validate()` reads Postgres on every authenticated request — the hottest query in the system, and it negates the stateless-JWT scaling rationale.
**Action:** cache the user by id in Redis with a 30–60s TTL. Revocation latency = TTL. Composes cleanly with the future refresh-token work.
**Effort:** hours. **Type:** performance.
```

Replace with:

```markdown
### 6. ~~Redis cache for the JWT user lookup~~ — ✔ Done (2026-07-06)
**Problem:** `JwtStrategy.validate()` read Postgres on every authenticated request — the hottest query in the system, negating the stateless-JWT scaling rationale.
**What was done:** new `@Global()` `RedisModule`/`RedisService` (`apps/api/src/redis/`) — a thin `get`/`set`/`del` wrapper over `ioredis` that catches client errors and treats them as a miss/no-op (fail-open), logged once via `Logger.warn`. `JwtStrategy.validate()` is now read-through: cache hit returns `{id, email, role}` from Redis without touching the DB; miss falls back to `UsersService.findOneById`, then warms the cache. TTL 30s, no active invalidation (accepted bounded revocation latency — a banned/role-changed user keeps old access for up to 30s). First app-level cache use of Redis in this codebase; the connection is shared via the new `RedisService` rather than hand-rolling a 4th independent client (Socket.io adapter, BullMQ, and throttler storage each already have their own). Design: `docs/superpowers/specs/2026-07-06-jwt-user-lookup-redis-cache-design.md`.
**Deliberately out of scope:** active cache invalidation on user save/role-change/delete; consolidating the other three existing Redis clients onto `RedisService`.
**Type:** performance.
```

- [ ] **Step 2: Add a Changelog entry**

At the top of the `## Changelog` section (after the `---` before it, before the first existing `- **2026-07-06** — ...` entry), add:

```markdown
- **2026-07-06** — 🔥 #6 done: Redis cache for the JWT user lookup. New `@Global()` `RedisModule`/`RedisService` (`apps/api/src/redis/`) wraps `ioredis` with fail-open `get`/`set`/`del` (client errors caught, logged, treated as miss/no-op — never block auth). `JwtStrategy.validate()` is now read-through with a 30s TTL and no active invalidation (bounded revocation latency, accepted). First app-level Redis cache in the codebase — shares one connection via `RedisService` rather than adding a 4th independent client. Design: `docs/superpowers/specs/2026-07-06-jwt-user-lookup-redis-cache-design.md`.
```

- [ ] **Step 3: Bump the "Last updated" date**

Confirm the header still reads `> Last updated: **2026-07-06**` (already today's date — no change needed unless this plan is executed on a later date, in which case update it to that date).

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/PLAN.md
git commit -m "docs: mark PLAN.md 🔥 #6 (JWT Redis cache) done"
```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: API unit tests**

Run: `pnpm test`
Expected: all suites pass, including the two new spec files.

- [ ] **Step 4: Boot check against local Redis**

Run: `docker compose up -d` (ensures local Redis is up), then start the API (`pnpm --filter api dev` or the repo's usual `pnpm dev`) and confirm the Nest log shows a clean boot with no `RedisModule`/`RedisService` DI errors. Hit any authenticated endpoint twice in a row (e.g. `GET /me` with a valid bearer token) and confirm the second call still returns `200` — this exercises the cache-hit path end-to-end, not just the mocked unit tests.

- [ ] **Step 5: Report results**

Per this project's Verification Mandate (`CLAUDE.md`), show the actual `pnpm typecheck && pnpm lint` (and `pnpm test`) output before calling this done — do not assert success without it.
