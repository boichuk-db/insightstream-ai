# Sentry Error Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Sentry error monitoring into `apps/api` (NestJS 11) and `apps/web` (Next.js 16) so all unhandled production errors are captured and visible in the Sentry dashboard.

**Architecture:** API uses `@sentry/nestjs` with a global exception filter; instrumentation bootstraps before NestJS modules load. Web uses `@sentry/nextjs` with three runtime configs (client/server/edge) wired via `instrumentation.ts` and `withSentryConfig` in `next.config.ts`.

**Tech Stack:** `@sentry/nestjs`, `@sentry/nextjs`, NestJS 11, Next.js 16.2.1, pnpm workspaces

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/api/src/instrument.ts` | Sentry.init() for API — must run before any other import |
| Modify | `apps/api/src/main.ts` | Add `import './instrument'` as first line |
| Modify | `apps/api/src/app.module.ts` | Add `SentryModule.forRoot()` to imports |
| Create | `apps/api/src/filters/sentry-exception.filter.ts` | Global filter — captures all exceptions to Sentry |
| Modify | `apps/api/.env` | Add `SENTRY_DSN` |
| Create | `apps/web/sentry.client.config.ts` | Sentry init for browser runtime |
| Create | `apps/web/sentry.server.config.ts` | Sentry init for SSR / server components |
| Create | `apps/web/sentry.edge.config.ts` | Sentry init for edge runtime (middleware) |
| Create | `apps/web/src/instrumentation.ts` | Next.js hook that loads server/edge configs at startup |
| Modify | `apps/web/next.config.ts` | Wrap with `withSentryConfig()` for source maps |
| Modify | `apps/web/.env.local` | Add `NEXT_PUBLIC_SENTRY_DSN` |

---

## Task 1: Install packages and add env vars

**Files:**
- Modify: `apps/api/.env`
- Modify: `apps/web/.env.local`

- [ ] **Step 1: Install `@sentry/nestjs` in the API**

Run from the monorepo root:

```bash
pnpm --filter api add @sentry/nestjs
```

Expected output: package added to `apps/api/node_modules` and `apps/api/package.json`.

- [ ] **Step 2: Install `@sentry/nextjs` in the web app**

```bash
pnpm --filter web add @sentry/nextjs
```

Expected output: package added to `apps/web/node_modules` and `apps/web/package.json`.

- [ ] **Step 3: Add Sentry DSN to API env**

Open `apps/api/.env` and append:

```
# Sentry
SENTRY_DSN=https://bf370f58a8e904a1de96df9d8ed73058@o4511118451408896.ingest.de.sentry.io/4511118458028112
```

- [ ] **Step 4: Add Sentry DSN to web env**

Open `apps/web/.env.local` and append:

```
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://6fae9ecb6f1cb277aa0fff8da74fb083@o4511118451408896.ingest.de.sentry.io/4511118468841552
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/web/package.json pnpm-lock.yaml
git commit -m "chore: install @sentry/nestjs and @sentry/nextjs"
```

---

## Task 2: API — Sentry instrumentation bootstrap

**Files:**
- Create: `apps/api/src/instrument.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Create `instrument.ts`**

Create `apps/api/src/instrument.ts`:

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

- [ ] **Step 2: Add instrument import as the very first line of `main.ts`**

Open `apps/api/src/main.ts`. The current first line is:

```ts
import 'reflect-metadata';
```

Replace the entire file with:

```ts
import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProjectsService } from './modules/projects/projects.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const projectsService = app.get(ProjectsService);

  // Cached domains to avoid DB hit on every preflight
  let cachedDomains: string[] = [];
  let cacheTime = 0;

  app.enableCors({
    origin: async (origin, callback) => {
      if (!origin) return callback(null, true);

      try {
        const originUrl = new URL(origin);
        if (
          originUrl.hostname === 'localhost' ||
          originUrl.hostname === '127.0.0.1' ||
          origin === process.env.FRONTEND_URL
        ) {
          return callback(null, true);
        }

        // Simple cache: refresh domains every 1 minute
        if (Date.now() - cacheTime > 60000) {
          cachedDomains = await projectsService.getAllDomains();
          cacheTime = Date.now();
        }

        const isAllowed = cachedDomains.some(
          (domain) =>
            originUrl.hostname === domain ||
            originUrl.hostname.endsWith(`.${domain}`),
        );

        if (isAllowed) {
          return callback(null, true);
        }

        return callback(
          new Error(`CORS Error: Origin ${origin} not in whitelist`),
          false,
        );
      } catch (err) {
        return callback(new Error('Invalid origin'), false);
      }
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

- [ ] **Step 3: Verify the API compiles**

```bash
pnpm --filter api build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/instrument.ts apps/api/src/main.ts
git commit -m "feat(api): add Sentry instrumentation bootstrap"
```

---

## Task 3: API — SentryModule and global exception filter

**Files:**
- Create: `apps/api/src/filters/sentry-exception.filter.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Create the exception filter**

Create `apps/api/src/filters/sentry-exception.filter.ts`:

```ts
import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    Sentry.captureException(exception);
    super.catch(exception, host);
  }
}
```

- [ ] **Step 2: Add SentryModule to AppModule**

Open `apps/api/src/app.module.ts`. Add the import at the top:

```ts
import { SentryModule } from '@sentry/nestjs/setup';
```

Then add `SentryModule.forRoot()` as the **first entry** in the `imports` array (before `ConfigModule`):

```ts
@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      // ... existing config unchanged
    }),
    UsersModule,
    AuthModule,
    FeedbackModule,
    ProjectsModule,
    EventsModule,
    DigestModule,
    PlansModule,
    TeamsModule,
    InvitationsModule,
    CommentsModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 3: Register the global filter in `main.ts`**

Open `apps/api/src/main.ts`. Add the import after the existing imports:

```ts
import { HttpAdapterHost } from '@nestjs/core';
import { SentryExceptionFilter } from './filters/sentry-exception.filter';
```

Inside `bootstrap()`, after `const app = await NestFactory.create(AppModule);`, add:

```ts
const { httpAdapter } = app.get(HttpAdapterHost);
app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));
```

The top of `bootstrap()` should now look like:

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  const projectsService = app.get(ProjectsService);
  // ... rest unchanged
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
pnpm --filter api build
```

Expected: build succeeds.

- [ ] **Step 5: Verify the filter works locally**

Start the API:

```bash
pnpm --filter api start:dev
```

In another terminal, trigger an unhandled error by calling a non-existent route:

```bash
curl http://localhost:3001/this-does-not-exist
```

Expected: 404 JSON response. Check the Sentry dashboard at sentry.io — a `NotFound` exception event should appear within ~30 seconds.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/filters/sentry-exception.filter.ts apps/api/src/app.module.ts apps/api/src/main.ts
git commit -m "feat(api): add Sentry global exception filter and SentryModule"
```

---

## Task 4: Web — Sentry configs and Next.js integration

**Files:**
- Create: `apps/web/sentry.client.config.ts`
- Create: `apps/web/sentry.server.config.ts`
- Create: `apps/web/sentry.edge.config.ts`
- Create: `apps/web/src/instrumentation.ts`
- Modify: `apps/web/next.config.ts`

> **Important:** `apps/web/AGENTS.md` warns that Next.js 16 has breaking changes. Before writing any Next.js-specific code, check `apps/web/node_modules/next/dist/docs/` for guidance on instrumentation and config changes. The steps below reflect the standard `@sentry/nextjs` App Router setup — adjust if the docs show a different API.

- [ ] **Step 1: Check Next.js 16 instrumentation docs**

```bash
ls apps/web/node_modules/next/dist/docs/ 2>/dev/null || echo "no docs dir"
```

If docs exist, skim for any changes to `instrumentation.ts` or `next.config` APIs before proceeding.

- [ ] **Step 2: Create `sentry.client.config.ts`**

Create `apps/web/sentry.client.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Session replay is disabled — overkill for current scale
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
```

- [ ] **Step 3: Create `sentry.server.config.ts`**

Create `apps/web/sentry.server.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

- [ ] **Step 4: Create `sentry.edge.config.ts`**

Create `apps/web/sentry.edge.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
```

- [ ] **Step 5: Create `src/instrumentation.ts`**

Create `apps/web/src/instrumentation.ts`:

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

- [ ] **Step 6: Wrap `next.config.ts` with `withSentryConfig`**

Open `apps/web/next.config.ts`. Current content:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

Replace with:

```ts
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
});
```

- [ ] **Step 7: Build to verify no TypeScript errors**

```bash
pnpm --filter web build
```

Expected: build completes. There may be a Sentry wizard prompt in stdout — ignore it (it's informational). The build must not fail.

- [ ] **Step 8: Verify client-side error capture locally**

Start the web app:

```bash
pnpm --filter web dev
```

Open the browser console on any page and run:

```js
throw new Error('sentry test from browser');
```

Check the Sentry `insightstream-web` project dashboard — the error should appear within ~30 seconds.

- [ ] **Step 9: Commit**

```bash
git add apps/web/sentry.client.config.ts apps/web/sentry.server.config.ts apps/web/sentry.edge.config.ts apps/web/src/instrumentation.ts apps/web/next.config.ts
git commit -m "feat(web): add Sentry error monitoring integration"
```

---

## Task 5: Add env vars to Railway (production)

This is a manual step in the Railway dashboard — no code changes.

- [ ] **Step 1: Add `SENTRY_DSN` to the API service**

1. Open Railway → select the `insightstream-api` service
2. Go to **Variables** tab
3. Add: `SENTRY_DSN` = `https://bf370f58a8e904a1de96df9d8ed73058@o4511118451408896.ingest.de.sentry.io/4511118458028112`

- [ ] **Step 2: Add `NEXT_PUBLIC_SENTRY_DSN` to the web service**

1. Open Railway → select the `insightstream-web` service
2. Go to **Variables** tab
3. Add: `NEXT_PUBLIC_SENTRY_DSN` = `https://6fae9ecb6f1cb277aa0fff8da74fb083@o4511118451408896.ingest.de.sentry.io/4511118468841552`

- [ ] **Step 3: Deploy and verify**

Push the branch to trigger a Railway deploy. After deploy completes:

1. Visit the production API URL — trigger a 404 by visiting `/this-does-not-exist`
2. Visit the production web URL — open browser console and run `throw new Error('prod sentry test')`

Confirm both events appear in their respective Sentry projects.

- [ ] **Step 4: Final commit (env example update)**

Document the new vars in the env example (if one exists), then commit:

```bash
git add apps/api/.env apps/web/.env.local
git commit -m "chore: add Sentry DSN env vars"
```

> Note: `.env` and `.env.local` are gitignored. This commit only applies if your project tracks `.env.example` files. Skip if not applicable.

---

## Self-Review

- **Spec coverage:** `instrument.ts` ✅, `main.ts` ✅, `SentryModule` ✅, `SentryExceptionFilter` ✅, three web configs ✅, `instrumentation.ts` ✅, `withSentryConfig` ✅, DSN via env vars ✅, Railway setup ✅
- **Placeholders:** None — all code blocks are complete
- **Type consistency:** `SentryExceptionFilter` extends `BaseExceptionFilter` from `@nestjs/core`, `HttpAdapterHost` from `@nestjs/core` — consistent across Tasks 3 steps
- **AGENTS.md warning:** acknowledged in Task 4 with an explicit check step before writing Next.js code
