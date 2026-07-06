# Redis cache for the JWT user lookup

> Design spec. Tracks PLAN.md 🔥 #6.

## Problem

`JwtStrategy.validate()` (`apps/api/src/modules/auth/jwt.strategy.ts:20-28`) runs `usersService.findOneById(payload.sub)` — a Postgres query — on **every** authenticated request. This is the hottest query in the system and it negates the stateless-JWT scaling rationale: the whole point of a JWT is to avoid a DB round-trip per request, but today every request pays one anyway.

## Goal

Cache the `{id, email, role}` shape returned by `validate()` in Redis, keyed by user id, with a short TTL. Accept bounded revocation latency (a banned/role-changed user keeps old access for up to the TTL) in exchange for removing the DB round-trip from the hot path most of the time.

## Design

### New shared `RedisModule` / `RedisService`

`apps/api/src/redis/redis.module.ts` + `redis.service.ts` — a `@Global()` Nest module wrapping one ioredis client, reading `process.env.REDIS_URL` with the same `|| 'redis://localhost:6379'` fallback already used by the Socket.io adapter, BullMQ, and throttler storage (`app.module.ts:44-59`, `adapters/redis-io.adapter.ts:16-18`). No other module currently exports a shared client — each existing consumer instantiates its own. This is the first app-level cache use of Redis, and PLAN.md's 🟡 Future list already names a second one (plan-limit lookups), so the connection is worth sharing rather than hand-rolling a 4th time.

`RedisService` exposes three generic primitives, nothing cache-policy-specific:

- `get(key: string): Promise<string | null>`
- `set(key: string, value: string, ttlSeconds: number): Promise<void>`
- `del(key: string): Promise<void>`

All three catch and swallow client errors internally, logging once via `Logger.warn` (not `error`, to avoid alert noise on a deliberately-tolerated failure mode) and returning `null` / resolving as a no-op. Callers never need their own try/catch around Redis — the service guarantees it never throws.

This is intentionally **not** a generic cache-manager abstraction (PLAN.md already retired that idea as premature) — it's the connection primitive, with zero policy (no invalidation, no key namespacing helpers). Policy lives in the caller.

### `JwtStrategy.validate()` flow

```
validate(payload):
  key = `user:${payload.sub}`
  cached = redisService.get(key)
  if cached:
    return JSON.parse(cached)   // { id, email, role }

  user = usersService.findOneById(payload.sub)
  if not user:
    throw UnauthorizedException (unchanged)

  result = { id: user.id, email: user.email, role: user.role }
  redisService.set(key, JSON.stringify(result), 30)   // fire-and-forget, do not await-block the response on it mattering
  return result
```

Only the minimal `{id, email, role}` shape is cached — not the full `User` entity — so nothing sensitive (`passwordHash`, `apiKey`, etc.) ever lands in Redis, and the cached shape matches exactly what `validate()` already returns today.

### TTL and invalidation

**30 seconds, TTL-only — no active invalidation on role/email change or user deletion.** A banned user or one whose role just changed keeps their old cached identity for up to 30s after the change; this is an accepted, bounded window, not a bug to close later. No code path needs to remember to bust this cache when touching a user record.

### Failure mode: fail-open

If Redis is unreachable (timeout, connection refused), `RedisService.get`/`set` swallow the error and act as a cache miss / no-op. `JwtStrategy.validate()` always falls through to the Postgres lookup in that case — a Redis outage degrades performance back to today's baseline, it never blocks authentication. This matters because Redis already carries BullMQ, the Socket.io adapter, and throttler storage; a fail-closed JWT path would mean one more thing depends on Redis being up to serve *any* authenticated request.

### Explicitly out of scope

- **Active cache invalidation** on `UsersService.save()` / role change / delete — deferred; TTL alone is the accepted mechanism (see above).
- **A generic cache-manager dependency** — two primitives (`get`/`set`) don't justify a new library; matches the project's existing preference for explicit hand-rolled code over abstraction (e.g. hand-rolled CORS).
- **Consolidating the other three existing Redis clients** (Socket.io adapter, BullMQ, throttler storage) onto `RedisService` — out of scope for this change; they work today and touching them adds risk for no benefit here. `RedisService` is additive.

## Testing (TDD)

- `apps/api/src/redis/redis.service.spec.ts` (new) — `get`/`set` happy path with a mocked ioredis client; `set` passes the TTL through correctly; a client error on `get` or `set` resolves instead of throwing (fail-open).
- `apps/api/src/modules/auth/jwt.strategy.spec.ts` (new — no existing spec file for this strategy) — cache hit returns the cached shape and never calls `usersService.findOneById`; cache miss calls the DB, returns the mapped shape, and warms the cache; a `RedisService` error still returns the user from the DB (fail-open end-to-end); user not found in DB still throws `UnauthorizedException` exactly as today, regardless of cache state.

## Files touched

- `apps/api/src/redis/redis.module.ts` — new.
- `apps/api/src/redis/redis.service.ts` — new.
- `apps/api/src/redis/redis.service.spec.ts` — new.
- `apps/api/src/modules/auth/jwt.strategy.ts` — cache read-through + warm.
- `apps/api/src/modules/auth/jwt.strategy.spec.ts` — new.
- `apps/api/src/app.module.ts` — import `RedisModule` once (its `@Global()` decorator makes `RedisService` injectable everywhere after that, matching how `ConfigModule.forRoot({ isGlobal: true })` is already imported once at this level).
- `docs/architecture/PLAN.md` — mark 🔥 #6 done, add Changelog entry.
