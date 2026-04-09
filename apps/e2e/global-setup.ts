import { chromium } from '@playwright/test'
import axios from 'axios'
import * as path from 'path'
import * as fs from 'fs'

const API_URL = 'http://localhost:3001'
const WEB_URL = 'http://localhost:3000'

export const TEST_USER_EMAIL = 'e2e-seed@insightstream.test'
export const TEST_USER_PASSWORD = 'E2eTestPass123!'
export const TEST_PROJECT_NAME = 'E2E Test Project'

export default async function globalSetup() {
  // Register test user (idempotent — 409 means already exists, which is fine)
  try {
    await axios.post(`${API_URL}/auth/register`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    })
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      // Already registered — continue
    } else {
      throw new Error(
        `globalSetup: register failed — ${axios.isAxiosError(err) ? err.message : String(err)}`,
      )
    }
  }

  // Login to get access token
  let token: string
  try {
    const { data } = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    })
    token = data.access_token
    if (!token) throw new Error('Login response missing access_token')
  } catch (err: unknown) {
    throw new Error(
      `globalSetup: login failed — ${axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : String(err)}`,
    )
  }

  // Find or create the test project
  let project: { id: string; apiKey: string; name: string }
  try {
    const { data: projects } = await axios.get(`${API_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const existing = projects.find((p: any) => p.name === TEST_PROJECT_NAME)
    if (existing) {
      project = existing
    } else {
      const { data } = await axios.post(
        `${API_URL}/projects`,
        { name: TEST_PROJECT_NAME },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      project = data
    }
  } catch (err: unknown) {
    throw new Error(
      `globalSetup: project seed failed — ${axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : String(err)}`,
    )
  }

  // Validate project before exposing to tests
  if (!project.id) {
    throw new Error(`globalSetup: project "${TEST_PROJECT_NAME}" has no id`)
  }
  if (!project.apiKey) {
    throw new Error(
      `globalSetup: project "${TEST_PROJECT_NAME}" has no apiKey — check if GET/POST /projects returns it`,
    )
  }

  // Expose to tests via process.env
  process.env.TEST_USER_EMAIL = TEST_USER_EMAIL
  process.env.TEST_USER_PASSWORD = TEST_USER_PASSWORD
  process.env.TEST_PROJECT_ID = project.id
  process.env.TEST_PROJECT_API_KEY = project.apiKey

  // Create .auth/ directory if it doesn't exist
  const authDir = path.resolve(__dirname, '.auth')
  fs.mkdirSync(authDir, { recursive: true })

  // Save authenticated browser state (storageState) for reuse in tests
  // The app stores JWT in localStorage under 'access_token' key.
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(WEB_URL)
  await page.evaluate((t: string) => localStorage.setItem('access_token', t), token)

  // Verify auth is actually set before saving state
  const stored = await page.evaluate(() => localStorage.getItem('access_token'))
  if (!stored) {
    await browser.close()
    throw new Error('globalSetup: failed to set access_token in localStorage')
  }

  await context.storageState({ path: path.resolve(authDir, 'user.json') })
  await browser.close()

  console.log('[globalSetup] Seed complete — project:', project.name, '| id:', project.id)
}
