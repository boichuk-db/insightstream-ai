import { test, expect, authenticatedContext } from '../../fixtures/test-fixtures'

test.use(authenticatedContext())

test.describe('Activity feed', () => {
  test('activity feed is visible and renders items', async ({ dashboardPage, page }) => {
    await dashboardPage.gotoActivity()

    const activityList = page.locator('[data-testid="activity-list"]')
    await expect(activityList).toBeVisible()

    // At least the project_created event from global-setup seed should be present
    const items = await dashboardPage.getActivityItems()
    expect(items.length).toBeGreaterThan(0)
  })
})
