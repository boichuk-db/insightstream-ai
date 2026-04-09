import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Register', () => {
  test('new user registration redirects to dashboard', async ({ authPage, page }) => {
    const uniqueEmail = `e2e-register-${Date.now()}@insightstream.test`;
    await authPage.register(uniqueEmail, 'E2eRegTest123!');
    expect(page.url()).toContain('/dashboard');
  });

  test('duplicate email shows error message', async ({ authPage, page }) => {
    await page.goto('/');
    await authPage.switchToRegister();
    await page.fill('[data-testid="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('[data-testid="password"]', 'AnyPass123!');
    await page.click('[data-testid="submit"]');
    await expect(authPage.errorLocator).toBeVisible();
  });
});
