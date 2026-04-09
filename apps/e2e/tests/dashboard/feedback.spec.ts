import { test, expect, authenticatedContext } from '../../fixtures/test-fixtures'

test.use(authenticatedContext())

test.describe('Dashboard feedback', () => {
  test('submitting feedback via manual input appears in kanban board', async ({ dashboardPage }) => {
    const uniqueContent = `E2E test feedback ${Date.now()}`
    await dashboardPage.goto()
    await dashboardPage.submitFeedback(uniqueContent)

    // Card appears after AI analysis completes (up to 15s)
    await dashboardPage.waitForFeedbackCard(uniqueContent)
  })
})
