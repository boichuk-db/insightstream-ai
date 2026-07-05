import { test, expect } from '../../fixtures/test-fixtures'
import axios from 'axios'

const API_URL = 'http://localhost:3001'

// Pure API-level authz check — no UI needed. Verifies the team-as-tenant
// contract: only ADMIN+ team members may delete a project; plain MEMBERs
// get 403, the owner (ADMIN by construction of the personal team) gets 200.
test.describe('Project delete authorization', () => {
  test('member cannot delete a project; owner can', async () => {
    const suffix = Date.now()
    const ownerEmail = `e2e-pd-owner-${suffix}@insightstream.test`
    const memberEmail = `e2e-pd-member-${suffix}@insightstream.test`
    const password = 'PdOwnerPass123!'

    // Owner registers — gets a personal team (owner is ADMIN-equivalent) and
    // a Default Project auto-created on first GET /projects.
    const { data: ownerRegister } = await axios.post(`${API_URL}/auth/register`, {
      email: ownerEmail,
      password,
    })
    const ownerToken: string = ownerRegister.access_token

    const { data: teams } = await axios.get(`${API_URL}/teams`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    expect(teams.length).toBe(1)
    const teamId: string = teams[0].id

    const { data: projects } = await axios.get(`${API_URL}/projects`, {
      params: { teamId },
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    expect(projects.length).toBeGreaterThan(0)
    const projectId: string = projects[0].id

    // Invite a second user as MEMBER (E2E_BYPASS_PLAN_LIMITS allows this on FREE).
    const { data: invitation } = await axios.post(
      `${API_URL}/teams/${teamId}/invitations`,
      { email: memberEmail, role: 'member' },
      { headers: { Authorization: `Bearer ${ownerToken}` } },
    )
    const inviteToken: string = invitation.token

    const { data: memberRegister } = await axios.post(`${API_URL}/auth/register`, {
      email: memberEmail,
      password,
    })
    const memberToken: string = memberRegister.access_token

    await axios.post(
      `${API_URL}/invitations/accept`,
      { token: inviteToken },
      { headers: { Authorization: `Bearer ${memberToken}` } },
    )

    // MEMBER attempts delete — forbidden (requires ADMIN role in the team).
    const memberDeleteRes = await axios.delete(`${API_URL}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
      validateStatus: () => true,
    })
    expect(memberDeleteRes.status).toBe(403)

    // Owner deletes — allowed.
    const ownerDeleteRes = await axios.delete(`${API_URL}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      validateStatus: () => true,
    })
    expect(ownerDeleteRes.status).toBe(200)
  })
})
