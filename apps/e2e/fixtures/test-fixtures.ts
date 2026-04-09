import * as path from 'path'
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
 * Usage in spec file:
 *   test.use(authenticatedContext())
 */
export function authenticatedContext() {
  return { storageState: path.resolve(__dirname, '../.auth/user.json') }
}
