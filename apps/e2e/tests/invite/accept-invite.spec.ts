import { test, expect, authenticatedContext } from '../../fixtures/test-fixtures'
import axios from 'axios'

const API_URL = 'http://localhost:3001'

test.use(authenticatedContext())

test.describe('Invite accept', () => {
  test('accepting an invitation redirects to dashboard', async ({ page }) => {
    // Login as the seeded test user to get a token for API calls
    const { data: loginData } = await axios.post(`${API_URL}/auth/login`, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    })
    const token: string = loginData.access_token

    // Get teams to find the teamId
    const { data: teams } = await axios.get(`${API_URL}/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const teamId: string = teams[0].id

    // Create invitation for a unique new email
    const inviteeEmail = `e2e-invitee-${Date.now()}@insightstream.test`
    const { data: invitation } = await axios.post(
      `${API_URL}/teams/${teamId}/invitations`,
      { email: inviteeEmail, role: 'member' },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const inviteToken: string = invitation.token

    // Register the invitee as a new user
    const { data: registerData } = await axios.post(`${API_URL}/auth/register`, {
      email: inviteeEmail,
      password: 'InviteePass123!',
    })
    const inviteeToken: string = registerData.access_token

    // Set the invitee token in the browser (overrides the seeded user's storageState)
    await page.goto('http://localhost:3000')
    await page.evaluate((t: string) => localStorage.setItem('access_token', t), inviteeToken)

    // Navigate to invite accept page
    await page.goto(`/invite/accept?token=${inviteToken}`)

    // Invite info is shown
    await expect(page.locator('[data-testid="invite-info"]')).toBeVisible({ timeout: 5000 })

    // Accept the invitation
    await page.click('[data-testid="invite-accept-btn"]')

    // Redirected to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 })
    expect(page.url()).toContain('/dashboard')
  })
})
