# Teams Creation & Dashboard — Design Spec

**Date:** 2026-03-27
**Product:** Feedback Platform
**Scope:** Phase 1 (Creation & Editing UI) + Phase 2 (Team Dashboard)

---

## Problem

The backend fully supports teams: creating, inviting members, assigning roles, scoping projects to teams, and logging activity. However, the frontend is missing:

1. A way to create a new team
2. A way to create a project within a team
3. A way to edit or delete a team
4. A team-level overview (dashboard + activity)

Users are stuck — they can be invited to a team, but cannot independently create one or manage it from the UI.

---

## Goals

- Close the creation gap: users can create teams and projects via UI
- Provide team owners basic management (rename, delete)
- Give team members a central place to see their team's projects and activity
- Respect existing role hierarchy (OWNER / ADMIN / MEMBER / VIEWER)

---

## Non-Goals

- Project transfer between teams (Phase 3)
- Notifications (Phase 4)
- Billing / seat limits changes (already enforced in backend, no UI needed now)

---

## Architecture

No new backend entities needed for Phases 1–2. One new API endpoint required:

```
PATCH /teams/:teamId   — update team name (OWNER only)
```

All other operations already exist:

- `POST /teams` — create team
- `POST /teams/:teamId/projects` — create project in team
- `DELETE /teams/:teamId` — delete team
- `GET /teams/:teamId/projects` — list team projects
- `GET /teams/:teamId/activity` — team activity feed

---

## Phase 1 — Creation & Editing UI

### 1.1 Create Team

**Entry point:** Sidebar, below team list — "+" icon or "Create team" text button

**Modal fields:**

- Team name (required, min 2 chars, max 50)

**On submit:**

1. `POST /teams { name }` → response: `{ id, name, ownerId }`
2. Invalidate `['teams']` React Query cache
3. Call `switchTeam(newTeam.id)` to activate new team
4. Close modal

**Error handling:** Show inline error if name is taken or empty.

---

### 1.2 Create Project in Team

**Entry point:** Sidebar under active team's project list — "+" icon

**Visibility:** Only shown to ADMIN or OWNER (check `userRole` from `useTeam()`)

**Modal fields:**

- Project name (required, min 2 chars, max 100)

**On submit:**

1. `POST /teams/:activeTeamId/projects { name }` → response: project object
2. Invalidate `['team-projects', activeTeamId]` React Query cache
3. Navigate to new project page
4. Close modal

---

### 1.3 Edit Team Name

**Entry point:** `/settings/team` page — inline edit next to team name (pencil icon)

**Behavior:**

- Click pencil → input field replaces text
- Save (Enter or button) → `PATCH /teams/:teamId { name }`
- Cancel (Escape or button) → revert to original
- Only rendered for OWNER role

**Backend additions:**

- `PATCH /teams/:teamId` route (requires OWNER via `@RequireTeamRole(TeamRole.OWNER)`)
- `TeamsService.update(teamId, { name })` — validates name, saves
- `UpdateTeamDto { name: string }` with class-validator decorators

---

### 1.4 Delete Team

**Entry point:** `/settings/team` — "Danger zone" section, OWNER only

**Confirmation flow:**

- Click "Delete team" button → confirmation modal
- Modal asks user to type team name to confirm
- Submit → `DELETE /teams/:teamId`
- On success: invalidate `['teams']`, redirect to first remaining team or `/dashboard`

---

## Phase 2 — Team Dashboard

### 2.1 Route: `/teams/[teamId]`

**Layout:**

```
┌─────────────────────────────────────────────┐
│ [Team Name]            [Members: 4]          │
├─────────────────────────┬───────────────────┤
│ Projects Grid (2/3)     │ Activity Feed (1/3)│
│                         │                   │
│ ┌────┐ ┌────┐ ┌────┐   │ • User joined     │
│ │Proj│ │Proj│ │ +  │   │ • Project created │
│ └────┘ └────┘ └────┘   │ • Role changed    │
│                         │                   │
└─────────────────────────┴───────────────────┘
```

**Project card shows:**

- Project name
- Feedback count
- Last activity date

**"New project" card** (last card): visible to ADMIN+ only

---

### 2.2 Activity Feed

**Data source:** `GET /teams/:teamId/activity?limit=20`

**Rendered events:**
| Action | Display |
|--------|---------|
| `MEMBER_JOINED` | `<user> joined the team` |
| `MEMBER_REMOVED` | `<user> was removed` |
| `MEMBER_ROLE_CHANGED` | `<user>'s role changed to <role>` |
| `PROJECT_CREATED` | `Project <name> was created` |
| `PROJECT_DELETED` | `Project <name> was deleted` |
| `INVITATION_SENT` | `<email> was invited as <role>` |

Each item shows relative timestamp ("2 hours ago").

---

### 2.3 Navigation Change

- Team items in sidebar switcher → become `<Link href="/teams/:teamId">`
- Currently: switching team keeps you on the same page
- After: switching team navigates to `/teams/:teamId`

---

## Components

| Component            | Location                      | Purpose                       |
| -------------------- | ----------------------------- | ----------------------------- |
| `CreateTeamModal`    | `components/teams/`           | Create team form + API call   |
| `CreateProjectModal` | `components/teams/`           | Create project in team form   |
| `ActivityFeed`       | `components/teams/`           | Render `ActivityEvent[]` list |
| Team dashboard page  | `app/teams/[teamId]/page.tsx` | Team overview layout          |

---

## Verification Checklist

- [ ] Create team → appears in sidebar → auto-switch
- [ ] Create project in team → appears in sidebar + project page
- [ ] Edit team name in settings → persists after refresh
- [ ] Delete team → confirmation → team removed from sidebar
- [ ] `/teams/:teamId` loads with project grid + activity feed
- [ ] Activity feed shows recent events with correct copy
- [ ] VIEWER/MEMBER cannot see "New project" button
- [ ] MEMBER cannot see edit/delete team controls
- [ ] Non-member navigating to `/teams/:teamId` gets 403 / redirect
