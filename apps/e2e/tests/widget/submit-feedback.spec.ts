import { test, expect } from '../../fixtures/test-fixtures'

test.describe('Widget embed', () => {
  test('open → fill → submit → shows success state', async ({ widgetPage, page }) => {
    await widgetPage.loadEmbed('test-api-key')

    // Widget trigger button visible on page load
    await expect(page.locator('[data-testid="widget-trigger"]')).toBeVisible()

    // Open the widget
    await widgetPage.open()

    // Form is visible
    await expect(page.locator('[data-testid="widget-form"]')).toBeVisible()

    // Submit button is disabled when textarea is empty
    await expect(page.locator('[data-testid="widget-submit"]')).toBeDisabled()

    // Fill and submit
    await widgetPage.submitFeedback('This is a test feedback message from Playwright')

    // Success state appears
    await widgetPage.waitForSuccess()
  })
})
