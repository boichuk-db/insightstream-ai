import { Page, expect } from '@playwright/test'

export class InvitePage {
  constructor(private page: Page) {}

  async acceptInvite(token: string) {
    await this.page.goto(`/invite/accept?token=${token}`)
    await expect(this.page.locator('[data-testid="invite-accept-btn"]')).toBeVisible({ timeout: 5000 })
    await this.page.click('[data-testid="invite-accept-btn"]')
    await this.page.waitForURL('/dashboard', { timeout: 10000 })
  }

  get infoLocator() {
    return this.page.locator('[data-testid="invite-info"]')
  }
}
