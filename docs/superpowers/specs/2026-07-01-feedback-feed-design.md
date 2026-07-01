# Feedback Feed — Design Spec

**Date:** 2026-07-01  
**Status:** Approved  
**Replaces:** KanbanBoard

---

## Problem

The Kanban board is the wrong mental model for feedback. It optimizes for task-tracking (drag cards between columns) while the core value of InsightStream is insight discovery. At scale (100+ feedbacks/week) Kanban columns become unmanageable. The "task" mental model creates friction for passive readers (CEO) and doesn't surface AI-generated patterns.

---

## Solution

Replace the primary feedback view with a **Feed/Inbox** layout, augmented with an AI trends bar (core value from AI digest) and power-user filter tabs and chips (quick navigation by status, source, sentiment, theme).

---

## Architecture

### Component Tree

```
FeedbackFeed (orchestrator — replaces KanbanBoard)
├── AITrendsBar          reusable, collapsible
├── StatusTabs           reusable (also usable in Archive page)
├── FilterChips          reusable, supports dropdown multi-select
└── FeedbackFeedItem     collapsed + expanded inline states
    └── FeedbackComments extracted from CommentsPanel (shared logic)
```

### Migration Strategy

- Add a **view switcher** (Feed / Kanban) to the dashboard page header
- Ship Feed as the new default; Kanban remains accessible
- Remove Kanban in a follow-up PR once Feed is validated in production

---

## Data Model

### New: `user_project_last_seen` table

```sql
user_id     UUID NOT NULL REFERENCES users(id)
project_id  UUID NOT NULL REFERENCES projects(id)
seen_at     TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY (user_id, project_id)
```

### New API endpoint

`POST /feedback/mark-seen` — upserts `seen_at = now()` for the current user + project. Called on `FeedbackFeed` mount.

### "New" dot logic

An item shows a new dot when `feedback.createdAt > seen_at`. This is computed client-side after both datasets are loaded. No changes to `IFeedback` interface or existing status fields.

### No changes to

- `IFeedback` interface
- Existing status values (New / In Review / In Progress / Done / Rejected)
- Existing API endpoints

---

## Read/Unread Approach

**Two separate concerns, solved separately:**

| Concern | Solution |
|---------|----------|
| "Did I see this?" | `last_seen_at` per user per project — auto-updates on mount |
| "Is someone handling this?" | Status field (New → In Review) — explicit action |

**Why not shared read state:** A CEO opening the feed would clear the "unread" signal for QA, even though QA hasn't processed the item. `last_seen_at` is per-user so each role has an independent signal.

**Coordination (two QAs race):** Handled by WebSocket — when one QA changes status to In Review, all connected clients update in real-time. First to act wins; no pessimistic locking needed.

---

## Component Specifications

### `FeedbackFeed`

Top-level orchestrator. Owns:
- Fetching feedbacks (existing `useFeedbacks` query)
- Fetching `seen_at` (new query)
- Filter state (status tab, source, sentiment, tags, category)
- Expanded item state (at most one item expanded at a time)
- WebSocket subscription (existing `useSocket`)

Props: `projectId: string`

### `AITrendsBar`

Collapsed by default — a single strip showing top AI-detected themes as chips.

- Chips are clickable → applies theme filter to feed
- "Details ▸" expands to full AI digest grouped by theme
- Fetches from new `GET /feedback/trends?projectId=` endpoint that returns `{ themes: { name: string, emoji: string, count: number }[] }` — existing `digestPreviewQuery` returns unstructured text and is not sufficient
- Renders with brand-accent teal styling using existing design tokens

Props: `projectId: string`, `onThemeFilter: (theme: string) => void`

### `StatusTabs`

Horizontal tab bar with count badges per status.

- Tabs: All | New | In Review | In Progress | Done | Rejected
- Active tab filters the feed list
- Count badges use existing `Badge` component styling
- Reusable: accepts generic `tabs: { label, value, count }[]`

Props: `tabs`, `activeTab`, `onChange`

### `FilterChips`

Horizontal row of filter chips with multi-select dropdown support.

- Static chips: source (All / Widget / Direct), sentiment (Positive / Negative)
- Dropdown chips: Tags ▾, Category ▾ — floating checklist on click, multi-select
- Active selections render as filled chips with × to clear
- Reusable: chip definitions passed as props

Props: `filters`, `activeFilters`, `onChange`

### `FeedbackFeedItem`

Single list row with two states: collapsed and expanded inline.

**Collapsed:**
- New dot (teal if `createdAt > seen_at`, faded otherwise)
- Source badge, Category badge (`Badge` component)
- Sentiment percentage (`SentimentBar` component)
- Relative timestamp
- First ~2 lines of content (text-clamp)
- AI pattern hint: `✦ Navigation · 14 similar` (teal, small)
- Hover → action buttons appear (status picker, delete)

**Expanded (inline, smooth height animation):**
- Full feedback text
- AI summary block (Sparkles icon, existing style)
- Status picker (existing logic from KanbanCard)
- Re-analyze + Delete buttons
- Last 3 comments inline + `"View all N →"` button (lazy loads full comment list)
- Click anywhere outside or on item header → collapses

At most one item expanded at a time (controlled by parent `FeedbackFeed`).

### `FeedbackComments`

Extract comment-fetching and comment-posting logic from `CommentsPanel` into a shared hook `useComments(feedbackId)`. `FeedbackFeedItem` uses this hook directly. `CommentsPanel` (used in Kanban) continues to work unchanged.

---

## WebSocket Behaviour

Existing `useSocket` hook is reused:
- New feedback arrives → prepend to list with fade-in animation
- If active filters are applied → only prepend if item matches current filters
- Status change by another user → update item in-place, no full refetch

---

## Design Tokens

All components use existing brand tokens exclusively — no hardcoded colors:

| Token | Usage |
|-------|-------|
| `brand-surface` | item background |
| `brand-surface-hover` | item hover, expanded background |
| `brand-border` | separators, chip borders |
| `brand-fg` | primary text |
| `brand-muted` | secondary text, timestamps |
| `brand-accent` | new dot, AI hints, active chips, status accent |

---

## Out of Scope

- Removing Kanban (separate PR after validation)
- Email/push notifications for new feedback
- Bulk actions (mark all as read, bulk status change)
- Mobile-specific layout changes
