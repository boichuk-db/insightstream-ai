# Theme System — Design Spec

**Date:** 2026-06-29  
**Status:** Approved  
**Scope:** `apps/web`

## Overview

Replace the current single dark-only indigo palette with a proper dual-theme system: two color themes (Teal, Slate Blue) × two brightness modes (Light, Dark) = 4 combinations. System OS preference is the default; the user can override in Settings.

## Problem

- App is dark-only — no light mode
- Accent color is indigo-500/400, which reads as "AI startup cliché" in 2025
- Many components reference `text-indigo-400`, `bg-indigo-600` directly instead of semantic tokens
- Kanban status colors are hardcoded in components instead of a shared constant

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Color themes | Teal + Slate Blue | Both muted/desaturated (~50% saturation) — comfortable for daily use |
| Brightness | Light + Dark + System | System default via `prefers-color-scheme`; user override in Settings |
| Theme switching | `next-themes` library | Handles SSR hydration flash, localStorage, system preference cleanly |
| Color theme storage | `data-color-theme` attr + localStorage | Orthogonal to dark/light; no extra library needed |
| Theme switcher location | Settings / Appearance section only | Not visible in main UI — keeps interface clean |

## Color Tokens

Eight semantic tokens, all defined as CSS custom properties. Four CSS selectors cover all combinations.

### CSS Selector Structure

```css
:root                            /* Teal · Light  */
.dark                            /* Teal · Dark   */
[data-color-theme="blue"]        /* Blue · Light  */
.dark[data-color-theme="blue"]   /* Blue · Dark   */
```

### Token Values

| Token | Role | Teal Light | Teal Dark | Blue Light | Blue Dark |
|-------|------|-----------|----------|-----------|----------|
| `--color-brand-bg` | Page background | `#f7fafa` | `#090c0c` | `#f8f8fc` | `#09090e` |
| `--color-brand-surface` | Cards, sidebar | `#ffffff` | `#0e1515` | `#ffffff` | `#0e0e18` |
| `--color-brand-border` | Dividers, outlines | `#dde8e7` | `#182222` | `#dcdcec` | `#1a1a28` |
| `--color-brand-muted` | Secondary text | `#8ab0ae` | `#2e4d4a` | `#9090b8` | `#2d2d48` |
| `--color-brand-fg` | Primary text (new) | `#1a2e2d` | `#e0eded` | `#1a1a30` | `#e2e2f0` |
| `--color-brand-primary` | Buttons, links | `#2d6b66` | `#3d8a84` | `#3a508a` | `#5068a0` |
| `--color-brand-accent` | Icons, highlights | `#3d8a84` | `#6eb5af` | `#5068a0` | `#8da0cc` |
| `--color-brand-ring` | Focus rings (new) | `rgba(45,107,102,.25)` | `rgba(61,138,132,.3)` | `rgba(58,80,138,.25)` | `rgba(80,104,160,.3)` |

### Semantic / Status Colors

These do **not** change per theme — they stay consistent across both Teal and Slate Blue:

| Category | Text | Background | Border |
|----------|------|-----------|--------|
| Bug | `text-red-400` | `bg-red-500/10` | `border-red-500/20` |
| Feature | `text-emerald-400` | `bg-emerald-500/10` | `border-emerald-500/20` |
| UI/UX | `text-fuchsia-400` | `bg-fuchsia-500/10` | `border-fuchsia-500/20` |
| Performance | `text-amber-400` | `bg-amber-500/10` | `border-amber-500/20` |
| Billing | `text-sky-400` | `bg-sky-500/10` | `border-sky-500/20` |
| Improvement | `text-violet-400` | `bg-violet-500/10` | `border-violet-500/20` |
| Support | `text-teal-400` | `bg-teal-500/10` | `border-teal-500/20` |

> Note: `fuchsia` for UI/UX is kept as-is — it's a categorical color, not a brand color, so it doesn't read as "AI-ish" in context.

## Architecture

### Package

Add `next-themes` to `apps/web`:
```
pnpm add next-themes --filter @insightstream/web
```

### ThemeProvider (`apps/web/src/app/layout.tsx`)

Wrap the app in `ThemeProvider` from `next-themes`:
- `attribute="class"` — adds `class="dark"` to `<html>` for Tailwind dark mode
- `defaultTheme="system"` — respects OS preference
- `enableSystem` — monitors `prefers-color-scheme` changes
- `storageKey="is-appearance"` — localStorage key for brightness preference

### Color Theme Hook (`apps/web/src/hooks/useColorTheme.ts`)

A small custom hook (no library) that:
1. Reads `is-color-theme` from localStorage on mount (default: `"teal"`)
2. Sets `data-color-theme` attribute on `document.documentElement` when value is `"blue"` (removes attribute for `"teal"`)
3. Exposes `colorTheme` and `setColorTheme` — used only by the Settings page

### globals.css Changes

Replace the current single `@theme inline` block with 4 themed blocks:
```css
/* Remove: --color-brand-primary: var(--color-indigo-500) */
/* Remove: --color-brand-accent: var(--color-indigo-400)  */
/* Add: full 4-selector token table as above              */
```

Also update `@theme inline` in Tailwind to expose the two new tokens:
```css
@theme inline {
  /* existing tokens stay, add: */
  --color-brand-fg: var(--color-brand-fg);
  --color-brand-ring: var(--color-brand-ring);
}
```
This lets `text-brand-fg` and `ring-brand-ring` work as Tailwind utility classes.

### Token Migration in Components

Replace direct Tailwind color references with semantic tokens:

| Old | New |
|-----|-----|
| `text-indigo-400` | `text-brand-accent` |
| `bg-indigo-600` | `bg-brand-primary` |
| `hover:bg-indigo-700` | `hover:bg-brand-primary/90` |
| `shadow-indigo-900/20` | `shadow-brand-primary/20` |
| `ring-indigo-500/50` | `ring-brand-ring` |
| `bg-indigo-500/10` | `bg-brand-accent/10` |
| `text-white` on neutral/dark backgrounds | `text-brand-fg` |
| `text-white` on colored buttons (`bg-brand-primary`) | **keep as-is** — white on colored bg is correct |
| `selection:bg-indigo-500/30` | `selection:bg-brand-primary/30` |

Affected files (from audit):
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/modal.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/KanbanCard.tsx`
- `src/components/dashboard/KanbanBoard.tsx`
- `src/components/billing/TrialBanner.tsx`
- `src/app/page.tsx` (selection color in body)

### Kanban Status Colors

Move hardcoded column colors from `KanbanBoard.tsx` into `src/lib/colors.ts` as `STATUS_COLORS`:
```ts
export const STATUS_COLORS: Record<string, string> = {
  New:        "bg-brand-accent",
  "In Review": "bg-amber-500",
  "In Progress": "bg-blue-500",
  Done:       "bg-emerald-500",
  Rejected:   "bg-red-500",
}
```

> Note: "New" status currently uses `bg-indigo-500` — changes to `bg-brand-accent` so it follows the active theme.

## Settings UI

Location: `apps/web/src/app/dashboard/settings/page.tsx` — existing Appearance section (or create one if absent).

Two independent controls:

**Color Theme** — two radio-style buttons:
- Teal (default, color swatch `#3d8a84`)
- Slate Blue (color swatch `#5068a0`)

**Appearance Mode** — segmented 3-way control:
- System (default)
- Light
- Dark

Both save immediately on change (no Save button needed). No preview — changes apply live.

## Out of Scope

- Chart fill hex values in `AnalyticsOverview.tsx` — `CATEGORY_COLORS` uses semantic status colors; these stay as-is
- Google/GitHub OAuth button SVG colors — brand colors, must not change
- Widget app (`apps/widget`) — separate bundle, not touched

## Acceptance Criteria

- [ ] All 4 theme combinations render correctly without visual regressions
- [ ] System preference is respected on first load (no flash)
- [ ] Switching theme in Settings updates UI instantly, persists across reload
- [ ] No direct `indigo-*` class references remain outside of `globals.css` migration comment
- [ ] `pnpm typecheck && pnpm lint` pass clean
