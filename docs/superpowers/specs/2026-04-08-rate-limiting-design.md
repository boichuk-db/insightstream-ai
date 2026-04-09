# Rate Limiting — Design Spec

**Date:** 2026-04-08  
**Status:** Approved  
**Scope:** NestJS API (`apps/api`)

---

## Problem

The API has no rate limiting. The public widget endpoint (`POST /widget/feedback`) and auth endpoints are open to flooding. With Railway single-instance deployment and Redis already available in production, adding Redis-backed throttling is low-effort and high-impact.

---

## Approach

Use `@nestjs/throttler` with `@nest-lab/throttler-storage-redis`. Register globally in `AppModule`. Two custom guards handle different key strategies.

---

## Packages

```
@nestjs/throttler
@nest-lab/throttler-storage-redis
```

---

## Limits

| Endpoint | Strategy | Limit |
|---|---|---|
| `POST /widget/feedback` | Per IP | 20 req/min |
| `POST /widget/feedback` | Per projectId | 300 req/min |
| `POST /auth/login` | Per IP | 10 req/min |
| `POST /auth/register` | Per IP | 5 req/min |
| All other authenticated routes | Per userId (fallback: IP) | 200 req/min |

Limits are configurable via environment variables:
- `WIDGET_IP_LIMIT` (default: 20)
- `WIDGET_PROJECT_LIMIT` (default: 300)
- `AUTH_LOGIN_LIMIT` (default: 10)
- `AUTH_REGISTER_LIMIT` (default: 5)
- `API_GLOBAL_LIMIT` (default: 200)

---

## Components

### New files

**`apps/api/src/guards/widget-throttler.guard.ts`**  
Extends `ThrottlerGuard`. Generates two keys per request:
1. `widget:ip:{ip}` — per-IP limit (20/min)
2. `widget:project:{projectId}` — per-projectId limit (300/min)

`projectId` is extracted from `req.body.projectId`. If missing, falls back to IP-only limiting.

**`apps/api/src/guards/api-throttler.guard.ts`**  
Extends `ThrottlerGuard`. Key = `api:user:{userId}` if JWT token present, otherwise `api:ip:{ip}`.

### Modified files

**`apps/api/src/app.module.ts`**  
Register `ThrottlerModule.forRoot()` with Redis storage using existing `REDIS_URL` env var. Apply `ApiThrottlerGuard` globally via `APP_GUARD` provider.

**`apps/api/src/modules/widget/widget.controller.ts`**  
Apply `@UseGuards(WidgetThrottlerGuard)` and `@Throttle()` with widget-specific limits on the feedback creation endpoint.

**`apps/api/src/modules/auth/auth.controller.ts`**  
Add `@Throttle({ default: { limit: 10, ttl: 60000 } })` on `login` endpoint.  
Add `@Throttle({ default: { limit: 5, ttl: 60000 } })` on `register` endpoint.

---

## Error Response

**HTTP 429 Too Many Requests**

Headers:
```
Retry-After: 60
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <unix timestamp>
```

Body:
```json
{
  "statusCode": 429,
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Try again in 60 seconds."
}
```

---

## Edge Cases

- **`X-Forwarded-For`**: Trust only the first IP in chain (Railway proxy adds this header). In `main.ts`, call `app.getHttpAdapter().getInstance().set('trust proxy', 1)` before `app.listen()`.
- **Redis unavailable**: Fail open — allow the request through, log error to Sentry. Never let Redis downtime take down the API.
- **Missing projectId on widget**: Fall back to IP-only limiting.
- **`@SkipThrottle()`**: Available for health check endpoints (`/health`).

---

## Testing

- Unit tests for `WidgetThrottlerGuard`: mock Redis store, verify both keys are generated correctly, verify 429 on N+1 request.
- Unit tests for `ApiThrottlerGuard`: verify userId key when token present, IP fallback when not.
- Integration test on `POST /widget/feedback`: send limit+1 requests, assert last is 429 with correct headers.
- Integration test on `POST /auth/login`: same pattern.

---

## Out of Scope

- Per-plan rate limits (e.g. PRO gets higher limits) — future iteration
- Rate limit dashboards or admin overrides
- DDoS-level protection (that's Railway/Cloudflare layer)
