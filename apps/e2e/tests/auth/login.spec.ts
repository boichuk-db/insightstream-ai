import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Login', () => {
  test('successful login redirects to dashboard', async ({ authPage, page }) => {
    await authPage.login(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!,
    );
    expect(page.url()).toContain('/dashboard');
  });

  test('wrong password shows error message', async ({ page, authPage }) => {
    await page.goto('/');
    await page.fill('[data-testid="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('[data-testid="password"]', 'WrongPass999!');
    await page.click('[data-testid="submit"]');
    await expect(authPage.errorLocator).toBeVisible();
  });
});
