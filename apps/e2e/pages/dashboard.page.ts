import { Page, expect } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard')
    await expect(this.page.locator('[data-testid="dashboard-root"]')).toBeVisible({ timeout: 10000 })
  }

  async submitFeedback(content: string) {
    // Manual feedback input lives on the devtools page (moved off the main
    // dashboard in the Feedback-only refactor). Submit there, then return to
    // the dashboard where the kanban board renders the new card.
    await this.page.goto('/dashboard/devtools')
    await this.page.fill('[data-testid="feedback-input"]', content)
    const created = this.page.waitForResponse(
      (r) => r.url().includes('/feedback') && r.request().method() === 'POST',
    )
    await this.page.click('[data-testid="feedback-submit"]')
    await created
    await this.page.goto('/dashboard')
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
