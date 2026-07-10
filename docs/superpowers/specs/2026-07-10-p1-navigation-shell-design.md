# P1 — Navigation & shell consistency — Design

> Date: 2026-07-10
> Roadmap item: `docs/architecture/PLAN.md` P1 "Navigation & shell consistency"

## Problem

Five small shell-level inconsistencies, all verified in code before writing this doc:

1. **Wrong-affordance back button.** `PageHeader` (`apps/web/src/components/dashboard/PageHeader.tsx`)
   renders a "←" back button unconditionally. It is used on exactly four pages: Analytics,
   Activity, Settings (all reached directly from the sidebar — top-level destinations, nothing to
   "go back" from) and Devtools (reached only via a hidden `Ctrl+Shift+D` shortcut in
   `DevtoolsShortcut.tsx`, not from any nav — a genuine drill-in). Showing "←" on the first three
   implies a hierarchy that doesn't exist.
2. **Inconsistent page width.** `DashboardShell` wraps children in `.brand-page-container`
   (`max-w-6xl`, defined in `globals.css`) by default. Analytics, Activity, Settings, Devtools all
   get this. The Feedback page (`apps/web/src/app/dashboard/page.tsx`) bypasses `DashboardShell`
   entirely and renders full-width.
3. **Avatar/Sign Out overlap risk.** The Sidebar footer's user row (`Link` wrapping avatar + email
   + badges) uses `p-1.5 -m-1.5` (a standard "expand the hover hit-area without shifting layout"
   trick — negative margin cancels the padding) combined with `mb-4` *on the same element*. Both
   utilities target `margin-bottom`; whichever Tailwind emits later in the stylesheet wins,
   independent of the order the classes are written in JSX. This is fragile: the intended 16px gap
   before the Sign Out button can silently collapse to the `-6px` from `-m-1.5`, pulling the button
   up over the badge row.
4. **Duplicate Upgrade CTA.** `TrialBanner` (rendered globally in `dashboard/layout.tsx`, above
   every page) shows "Upgrade now →" whenever `planStatus === "trialing"`. Independently, the
   Sidebar footer shows a static "Upgrade" label whenever `!isPaidPlan(plan)` — which is also true
   while trialing. A trialing user sees both at once.
5. **Arbitrary radius scale.** No radius tokens exist (`globals.css` only defines color variables
   under `@theme inline`); every component uses a raw Tailwind class. Controls (`Button`, `Input`)
   use `rounded-xl` (12px) and cards (`Section`) use `rounded-2xl` (16px) — both one step above
   where the plan's target scale (8/12/16) puts them.

## Goal

Make the shell read as one deliberate system: back button only where a hierarchy genuinely
exists, one container width (with a documented, load-bearing exception), no overlapping controls,
one Upgrade CTA visible at a time, and a three-tier radius scale (8px controls / 12px cards / 16px
modals) applied at the shared primitives so every consumer inherits it for free.

## Design

### 1. Back button gating

Add `showBackButton?: boolean` to `PageHeaderProps`, default `false`. The back button block
(button + `ArrowLeft`) only renders when `showBackButton` is `true`. `onBack` stays as the
override for *where* it navigates when shown.

- Analytics, Activity, Settings: omit the prop (get the new default of no back button) — no
  code change needed beyond the default flip itself.
- Devtools: pass `showBackButton` (navigates back to `/dashboard`, its implicit "home") — it's
  the one page in the set actually reached by drilling in from outside the sidebar.

### 2. Page width — Feedback page exception, documented not fixed

`apps/web/src/components/dashboard/KanbanBoard.tsx` renders 5 fixed-identity columns
(`KanbanColumn.tsx`: `min-w-[280px] sm:min-w-[300px]`). Five columns at that floor alone need
~1400-1500px before any gaps, which exceeds `max-w-6xl` (1152px). Forcing the Feedback page into
`.brand-page-container` would visibly cramp the one view that's the reason the page has a
custom layout in the first place (confirmed via `git log` — the page was deliberately "stripped to
Feedback-only" and given a Feed/Kanban toggle in earlier commits).

Decision: **keep full-width, add a code comment recording why**, so a future reader doesn't
mistake this for the same bug as the others. No other page needs a width change — Analytics,
Activity, Settings, Devtools already inherit `.brand-page-container` via `DashboardShell`.

### 3. Avatar / Sign Out spacing

Move the footer's vertical spacing off the negative-margin element and onto its parent:

```
<div className="... mt-auto flex flex-col gap-4">
  <Link className="flex items-center gap-3 group cursor-pointer rounded-lg p-1.5 -m-1.5 ...">
```

(`mb-4` removed from the `Link`, `flex flex-col gap-4` added to the footer wrapper.) `gap` is
applied by the parent to the space *between* children and isn't part of either child's own margin
box, so it can't collide with the child's own `-m-1.5` hit-area trick — this removes the class
conflict rather than just reordering around it.

### 4. Single Upgrade CTA

Keep `TrialBanner` as the CTA during an active trial (it carries real information — days left —
that the sidebar label doesn't). Gate the Sidebar's static label to the complementary case:

```
{!isPaidPlan(plan) && planStatus?.planStatus !== "trialing" && <span>Upgrade</span>}
```

Net effect: exactly one Upgrade surface visible at any given plan state (trialing → banner only;
free/past-trial → sidebar label only; paid → neither).

### 5. Radius scale

Apply the plan's 8/12/16 scale at the primitive level so every consumer inherits it:

| Bucket | Tailwind class | px | Where |
|---|---|---|---|
| Controls | `rounded-lg` | 8 | `Button`, `Input`, `PageHeader` back button, Sidebar nav links/dropdown triggers/modal buttons, tiny plan/role/upgrade badges |
| Cards | `rounded-xl` | 12 | `Section` (and its glow overlay), page-level empty-state/error panels in `analytics/page.tsx` and `dashboard/page.tsx` |
| Modals | `rounded-2xl` | 16 | `Modal`, Sidebar's delete-project confirmation dialog (already correct) |

Out of scope (left as-is, by design, not oversight):
- Avatar circle and the "new" count pill stay `rounded-full` — circles/pills are a distinct shape
  category, not part of the lg/xl/2xl "arbitrary" mixing the plan complains about.
- Nested control-group radii (e.g. Settings tab bar / appearance-mode segmented control: outer
  `rounded-xl` container around inner `rounded-lg` buttons) — outer-slightly-larger-than-inner is
  a standard nested-radius pattern, not the bug being fixed, and untouched here to avoid scope
  creep into `settings/page.tsx` internals unrelated to the shell.
- `badge.tsx`, `lib/colors.ts`, `FeedbackFeedItem.tsx` — explicitly out of scope; a parallel agent
  is mid-edit on those files for the P1 "Feed hierarchy & typography" item.

This is a pure Tailwind-class change; the CSS-variable color theming (teal/blue × light/dark) is
untouched, so no new light/dark or accent-theme interaction is introduced.

## Testing / Verification

- `pnpm --filter web typecheck`
- `pnpm --filter web lint`
- Manual/visual reasoning: radius and spacing changes are class-only (no color/theme tokens
  touched), so behavior is identical across teal/blue × light/dark. Back-button and Upgrade-CTA
  gating are conditional-render changes verified by reading each call site's props/data, not by
  booting a browser session in this pass.

## Non-Goals

- No new radius CSS variables/tokens — the scale is expressed directly as Tailwind classes
  (`rounded-lg/xl/2xl`), consistent with how this codebase already expresses spacing today.
- No change to `apps/api`, `apps/widget`, `apps/landing`, `apps/e2e`, or `packages/*`.
- No touch to `PlanLimitBanner` (the near-limit warning on the Feedback page) — it's a distinct,
  contextual warning (usage %, dismissible, scoped to one page), not part of the "Upgrade appears
  twice" duplication the plan calls out (that's specifically TrialBanner × Sidebar footer).
