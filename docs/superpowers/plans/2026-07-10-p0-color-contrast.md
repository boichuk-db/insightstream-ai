# P0 Color System & Contrast Implementation Plan

> Written retroactively — this task was dispatched directly to a background sub-agent with a fully-specified prompt instead of going through the usual brainstorming/writing-plans steps first. Recorded here after the fact to keep this project's plan/spec pairing convention intact. All steps below were completed and merged to `main` (`ce82fc6`) on 2026-07-10.

**Goal:** fix the P0 color-contrast defects in `docs/architecture/PLAN.md`'s UI/UX Roadmap, scoped entirely to `apps/web`, no database/migration/shared-package surface.

**Architecture:** extend the existing CSS-variable theming system (`apps/web/src/app/globals.css`) with a text/decorative token split and semantic status tokens, then rewire every hardcoded color consumer to read from those tokens instead of literal hex/Tailwind shades.

**Tech Stack:** Next.js 16, TailwindCSS 4, CSS custom properties.

Spec: `docs/superpowers/specs/2026-07-10-p0-color-contrast-design.md`

---

## Task 1: Token split and dark-theme border fix — done (`b90f754`)

- [x] Add `--brand-fg-muted` (light `#5b7975`, dark `#8aa8a4`) alongside the existing decorative-only `--brand-muted`.
- [x] Rename every text usage (`text-brand-muted`, `placeholder-brand-muted`/`placeholder:text-brand-muted`) to `text-brand-fg-muted` across the codebase; leave `border-brand-muted`/`bg-brand-muted` untouched.
- [x] Dark-theme card border `#182222` → `#243232`.

## Task 2: Semantic status tokens — done (`78d92c4`)

- [x] Add `--status-success/warning/danger/info` (light + dark hex, each ≥4.5:1).
- [x] Rewire `Badge`, `lib/colors.ts`'s `STATUS_COLORS`, `CurrentPlanCard`, `Sidebar`'s plan-tier badge, `plan-limit-banner.tsx` to consume the tokens.
- [x] Fold `Badge`'s neutral/zinc variant (`text-zinc-300`, ~1.3:1) into `--brand-fg-muted` instead of adding a fifth token.

## Task 3: Chart colors — done (`70697fc`)

- [x] `AnalyticsOverview`'s Recharts grid/tick/cursor colors now reference `var(--brand-border)`/`var(--brand-fg-muted)`/`var(--brand-surface-hover)`.

## Task 4: Sentiment-honesty fix — done (`349a6dc`)

- [x] Fix root cause in `SentimentBar` (null/undefined → "Analyzing…" chip) rather than patching each of its four call sites (`FeedbackFeedItem`, `KanbanCard`, `DigestModal`, `FeedbackFeed` CSV export).
- [x] Drop `DigestModal`'s fabricated `?? 0.5` neutral default, now redundant.

## Task 5: Blue accent theme follow-up — done (`ce82fc6`)

- [x] Add `--brand-fg-muted` to the blue theme's light (`#475569`) and dark (`#cbd5e1`) blocks — it was silently inheriting the teal value via cascade.
- [x] Leave `--status-*` tokens shared across accent themes (semantic, not brand-hue).

## Verification — done

- [x] `pnpm --filter web typecheck` — clean.
- [x] `pnpm --filter web lint` — clean (2 pre-existing, unrelated warnings).
- [x] WCAG contrast computed for every new token (range 4.73:1–12.81:1, all above the 4.5:1 norm).

---

## Process note

This task ran as an isolated background sub-agent (`isolation: "worktree"`). The isolation did not hold as expected — all 4 initial commits landed directly on local `main` instead of a separate worktree, caught only because `git worktree list`/`git log` were checked before treating the result as isolated. Recovered by branching the commits onto `feature/p0-color-contrast` and resetting `main` back to its pre-dispatch tip — zero data loss, because the agent had no `git push`/deploy access. See `CLAUDE.md`'s "Background/Sub-Agent Dispatch" rule, added as a direct result of this.
