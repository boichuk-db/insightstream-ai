# Playwright E2E Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add end-to-end testing with Playwright (Page Object Model) covering auth, dashboard, widget embed, and invite flows — running in CI after existing lint/build/unit jobs.

**Architecture:** New `apps/e2e` monorepo package with Page Object Model classes per page, custom Playwright fixtures for authenticated context, and HTTP-based seed in `global-setup`. Widget tests use `page.route()` to serve the built IIFE locally without a separate server.

**Tech Stack:** `@playwright/test`, `axios` (seed HTTP calls), Playwright `storageState` for auth reuse, `data-testid` attributes on all interactive elements.

---

### Task 1: Scaffold `apps/e2e` package

**Files:**
- Create: `apps/e2e/package.json`
- Create: `apps/e2e/tsconfig.json`
- Create: `apps/e2e/playwright.config.ts`
- Create: `apps/e2e/.gitignore`

- [ ] **Step 1: Create `apps/e2e/package.json`**

```json
{
  "name": "e2e",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "axios": "^1.7.0"
  }
}
```

- [ ] **Step 2: Create `apps/e2e/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `apps/e2e/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter api start',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || '5432',
        DB_USERNAME: process.env.DB_USERNAME || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
        DB_DATABASE: process.env.DB_DATABASE || 'insightstream_test',
        JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'test-key',
      },
    },
    {
      command: 'pnpm --filter web start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
        NEXT_PUBLIC_WIDGET_URL: 'http://localhost:8080/dist/widget.iife.js',
      },
    },
  ],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

- [ ] **Step 4: Create `apps/e2e/.gitignore`**

```
node_modules/
dist/
playwright-report/
test-results/
.auth/
```

- [ ] **Step 5: Install dependencies**

```bash
cd apps/e2e && pnpm install
```

Expected: `@playwright/test` and `axios` installed.

- [ ] **Step 6: Install Playwright browsers**

```bash
pnpm --filter e2e exec playwright install chromium
```

Expected: Chromium browser downloaded.

- [ ] **Step 7: Commit**

```bash
git add apps/e2e/package.json apps/e2e/tsconfig.json apps/e2e/playwright.config.ts apps/e2e/.gitignore
git commit -m "feat(e2e): scaffold apps/e2e playwright package"
```

---

### Task 2: Global setup and teardown (seed)

Playwright starts webServers before globalSetup, so HTTP calls to the API work safely.

**Files:**
- Create: `apps/e2e/global-setup.ts`
- Create: `apps/e2e/global-teardown.ts`
- Create: `apps/e2e/.auth/.gitkeep` (dir for storageState)

- [ ] **Step 1: Create `.auth` directory placeholder**

```bash
mkdir -p apps/e2e/.auth && touch apps/e2e/.auth/.gitkeep
```

- [ ] **Step 2: Create `apps/e2e/global-setup.ts`**

```typescript
import { chromium } from '@playwright/test'
import axios from 'axios'

const API_URL = 'http://localhost:3001'
const WEB_URL = 'http://localhost:3000'

export const TEST_USER_EMAIL = 'e2e-seed@insightstream.test'
export const TEST_USER_PASSWORD = 'E2eTestPass123!'
export const TEST_PROJECT_NAME = 'E2E Test Project'

export default async function globalSetup() {
  // Register test user (idempotent — ignore conflict if already exists)
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    })
  } catch (err: any) {
    if (err?.response?.status !== 409) {
      throw new Error(`globalSetup: register failed — ${err.message}`)
    }
  }

  // Login to get access token
  const { data: loginData } = await axios.post(`${API_URL}/auth/login`, {
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  })
  const token: string = loginData.access_token

  // Create test project if not exists (idempotent via name check)
  const { data: projects } = await axios.get(`${API_URL}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  let project = projects.find((p: any) => p.name === TEST_PROJECT_NAME)
  if (!project) {
    const { data } = await axios.post(
      `${API_URL}/projects`,
      { name: TEST_PROJECT_NAME },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    project = data
  }

  // Expose to tests via process.env
  process.env.TEST_USER_EMAIL = TEST_USER_EMAIL
  process.env.TEST_USER_PASSWORD = TEST_USER_PASSWORD
  process.env.TEST_PROJECT_ID = project.id
  process.env.TEST_PROJECT_API_KEY = project.apiKey ?? ''

  // Save authenticated browser state (storageState) for reuse in tests
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(WEB_URL)
  await page.evaluate((t: string) => localStorage.setItem('access_token', t), token)
  await context.storageState({ path: 'apps/e2e/.auth/user.json' })
  await browser.close()

  console.log('[globalSetup] Seed complete — project:', project.name, '| apiKey:', project.apiKey ?? 'n/a')
}
```

- [ ] **Step 3: Create `apps/e2e/global-teardown.ts`**

```typescript
export default async function globalTeardown() {
  // No-op for now. Add cleanup logic here if tests create side effects
  // that need to be cleaned between full test suite runs.
  console.log('[globalTeardown] Done.')
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/e2e/global-setup.ts apps/e2e/global-teardown.ts apps/e2e/.auth/.gitkeep
git commit -m "feat(e2e): add global-setup seed and teardown"
```

---

### Task 3: Page Object Models

One class per page. Selectors are centralized here; tests never use raw selectors.

**Files:**
- Create: `apps/e2e/pages/auth.page.ts`
- Create: `apps/e2e/pages/dashboard.page.ts`
- Create: `apps/e2e/pages/widget.page.ts`
- Create: `apps/e2e/pages/invite.page.ts`

- [ ] **Step 1: Create `apps/e2e/pages/auth.page.ts`**

The auth form lives at `/`. It has a login/register toggle — default is login mode.

```typescript
import { Page, expect } from '@playwright/test'

export class AuthPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  /** Switch to register mode (form starts in login mode) */
  async switchToRegister() {
    await this.page.click('[data-testid="auth-toggle"]')
    await expect(this.page.locator('[data-testid="submit"]')).toContainText('Sign Up')
  }

  async login(email: string, password: string) {
    await this.goto()
    await this.page.fill('[data-testid="email"]', email)
    await this.page.fill('[data-testid="password"]', password)
    await this.page.click('[data-testid="submit"]')
    await this.page.waitForURL('/dashboard', { timeout: 10000 })
  }

  async register(email: string, password: string) {
    await this.goto()
    await this.switchToRegister()
    await this.page.fill('[data-testid="email"]', email)
    await this.page.fill('[data-testid="password"]', password)
    await this.page.click('[data-testid="submit"]')
    await this.page.waitForURL('/dashboard', { timeout: 10000 })
  }

  async submitForgotPassword(email: string) {
    await this.page.goto('/auth/forgot-password')
    await this.page.fill('[data-testid="email"]', email)
    await this.page.click('[data-testid="submit"]')
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 5000 })
  }

  async getErrorMessage() {
    return this.page.locator('[data-testid="auth-error"]').textContent()
  }
}
```

- [ ] **Step 2: Create `apps/e2e/pages/dashboard.page.ts`**

```typescript
import { Page, expect } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard')
    await this.page.waitForSelector('[data-testid="dashboard-root"]', { timeout: 10000 })
  }

  /** Submit feedback via the manual input form on the dashboard */
  async submitFeedback(content: string) {
    await this.page.fill('[data-testid="feedback-input"]', content)
    await this.page.click('[data-testid="feedback-submit"]')
  }

  /** Wait for a feedback card with given content to appear in the Kanban board */
  async waitForFeedbackCard(content: string) {
    await expect(
      this.page.locator('[data-testid="kanban-card"]').filter({ hasText: content })
    ).toBeVisible({ timeout: 15000 })
  }

  async gotoActivity() {
    await this.page.goto('/dashboard/activity')
    await this.page.waitForSelector('[data-testid="activity-list"]', { timeout: 10000 })
  }

  async getActivityItems() {
    return this.page.locator('[data-testid="activity-item"]').all()
  }
}
```

- [ ] **Step 3: Create `apps/e2e/pages/widget.page.ts`**

The widget is an IIFE build. This page object loads the built file via `page.route` — no separate server required. Build the widget (`pnpm build --filter widget`) before running E2E locally.

```typescript
import { Page, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

export class WidgetPage {
  constructor(private page: Page) {}

  /** Load a minimal embed page with the widget IIFE injected */
  async loadEmbed(apiKey = 'test-api-key') {
    const iifePath = path.resolve(__dirname, '../../../widget/dist/widget.iife.js')
    if (!fs.existsSync(iifePath)) {
      throw new Error(
        `Widget IIFE not found at ${iifePath}. Run: pnpm build --filter widget`,
      )
    }
    const iife = fs.readFileSync(iifePath, 'utf-8')

    // Serve the IIFE from an intercepted URL
    await this.page.route('http://widget-local/widget.iife.js', async (route) => {
      await route.fulfill({ contentType: 'application/javascript', body: iife })
    })

    // Mock the public feedback API endpoint
    await this.page.route('**/feedback/public', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mock-feedback-id' }),
      })
    })

    await this.page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script>
          window.InsightStreamConfig = {
            apiKey: '${apiKey}',
            apiUrl: 'http://localhost:3001'
          }
        </script>
        <script src="http://widget-local/widget.iife.js"></script>
      </body>
      </html>
    `)

    // Wait for widget trigger button to render
    await expect(this.page.locator('[data-testid="widget-trigger"]')).toBeVisible({ timeout: 5000 })
  }

  async open() {
    await this.page.click('[data-testid="widget-trigger"]')
    await expect(this.page.locator('[data-testid="widget-form"]')).toBeVisible({ timeout: 3000 })
  }

  async submitFeedback(content: string) {
    await this.page.fill('[data-testid="widget-textarea"]', content)
    await this.page.click('[data-testid="widget-submit"]')
  }

  async waitForSuccess() {
    await expect(this.page.locator('[data-testid="widget-success"]')).toBeVisible({ timeout: 5000 })
  }
}
```

- [ ] **Step 4: Create `apps/e2e/pages/invite.page.ts`**

```typescript
import { Page, expect } from '@playwright/test'

export class InvitePage {
  constructor(private page: Page) {}

  async acceptInvite(token: string) {
    await this.page.goto(`/invite/accept?token=${token}`)
    await expect(this.page.locator('[data-testid="invite-accept-btn"]')).toBeVisible({ timeout: 5000 })
    await this.page.click('[data-testid="invite-accept-btn"]')
    await this.page.waitForURL('/dashboard', { timeout: 10000 })
  }

  async getInviteInfo() {
    return this.page.locator('[data-testid="invite-info"]').textContent()
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/e2e/pages/
git commit -m "feat(e2e): add page object models for auth, dashboard, widget, invite"
```

---

### Task 4: Custom fixtures

Extends Playwright's `test` with typed page objects and an authenticated browser context.

**Files:**
- Create: `apps/e2e/fixtures/test-fixtures.ts`

- [ ] **Step 1: Create `apps/e2e/fixtures/test-fixtures.ts`**

```typescript
import { test as base, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DashboardPage } from '../pages/dashboard.page'
import { WidgetPage } from '../pages/widget.page'
import { InvitePage } from '../pages/invite.page'

type E2EFixtures = {
  authPage: AuthPage
  dashboardPage: DashboardPage
  widgetPage: WidgetPage
  invitePage: InvitePage
}

export const test = base.extend<E2EFixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page))
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page))
  },
  widgetPage: async ({ page }, use) => {
    await use(new WidgetPage(page))
  },
  invitePage: async ({ page }, use) => {
    await use(new InvitePage(page))
  },
})

export { expect }

/**
 * Returns Playwright browser context options that reuse the authenticated session
 * saved by global-setup. Use in tests that require a logged-in user.
 *
 * Usage:
 *   test.use(authenticatedContext())
 */
export function authenticatedContext() {
  return { storageState: 'apps/e2e/.auth/user.json' }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/e2e/fixtures/test-fixtures.ts
git commit -m "feat(e2e): add custom playwright fixtures"
```

---

### Task 5: Add `data-testid` to auth forms (web)

Two files need testid attributes: the main page (login/register toggle) and the forgot-password page.

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/auth/forgot-password/page.tsx`

- [ ] **Step 1: Add testids to `apps/web/src/app/page.tsx`**

Find the email `<Input>` (~line 150) and add `data-testid="email"`:
```tsx
<Input
  type="email"
  data-testid="email"
  placeholder="name@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="pl-10"
  required
/>
```

Find the password `<Input>` (~line 178) and add `data-testid="password"`:
```tsx
<Input
  type="password"
  data-testid="password"
  placeholder="••••••••"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="pl-10"
  required
/>
```

Find the submit `<Button>` (~line 187) and add `data-testid="submit"`:
```tsx
<Button
  type="submit"
  data-testid="submit"
  variant="primary"
  size="lg"
  className="w-full mt-6"
  isLoading={authMutation.isPending}
>
```

Find the toggle button (~line 201) and add `data-testid="auth-toggle"`:
```tsx
<button
  onClick={() => setIsLogin(!isLogin)}
  data-testid="auth-toggle"
  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors focus:outline-none"
>
```

Find the error div (~line 126) and add `data-testid="auth-error"`:
```tsx
{(oauthError || errorMsg) && (
  <div
    data-testid="auth-error"
    className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded text-red-400 text-sm text-center"
  >
```

- [ ] **Step 2: Add testids to `apps/web/src/app/auth/forgot-password/page.tsx`**

Find the email `<Input>` (~line 65) and add `data-testid="email"`:
```tsx
<Input
  type="email"
  data-testid="email"
  placeholder="name@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="pl-10"
  required
/>
```

Find the submit `<Button>` (~line 83) and add `data-testid="submit"`:
```tsx
<Button
  type="submit"
  data-testid="submit"
  variant="primary"
  size="lg"
  className="w-full"
  isLoading={mutation.isPending}
>
```

Find the success state container (~line 31) and add `data-testid="success-message"`:
```tsx
{submitted ? (
  <div data-testid="success-message" className="space-y-4">
    <h2 className="text-2xl font-bold">Check your inbox</h2>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/auth/forgot-password/page.tsx
git commit -m "feat(e2e): add data-testid to auth form elements"
```

---

### Task 6: Add `data-testid` to dashboard components

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/components/dashboard/KanbanCard.tsx`
- Modify: `apps/web/src/components/dashboard/ActivityFeed.tsx`

- [ ] **Step 1: Add testids to `apps/web/src/app/dashboard/page.tsx`**

Find the outer `<div>` (~line 168) and add `data-testid="dashboard-root"`:
```tsx
<div data-testid="dashboard-root" className="flex h-screen bg-brand-bg overflow-hidden">
```

Find the feedback `<Input>` in the Manual Input section (~line 238) and add `data-testid="feedback-input"`:
```tsx
<Input
  data-testid="feedback-input"
  placeholder="Type a feedback message here..."
  value={newFeedback}
  onChange={(e) => setNewFeedback(e.target.value)}
  className="w-full bg-brand-surface/60 border-brand-border/50 focus:border-indigo-500 h-11 pl-4 text-sm"
/>
```

Find the "Post Internal" submit `<Button>` (~line 243) and add `data-testid="feedback-submit"`:
```tsx
<Button
  type="submit"
  data-testid="feedback-submit"
  isLoading={createMutation.isPending}
  disabled={!newFeedback.trim()}
  variant="brand"
  size="md"
  className="w-full sm:min-w-[140px] sm:w-auto shrink-0"
>
```

- [ ] **Step 2: Add testid to `apps/web/src/components/dashboard/KanbanCard.tsx`**

Read the full file first to find the root element of the card. Add `data-testid="kanban-card"` to the outermost wrapper returned by the component (the `<Draggable>` wrapper's inner div).

Open the file and look for the div inside `<Draggable>` that holds all card content. Add:
```tsx
<div
  data-testid="kanban-card"
  ref={provided.innerRef}
  {...provided.draggableProps}
  {...provided.dragHandleProps}
  // ... existing className
>
```

- [ ] **Step 3: Add testids to `apps/web/src/components/dashboard/ActivityFeed.tsx`**

Read the file. Find the container that wraps all activity items and add `data-testid="activity-list"`. Find individual activity item elements and add `data-testid="activity-item"` to each rendered item.

Pattern to look for: the map over activities array that renders each item. Add to the list container:
```tsx
<div data-testid="activity-list" className="...existing classes...">
```

Add to each item wrapper:
```tsx
<div data-testid="activity-item" key={activity.id} className="...existing classes...">
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/page.tsx apps/web/src/components/dashboard/KanbanCard.tsx apps/web/src/components/dashboard/ActivityFeed.tsx
git commit -m "feat(e2e): add data-testid to dashboard and activity feed"
```

---

### Task 7: Add `data-testid` to widget

**Files:**
- Modify: `apps/widget/src/App.tsx`

- [ ] **Step 1: Add testids to `apps/widget/src/App.tsx`**

Find the trigger `<button>` (~line 170) and add `data-testid="widget-trigger"`:
```tsx
<button
  onClick={() => setIsOpen(!isOpen)}
  data-testid="widget-trigger"
  className={buttonClass}
  style={{ background: `linear-gradient(135deg, ${primaryColor}, #4f46e5)` }}
  aria-label="Toggle Feedback Widget"
>
```

Find the `<form>` (~line 113) and add `data-testid="widget-form"`:
```tsx
<form data-testid="widget-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
```

Find the `<textarea>` (~line 115) and add `data-testid="widget-textarea"`:
```tsx
<textarea
  data-testid="widget-textarea"
  autoFocus
  placeholder="How can we make this better for you?"
  value={content}
  onChange={(e) => setContent(e.target.value)}
  className="..."
```

Find the submit `<button>` (~line 130) and add `data-testid="widget-submit"`:
```tsx
<button
  data-testid="widget-submit"
  disabled={status === 'loading' || !content.trim()}
  className="..."
  style={{ background: `linear-gradient(135deg, ${primaryColor}, #4f46e5)` }}
>
```

Find the success state container (~line 94) and add `data-testid="widget-success"`:
```tsx
{status === 'success' ? (
  <div data-testid="widget-success" className="py-12 flex flex-col items-center justify-center text-center gap-5">
```

- [ ] **Step 2: Rebuild widget to include new testids**

```bash
pnpm build --filter widget
```

Expected: `apps/widget/dist/widget.iife.js` updated.

- [ ] **Step 3: Commit**

```bash
git add apps/widget/src/App.tsx apps/widget/dist/
git commit -m "feat(e2e): add data-testid to widget elements"
```

---

### Task 8: Auth tests — login and register

**Files:**
- Create: `apps/e2e/tests/auth/login.spec.ts`
- Create: `apps/e2e/tests/auth/register.spec.ts`

- [ ] **Step 1: Create `apps/e2e/tests/auth/login.spec.ts`**

```typescript
import { test, expect } from '../../fixtures/test-fixtures'

test.describe('Login', () => {
  test('successful login redirects to dashboard', async ({ authPage, page }) => {
    await authPage.login(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!,
    )
    expect(page.url()).toContain('/dashboard')
  })

  test('wrong password shows error message', async ({ authPage }) => {
    await authPage.goto()
    await authPage['page'].fill('[data-testid="email"]', process.env.TEST_USER_EMAIL!)
    await authPage['page'].fill('[data-testid="password"]', 'WrongPass999!')
    await authPage['page'].click('[data-testid="submit"]')
    await expect(authPage['page'].locator('[data-testid="auth-error"]')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run login tests to verify they work**

```bash
cd apps/e2e && npx playwright test tests/auth/login.spec.ts --reporter=line
```

Expected: 2 tests pass.

- [ ] **Step 3: Create `apps/e2e/tests/auth/register.spec.ts`**

Use a unique email per run to avoid conflicts (the test DB is shared between test suite runs).

```typescript
import { test, expect } from '../../fixtures/test-fixtures'

test.describe('Register', () => {
  test('new user registration redirects to dashboard', async ({ authPage, page }) => {
    const uniqueEmail = `e2e-register-${Date.now()}@insightstream.test`
    await authPage.register(uniqueEmail, 'E2eRegTest123!')
    expect(page.url()).toContain('/dashboard')
  })

  test('duplicate email shows error message', async ({ authPage }) => {
    await authPage.goto()
    await authPage.switchToRegister()
    await authPage['page'].fill('[data-testid="email"]', process.env.TEST_USER_EMAIL!)
    await authPage['page'].fill('[data-testid="password"]', 'AnyPass123!')
    await authPage['page'].click('[data-testid="submit"]')
    await expect(authPage['page'].locator('[data-testid="auth-error"]')).toBeVisible()
  })
})
```

- [ ] **Step 4: Run register tests**

```bash
cd apps/e2e && npx playwright test tests/auth/register.spec.ts --reporter=line
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/e2e/tests/auth/
git commit -m "feat(e2e): add login and register E2E tests"
```

---

### Task 9: Auth test — forgot-password

**Files:**
- Create: `apps/e2e/tests/auth/forgot-password.spec.ts`

- [ ] **Step 1: Create the spec**

```typescript
import { test, expect } from '../../fixtures/test-fixtures'

test.describe('Forgot Password', () => {
  test('submitting email shows success message', async ({ authPage }) => {
    await authPage.submitForgotPassword(process.env.TEST_USER_EMAIL!)
    // Success message must be visible (we do not verify actual email delivery)
    await expect(authPage['page'].locator('[data-testid="success-message"]')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the test**

```bash
cd apps/e2e && npx playwright test tests/auth/forgot-password.spec.ts --reporter=line
```

Expected: 1 test passes.

- [ ] **Step 3: Commit**

```bash
git add apps/e2e/tests/auth/forgot-password.spec.ts
git commit -m "feat(e2e): add forgot-password E2E test"
```

---

### Task 10: Widget embed test

Tests widget UI: open → fill → submit → success state. API is mocked — no real server call.

**Files:**
- Create: `apps/e2e/tests/widget/submit-feedback.spec.ts`

- [ ] **Step 1: Verify widget IIFE exists**

```bash
ls apps/widget/dist/widget.iife.js
```

If missing: `pnpm build --filter widget`

- [ ] **Step 2: Create `apps/e2e/tests/widget/submit-feedback.spec.ts`**

```typescript
import { test, expect } from '../../fixtures/test-fixtures'

test.describe('Widget embed', () => {
  test('open → fill → submit → shows success state', async ({ widgetPage }) => {
    await widgetPage.loadEmbed('test-api-key')

    // Widget trigger button is visible on page load
    await expect(widgetPage['page'].locator('[data-testid="widget-trigger"]')).toBeVisible()

    // Open the widget
    await widgetPage.open()

    // Form is visible
    await expect(widgetPage['page'].locator('[data-testid="widget-form"]')).toBeVisible()

    // Submit button is disabled when textarea is empty
    await expect(widgetPage['page'].locator('[data-testid="widget-submit"]')).toBeDisabled()

    // Fill and submit
    await widgetPage.submitFeedback('This is a test feedback message from Playwright')

    // Success state appears
    await widgetPage.waitForSuccess()
  })
})
```

- [ ] **Step 3: Run the widget test**

```bash
cd apps/e2e && npx playwright test tests/widget/ --reporter=line
```

Expected: 1 test passes.

- [ ] **Step 4: Commit**

```bash
git add apps/e2e/tests/widget/submit-feedback.spec.ts
git commit -m "feat(e2e): add widget embed E2E test"
```

---

### Task 11: Dashboard tests — feedback and activity

These tests use the authenticated context (saved storageState from global-setup).

**Files:**
- Create: `apps/e2e/tests/dashboard/feedback.spec.ts`
- Create: `apps/e2e/tests/dashboard/activity.spec.ts`

- [ ] **Step 1: Create `apps/e2e/tests/dashboard/feedback.spec.ts`**

```typescript
import { test, expect, authenticatedContext } from '../../fixtures/test-fixtures'

test.use(authenticatedContext())

test.describe('Dashboard feedback', () => {
  test('submitting feedback via manual input appears in kanban board', async ({ dashboardPage }) => {
    const uniqueContent = `E2E test feedback ${Date.now()}`
    await dashboardPage.goto()
    await dashboardPage.submitFeedback(uniqueContent)

    // Feedback card appears in the Kanban board (AI analysis may take a few seconds)
    await dashboardPage.waitForFeedbackCard(uniqueContent)
  })
})
```

- [ ] **Step 2: Create `apps/e2e/tests/dashboard/activity.spec.ts`**

```typescript
import { test, expect, authenticatedContext } from '../../fixtures/test-fixtures'

test.use(authenticatedContext())

test.describe('Activity feed', () => {
  test('activity feed is visible and renders items', async ({ dashboardPage }) => {
    await dashboardPage.gotoActivity()

    // Activity list container is present
    const activityList = dashboardPage['page'].locator('[data-testid="activity-list"]')
    await expect(activityList).toBeVisible()

    // At least the project_created event logged during global-setup is present
    const items = await dashboardPage.getActivityItems()
    expect(items.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run dashboard tests**

```bash
cd apps/e2e && npx playwright test tests/dashboard/ --reporter=line
```

Expected: 2 tests pass.

Note: `feedback.spec.ts` has a 15s timeout on `waitForFeedbackCard` to allow AI analysis to complete asynchronously.

- [ ] **Step 4: Commit**

```bash
git add apps/e2e/tests/dashboard/
git commit -m "feat(e2e): add dashboard feedback and activity E2E tests"
```

---

### Task 12: Invite accept test

The test creates a real invitation via API then navigates to the invite URL.

**Files:**
- Create: `apps/e2e/tests/invite/accept-invite.spec.ts`
- Modify: `apps/web/src/app/invite/accept/page.tsx` (add testids)

- [ ] **Step 1: Add testids to `apps/web/src/app/invite/accept/page.tsx`**

Read the file and find the "Accept invitation" button (inside the `AcceptInviteContent` component). Add `data-testid="invite-accept-btn"`.

Also find the container that shows invite info (team name, role) and add `data-testid="invite-info"`.

Pattern to find (~line 60+): the button that calls `acceptMutation.mutate()`:
```tsx
<Button
  data-testid="invite-accept-btn"
  onClick={() => acceptMutation.mutate()}
  // ...existing props
>
  Accept Invitation
</Button>
```

And the info container showing team/email details:
```tsx
<div data-testid="invite-info" className="...existing classes...">
```

- [ ] **Step 2: Create `apps/e2e/tests/invite/accept-invite.spec.ts`**

```typescript
import { test, expect, authenticatedContext } from '../../fixtures/test-fixtures'
import axios from 'axios'

const API_URL = 'http://localhost:3001'

test.use(authenticatedContext())

test.describe('Invite accept', () => {
  test('accepting an invitation redirects to dashboard', async ({ page, invitePage }) => {
    // Get the auth token from the saved storageState via API login
    const { data: loginData } = await axios.post(`${API_URL}/auth/login`, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    })
    const token: string = loginData.access_token

    // Get teams to find the teamId needed to create invite
    const { data: teams } = await axios.get(`${API_URL}/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const teamId: string = teams[0].id

    // Create invitation for a new email
    const inviteeEmail = `e2e-invitee-${Date.now()}@insightstream.test`
    const { data: invitation } = await axios.post(
      `${API_URL}/teams/${teamId}/invitations`,
      { email: inviteeEmail, role: 'member' },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const inviteToken: string = invitation.token

    // Register the invitee (new user) — use a fresh browser context (no stored auth)
    const { data: registerData } = await axios.post(`${API_URL}/auth/register`, {
      email: inviteeEmail,
      password: 'InviteePass123!',
    })
    const inviteeToken: string = registerData.access_token

    // Set the invitee's token in the browser
    await page.goto('http://localhost:3000')
    await page.evaluate((t: string) => localStorage.setItem('access_token', t), inviteeToken)

    // Navigate to invite accept page
    await page.goto(`/invite/accept?token=${inviteToken}`)

    // Invite info is shown
    await expect(page.locator('[data-testid="invite-info"]')).toBeVisible({ timeout: 5000 })

    // Accept the invitation
    await page.click('[data-testid="invite-accept-btn"]')

    // Redirected to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 })
    expect(page.url()).toContain('/dashboard')
  })
})
```

- [ ] **Step 3: Run invite test**

```bash
cd apps/e2e && npx playwright test tests/invite/ --reporter=line
```

Expected: 1 test passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/invite/accept/page.tsx apps/e2e/tests/invite/accept-invite.spec.ts
git commit -m "feat(e2e): add invite accept E2E test and testids"
```

---

### Task 13: Run full test suite locally

Verify all tests pass before wiring up CI.

- [ ] **Step 1: Build all apps**

```bash
pnpm build
```

Expected: API, web, and widget all build without errors.

- [ ] **Step 2: Start the API and web servers (separate terminals)**

In terminal 1:
```bash
pnpm --filter api start
```

In terminal 2:
```bash
pnpm --filter web start
```

- [ ] **Step 3: Run all E2E tests**

```bash
pnpm --filter e2e test
```

Expected output: 10 tests across 7 spec files — all passing.

- [ ] **Step 4: View HTML report on failure (if any)**

```bash
pnpm --filter e2e test:report
```

Debug failing tests with:
```bash
pnpm --filter e2e test:debug tests/path/to/failing.spec.ts
```

---

### Task 14: CI integration

Adds the `e2e` job to GitHub Actions, running after `ci` and `test` jobs.

**Files:**
- Modify: `.github/workflows/main.yml`

- [ ] **Step 1: Add `e2e` job to `.github/workflows/main.yml`**

After the existing `test:` job block, add:

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
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Install pnpm
        uses: pnpm/action-setup@v5
        with:
          version: 9.12.0

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Build all apps (API, web, widget)
        run: pnpm build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3001
          NEXT_PUBLIC_WIDGET_URL: http://localhost:8080/dist/widget.iife.js

      - name: Run database migrations
        run: pnpm --filter api migration:run
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: insightstream_test

      - name: Install Playwright browsers
        run: pnpm --filter e2e exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm --filter e2e test
        env:
          CI: true

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: apps/e2e/playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Commit and push to trigger CI**

```bash
git add .github/workflows/main.yml
git commit -m "feat(e2e): add E2E job to GitHub Actions CI pipeline"
git push
```

- [ ] **Step 3: Verify CI passes**

Open GitHub Actions → verify the `E2E Tests` job runs after `Lint, Typecheck, Build` and `Backend Tests`, and all 10 E2E tests pass.

If the job fails, download the `playwright-report` artifact from the Actions run for a visual HTML report with screenshots and traces.

---

## Summary

| Task | Output |
|---|---|
| 1 | `apps/e2e` package with Playwright config |
| 2 | Global setup: seed user + project, save storageState |
| 3 | 4 Page Object Model classes |
| 4 | Custom fixtures with typed page objects |
| 5 | `data-testid` on auth forms |
| 6 | `data-testid` on dashboard, kanban card, activity feed |
| 7 | `data-testid` on widget, rebuilt IIFE |
| 8–9 | Login, register, forgot-password tests |
| 10 | Widget embed test (mocked API) |
| 11 | Dashboard feedback + activity tests |
| 12 | Invite accept test |
| 13 | Full local suite validation |
| 14 | CI job in GitHub Actions |
