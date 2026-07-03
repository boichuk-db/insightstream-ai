import { Page, expect } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    // The dashboard defaults to the feed view; the kanban board (and its
    // [data-testid="kanban-card"]) only renders in kanban view. Force it via
    // localStorage before any page script runs so every navigation in this
    // page uses the kanban view.
    await this.page.addInitScript(() => {
      localStorage.setItem('is-feedback-view', 'kanban')
    })
    await this.page.goto('/dashboard')
    await expect(this.page.locator('[data-testid="dashboard-root"]')).toBeVisible({ timeout: 10000 })
  }

  async submitFeedback(content: string) {
    // Manual feedback input lives on the devtools page (moved off the main
    // dashboard in the Feedback-only refactor). Submit there, then return to
    // the dashboard where the kanban board renders the new card.
    // Wait for the projects query (fired on mount) so the form has a target
    // project id. Registered before navigation to avoid a response race, and
    // avoiding networkidle which never settles under the realtime socket.
    const projectsLoaded = this.page.waitForResponse(
      (r) => r.url().includes('/projects') && r.request().method() === 'GET',
    )
    await this.page.goto('/dashboard/devtools')
    await projectsLoaded
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
