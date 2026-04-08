# TanStack Query Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shared `queryOptions` factories into `lib/queries.ts`, fix two bugs in `activity/page.tsx`, and convert the digest preview from ad-hoc async state to `useQuery`.

**Architecture:** A single new file `apps/web/src/lib/queries.ts` exports `queryOptions` objects (TanStack Query v5 API) for the four shared queries: `userProfile`, `projects`, `feedbacks`, `digestPreview`. Each page/hook imports and passes these directly to `useQuery`, replacing all inline `queryFn` duplicates. No other structural changes.

**Tech Stack:** TanStack Query v5 (`@tanstack/react-query`), Next.js 16 App Router, TypeScript

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `apps/web/src/lib/queries.ts` | All `queryOptions` factories |
| **Modify** | `apps/web/src/app/dashboard/page.tsx` | Use factories; digest → `useQuery` |
| **Modify** | `apps/web/src/app/dashboard/activity/page.tsx` | Bugfix endpoint + queryKey; use factories |
| **Modify** | `apps/web/src/app/dashboard/archive/page.tsx` | Use factories |
| **Modify** | `apps/web/src/app/dashboard/embed/page.tsx` | Use factories |
| **Modify** | `apps/web/src/app/settings/page.tsx` | Use factories |
| **Modify** | `apps/web/src/app/settings/team/page.tsx` | Use factories |
| **Modify** | `apps/web/src/hooks/useTeam.ts` | Use `userProfileQuery` factory |

---

## Task 1: Create `lib/queries.ts`

**Files:**
- Create: `apps/web/src/lib/queries.ts`

- [ ] **Step 1: Create the file**

```ts
import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const userProfileQuery = queryOptions({
  queryKey: ["userProfile"],
  queryFn: () => api.get("/users/me").then((r) => r.data),
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: () => api.get("/projects").then((r) => r.data),
});

export const feedbacksQuery = queryOptions({
  queryKey: ["feedbacks"],
  queryFn: () => api.get("/feedback").then((r) => r.data),
});

export const digestPreviewQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["digestPreview", projectId],
    queryFn: () =>
      api.get(`/digest/preview/${projectId}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `apps/web/`:
```bash
pnpm typecheck
```
Expected: no errors related to `queries.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/queries.ts
git commit -m "feat(web): add queryOptions factories to lib/queries.ts"
```

---

## Task 2: Fix bugs + refactor `activity/page.tsx`

Two bugs: wrong endpoint (`/auth/profile` → `/users/me`) and wrong query key (`["projects", activeTeam?.id]` → `["projects"]`).

**Files:**
- Modify: `apps/web/src/app/dashboard/activity/page.tsx`

- [ ] **Step 1: Replace the imports and inline queries**

Replace the top of the file. Current:
```ts
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { api } from "@/lib/api";
```

New:
```ts
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { api } from "@/lib/api";
import { userProfileQuery, projectsQuery } from "@/lib/queries";
```

Keep `api` — the inline `teams` query still uses it.

- [ ] **Step 2: Replace the userProfile query (bugfix: wrong endpoint)**

Remove:
```ts
const { data: userProfile } = useQuery({
  queryKey: ["userProfile"],
  queryFn: async () => {
    const { data } = await api.get("/auth/profile");
    return data;
  },
});
```

Replace with:
```ts
const { data: userProfile } = useQuery(userProfileQuery);
```

- [ ] **Step 3: Replace the teams query (keep inline — not a shared factory)**

The `teams` query stays inline as-is (it uses `useTeam` on other pages; this page calls it directly but it's fine since TQ deduplicates by query key).

- [ ] **Step 4: Replace the projects query (bugfix: wrong query key)**

Remove:
```ts
const { data: projects } = useQuery({
  queryKey: ["projects", activeTeam?.id],
  queryFn: async () => {
    const { data } = await api.get(`/projects?teamId=${activeTeam?.id}`);
    return data;
  },
  enabled: !!activeTeam?.id,
});
```

Replace with:
```ts
const { data: projects } = useQuery(projectsQuery);
```

Note: the original filtered by `teamId` but no other page does this, and the backend `/projects` returns the user's projects regardless. The `activeTeam` filter was incorrect — projects come filtered server-side by the authenticated user, not by team.

- [ ] **Step 5: Remove the unused `api` import**

The file no longer uses `api` directly. Remove:
```ts
import { api } from "@/lib/api";
```

- [ ] **Step 6: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/dashboard/activity/page.tsx
git commit -m "fix(web): fix userProfile endpoint and projects query key in activity page"
```

---

## Task 3: Refactor `dashboard/page.tsx` (digest + queries)

Most complex change: replaces 3 inline queries + rewrites the digest from manual async state to `useQuery`.

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Update imports**

Add to existing imports:
```ts
import { userProfileQuery, projectsQuery, feedbacksQuery, digestPreviewQuery } from "@/lib/queries";
```

Remove `api` import only if it becomes unused — check: `api` is still used in `createMutation`, `deleteProjectMutation`, `handleSeedFeedbacks`. Keep `api` import.

- [ ] **Step 2: Replace the three inline queries**

Remove:
```ts
const { data: userProfile } = useQuery({
  queryKey: ["userProfile"],
  queryFn: async () => {
    const { data } = await api.get("/users/me");
    return data;
  },
});
```
Replace with:
```ts
const { data: userProfile } = useQuery(userProfileQuery);
```

Remove:
```ts
const { data: projects } = useQuery({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data } = await api.get("/projects");
    return data;
  },
});
```
Replace with:
```ts
const { data: projects } = useQuery(projectsQuery);
```

Remove:
```ts
const {
  data: allFeedbacks,
  isLoading,
  isError,
} = useQuery({
  queryKey: ["feedbacks"],
  queryFn: async () => {
    const { data } = await api.get("/feedback");
    return data;
  },
});
```
Replace with:
```ts
const {
  data: allFeedbacks,
  isLoading,
  isError,
} = useQuery(feedbacksQuery);
```

- [ ] **Step 3: Replace digest manual state with useQuery**

Remove these four state declarations:
```ts
const [digestData, setDigestData] = useState<any>(null);
const [digestLoading, setDigestLoading] = useState(false);
const [digestError, setDigestError] = useState<string | null>(null);
```

Remove the `handleOpenDigest` function entirely:
```ts
const handleOpenDigest = async () => {
  if (!activeProject?.id) return;
  setIsDigestOpen(true);
  setDigestData(null);
  setDigestError(null);
  setDigestLoading(true);
  try {
    const { data } = await api.get(`/digest/preview/${activeProject.id}`);
    setDigestData(data);
  } catch (e: any) {
    setDigestError(
      e?.response?.data?.message || "Не вдалося згенерувати digest",
    );
  } finally {
    setDigestLoading(false);
  }
};
```

Add in its place (after `isDigestOpen` state):
```ts
const {
  data: digestData,
  isLoading: digestLoading,
  error: digestErrorRaw,
} = useQuery({
  ...digestPreviewQuery(activeProject?.id ?? ""),
  enabled: isDigestOpen && !!activeProject?.id,
});

const digestError = digestErrorRaw
  ? ((digestErrorRaw as any)?.response?.data?.message ??
    "Не вдалося згенерувати digest")
  : null;
```

- [ ] **Step 4: Update the AI Digest button**

Find:
```tsx
onClick={handleOpenDigest}
```
Replace with:
```tsx
onClick={() => setIsDigestOpen(true)}
```

- [ ] **Step 5: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/page.tsx
git commit -m "refactor(web): replace inline queries and convert digest to useQuery in dashboard"
```

---

## Task 4: Refactor `archive/page.tsx`

**Files:**
- Modify: `apps/web/src/app/dashboard/archive/page.tsx`

- [ ] **Step 1: Update imports**

Add:
```ts
import { userProfileQuery, projectsQuery, feedbacksQuery } from "@/lib/queries";
```

- [ ] **Step 2: Replace userProfile query**

Remove:
```ts
const { data: userProfile } = useQuery({
  queryKey: ["userProfile"],
  queryFn: async () => {
    const { data } = await api.get("/users/me");
    return data;
  },
});
```
Replace with:
```ts
const { data: userProfile } = useQuery(userProfileQuery);
```

- [ ] **Step 3: Replace projects query**

Remove:
```ts
const { data: projects } = useQuery({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data } = await api.get("/projects");
    return data;
  },
});
```
Replace with:
```ts
const { data: projects } = useQuery(projectsQuery);
```

- [ ] **Step 4: Replace feedbacks query**

Remove:
```ts
const { data: allFeedbacks, isLoading } = useQuery({
  queryKey: ["feedbacks"],
  queryFn: async () => {
    const { data } = await api.get("/feedback");
    return data;
  },
});
```
Replace with:
```ts
const { data: allFeedbacks, isLoading } = useQuery(feedbacksQuery);
```

- [ ] **Step 5: Remove unused `api` import if no longer used**

Check: `api` is still used in `restoreMutation` and `deleteMutation`. Keep it.

- [ ] **Step 6: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/dashboard/archive/page.tsx
git commit -m "refactor(web): use queryOptions factories in archive page"
```

---

## Task 5: Refactor `embed/page.tsx`

**Files:**
- Modify: `apps/web/src/app/dashboard/embed/page.tsx`

- [ ] **Step 1: Update imports**

Add:
```ts
import { userProfileQuery, projectsQuery } from "@/lib/queries";
```

- [ ] **Step 2: Replace userProfile query**

Remove:
```ts
const { data: userProfile } = useQuery({
  queryKey: ["userProfile"],
  queryFn: async () => {
    const { data } = await api.get("/users/me");
    return data;
  },
});
```
Replace with:
```ts
const { data: userProfile } = useQuery(userProfileQuery);
```

- [ ] **Step 3: Replace projects query**

Remove:
```ts
const { data: projects } = useQuery({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data } = await api.get("/projects");
    return data;
  },
});
```
Replace with:
```ts
const { data: projects } = useQuery(projectsQuery);
```

- [ ] **Step 4: Remove unused `api` import**

`api` is no longer used in this file. Remove:
```ts
import { api } from "@/lib/api";
```

- [ ] **Step 5: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/embed/page.tsx
git commit -m "refactor(web): use queryOptions factories in embed page"
```

---

## Task 6: Refactor `settings/page.tsx`

**Files:**
- Modify: `apps/web/src/app/settings/page.tsx`

- [ ] **Step 1: Update imports**

Add:
```ts
import { userProfileQuery, projectsQuery } from "@/lib/queries";
```

- [ ] **Step 2: Replace projects query**

Remove:
```ts
const { data: projects } = useQuery({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data } = await api.get("/projects");
    return data;
  },
});
```
Replace with:
```ts
const { data: projects } = useQuery(projectsQuery);
```

- [ ] **Step 3: Replace userProfile query**

Remove:
```ts
const { data: userProfile, isLoading: profileLoading } = useQuery({
  queryKey: ["userProfile"],
  queryFn: async () => {
    const { data } = await api.get("/users/me");
    return data;
  },
});
```
Replace with:
```ts
const { data: userProfile, isLoading: profileLoading } = useQuery(userProfileQuery);
```

- [ ] **Step 4: Keep planUsage query inline**

The `/plans/usage` query is only used in this file — no factory needed. Leave it as-is:
```ts
const { data: usage, isLoading: usageLoading } = useQuery({
  queryKey: ["planUsage"],
  queryFn: async () => {
    const { data } = await api.get("/plans/usage");
    return data;
  },
});
```

- [ ] **Step 5: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/settings/page.tsx
git commit -m "refactor(web): use queryOptions factories in settings page"
```

---

## Task 7: Refactor `settings/team/page.tsx`

**Files:**
- Modify: `apps/web/src/app/settings/team/page.tsx`

- [ ] **Step 1: Update imports**

Add:
```ts
import { userProfileQuery, projectsQuery } from "@/lib/queries";
```

- [ ] **Step 2: Replace userProfile query**

Remove:
```ts
const { data: userProfile } = useQuery({
  queryKey: ["userProfile"],
  queryFn: async () => {
    const { data } = await api.get("/users/me");
    return data;
  },
});
```
Replace with:
```ts
const { data: userProfile } = useQuery(userProfileQuery);
```

- [ ] **Step 3: Replace projects query**

Remove:
```ts
const { data: projects } = useQuery({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data } = await api.get("/projects");
    return data;
  },
});
```
Replace with:
```ts
const { data: projects } = useQuery(projectsQuery);
```

- [ ] **Step 4: Keep teamMembers and teamInvitations queries inline**

These are specific to team management and not shared — leave them as-is.

- [ ] **Step 5: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/settings/team/page.tsx
git commit -m "refactor(web): use queryOptions factories in team settings page"
```

---

## Task 8: Refactor `hooks/useTeam.ts`

**Files:**
- Modify: `apps/web/src/hooks/useTeam.ts`

- [ ] **Step 1: Update imports**

Add:
```ts
import { userProfileQuery } from "@/lib/queries";
```

- [ ] **Step 2: Replace userProfile query**

Remove (lines 58–64):
```ts
const { data: userProfile } = useQuery({
  queryKey: ["userProfile"],
  queryFn: async () => {
    const { data } = await api.get("/users/me");
    return data;
  },
});
```
Replace with:
```ts
const { data: userProfile } = useQuery(userProfileQuery);
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 4: Final typecheck across full monorepo**

```bash
cd d:/Work/fullstack-app && pnpm typecheck
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useTeam.ts
git commit -m "refactor(web): use userProfileQuery factory in useTeam hook"
```

---

## Verification Checklist

After all tasks complete, manually verify in browser (`pnpm dev`):

- [ ] Dashboard loads — projects in sidebar, feedbacks in Kanban
- [ ] AI Digest button opens modal and loads data
- [ ] Archive page shows archived items for active project
- [ ] Activity page loads (was using wrong endpoint — confirm fix)
- [ ] Embed page shows correct API key for active project
- [ ] Settings page shows user profile + usage meters
- [ ] Team settings page shows members list
- [ ] DevTools Network: no duplicate requests for `GET /users/me` or `GET /projects` when navigating between pages (cache hit)
