# P1 — Feed Hierarchy & Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the feed hierarchy/typography defects called out in `docs/architecture/PLAN.md`'s
"P1 — Feed hierarchy & typography" item: feedback content buried below its own metadata,
category shown twice, sentiment as a context-free percentage, sub-12px body text, and a
red/error-styled "new" counter pill.

**Architecture:** No new components. `FeedbackFeedItem.tsx`'s collapsed row JSX is reordered
(content first, one meta line below) and its duplicate category paragraph removed. The shared
`sentiment-bar.tsx` gets a word label (`Positive`/`Neutral`/`Negative`, colored via the existing
`--status-*` tokens) in place of a bare percentage — `KanbanCard.tsx` and `DigestModal.tsx`
inherit this for free since they consume the same component with default props. Text sizes
below 12px that render read content/metadata (not genuine uppercase/tracked eyebrow labels)
move from `text-[10px]`/`text-[11px]` to `text-xs`.

**Tech Stack:** Next.js 16 / React 19, TailwindCSS 4 (CSS-variable theming, `--brand-fg-muted` /
`--status-success/warning/danger/info` from the already-merged P0 pass).

**Design doc:** `docs/superpowers/specs/2026-07-10-p1-feed-hierarchy-design.md`

---

### Task 1: Sentiment word label in `sentiment-bar.tsx`

**Files:**
- Modify: `apps/web/src/components/ui/sentiment-bar.tsx`

- [x] **Step 1: Replace the percentage label with a word label**

Non-null branch: derive `isPositive = score > 0.6`, `isNegative = score < 0.4` (same
thresholds already used for the bar's `colorClass`), then render `label = isPositive ?
"Positive" : isNegative ? "Negative" : "Neutral"` colored via `text-status-success` /
`text-status-danger` / `text-status-warning` instead of the flat `text-brand-fg-muted`
percentage text. Null branch ("Analyzing…") unchanged in behavior; both branches' label text
bumped from `text-[10px]` to `text-xs` (typography floor, Task 3).

- [x] **Step 2: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/sentiment-bar.tsx
git commit -m "feat(web): show sentiment as a word + bar instead of a bare percentage"
```

---

### Task 2: Reorder `FeedbackFeedItem.tsx` — content before metadata, drop duplicate category

**Files:**
- Modify: `apps/web/src/components/dashboard/FeedbackFeedItem.tsx`

- [x] **Step 1: Move the feedback content paragraph above the meta line**

Swap the order inside the row's `flex-1 min-w-0` column: the `<p>` rendering
`feedback.content` (with `line-clamp-2` while collapsed) now comes first; the meta row
(source pill, category `Badge`, `SentimentBar`, timestamp) follows with `mt-1.5` instead of
preceding it with `mb-1.5`.

- [x] **Step 2: Delete the duplicate category paragraph, fold "AI analyzed" into the meta line**

Remove the `!isExpanded && feedback.category` paragraph (`• {category} · AI analyzed`) — the
`Badge` in the meta line is already the single source of truth for category. Preserve the one
non-duplicate signal it carried, `AI analyzed`, as a small `Sparkles` + text chip inside the
meta line, still gated on `!isExpanded` (matches prior collapsed-only behavior; the expanded
view already shows the full AI summary block, so showing the chip there too would be
redundant).

- [x] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/FeedbackFeedItem.tsx
git commit -m "fix(web): make feedback content visually primary in the feed row"
```

---

### Task 3: Raise the typography floor to 12px in `FeedbackFeedItem.tsx`

**Files:**
- Modify: `apps/web/src/components/dashboard/FeedbackFeedItem.tsx`

- [x] **Step 1: Bump metadata text sizes**

`text-[10px]` (source pill) and `text-[11px]` (timestamp, comment timestamp) → `text-xs`
(12px). `Badge`'s own `size="sm"` (9px, `uppercase tracking-wider`) is left untouched — it's
the genuinely-uppercase-tracked-micro-label case the rule exempts, and `Badge` is a shared
primitive used well beyond this file (its own font-scale is the separate, already-tracked
Component-library-consolidation backlog item, not this one).

- [x] **Step 2: Typecheck + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: no errors; any warnings must be in files this plan did not touch (verify via
`git diff --name-only`).

- [x] **Step 3: Commit**

Folded into Task 2's commit (same file, same logical change set — see Self-Review Notes).

---

### Task 4: Investigate the "new" counter (red pill, "stuck at 42")

**Files:** none (read-only investigation; `Sidebar.tsx` is out of scope for this plan — see
design doc's Scope section)

- [x] **Step 1: Search for a hardcoded `42`**

Run: `grep -rn "42" apps/web/src` — the only hits are Storybook mock data
(`DigestModal.stories.tsx`, `FilterBar.stories.tsx`), not live code paths.

- [x] **Step 2: Find the actual red-pill counter and its data source**

`Sidebar.tsx:260-264` renders `bg-red-500/15 text-red-400 border-red-500/20` around
`newCount`, computed at `Sidebar.tsx:73-75` as
`feedbacks.filter(f => f.status === FeedbackStatus.NEW).length` — a live, correct count of
feedback whose workflow status is still `"New"`.

- [x] **Step 3: Determine why it reads as "stuck"**

It's a different "new" than the feed's own `isNew`/"Mark all read" (session-based,
`createdAt > lastSeen`). "Mark all read" only writes `lastSeen` — it never changes any
feedback's `status` — so the sidebar count cannot decrease from that action. A team that isn't
actively triaging (moving items out of the `New` status) will see the number sit flat
indefinitely, which reads as "stuck" even though the underlying query is live. Full writeup:
design doc's "Investigation" section.

- [x] **Step 4: Flag, don't fix**

`Sidebar.tsx` is owned by the parallel P1 "Navigation & shell consistency" pass running at the
same time as this one (per this task's own constraints) — the color fix (red → brand accent)
and the semantic-mismatch bug are both flagged in the final report and the design doc rather
than patched here.

---

### Task 5: Full verification

**Files:** none (verification only)

- [x] **Step 1: Web typecheck and lint**

Run: `pnpm --filter web typecheck` then `pnpm --filter web lint`.
Expected: both clean, or only pre-existing warnings in files this plan didn't touch.

- [x] **Step 2: Visual/theme sanity check**

`apps/web` has no test infrastructure (PLAN.md Analysis Backlog #2), so this step is a
reasoning check against `apps/web/src/app/globals.css`'s token values rather than a live
screenshot diff: confirm `--status-success/warning/danger` and `--brand-fg-muted` each resolve
to a readable, distinct color against `--brand-surface`/`--brand-bg` in both the `light` and
`dark` (and `blue`-accent) blocks, so the new sentiment word labels and bumped metadata text
stay legible in every theme this app ships.

- [x] **Step 3: Report results**

State explicitly which commands were run and their pass/fail output — do not report "done"
without this evidence, per the project's Verification Mandate. Report the Task 4 finding
explicitly rather than letting it disappear into "done."

---

## Self-Review Notes

- **Spec coverage:** row reorder + duplicate-category removal (Task 2), sentiment word label
  (Task 1), typography floor (Task 3), new-counter investigation (Task 4), verification
  (Task 5) — every design-doc section maps to a task.
- **Commit grouping:** Task 3's typography bump lives in the same file and the same logical
  "row is now readable" change as Task 2, so it is committed together with Task 2 rather than
  as a third near-empty commit — the actual commit history for this plan is 2 commits
  (sentiment-bar, FeedbackFeedItem), not 3.
- **No `Sidebar.tsx`/`PageHeader.tsx`/dashboard-page edits** anywhere in this plan — verified
  against `git diff --name-only` before every commit, per this task's explicit scope
  constraint (parallel agent working the nav/shell pass on those files concurrently).
