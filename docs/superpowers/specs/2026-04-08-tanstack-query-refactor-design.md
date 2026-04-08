# TanStack Query Refactor — Design Spec

**Date:** 2026-04-08  
**Status:** Approved

## Problem

TanStack Query v5 is already installed and used across the web app, but the current usage has three issues:

1. **Duplication** — `queryFn` definitions for `userProfile`, `projects`, and `feedbacks` are copy-pasted inline across 5+ pages and hooks.
2. **Bugs** — `activity/page.tsx` uses the wrong endpoint (`/auth/profile` instead of `/users/me`) and the wrong query key (`["projects", activeTeam?.id]` instead of `["projects"]`), causing stale cache misses and incorrect data.
3. **Ad-hoc async state** — `dashboard/page.tsx` fetches the digest preview with raw `api.get` + manual `useState` for loading/error/data, bypassing TanStack Query entirely.

## Solution

### 1. New file: `apps/web/src/lib/queries.ts`

Extract all shared query definitions into `queryOptions` factories — the idiomatic TanStack Query v5 pattern. Each factory exports a pre-typed query options object that can be passed directly to `useQuery`, `queryClient.prefetchQuery`, etc.

```ts
export const userProfileQuery = queryOptions({ ... })
export const projectsQuery = queryOptions({ ... })
export const feedbacksQuery = queryOptions({ ... })
export const digestPreviewQuery = (projectId: string) => queryOptions({ ... })
```

`digestPreviewQuery` accepts a `projectId` parameter and sets `staleTime: 5 * 60 * 1000` — digest data doesn't need frequent refetching.

### 2. Bugfixes in `activity/page.tsx`

- Fix endpoint: `/auth/profile` → `/users/me` (matches all other pages)
- Fix query key: `["projects", activeTeam?.id]` → `["projects"]` (matches the shared cache entry used everywhere)

### 3. Digest refactor in `dashboard/page.tsx`

Replace manual async state (`digestData`, `digestLoading`, `digestError`, `handleOpenDigest`) with:

```ts
const { data: digestData, isLoading: digestLoading, error: digestError } = useQuery({
  ...digestPreviewQuery(activeProject?.id ?? ''),
  enabled: isDigestOpen && !!activeProject?.id,
})
```

`handleOpenDigest` is removed — clicking the button just calls `setIsDigestOpen(true)`, and the query fires automatically based on the `enabled` flag.

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/lib/queries.ts` | **NEW** — `queryOptions` factories |
| `apps/web/src/app/dashboard/page.tsx` | Replace 3× inline queryFn; digest → `useQuery(digestPreviewQuery(...))` |
| `apps/web/src/app/dashboard/archive/page.tsx` | Replace 2× inline queryFn |
| `apps/web/src/app/dashboard/activity/page.tsx` | Bugfix endpoint + bugfix queryKey + replace inline queryFn |
| `apps/web/src/app/dashboard/embed/page.tsx` | Replace 2× inline queryFn |
| `apps/web/src/app/settings/page.tsx` | Replace 2× inline queryFn |
| `apps/web/src/app/settings/team/page.tsx` | Replace 2× inline queryFn |
| `apps/web/src/hooks/useTeam.ts` | Replace `userProfile` inline queryFn |

## Out of Scope

- No changes to API endpoints or backend
- No changes to mutation logic (mutations are page-specific, no duplication)
- No changes to `useTeam` structure — TanStack Query deduplicates requests with the same query key automatically, so `useTeam` calling `useQuery(userProfileQuery)` alongside pages is correct behavior
- No new pages or components

## Testing

After the refactor, verify:
- Dashboard loads feedbacks and projects correctly
- Archive page shows archived items (not all feedbacks)
- Activity page loads correctly (was using wrong endpoint — verify fix)
- Digest modal opens and loads data without a spinner flash on re-open (cached)
- Team settings page loads members and invitations
- No duplicate network requests in DevTools for `userProfile` and `projects` across pages
