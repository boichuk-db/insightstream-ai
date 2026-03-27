# Sentry Error Monitoring — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Complexity:** XS
**Roadmap ref:** Section 3.5

---

## Overview

Integrate Sentry error monitoring into both `apps/api` (NestJS) and `apps/web` (Next.js) to gain visibility into production errors and performance issues. Currently the production environment is blind — clients see 500 errors, the developer sees nothing.

---

## Sentry Projects

Two separate Sentry projects, each with its own DSN:

| App | Sentry Platform | DSN env var |
|-----|-----------------|-------------|
| `apps/api` | NestJS | `SENTRY_DSN` |
| `apps/web` | Next.js | `NEXT_PUBLIC_SENTRY_DSN` |

**DSNs must only be stored in env vars — never committed to git.**

---

## API Integration — `apps/api`

### Package

```
@sentry/nestjs
```

### Key constraint

Sentry instrumentation must run **before** any NestJS module is imported. This is required for the SDK to correctly patch third-party libraries (TypeORM, HTTP).

### Files to create/modify

**`apps/api/src/instrument.ts`** (new)
Standalone file with `Sentry.init()`. Imported as the first side-effect in `main.ts`.

```ts
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  enabled: process.env.NODE_ENV !== 'test',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  sendDefaultPii: false,
});
```

**`apps/api/src/main.ts`** (modify)
Add `import './instrument';` as the **first line** before all other imports.

**`apps/api/src/app.module.ts`** (modify)
Add `SentryModule.forRoot()` to imports array.

**`apps/api/src/filters/sentry-exception.filter.ts`** (new)
Global exception filter that captures all unhandled exceptions and forwards them to Sentry before returning the HTTP response.

```ts
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    Sentry.captureException(exception);
    super.catch(exception, host);
  }
}
```

Register in `main.ts` as global filter via `app.useGlobalFilters()`.

### What gets tracked automatically

- All unhandled exceptions (4xx are captured but with low priority; 5xx are the main signal)
- HTTP request performance traces
- TypeORM query performance (auto-instrumented by `@sentry/nestjs`)

---

## Web Integration — `apps/web`

### Package

```
@sentry/nextjs
```

### Files to create/modify

**`apps/web/sentry.client.config.ts`** (new)
Runs in the browser. Captures client-side JS errors and browser performance.

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 0, // session replay disabled
});
```

**`apps/web/sentry.server.config.ts`** (new)
Runs during SSR and in Next.js server components. Captures server-side errors.

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

**`apps/web/sentry.edge.config.ts`** (new)
Runs in Next.js edge runtime (middleware). Minimal config.

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
```

**`apps/web/src/instrumentation.ts`** (new)
Next.js built-in hook for initializing server/edge Sentry configs at startup.

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
```

**`apps/web/next.config.ts`** (new or modify)
Wrap existing config with `withSentryConfig()`. This enables source map upload on build so stack traces in Sentry show original TypeScript code instead of minified JS.

```ts
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = { /* existing config */ };

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
});
```

### What gets tracked automatically

- Client-side JS errors (unhandled exceptions, promise rejections)
- SSR errors in server components and API routes
- Next.js navigation performance
- Core Web Vitals (LCP, CLS, FID)

---

## Environment Variables

### `apps/api/.env` (add)
```
SENTRY_DSN=<api-dsn>
```

### `apps/web/.env.local` (add)
```
NEXT_PUBLIC_SENTRY_DSN=<web-dsn>
```

### Railway (production)
Add both vars to the respective Railway services via the Railway dashboard environment variables UI.

---

## What is NOT in scope

- Custom `Sentry.captureException()` calls in individual catch blocks — the global filter handles this
- Session replay — overkill for current scale
- Sentry alerting rules — configured manually in Sentry UI after deploy
- Source map upload auth token for CI — can be added later via `SENTRY_AUTH_TOKEN`

---

## Verification

After deploying, trigger a test error:
- **API:** Call a non-existent endpoint or temporarily throw in a controller
- **Web:** Throw in a client component or call `Sentry.captureMessage('test')`

Confirm the event appears in the Sentry dashboard within ~30 seconds.
