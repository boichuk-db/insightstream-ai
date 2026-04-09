import { Page, expect } from '@playwright/test'

export class AuthPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  /** Switch to register mode (form starts in login mode by default) */
  async switchToRegister() {
    await this.page.click('[data-testid="auth-toggle"]')
    await expect(this.page.locator('[data-testid="submit"]')).toContainText('Sign Up')
  }

  async login(email: string, password: string) {
    await this.goto()
    await this.page.fill('[data-testid="email"]', email)
    await this.page.fill('[data-testid="password"]', password)
    await this.page.click('[data-testid="submit"]')
    await this.page.waitForURL('/dashboard', { timeout: 10000 })
  }

  async register(email: string, password: string) {
    await this.goto()
    await this.switchToRegister()
    await this.page.fill('[data-testid="email"]', email)
    await this.page.fill('[data-testid="password"]', password)
    await this.page.click('[data-testid="submit"]')
    await this.page.waitForURL('/dashboard', { timeout: 10000 })
  }

  async submitForgotPassword(email: string) {
    await this.page.goto('/auth/forgot-password')
    await this.page.fill('[data-testid="email"]', email)
    await this.page.click('[data-testid="submit"]')
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 5000 })
  }

  get errorLocator() {
    return this.page.locator('[data-testid="auth-error"]')
  }
}
