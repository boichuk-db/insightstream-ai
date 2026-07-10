# P1 — Feed Hierarchy & Typography — Design

> Date: 2026-07-10
> Status: Implemented
> Source: `docs/architecture/PLAN.md` → 🔥 Implement Soon → "P1 — Feed hierarchy & typography"

## Problem

In `FeedbackFeedItem.tsx` the collapsed feed row rendered secondary metadata (source pill,
category badge, sentiment percentage, timestamp) in a line *above* the feedback content,
so the actual user message — the one piece of information the feed exists to show — was
visually subordinate to its own metadata. On top of that:

- The category was shown twice: once as a `Badge`, once again as a `• Category [· AI
  analyzed]` text line directly under the (collapsed) content.
- Sentiment rendered as a bare `72%` with no context — a reader has to know the scoring
  convention to tell whether 72% is good or bad.
- Most metadata text sat at 9–11px (`text-[9px]`/`text-[10px]`/`text-[11px]`), which — combined
  with the P0 contrast fixes already merged (`--brand-fg-muted`, `--status-*` tokens) — still
  reads as too small for content users are expected to actually read (as opposed to genuine
  uppercase/tracked eyebrow labels, which are a different, intentionally-small category).
- The sidebar's "new feedback" counter (`Sidebar.tsx`) is a `bg-red-500/15 text-red-400` pill,
  which visually reads as an error/alarm state for what is just an informational count.

## Scope

`apps/web` only, and narrowly: `FeedbackFeedItem.tsx` (the feed row) and `sentiment-bar.tsx`
(the shared sentiment indicator it and `KanbanCard`/`DigestModal` all use). Explicitly **not**
in scope: `Sidebar.tsx`, `PageHeader.tsx`, or any dashboard shell/page file — those are owned
by a parallel P1 "Navigation & shell consistency" pass running at the same time, and the
sidebar counter finding below is a report-only flag for that work, not a change made here.

## Changes

### 1. Row reorder — content first, meta line below

`FeedbackFeedItem.tsx`'s collapsed row previously rendered, top to bottom: meta line (source /
category badge / sentiment / timestamp), then content (`line-clamp-2` when collapsed), then
the duplicate category text line. Reordered to: content first, single meta line below it.
The meta line keeps: source pill, category `Badge`, `SentimentBar`, an "AI analyzed" chip
(collapsed-only, replacing the old duplicate line's role), and the timestamp pushed right via
`ml-auto`. No new components — pure JSX reorder in the existing `flex-1 min-w-0` column.

### 2. Drop the duplicate category line

The `Badge variant="category"` in the meta line is the single source of truth for category;
the old `!isExpanded && feedback.category` paragraph (`• {category} · AI analyzed`) is
deleted. Its one non-duplicate bit of information — "AI analyzed" — is preserved as a small
`Sparkles` + text chip in the meta line, still gated to the collapsed state only (the expanded
view already shows the full AI summary block, so showing the chip there too would itself be
redundant).

### 3. Sentiment as word + bar, not a bare percentage

`sentiment-bar.tsx`'s non-null branch changes its label from `{Math.round(score * 100)}%` to
one of `"Positive" | "Neutral" | "Negative"`, using the same `> 0.6` / `< 0.4` thresholds
already used to color the bar itself (`--status-success` / `--status-warning` /
`--status-danger`), so the label text now also carries that color instead of the flat
`text-brand-fg-muted` it had before. The null-state ("Analyzing…", from the P0 work) is
unchanged in behavior, only bumped from `text-[10px]` to `text-xs` for the typography rule
below. `KanbanCard.tsx` and `DigestModal.tsx` both consume `SentimentBar` with default props
and get the new word label for free — no call-site changes needed.

### 4. Typography floor: 12px, 11px reserved for eyebrow labels

Within `FeedbackFeedItem.tsx`, every `text-[10px]`/`text-[11px]` that renders metadata a user
reads (source pill, timestamp, sentiment label, comment timestamp) moves to `text-xs` (12px).
`Badge`'s own `size="sm"` text (9px, `uppercase tracking-wider`) is deliberately left alone —
that's exactly the "genuinely uppercase/tracked micro-label" case the rule exempts, and
`Badge` is a shared primitive used well beyond the feed (changing its scale is the separate,
already-tracked "Component library consolidation" / `Eyebrow`/`MicroLabel` backlog item, not
this one).

### 5. "New" counter: red pill → brand accent (flagged, not fixed here)

The literal red/error-styled "new" counter is `Sidebar.tsx:260-264`
(`bg-red-500/15 text-red-400 border-red-500/20`, showing `newCount`). It is out of this task's
file scope (see Scope above). See **Investigation** below for what it actually does and why it
can look "stuck."

## Investigation: the "stuck at 42" counter

No literal hardcoded `42` exists in any live code path — `42` only appears as Storybook mock
data (`DigestModal.stories.tsx`, `FilterBar.stories.tsx`), which doesn't touch runtime state.
`Sidebar.tsx`'s `newCount` is a real, live computation:

```ts
const newCount = (feedbacks as IFeedback[]).filter(
  (f) => f.status === FeedbackStatus.NEW,
).length;
```

This counts feedback whose **workflow status** is literally `"New"` (never yet moved to
In Review/In Progress/Done/Rejected by a human) — it is not the same "new" as the feed's own
per-row indicator (`isNew` in `FeedbackFeed.tsx`, computed from `createdAt > lastSeen`) or the
"Mark all read" action, which only updates `lastSeen` and never touches any feedback's
`status`. Two different concepts share the word "new":

- **Feed row dot / "Mark all read"**: session-based, "have I seen this since I last visited."
- **Sidebar pill**: workflow-based, "how many items are still sitting untriaged."

Because "Mark all read" cannot decrease the sidebar count (it doesn't change `status`), a team
that isn't actively triaging will see that number sit flat indefinitely — which is exactly what
"permanently stuck at 42" looks like from the outside, even though the underlying query is
live and correct. This is a **real, distinct UX bug** (two same-named-but-different counters,
one of which never responds to the action a user would expect to clear it), not a hardcoded
value and not something fixed by this change — it lives entirely in `Sidebar.tsx`, which this
task does not touch. Flagged for the parallel nav/shell work or a follow-up ticket.

## Out of scope

- `Sidebar.tsx` counter color/semantics fix (file ownership conflict with the parallel P1 nav
  pass, see Scope).
- `Badge` component font-size changes (separate Component-library-consolidation backlog item).
- `AITrendsBar.tsx`'s own 10–11px chips (sits above the feed, not part of the feed row itself;
  same typography problem, worth a follow-up but not in this pass's named files).
- Any test infra — `apps/web` has zero test coverage today (tracked in PLAN.md's Analysis
  Backlog #2); verification here is typecheck + lint + manual/visual reasoning only.
