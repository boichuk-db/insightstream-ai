import { Page, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

export class WidgetPage {
  constructor(private page: Page) {}

  async loadEmbed(apiKey = 'test-api-key') {
    const iifePath = path.resolve(__dirname, '../../../widget/dist/widget.iife.js')
    if (!fs.existsSync(iifePath)) {
      throw new Error(
        `Widget IIFE not found at ${iifePath}. Run: pnpm build --filter widget`,
      )
    }
    const iife = fs.readFileSync(iifePath, 'utf-8')

    await this.page.route('http://widget-local/widget.iife.js', async (route) => {
      await route.fulfill({ contentType: 'application/javascript', body: iife })
    })

    await this.page.route('**/feedback/public', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mock-feedback-id' }),
      })
    })

    await this.page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script>
          window.InsightStreamConfig = {
            apiKey: '${apiKey}',
            apiUrl: 'http://localhost:3001'
          }
        </script>
        <script src="http://widget-local/widget.iife.js"></script>
      </body>
      </html>
    `)

    await expect(this.page.locator('[data-testid="widget-trigger"]')).toBeVisible({ timeout: 5000 })
  }

  async open() {
    await this.page.click('[data-testid="widget-trigger"]')
    await expect(this.page.locator('[data-testid="widget-form"]')).toBeVisible({ timeout: 3000 })
  }

  async submitFeedback(content: string) {
    await this.page.fill('[data-testid="widget-textarea"]', content)
    await this.page.click('[data-testid="widget-submit"]')
  }

  async waitForSuccess() {
    await expect(this.page.locator('[data-testid="widget-success"]')).toBeVisible({ timeout: 5000 })
  }
}
