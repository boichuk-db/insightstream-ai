# Web unit tests — design

**Date:** 2026-07-11
**Source:** 🔍 Analysis Backlog #2 "Web test pyramid" (`docs/architecture/PLAN.md`) — web-tests portion only. Billing e2e happy path (checkout → webhook → plan change) is deliberately split off as a separate future item; different tooling (Playwright/`apps/e2e`), not bundled here.

## Problem

`apps/web` has zero tests of any kind. The 🔥 #16 component library consolidation (11 components rewired, merged 2026-07-11) shipped with no safety net on any of the affected surfaces — the plan's own text warned this would happen before the refactor, and it happened anyway. Highest-risk untested surfaces: feed filtering (`FeedbackFeed`), plan-usage hooks, `useComments`, kanban drag/filter logic.

`apps/web` already has Vitest configured (`apps/web/vitest.config.ts`), but exclusively as a `storybook` browser-mode project — real Chromium via `@vitest/browser-playwright`, driving `.stories.tsx` play functions. No jsdom, no `@testing-library/react`, no `test` npm script. `PLAN.md` names "Vitest + Testing Library" as the intended approach, which this project does not yet have.

Separately: `pnpm test` is documented in `CLAUDE.md` as "API unit tests (Jest)" but does not actually work from the repo root today — there is no root `test` npm script and no `test` task in `turbo.json` (only `build`/`lint`/`typecheck`/`dev`). Today it only works as `pnpm --filter api test`.

## Approach

Add a second Vitest **project** (jsdom) to the existing `apps/web/vitest.config.ts`, alongside the current `storybook` browser project — they run independently, no conflict:

```ts
// apps/web/vitest.config.ts
projects: [
  { /* existing storybook browser project — unchanged */ },
  {
    extends: true,
    test: {
      name: "unit",
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
    },
  },
]
```

New devDependencies: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.

New `apps/web/package.json` script: `"test": "vitest run"` (runs both projects).

Mocking: `vi.mock("@/lib/api")` (the axios instance at `apps/web/src/lib/api.ts`) — no MSW. MSW's HTTP-interception model is unnecessary overhead for hook tests where what matters is that `useQuery`/`useMutation` react correctly to a resolved/rejected promise, not the exact wire format of the request.

## Test targets (6 units)

Chosen to cover all four surfaces `PLAN.md` names (feed filtering, plan-usage hooks, `useComments`, kanban drag/reducer logic), plus one additional pure-function target with a real prior bug (the widget-snippet XSS-adjacent escaping fix from the Phase 1 component-library review).

| # | Target | Environment | Covers |
|---|---|---|---|
| 1 | `applyFilters` — `KanbanBoard.tsx:29` | node (pure) | search/category/tag filters + sentiment sort. Requires adding `export` (currently module-private) — no behavior change. |
| 2 | `reorderColumns` — **new extraction** from `handleDragEnd` (`KanbanBoard.tsx:256-293`) | node (pure) | The "kanban drag reducer" `PLAN.md` names. The reorder/move-between-columns array-splice logic is currently trapped inside a `useCallback` closure that also fires a mutation — untestable without simulating a real drag in jsdom, which is unreliable. Extract a pure `reorderColumns(columns, source, destination, draggableId)` returning the new columns map (+ whether the item crossed columns); `handleDragEnd` becomes a thin wrapper that calls it and then fires `updateStatusMutation` only on cross-column moves. Behavior-preserving. |
| 3 | `buildWidgetSnippet` — `widgetSnippet.ts` | node (pure) | html/react/angular template output; a dedicated regression test asserting `apiKey` values containing `"`, backticks, and `</script>` are safely escaped via `JSON.stringify` (ties to the real fix from the Phase 1 review). |
| 4 | `usePlanUsage` — `use-plan-usage.ts` | jsdom + RTL `renderHook` | `computeLimitStatus` via the hook: `ratio >= 0.8` (near-limit boundary), `current >= max` (at-limit), `max === null` (unlimited, both flags false). |
| 5 | `useComments` — `useComments.ts` | jsdom + RTL `renderHook` | `submit()` no-ops on empty/whitespace-only draft; draft clears on successful add; `deleteComment` calls the right mutation/endpoint. |
| 6 | `FeedbackFeed` — `FeedbackFeed.tsx` | jsdom + RTL `render` | Seed a `QueryClient` with a feedback fixture array, render, click a status tab and a sentiment filter chip, assert the visible row set changes correctly. Highest-value target — the exact "regression silently corrupts UX" surface `PLAN.md` calls out by name. |

## CI integration

Add a `test` task to `turbo.json` (no `dependsOn`, plain fan-out to each workspace's own `test` script):

```json
"test": {}
```

This makes root `pnpm test` actually run `apps/api` (jest) + `apps/web` (new vitest unit project) together, matching what `CLAUDE.md` already documents but which does not work today. No behavior change for `apps/api`. The existing `storybook` vitest project (real Chromium) is left as-is — not wired into this new `test` task, since it has a different cost profile (spins a browser) and is already invoked separately via Storybook's own tooling.

## Out of scope

- Billing e2e happy path (Playwright, `apps/e2e`) — separate future item, different tooling.
- MSW / any change to the existing `storybook` browser-mode Vitest project.
- Coverage thresholds / CI gating on coverage percentage — not requested, would be premature before the suite has any history.
- Any other web surface beyond the 6 listed above (exportFeedbacks.ts, colors.ts, etc.) — deliberately kept to the plan's own "5–7 units" scope; revisit in a follow-up pass if these 6 prove the pattern out.
