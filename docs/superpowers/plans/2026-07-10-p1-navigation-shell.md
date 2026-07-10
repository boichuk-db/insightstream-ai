# P1 — Navigation & Shell Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five verified shell/navigation inconsistencies in `apps/web`'s dashboard: a
back button shown on pages that aren't drill-downs, an inconsistent page container width, an
avatar/Sign Out spacing bug, a duplicated Upgrade CTA, and an arbitrary radius scale — without
touching color/theme tokens or any file outside `apps/web`.

**Architecture:** Pure `apps/web` component/class changes. No new components, no new CSS
variables, no API/DB/shared-types surface. Fixes land at shared primitives (`PageHeader`,
`Button`, `Input`, `Section`, `Sidebar`) so every consumer inherits them.

**Tech Stack:** Next.js 16 App Router, React 19, TailwindCSS 4 (utility classes only — no
`tailwind.config`, this repo drives Tailwind v4 via `@theme inline` in `globals.css`).

**Spec:** `docs/superpowers/specs/2026-07-10-p1-navigation-shell-design.md`

---

### Task 1: Back button — show only on genuine drill-down pages

**Files:**
- Modify: `apps/web/src/components/dashboard/PageHeader.tsx`
- Modify: `apps/web/src/app/dashboard/devtools/page.tsx`

- [x] **Step 1:** Add `showBackButton?: boolean` (default `false`) to `PageHeaderProps`; only
  render the back button block when true.
- [x] **Step 2:** Pass `showBackButton` on the Devtools page only (reached via hidden
  `Ctrl+Shift+D` shortcut, not sidebar nav — the one real drill-in among the four `PageHeader`
  consumers). Analytics/Activity/Settings need no edit — they simply stop passing `onBack`/get the
  new default.
- [x] **Step 3: Verify** — `grep -rn "PageHeader" apps/web/src/app` lists exactly 4 usages;
  confirm only `devtools/page.tsx` passes `showBackButton`.
- [x] **Step 4: Commit** (`fix(web): back button only on genuine drill-down pages`).

### Task 2: Page width — document the Feedback page exception

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx` (comment only)

- [x] **Step 1:** Confirm no other `PageHeader`/`DashboardShell` consumer needs a width change
  (they all already inherit `.brand-page-container` via `DashboardShell`).
- [x] **Step 2:** Add a code comment above the Feedback page's full-width container explaining
  the 5-column Kanban min-width math, so the exception reads as intentional, not a leftover bug.
- [x] **Step 3: Commit** (`docs(web): document Feedback page's full-width as intentional`).

### Task 3: Avatar / Sign Out spacing

**Files:**
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`

- [x] **Step 1:** Move the footer's bottom spacing from `mb-4` on the avatar `Link` (which
  conflicts with that same element's `-m-1.5` hover-hitbox trick) to `gap-4` on the parent
  `flex flex-col` footer wrapper.
- [x] **Step 2: Verify** — re-read the diff; confirm `Link` no longer carries `mb-4` and the
  parent footer `div` carries `flex flex-col gap-4`.
- [x] **Step 3: Commit** (`fix(web): stop sidebar footer margin collision that overlapped avatar and Sign Out`).

### Task 4: Single Upgrade CTA

**Files:**
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`

- [x] **Step 1:** Gate the Sidebar's static "Upgrade" label with
  `planStatus?.planStatus !== "trialing"` in addition to the existing `!isPaidPlan(...)` check, so
  it doesn't show at the same time as `TrialBanner`.
- [x] **Step 2: Verify** — read `PlanStatus` type (`apps/web/src/lib/queries.ts`) to confirm
  `planStatus.planStatus` is the correct field/string literal (`"trialing"`).
- [x] **Step 3: Commit** (`fix(web): remove duplicate Upgrade CTA when trial banner is showing`).

### Task 5: Radius scale — 8px controls / 12px cards / 16px modals

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/components/ui/input.tsx`
- Modify: `apps/web/src/components/ui/section.tsx`
- Modify: `apps/web/src/components/dashboard/PageHeader.tsx`
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`
- Modify: `apps/web/src/app/dashboard/analytics/page.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- (No change needed: `apps/web/src/components/ui/modal.tsx` already `rounded-2xl`;
  `apps/web/src/components/ui/dropdown.tsx`'s `DropdownItem` already `rounded-lg`, its panel
  already `rounded-xl`.)

- [x] **Step 1:** `Button`, `Input`: `rounded-xl` → `rounded-lg` (controls, 8px).
- [x] **Step 2:** `Section` (card primitive, both the outer `Tag` and its glow-overlay div):
  `rounded-2xl` → `rounded-xl` (cards, 12px).
- [x] **Step 3:** `PageHeader` back button: `rounded-xl` → `rounded-lg`.
- [x] **Step 4:** `Sidebar`: team/project dropdown triggers, nav links, avatar row link, delete-
  modal Cancel/Delete buttons: `rounded-xl` → `rounded-lg`; plan/role/upgrade tiny badges: bare
  `rounded` → `rounded-lg`. Delete-modal panel itself stays `rounded-2xl` (it's a modal). Drive-by:
  drop the dead `rx-3` class found adjacent to the project-switcher trigger's radius class.
- [x] **Step 5:** `analytics/page.tsx` empty-state panel, `dashboard/page.tsx` error panel:
  `rounded-2xl` → `rounded-xl` (they're cards, matching `Section`).
- [x] **Step 6: Verify** — `grep -rn "rounded-2xl" apps/web/src/components/ui/section.tsx
  apps/web/src/components/ui/button.tsx apps/web/src/components/ui/input.tsx` returns nothing;
  spot-check `Modal`/`Dropdown` untouched.
- [x] **Step 7: Commit** (`fix(web): apply 8/12/16 radius scale to shell controls, cards, modals`).

### Task 6: Verification

- [x] Run `pnpm --filter web typecheck` — must be clean.
- [x] Run `pnpm --filter web lint` — must be clean or only pre-existing/unrelated warnings
  (cross-check with `git diff` that any warning-producing file wasn't touched this pass).

---

## Post-Plan Manual Steps (not part of this plan's automated work)

1. A human should eyeball the dashboard in a running dev server across light/dark ×
   teal/blue — this pass verifies via static reasoning about the classes changed (no color
   tokens touched, so no theme-specific risk), not a live browser session.

---

## Self-Review Notes

- **Spec coverage:** all 5 problems in the design doc have a corresponding task above.
- **Scope:** no edits outside `apps/web`; no edits to `badge.tsx`, `lib/colors.ts`,
  `FeedbackFeedItem.tsx` (parallel agent's files for the sibling P1 typography item).
- **Feedback page width:** kept full-width deliberately (Task 2) — documented, not "fixed" by
  forcing consistency that would break the 5-column Kanban view.
