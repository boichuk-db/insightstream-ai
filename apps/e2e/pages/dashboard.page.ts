import { Page, expect } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard')
    await expect(this.page.locator('[data-testid="dashboard-root"]')).toBeVisible({ timeout: 10000 })
  }

  async submitFeedback(content: string) {
    await this.page.fill('[data-testid="feedback-input"]', content)
    await this.page.click('[data-testid="feedback-submit"]')
  }

  async waitForFeedbackCard(content: string) {
    await expect(
      this.page.locator('[data-testid="kanban-card"]').filter({ hasText: content })
    ).toBeVisible({ timeout: 15000 })
  }

  async gotoActivity() {
    await this.page.goto('/dashboard/activity')
    await expect(this.page.locator('[data-testid="activity-list"]')).toBeVisible({ timeout: 10000 })
  }

  async getActivityItems() {
    return this.page.locator('[data-testid="activity-item"]').all()
  }
}
