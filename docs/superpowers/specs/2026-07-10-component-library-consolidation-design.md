# Component Library Consolidation — Design

> Date: 2026-07-10
> Roadmap item: `PLAN.md` 🎨 UI/UX Roadmap, P1 — Component library consolidation (#16)

## Problem

`apps/web/src/components/ui/` is not yet a real internal component library — it's a folder with some shared primitives (`Badge`, `Button`, `Modal`, `Dropdown`, `Select`, `StatusTabs`, etc.) alongside 11 confirmed duplication patterns identified in a 2026-07-03 design-review audit and re-verified today (all 11 still accurate; none were resolved by the 2026-07-10 color/contrast/nav passes). Concretely: status colors/lists defined in 4 separate places, 4 independent popover-ish implementations, 5 tab-ish patterns, 4 rolled-own overlay/backdrop implementations, native `confirm()` used in 3 places next to an installed toast system, and 18 hand-rolled uppercase-label instances across 11 files.

## Verified target list (11)

| # | Target | Files touched (current paths) |
|---|---|---|
| 1 | `WidgetConfigForm` + `buildWidgetSnippet()` | `components/dashboard/WidgetGeneratorModal.tsx`, `components/settings/EmbedTab.tsx` |
| 2 | `ConfirmDialog` (on `Modal`) | `components/settings/TeamTab.tsx`, `components/dashboard/KanbanBoard.tsx`, `KanbanCard.tsx`, `components/dashboard/Sidebar.tsx` (delete-project modal) |
| 3 | `CommentThread` (uses `useComments`) | `components/dashboard/CommentsPanel.tsx`, `components/dashboard/FeedbackFeedItem.tsx` |
| 4 | `StatusSelect` + single `STATUS_CONFIG` | `components/ui/badge.tsx`, `lib/colors.ts`, `FeedbackFeedItem.tsx`, `KanbanCard.tsx` |
| 5 | `Popover` primitive | `components/ui/dropdown.tsx`, `select.tsx`, `FilterChips.tsx`, `FeedbackFeedItem.tsx` |
| 6 | `Tabs`/`SegmentedControl`/`ChoiceCard` | `components/ui/StatusTabs.tsx`, `app/dashboard/settings/page.tsx`, `components/settings/EmbedTab.tsx` |
| 7 | `Drawer` + `Overlay` | `components/dashboard/CommentsPanel.tsx`, `Sidebar.tsx`, `components/ui/modal.tsx` |
| 8 | `FormField` | `CreateProjectModal.tsx`, `CreateTeamModal.tsx`, `CreateTeamProjectModal.tsx`, `app/auth/forgot-password/page.tsx`, `reset-password/page.tsx`, `app/page.tsx` |
| 9 | `Button size="xs"` | `FeedbackFeed.tsx`, `FeedbackFeedItem.tsx`, `KanbanCard.tsx`, `components/ui/button.tsx` |
| 10 | `Eyebrow`/`MicroLabel` | 11 files (up from 10 in the original audit): `PricingCards.tsx`, `AITrendsBar.tsx`, `labeled-section.tsx`, `usage-meter.tsx`, `badge.tsx`, `DigestModal.tsx`, `KanbanBoard.tsx`, `KanbanCard.tsx`, `FilterBar.tsx`, `EmbedTab.tsx`, `Sidebar.tsx` |
| 11 | `NavItem` | `Sidebar.tsx` (4 nav `Link` blocks) |

## File-overlap finding

A pairwise file-overlap map shows 10 of the 11 targets are transitively connected through 5 hub files (`Sidebar.tsx`, `KanbanCard.tsx`, `FeedbackFeedItem.tsx`, `EmbedTab.tsx`, `badge.tsx`) — a naive "one isolated worktree agent per numbered target" split is not possible; agents would collide on these files. Only target #8 (`FormField`) has zero overlap with anything else.

## Approach: two-phase parallel dispatch

**Phase 1 — Primitives (new files only, zero conflicts, one agent, no isolation needed).**
Build all new `components/ui/` primitives and the `STATUS_CONFIG` consolidation as pure new code with no changes yet to existing consumers:

- `ConfirmDialog` — built on `Modal`. Props: `open`, `title`, `message`, `confirmLabel`, `danger?`, `onConfirm`, `onCancel`.
- `CommentThread` — wraps existing `useComments` hook + list/input UI. Props: `feedbackId`.
- `StatusSelect` — props `value`, `onChange`, `size?`; reads from one new `STATUS_CONFIG` (in `lib/`) that replaces the 4 existing copies.
- `Popover` — headless: click-outside close, anchor positioning, `AnimatePresence`. Props: `trigger`, `children`, `align?`. **Also refactors `components/ui/dropdown.tsx`, `select.tsx`, and `FilterChips.tsx` (`DropdownChip`) onto it in this same phase** — these are `ui/`-internal library files, not owned by any Phase 2 cluster, and their public props stay unchanged so no Phase 2 consumer needs to adjust.
- `Tabs` / `SegmentedControl` / `ChoiceCard` — three small related primitives (underline tabs, segmented button group, selectable card). **Also refactors `components/ui/StatusTabs.tsx` onto the new `Tabs` primitive internally**, keeping `StatusTabs`'s existing public props stable — the Feed cluster (Phase 2) consumes `StatusTabs` as-is and needs zero changes for this.
- `Drawer` + `Overlay` — `Overlay` is the shared backdrop; `Drawer` is a slide-in panel built on it; `Modal` gets refactored onto the same `Overlay`.
- `FormField` — props `label`, `required?`, `icon?`, `children`.
- `Button` `size="xs"` — new variant on the existing `button.tsx`.
- `Eyebrow` / `MicroLabel` — standalone uppercase-tracked label component. **Also refactors `components/ui/labeled-section.tsx` and `usage-meter.tsx` onto it internally** (both are `ui/`-internal files with their own ad-hoc uppercase-label markup); public props of both stay stable.
- `NavItem` — props `href`, `icon`, `label`, `active?`.
- `WidgetConfigForm` + `buildWidgetSnippet()` — shared form (COLORS/SHAPES/POSITIONS/FRAMEWORKS consts) + pure snippet-builder util.
- **`STATUS_CONFIG` consolidation** (`components/ui/badge.tsx`, `lib/colors.ts`) also lands in this phase, since Phase 2's Feed and Kanban clusters both consume it via `StatusSelect` — treating it as a Phase 1 shared-data dependency avoids those two agents building against the stale 4-copies state.

Every primitive gets a `.stories.tsx`. Merge and verify (`tsc --noEmit`, `eslint`, Storybook renders) before starting Phase 2.

**File-ownership rule (resolves all ambiguity about who touches what):** Phase 1 owns every file under `components/ui/` exclusively — both brand-new primitives and existing ones being refactored internally (`dropdown.tsx`, `select.tsx`, `FilterChips.tsx`, `StatusTabs.tsx`, `modal.tsx`, `badge.tsx`, `button.tsx`). Phase 2 clusters own only consumer call-site files outside `components/ui/`. No Phase 2 cluster edits a `ui/` file; they only import and use its stable public API.

**Phase 2 — Consumer clusters (parallel isolated worktree agents, one per cluster).**
Each cluster owns its files exclusively; no two clusters share a file, so all can run in parallel and merge independently as each finishes.

| Cluster | Owns | Rewires to use |
|---|---|---|
| Sidebar | `Sidebar.tsx` | `ConfirmDialog`, `Drawer`+`Overlay`, `NavItem`, `Eyebrow` |
| Kanban | `KanbanBoard.tsx`, `KanbanCard.tsx` | `ConfirmDialog`, `StatusSelect`, `Button size="xs"`, `Eyebrow` |
| Feed | `FeedbackFeedItem.tsx`, `FeedbackFeed.tsx` | `CommentThread`, `StatusSelect`+`Popover`, `Button size="xs"` |
| Comments | `CommentsPanel.tsx` | `CommentThread`, `Drawer` |
| Embed/Widget | `EmbedTab.tsx`, `WidgetGeneratorModal.tsx` | `WidgetConfigForm`+`buildWidgetSnippet()`, `Tabs`, `Eyebrow` |
| Settings shell | `app/dashboard/settings/page.tsx`, `components/settings/TeamTab.tsx` | `SegmentedControl`/`ChoiceCard`, `Tabs`, `Eyebrow`, `ConfirmDialog` (TeamTab's `confirm()`) |
| Forms | `CreateProjectModal.tsx`, `CreateTeamModal.tsx`, `CreateTeamProjectModal.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `app/page.tsx` | `FormField` |
| Eyebrow sweep | `components/billing/PricingCards.tsx`, `components/dashboard/AITrendsBar.tsx`, `components/dashboard/DigestModal.tsx`, `components/dashboard/FilterBar.tsx` | `Eyebrow` only — these 4 files have no other target touching them |

8 Phase 2 clusters (Status config moved to Phase 1 per the sequencing decision above; `TeamTab.tsx` folded into Settings shell since it's only ever rendered from `settings/page.tsx`; the 4 Eyebrow-only files with no other cluster claim get their own low-risk sweep).

## Verification per agent

- `pnpm --filter web exec tsc --noEmit` and `pnpm --filter web exec eslint <owned files>` for every agent, Phase 1 and each Phase 2 cluster.
- Manual browser check of the touched screen(s) before reporting a cluster done — `apps/web` has no unit tests today (tracked separately in the 🔍 Analysis Backlog; not introduced as a side effect of this pass).
- Worktree isolation verified before treating any agent's result as isolated: `git worktree list` + `git log` on the base branch, per the rule added to `CLAUDE.md` after the P0 isolation miss.

## Discipline rules (carried over from `PLAN.md`, enforced not re-litigated)

- Every `ui/` primitive ships a `.stories.tsx`.
- No raw Tailwind status-color classes (`text-amber-300` etc.) left in consumer files after their cluster lands.
- Native `confirm()` / browser `alert()` fully replaced in touched files, not left running alongside the new components.
- A component may live outside `ui/` only if used by exactly one page.

## Explicitly out of scope

- Extracting `packages/ui` as a shared workspace package — existing 🟡 `PLAN.md` trigger (a second React consumer) not met.
- Adding a general unit-test harness for `apps/web` — separate 🔍 Analysis Backlog item.
- Any file not listed in the Phase 1 primitive list or the 8 Phase 2 clusters above.

## Rollout

1. Phase 1 lands and merges (single agent or done directly), fully verified.
2. Dispatch 8 Phase 2 agents in parallel, each in its own isolated worktree.
3. Each cluster merges independently as it finishes — no need to wait on siblings.
4. `PLAN.md` #16 marked done with a changelog entry covering all 8 clusters, same level of detail as the P0/P1 entries.
