import { chromium } from '@playwright/test'
import axios from 'axios'

const API_URL = 'http://localhost:3001'
const WEB_URL = 'http://localhost:3000'

export const TEST_USER_EMAIL = 'e2e-seed@insightstream.test'
export const TEST_USER_PASSWORD = 'E2eTestPass123!'
export const TEST_PROJECT_NAME = 'E2E Test Project'

export default async function globalSetup() {
  // Register test user (idempotent — ignore 409 conflict if already exists)
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    })
  } catch (err: any) {
    if (err?.response?.status !== 409) {
      throw new Error(`globalSetup: register failed — ${err.message}`)
    }
  }

  // Login to get access token
  const { data: loginData } = await axios.post(`${API_URL}/auth/login`, {
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  })
  const token: string = loginData.access_token

  // Create test project if not exists (find by name)
  const { data: projects } = await axios.get(`${API_URL}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  let project = projects.find((p: any) => p.name === TEST_PROJECT_NAME)
  if (!project) {
    const { data } = await axios.post(
      `${API_URL}/projects`,
      { name: TEST_PROJECT_NAME },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    project = data
  }

  // Expose to tests via process.env
  process.env.TEST_USER_EMAIL = TEST_USER_EMAIL
  process.env.TEST_USER_PASSWORD = TEST_USER_PASSWORD
  process.env.TEST_PROJECT_ID = project.id
  process.env.TEST_PROJECT_API_KEY = project.apiKey ?? ''

  // Save authenticated browser state for reuse in tests
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(WEB_URL)
  await page.evaluate((t: string) => localStorage.setItem('access_token', t), token)
  await context.storageState({ path: 'apps/e2e/.auth/user.json' })
  await browser.close()

  console.log('[globalSetup] Seed complete — project:', project.name, '| id:', project.id)
}
