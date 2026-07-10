# P0 Color System & Contrast — Design Spec

> Design spec, written retroactively alongside the implementation. Fixes `docs/architecture/PLAN.md`'s "🎨 UI/UX Roadmap → P0 — Color system & contrast" item.

## Problem

One `--brand-muted` CSS variable served both decorative elements and secondary *text*. As text it failed WCAG hard: `#2e4d4a` on dark surface `#0e1515` = 2.0:1, `#8ab0ae` on white = 2.4:1 (norm 4.5:1) — the dark theme was near-unreadable. Status colors were hardcoded dark-theme Tailwind shades (`text-amber-300` etc.) that washed out on light theme (~1.5:1). `AnalyticsOverview`'s charts embedded dark-only grays (`#262626`/`#737373`/`#171717`), broken in light theme. Feedback with no AI analysis yet rendered a bare "0%" instead of an "analyzing" state — a `null` sentiment score was being coerced to `0` and colored as strongly negative.

## Goal

Fix all of the above without replacing the existing CSS-variable theming architecture (light/dark + a "blue" accent theme) — extend it, not touch its mechanism.

## Design

1. **Token split:** `--brand-muted` (light `#8ab0ae` / dark `#2e4d4a`) stays decorative-only. New `--brand-fg-muted` (light `#5b7975` ~4.7:1, dark `#8aa8a4` ~4.7:1) takes over every text usage — a mechanical rename of `text-brand-muted`/`placeholder-brand-muted` across ~40 files, leaving `border-brand-muted`/`bg-brand-muted` untouched.
2. **Semantic status tokens:** `--status-success/warning/danger/info`, each with a light and dark hex verified ≥4.5:1 against that theme's surface. `Badge`, `lib/colors.ts`'s `STATUS_COLORS`, and every hardcoded `text-*-300`/`text-*-400` status usage now read from these tokens. Along the way, `Badge`'s neutral/zinc variant (`text-zinc-300`, ~1.3:1 on white) was folded into `--brand-fg-muted` rather than inventing a fifth token.
3. **Chart colors:** `AnalyticsOverview`'s Recharts grid/tick/cursor now reference `var(--brand-border)`/`var(--brand-fg-muted)`/`var(--brand-surface-hover)` instead of hardcoded hex.
4. **Dark card border:** `#182222` → `#243232` (cards were invisible against the dark surface).
5. **Sentiment honesty:** root cause was `FeedbackFeedItem.tsx` guarding only `sentimentScore !== undefined`, letting `null` (not-yet-analyzed) through into `SentimentBar`, which computed `Math.round(null*100)=0`. Fixed at the source — `SentimentBar` itself now renders an "Analyzing…" chip for null/undefined, so `FeedbackFeedItem`, `KanbanCard`, `DigestModal`'s "most negative" list, and `FeedbackFeed`'s CSV export all inherit the fix instead of each carrying its own guard (dropped `DigestModal`'s `?? 0.5` fabricated-neutral default in the process).
6. **Blue theme follow-up (same day, separate commit):** the "blue" accent theme's light/dark blocks defined `--brand-muted` but never `--brand-fg-muted`, silently inheriting the teal value via CSS cascade — readable but hue-mismatched. Added `#475569` (light, ~7.6:1 on white) / `#cbd5e1` (dark, ~12.9:1 on `#0e0e18`). `--status-*` tokens deliberately stay shared across accent themes — they're semantic (success/warning/danger/info), not brand-hue, so re-tinting per theme would blur meaning rather than fix a defect.

## Why this is the right fix

Extends the existing token system instead of replacing it — every consumer of `--brand-fg-muted`/`--status-*` gets the fix automatically via CSS cascade, no per-component color logic. Fixing sentiment-null-handling at the `SentimentBar` source instead of patching each of its four call sites closes the bug class, not just today's instance.

## Testing / Verification

- `pnpm --filter web typecheck` / `pnpm --filter web lint` — clean (2 pre-existing, unrelated warnings, confirmed via `git diff` to be untouched files).
- Contrast: computed WCAG relative luminance for every new token against its expected surface — all ≥4.5:1 (range 4.73:1–12.81:1); confirmed the *old* `--brand-muted` values reproduce the exact failing ratios PLAN.md cited (2.36:1 light, 2.00:1 dark).
- Dev server started; compiled Tailwind output inspected to confirm the new utility classes actually generate (not just declared as unused CSS vars).

## Files touched

`apps/web/src/app/globals.css`, `apps/web/src/components/ui/badge.tsx`, `apps/web/src/components/ui/sentiment-bar.tsx`, `apps/web/src/lib/colors.ts`, `apps/web/src/components/analytics/AnalyticsOverview.tsx`, `apps/web/src/components/dashboard/FeedbackFeedItem.tsx`, `KanbanCard.tsx`, `DigestModal.tsx`, `FeedbackFeed.tsx`, plus ~40 files for the mechanical `text-brand-muted` → `text-brand-fg-muted` rename.

## Deliberately out of scope

Category colors (`CATEGORY_COLORS`) — categorical, not status semantics. `ActivityFeed.tsx` event-type icon colors and decorative danger-red buttons/icons — actions/decoration, not entity status.
