# Playwright E2E Testing — Design Spec

**Date:** 2026-04-09  
**Status:** Approved

## Overview

Add end-to-end testing with Playwright using the Page Object Model pattern. Tests run in CI after lint/build/unit tests, covering auth flows, dashboard, widget embed, and invite flows.

## Structure

New monorepo package `apps/e2e/` added to pnpm workspace:

```
apps/e2e/
  playwright.config.ts      # baseURL, webServer, reporters
  global-setup.ts           # seed DB before all tests
  global-teardown.ts        # cleanup after all tests
  package.json
  pages/
    auth.page.ts
    dashboard.page.ts
    widget.page.ts
    settings.page.ts
    invite.page.ts
  tests/
    auth/
      login.spec.ts
      register.spec.ts
      forgot-password.spec.ts
    dashboard/
      feedback.spec.ts
      activity.spec.ts
    widget/
      submit-feedback.spec.ts
    invite/
      accept-invite.spec.ts
  fixtures/
    test-fixtures.ts
  helpers/
    seed.ts
  test-pages/
    widget-embed.html
```

## Page Object Model

Each page class encapsulates selectors and actions:

```typescript
// pages/auth.page.ts
export class AuthPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/auth/login')
    await this.page.fill('[data-testid="email"]', email)
    await this.page.fill('[data-testid="password"]', password)
    await this.page.click('[data-testid="submit"]')
    await this.page.waitForURL('/dashboard')
  }

  async register(name: string, email: string, password: string) { ... }
  async forgotPassword(email: string) { ... }
}
```

All selectors use `data-testid` attributes — not CSS classes or text content, which are fragile across UI changes.

## Fixtures

`fixtures/test-fixtures.ts` extends Playwright's `test` with typed page objects and an `authenticatedPage` fixture that reuses `storageState` (saved cookies/localStorage after login) to avoid logging in before every test:

```typescript
export const test = base.extend<{
  authPage: AuthPage
  dashboardPage: DashboardPage
  widgetPage: WidgetPage
  authenticatedPage: Page
}>({ ... })
```

## Seed Strategy

- **global-setup**: connects to test DB via TypeORM, creates one test user + one test project
- **per-spec**: each spec file seeds additional data in `beforeEach` and cleans up in `afterEach` as needed
- OAuth flows are **not tested** — Google/GitHub consent screen cannot be automated

## Playwright Config

```typescript
// playwright.config.ts
export default defineConfig({
  webServer: [
    { command: 'pnpm --filter api start', url: 'http://localhost:3001/health', reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter web start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter widget dev', url: 'http://localhost:8080', reuseExistingServer: !process.env.CI },
  ],
  baseURL: 'http://localhost:3000',
  reporter: process.env.CI ? 'github' : 'html',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@smoke/ }, // CI only smoke
  ],
})
```

## Widget Testing

A static HTML file `test-pages/widget-embed.html` simulates a real customer embed scenario:

```html
<script>
  window.InsightStreamConfig = { projectId: 'test-project-id' }
</script>
<script src="http://localhost:8080/dist/widget.iife.js"></script>
```

Playwright navigates to this page (served via `page.goto('file://...')` or a simple static server) and interacts with the widget as a real end user would.

## Test Coverage

| Spec | Scenarios |
|---|---|
| `login.spec.ts` | Successful login → dashboard redirect; wrong password → error message |
| `register.spec.ts` | Full registration flow → dashboard; existing email → error |
| `forgot-password.spec.ts` | Submit email → success message shown |
| `feedback.spec.ts` | Feedback submitted via widget appears in dashboard list |
| `activity.spec.ts` | Activity feed reflects new feedback entries |
| `submit-feedback.spec.ts` | Widget embed: open → fill form → submit → success state |
| `accept-invite.spec.ts` | Invite link → register → access team project |

## data-testid Additions Required

Web components need `data-testid` attributes added to:
- Auth forms: `email`, `password`, `name`, `submit`, error messages
- Dashboard: feedback list items, activity feed entries
- Settings: team invite button, invite input
- Widget: trigger button, form fields, submit button, success message

## CI Integration

New `e2e` job in `.github/workflows/main.yml`, runs after `ci` and `test` jobs:

```yaml
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [ci, test]
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: insightstream_test
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/insightstream_test
    DB_HOST: localhost
    DB_PORT: 5432
    DB_USERNAME: postgres
    DB_PASSWORD: postgres
    DB_DATABASE: insightstream_test
    JWT_SECRET: test-secret
    GEMINI_API_KEY: test-key
    NEXT_PUBLIC_API_URL: http://localhost:3001
    NEXT_PUBLIC_WIDGET_URL: http://localhost:8080/dist/widget.iife.js
  steps:
    - uses: actions/checkout@v6
    - uses: pnpm/action-setup@v5
      with: { version: 9.12.0 }
    - uses: actions/setup-node@v6
      with: { node-version: 20, cache: pnpm }
    - run: pnpm install
    - run: pnpm build
    - run: pnpm --filter e2e exec playwright install --with-deps chromium firefox
    - run: pnpm --filter api migration:run
    - run: pnpm --filter e2e test
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: apps/e2e/playwright-report/
        retention-days: 7
```

## Local Commands

```bash
pnpm --filter e2e test          # headless
pnpm --filter e2e test:ui       # Playwright UI mode
pnpm --filter e2e test:debug    # step-by-step debug
pnpm --filter e2e test:report   # open last HTML report
```
