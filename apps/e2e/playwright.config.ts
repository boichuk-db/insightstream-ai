import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['html']],
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter api start',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || '5432',
        DB_USERNAME: process.env.DB_USERNAME || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
        DB_DATABASE: process.env.DB_DATABASE || 'insightstream_test',
        JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'test-key',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
        NODE_ENV: 'test',
      },
    },
    {
      command: 'pnpm --filter web start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
        NEXT_PUBLIC_WIDGET_URL: 'http://localhost:8080/dist/widget.iife.js',
      },
    },
  ],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
