import { test, expect } from '../../fixtures/test-fixtures'
import axios from 'axios'

const API_URL = 'http://localhost:3001'

// Pure API-level checks — no UI needed. Verifies plan/status/checkout
// endpoints are strictly team-scoped: teamId is required, membership is
// required to read status, and only the team owner may initiate checkout.
test.describe('Team-scoped plan endpoints', () => {
  test('status requires teamId, requires membership; checkout is owner-only', async () => {
    const suffix = Date.now()
    const password = 'PlanUserPass123!'

    const { data: user1Register } = await axios.post(`${API_URL}/auth/register`, {
      email: `e2e-plan-owner-${suffix}@insightstream.test`,
      password,
    })
    const token1: string = user1Register.access_token

    const { data: teams1 } = await axios.get(`${API_URL}/teams`, {
      headers: { Authorization: `Bearer ${token1}` },
    })
    const teamId: string = teams1[0].id

    const statusRes = await axios.get(`${API_URL}/plans/status`, {
      params: { teamId },
      headers: { Authorization: `Bearer ${token1}` },
      validateStatus: () => true,
    })
    expect(statusRes.status).toBe(200)
    expect(statusRes.data.plan).toBe('FREE')
    expect(statusRes.data.isOwner).toBe(true)

    const statusNoTeamRes = await axios.get(`${API_URL}/plans/status`, {
      headers: { Authorization: `Bearer ${token1}` },
      validateStatus: () => true,
    })
    expect(statusNoTeamRes.status).toBe(400)

    // A second, unrelated user has no membership in the first user's team.
    const { data: user2Register } = await axios.post(`${API_URL}/auth/register`, {
      email: `e2e-plan-outsider-${suffix}@insightstream.test`,
      password,
    })
    const token2: string = user2Register.access_token

    const outsiderStatusRes = await axios.get(`${API_URL}/plans/status`, {
      params: { teamId },
      headers: { Authorization: `Bearer ${token2}` },
      validateStatus: () => true,
    })
    expect(outsiderStatusRes.status).toBe(403)

    // Non-owner (also non-member here) cannot start checkout for this team —
    // uniform 404 so team existence isn't probeable.
    const checkoutRes = await axios.post(
      `${API_URL}/plans/checkout`,
      { priceId: 'price_x', teamId },
      { headers: { Authorization: `Bearer ${token2}` }, validateStatus: () => true },
    )
    expect(checkoutRes.status).toBe(404)
  })
})
