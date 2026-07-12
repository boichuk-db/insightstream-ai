---
id: web
title: apps/web
sidebar_position: 2
---

# apps/web

Next.js 16 App Router dashboard, React 19, TailwindCSS 4, TanStack Query 5. Port 3000. Deployed on Vercel today, with an Amplify deployment running in parallel (cutover pending — see [Ops](../ops)).

## Routes (`apps/web/src/app/`)

- `/` (root `page.tsx`) — a combined login/register form (toggles between `POST /auth/login` and `POST /auth/register`), not a separate `auth/login` route. See [Authentication Flow](../architecture/auth-flow).
- `auth/` — OAuth callback (`oauth/callback/`), `forgot-password/`, `reset-password/`.
- `invite/accept/` — team invite acceptance.
- `dashboard/` — the authenticated app shell, mounted under `dashboard/layout.tsx`:
  - root (`page.tsx`) — the feed/Kanban view (`FeedbackFeed` / `KanbanBoard`, toggled via `useFeedbackView`).
  - `analytics/`, `activity/` — real standalone pages.
  - `settings/` — a single tabbed page (Appearance, Profile, Billing, Team, Embed, Developer Tools tabs); this is where team/project/billing management actually lives.
  - `archive/`, `billing/`, `embed/` — thin redirect stubs kept for backward-compatible links, not separate pages: `archive/` redirects to `/dashboard`, `billing/` and `embed/` each redirect to `/dashboard/settings?tab=...`.
  - `devtools/` — the only route among these that's a real standalone page and keeps the back-button pattern (`showBackButton`) instead of collapsing into a settings tab.
- `settings/` (top level, outside `dashboard/`) — entirely a legacy redirect layer to `/dashboard/settings` (and `/dashboard/settings/team`); it has no content of its own.

## Component library (`apps/web/src/components/ui/`)

A real internal UI library — one implementation per pattern (`Modal`, `Popover`, `Tabs`, `Drawer`, `FormField`, `StatusSelect`, `ConfirmDialog`, `CommentThread`, `NavItem`, etc.), just over half (16 of 29) paired with a Storybook story; the rest — mostly older components like `Modal` — don't have one yet. Consolidated from 4-5 duplicate implementations per pattern in 2026-07 — see [Timeline](../timeline) for the two-phase rollout, or `PLAN.md` P1 for the full task-by-task detail. Rule: a component may live outside `ui/` only if it's used by exactly one page.

## State

- `TeamProvider` (`contexts/TeamContext.tsx`) — current team context, mounted once in `dashboard/layout.tsx`. Its value object isn't memoized, so every consumer re-renders on any provider query update (e.g. `switchTeam()`) — fine at current scale.
- TanStack Query — server state, keyed with `teamId` throughout.
- `useSocket` — Socket.io client; connects with the user's JWT and listens for `feedbackUpdated`. Room membership (`user-{id}`, `team-{teamId}`) is assigned server-side on connection, not requested by the client. See [Request Lifecycle](../architecture/request-lifecycle) for the full path from feedback submission to this update.

## Where to look

- `apps/web/src/app/dashboard/layout.tsx` — the authenticated shell; mounts `TeamProvider`.
- `apps/web/src/hooks/` — data-fetching and domain hooks (`useComments`, `use-plan-usage`, `useSocket`, `useTeam`, etc.).
- `apps/web/src/lib/statusConfig.ts` — the single source of truth for feedback status colors (`STATUS_CONFIG`), consuming the semantic `--status-success/warning/danger/info` tokens defined in `globals.css`. `lib/colors.ts` re-exports it; its own local `STATUS_COLORS` is deprecated. `lib/colors.ts` also holds `CATEGORY_COLORS`, which intentionally uses raw Tailwind shades for category tags — that's a separate, non-semantic color set.
