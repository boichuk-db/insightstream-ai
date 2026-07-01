# Dashboard UX Reorganization — Design Spec

**Date:** 2026-07-01  
**Status:** Approved for implementation

---

## Problem Statement

The current dashboard has accumulated structural debt:

1. **Dashboard overloaded** — 4 unrelated concepts on one page: dev testing tools, analytics charts, feedback feed/kanban, AI digest button.
2. **Billing duplicated** — `Settings` page shows a "Billing & Plan" section that just links to `/billing`. Two entry points for one thing.
3. **Delete Project in sidebar** — destructive action as a nav item, uses `window.confirm()`.
4. **Archive is a redundant page** — does the same `feedbacksQuery` + client-side filter as the main feed. It's just another status tab.
5. **Activity Log bug** — uses `teams?.[0]` instead of `activeTeam`. Always shows first team's activity regardless of which team is active.
6. **Manual Input Testing visible to all users** — no admin gate, no feature flag.
7. **No Inbox concept** — "New" feedback has no visual weight in navigation.
8. **Export CSV hidden** — rendered in `rightSlot` of StatusTabs, not discoverable.
9. **Analytics buried** — charts render only when feedbacks exist, no dedicated URL, can't be linked to or shared.

---

## Final Design

### Sidebar Navigation

```
💬 Feedback        [44]   ← badge = count of "New" status
📊 Analytics
⚡ Activity Log
─────────────────────────
⚙  Settings
```

4 items + Settings. Clean. No sections, no sub-nav, no project stats block.

---

### Pages

#### 1. Feedback — `/dashboard` (replaces current Dashboard)

**What stays:**
- AI Trends Bar
- Status Tabs: All / New / In Review / In Progress / Done / Rejected / **Archived** ← new tab
- Filter Chips (source, sentiment, tags, category)
- Feed Items with inline expand
- Export CSV button (stays in StatusTabs rightSlot — discoverable enough once Archive is gone)

**What's removed:**
- `AnalyticsOverview` section (Sentiment Trend + Category Distribution) → moves to Analytics page
- Manual Input Testing section → moves to `/dashboard/devtools`
- AI Digest button → moves to Analytics page

**Archived tab behavior:**
- Renders archived feedback inline with the same `FeedbackFeed` component
- `feedbacksQuery` already fetches all feedback including archived — just needs the filter to pass through when `activeTab === "Archived"`
- `/dashboard/archive` route is removed (redirect to `/dashboard`)

**Badge in sidebar:**
- Shows count of feedbacks with `status === "New"` for the active project
- Disappears when count is 0

---

#### 2. Analytics — `/dashboard/analytics` (new page)

**Content:**
- Sentiment Trend chart (from `AnalyticsOverview`)
- Category Distribution chart (from `AnalyticsOverview`)
- AI Digest button → opens `DigestModal`

**Notes:**
- Extract `AnalyticsOverview` from `dashboard/page.tsx` — it's already a standalone component, no refactor needed
- `DigestModal` state moves from Dashboard to Analytics page

---

#### 3. Activity Log — `/dashboard/activity`

**No UI changes.**

**Bug fix only:** `ActivityPage` currently does `const activeTeam = teams?.[0]`. Change to use `useTeam()` hook's `activeTeam` (same as Sidebar already does).

---

#### 4. Settings — `/dashboard/settings` (tabbed, replaces 4 separate pages)

Five tabs, URL param: `/dashboard/settings?tab=<name>`

| Tab | Content | Source |
|-----|---------|--------|
| `appearance` (default) | Color theme, dark/light mode | current `/settings` |
| `profile` | Email, member since | current `/settings` |
| `billing` | CurrentPlanCard + UsageMetrics + PricingCards | current `/billing` |
| `team` | Invite member, pending invitations, members list | current `/settings/team` |
| `embed` | Visual config, API key, implementation code | current `/embed` |

**Routing:**
- `/dashboard/billing` → redirect to `/dashboard/settings?tab=billing`
- `/dashboard/settings/team` → redirect to `/dashboard/settings?tab=team`
- `/dashboard/embed` → redirect to `/dashboard/settings?tab=embed`

**Settings page subtitle** changes from "Manage your account and subscription plan." to "Manage your workspace, team, and integrations."

---

#### 5. Developer Tools — `/dashboard/devtools` (hidden)

**Content:** Manual Input Testing section (textarea + "Post Internal" button + "Seed 20 feedbacks" button). Identical to current implementation, just moved.

**Access:**
- Direct URL: `/dashboard/devtools`
- Keyboard shortcut: `Ctrl+Shift+D` (global, registered in dashboard layout)
- Not linked from any navigation

---

### Removed / Consolidated

| Was | Now |
|-----|-----|
| `/dashboard/archive` (page) | "Archived" tab in Feedback |
| `/dashboard/billing` (page) | Settings → Billing tab |
| `/dashboard/settings/team` (page) | Settings → Team tab |
| `/dashboard/embed` (page) | Settings → Embed tab |
| Sidebar "Project Actions" section | Removed entirely |
| Sidebar "Delete Project" button | Moved to project switcher dropdown |
| `window.confirm()` for delete | Replaced with confirmation modal |
| Analytics on Dashboard | Moved to Analytics page |
| AI Digest button on Dashboard | Moved to Analytics page |
| Manual Input Testing on Dashboard | Moved to `/dashboard/devtools` |

---

## Delete Project

Remove from sidebar entirely. Add "Delete project…" as a destructive item at the bottom of the **project switcher dropdown** (already exists in Sidebar, uses `Dropdown` component).

Replace `window.confirm()` with a proper confirmation modal (inline, reuse existing modal pattern — `Dialog` or similar already used in the codebase).

---

## What Is Not Changing

- Sidebar Team / Project switchers — no changes
- User footer (avatar, plan badge, Sign Out) — no changes
- `FeedbackFeedItem` component — no changes
- `AITrendsBar` component — no changes
- `FilterChips`, `StatusTabs` — no changes
- All API endpoints — no changes
- Real-time socket invalidation — no changes
- Plan limit banner / modal — no changes

---

## Affected Files

**Modified:**
- `apps/web/src/app/dashboard/page.tsx` — remove analytics, remove manual input, rename to Feedback page
- `apps/web/src/app/dashboard/settings/page.tsx` — add tab navigation, embed Billing + Team + Embed content
- `apps/web/src/app/dashboard/activity/page.tsx` — fix `activeTeam` bug
- `apps/web/src/components/dashboard/Sidebar.tsx` — remove "Project Actions" section, add Delete to dropdown, add New badge
- `apps/web/src/components/dashboard/FeedbackFeed.tsx` — add "Archived" to STATUS_TABS, pass through archived filter

**New files:**
- `apps/web/src/app/dashboard/analytics/page.tsx`
- `apps/web/src/app/dashboard/devtools/page.tsx`

**Redirects (can use Next.js `redirect()` in page files):**
- `apps/web/src/app/dashboard/archive/page.tsx` → redirect to `/dashboard`
- `apps/web/src/app/dashboard/billing/page.tsx` → redirect to `/dashboard/settings?tab=billing`
- `apps/web/src/app/dashboard/settings/team/page.tsx` → redirect to `/dashboard/settings?tab=team`
- `apps/web/src/app/dashboard/embed/page.tsx` → redirect to `/dashboard/settings?tab=embed`
