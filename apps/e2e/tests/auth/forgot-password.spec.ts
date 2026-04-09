import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Forgot Password', () => {
  test('submitting email shows success message', async ({ authPage, page }) => {
    await authPage.submitForgotPassword(process.env.TEST_USER_EMAIL!);
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
