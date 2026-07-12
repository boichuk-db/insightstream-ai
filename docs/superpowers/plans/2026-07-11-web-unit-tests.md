# Web Unit Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a jsdom Vitest + Testing Library project to `apps/web` (currently zero tests of any kind) and land 6 unit tests covering the highest-risk untested surfaces named in `docs/architecture/PLAN.md`'s Analysis Backlog #2.

**Architecture:** A second Vitest "project" (`environment: 'jsdom'`) is added to the existing `apps/web/vitest.config.ts` `projects` array, alongside the current `storybook` browser-mode project — independent, no shared state. API calls are mocked at the `@/lib/api` module boundary via `vi.mock`, not MSW. Two small pure-function extractions (`applyFilters` export, `reorderColumns` extraction) in `KanbanBoard.tsx` make the kanban filter/drag logic testable without simulating a real drag in jsdom.

**Tech Stack:** Vitest 4 (jsdom project), `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@vitejs/plugin-react`, TanStack Query 5 (`QueryClientProvider` test wrapper).

**Spec:** `docs/superpowers/specs/2026-07-11-web-unit-tests-design.md`

---

### Task 1: Test infrastructure

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Modify: `turbo.json`

- [ ] **Step 1: Install new devDependencies**

Run:
```bash
pnpm --filter web add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

Expected: adds 5 packages to `apps/web/package.json` `devDependencies`, lockfile updated, no errors.

- [ ] **Step 2: Add the `test` script to `apps/web/package.json`**

In the `"scripts"` block, add `"test"` after `"typecheck"`:

```json
  "scripts": {
    "predev": "npx kill-port 3000",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --project=unit",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
```

Scoped to `--project=unit` deliberately — the pre-existing `storybook` project has its own, separate failures unrelated to this task (a stale `packages/shared-types` dist missing exports some `.stories.tsx` files need, and a `Sidebar.stories.tsx` story that needs `TeamProvider` mocked). Wiring `pnpm test` through both projects would make the very first run of this new infrastructure red for reasons outside this task's scope. This matches the design spec's stated intent: "The existing `storybook` vitest project ... is left as-is — not wired into this new `test` task."

- [ ] **Step 3: Create `apps/web/vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

**Updated during Task 7:** this file gained an `afterEach(cleanup)` registration once the `unit` project's first `render()`-based (not `renderHook`) multi-test file exposed that RTL's automatic cleanup never engages here (`test.globals: true` is deliberately not set, since this config is shared with the `storybook` project). See Task 7 below for the final content.

- [ ] **Step 4: Add the jsdom "unit" project to `apps/web/vitest.config.ts`**

Replace the full file content with:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        plugins: [react()],
        resolve: {
          alias: { '@': path.join(dirname, 'src') },
        },
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: [path.join(dirname, 'vitest.setup.ts')],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
```

The only change from the original file: the `react` import, and the new second entry in `projects`. The `storybook` project entry is untouched.

- [ ] **Step 5: Verify the new project loads with zero tests**

Run:
```bash
pnpm --filter web exec vitest run --project=unit --passWithNoTests
```

Expected: exits 0, reports "No test files found" (or empty run summary) for the `unit` project — confirms config/alias/jsdom/plugin wiring loads without error before any test files exist.

- [ ] **Step 6: Add a `test` task to `turbo.json`, with `dependsOn: ["^build"]`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`dependsOn: ["^build"]` matters, not just for symmetry with `typecheck`: `apps/web` and `apps/api` both import from `@insightstream/shared-types` (a workspace package with a build step). Without this, `turbo test` can run against a stale or missing `dist/`, and any test importing a type/enum that was added to `shared-types` after the last manual build (e.g. `FeedbackStatus`, used by Task 7's `FeedbackFeed.test.tsx` later in this plan) fails for reasons that have nothing to do with the test itself.

- [ ] **Step 7: Add the `test` script to root `package.json`**

`turbo.json` having a `test` task is not enough on its own — root `pnpm test` only works if root `package.json` has a `test` script that invokes turbo, the same way `build`/`lint`/`typecheck` already do. In `package.json` (repo root), add `"test": "turbo test"` to the `"scripts"` block, after `"typecheck"`:

```json
  "scripts": {
    "build": "turbo build",
    "dev": "doppler run -- turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
```

- [ ] **Step 8: Verify `pnpm test` works end to end from the repo root**

Run:
```bash
pnpm test
```

Expected: turbo builds `packages/database` and `packages/shared-types` first (via the `test` task's `dependsOn: ["^build"]`), then runs `apps/api`'s `test` script (jest, all specs green) and `apps/web`'s `test` script (vitest, `unit` project only — 0 test files yet, exits 0). No `ERR_PNPM_NO_SCRIPT`, no failures.

- [ ] **Step 9: Commit**

```bash
git add package.json apps/web/package.json apps/web/vitest.config.ts apps/web/vitest.setup.ts turbo.json pnpm-lock.yaml
git commit -m "test(web): add jsdom Vitest project + Testing Library, wire root test task

Second Vitest project alongside the existing Storybook browser-mode
project (which keeps its own, separate pre-existing failures out of
this new test task — apps/web's test script is scoped to
--project=unit). Root package.json gains a test script delegating to
turbo, and the new turbo test task depends on ^build so workspace
packages (@insightstream/shared-types etc.) are never stale when
tests run. Makes root pnpm test actually work end to end, matching
what CLAUDE.md already documents but didn't (no root script existed
before)."
```

---

### Task 2: `applyFilters` (KanbanBoard search/category/tag/sentiment filter)

**Files:**
- Modify: `apps/web/src/components/dashboard/KanbanBoard.tsx:29`
- Create: `apps/web/src/components/dashboard/KanbanBoard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/dashboard/KanbanBoard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyFilters } from "./KanbanBoard";

const feedbacks = [
  { id: "1", content: "Login button broken", category: "Bug", tags: ["ui"], sentimentScore: 0.9 },
  { id: "2", content: "Add dark mode please", category: "Feature", tags: ["ui", "theme"], sentimentScore: 0.3 },
  { id: "3", content: "Great app overall", category: "Other", tags: [], sentimentScore: 0.8 },
];

describe("applyFilters", () => {
  it("filters by search text across content and aiSummary", () => {
    const result = applyFilters(feedbacks, "dark mode", [], false, []);
    expect(result.map((f) => f.id)).toEqual(["2"]);
  });

  it("filters by selected categories", () => {
    const result = applyFilters(feedbacks, "", ["Bug"], false, []);
    expect(result.map((f) => f.id)).toEqual(["1"]);
  });

  it("filters by selected tags", () => {
    const result = applyFilters(feedbacks, "", [], false, ["theme"]);
    expect(result.map((f) => f.id)).toEqual(["2"]);
  });

  it("sorts by sentiment ascending when sortBySentiment is true", () => {
    const result = applyFilters(feedbacks, "", [], true, []);
    expect(result.map((f) => f.id)).toEqual(["2", "3", "1"]);
  });

  it("does not mutate the input array", () => {
    const original = [...feedbacks];
    applyFilters(feedbacks, "", [], true, []);
    expect(feedbacks).toEqual(original);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run --project=unit KanbanBoard.test.ts`
Expected: FAIL — `applyFilters` is not exported from `./KanbanBoard` (module has no exported member `applyFilters`).

- [ ] **Step 3: Export `applyFilters`**

In `apps/web/src/components/dashboard/KanbanBoard.tsx`, change line 29 from:

```ts
function applyFilters(
```

to:

```ts
export function applyFilters(
```

No other change — the function body is already correct.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run --project=unit KanbanBoard.test.ts`
Expected: PASS, 5/5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanBoard.tsx apps/web/src/components/dashboard/KanbanBoard.test.ts
git commit -m "test(web): unit test applyFilters (KanbanBoard search/category/tag/sentiment)"
```

---

### Task 3: `reorderColumns` (kanban drag reducer extraction)

**Files:**
- Modify: `apps/web/src/components/dashboard/KanbanBoard.tsx:256-293`
- Modify: `apps/web/src/components/dashboard/KanbanBoard.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/src/components/dashboard/KanbanBoard.test.ts`:

```ts
import { reorderColumns } from "./KanbanBoard";

describe("reorderColumns", () => {
  const columns = {
    New: [{ id: "a", status: "New" }, { id: "b", status: "New" }],
    Done: [{ id: "c", status: "Done" }],
  };

  it("reorders within the same column without a cross-column move", () => {
    const result = reorderColumns(
      columns,
      { droppableId: "New", index: 0 },
      { droppableId: "New", index: 1 },
    );
    expect(result.crossColumnMove).toBe(false);
    expect(result.columns.New.map((f: any) => f.id)).toEqual(["b", "a"]);
    expect(result.columns.Done).toEqual(columns.Done);
  });

  it("moves an item to a different column and flags crossColumnMove", () => {
    const result = reorderColumns(
      columns,
      { droppableId: "New", index: 0 },
      { droppableId: "Done", index: 1 },
    );
    expect(result.crossColumnMove).toBe(true);
    expect(result.columns.New.map((f: any) => f.id)).toEqual(["b"]);
    expect(result.columns.Done.map((f: any) => f.id)).toEqual(["c", "a"]);
  });

  it("updates the moved item's status to the destination column id", () => {
    const result = reorderColumns(
      columns,
      { droppableId: "New", index: 0 },
      { droppableId: "Done", index: 0 },
    );
    const moved = result.columns.Done.find((f: any) => f.id === "a");
    expect(moved.status).toBe("Done");
  });
});
```

Add the `import { reorderColumns } from "./KanbanBoard";` line at the top of the file, next to the existing `applyFilters` import (combine into one import statement: `import { applyFilters, reorderColumns } from "./KanbanBoard";`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run --project=unit KanbanBoard.test.ts`
Expected: FAIL — `reorderColumns` is not exported from `./KanbanBoard`.

- [ ] **Step 3: Extract `reorderColumns` and rewrite `handleDragEnd` to use it**

In `apps/web/src/components/dashboard/KanbanBoard.tsx`, insert a new exported interface + function right after `applyFilters` (i.e. after its closing brace, before `export function KanbanBoard`):

```ts
export interface ReorderResult {
  columns: Record<string, any[]>;
  crossColumnMove: boolean;
}

export function reorderColumns(
  columns: Record<string, any[]>,
  source: { droppableId: string; index: number },
  destination: { droppableId: string; index: number },
): ReorderResult {
  const sourceColumn = [...(columns[source.droppableId] || [])];
  const destColumn = [...(columns[destination.droppableId] || [])];
  const [movedItem] = sourceColumn.splice(source.index, 1);

  movedItem.status = destination.droppableId;

  if (source.droppableId === destination.droppableId) {
    sourceColumn.splice(destination.index, 0, movedItem);
    return {
      columns: { ...columns, [source.droppableId]: sourceColumn },
      crossColumnMove: false,
    };
  }

  destColumn.splice(destination.index, 0, movedItem);
  return {
    columns: {
      ...columns,
      [source.droppableId]: sourceColumn,
      [destination.droppableId]: destColumn,
    },
    crossColumnMove: true,
  };
}
```

Then replace the existing `handleDragEnd` (lines 256-293) — which currently does:

```ts
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;

      if (!destination) return;

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const sourceColumn = [...(columns[source.droppableId] || [])];
      const destColumn = [...(columns[destination.droppableId] || [])];
      const [movedItem] = sourceColumn.splice(source.index, 1);

      movedItem.status = destination.droppableId;

      if (source.droppableId === destination.droppableId) {
        sourceColumn.splice(destination.index, 0, movedItem);
        setColumns({ ...columns, [source.droppableId]: sourceColumn });
      } else {
        destColumn.splice(destination.index, 0, movedItem);
        setColumns({
          ...columns,
          [source.droppableId]: sourceColumn,
          [destination.droppableId]: destColumn,
        });

        updateStatusMutation.mutate({
          id: draggableId,
          status: destination.droppableId,
        });
      }
    },
    [columns, updateStatusMutation],
  );
```

with:

```ts
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;

      if (!destination) return;

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const { columns: nextColumns, crossColumnMove } = reorderColumns(
        columns,
        source,
        destination,
      );
      setColumns(nextColumns);

      if (crossColumnMove) {
        updateStatusMutation.mutate({
          id: draggableId,
          status: destination.droppableId,
        });
      }
    },
    [columns, updateStatusMutation],
  );
```

This is behavior-preserving: same-column reorder still calls `setColumns` with only the reordered source column changed; cross-column move still updates both columns and fires the mutation exactly as before.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run --project=unit KanbanBoard.test.ts`
Expected: PASS, 8/8 tests (5 from Task 2 + 3 new).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanBoard.tsx apps/web/src/components/dashboard/KanbanBoard.test.ts
git commit -m "test(web): extract and unit test reorderColumns (kanban drag reducer)

handleDragEnd's reorder/move-between-columns array-splice logic was
trapped in a useCallback closure — untestable without simulating a
real drag in jsdom. Extracted to a pure reorderColumns() function;
handleDragEnd is now a thin wrapper. Behavior-preserving."
```

---

### Task 4: `buildWidgetSnippet` escaping regression tests

**Files:**
- Create: `apps/web/src/lib/widgetSnippet.test.ts`

- [ ] **Step 1: Write the tests**

Create `apps/web/src/lib/widgetSnippet.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildWidgetSnippet } from "./widgetSnippet";

describe("buildWidgetSnippet", () => {
  const baseConfig = {
    apiKey: "test-key",
    color: "#6366f1" as const,
    shape: "circle" as const,
    position: "bottom-right" as const,
    scriptUrl: "https://cdn.example.com/widget.iife.js",
  };

  it("embeds a safe apiKey directly in the html snippet", () => {
    const snippet = buildWidgetSnippet({ ...baseConfig, framework: "html" });
    expect(snippet).toContain('apiKey: "test-key"');
  });

  it("escapes a malicious apiKey so it cannot break out of the JS string (html)", () => {
    const malicious = `"; alert(1); //`;
    const snippet = buildWidgetSnippet({ ...baseConfig, apiKey: malicious, framework: "html" });
    expect(snippet).toContain(JSON.stringify(malicious));
    expect(snippet).not.toContain(`apiKey: "${malicious}"`);
  });

  it("escapes a malicious apiKey in the react snippet", () => {
    const malicious = `"; alert(1); //`;
    const snippet = buildWidgetSnippet({ ...baseConfig, apiKey: malicious, framework: "react" });
    expect(snippet).toContain(JSON.stringify(malicious));
    expect(snippet).not.toContain(`= "${malicious}";`);
  });

  it("escapes a malicious apiKey in the angular snippet", () => {
    const malicious = `"; alert(1); //`;
    const snippet = buildWidgetSnippet({ ...baseConfig, apiKey: malicious, framework: "angular" });
    expect(snippet).toContain(JSON.stringify(malicious));
    expect(snippet).not.toContain(`= "${malicious}";`);
  });

  it("uses the provided scriptUrl verbatim", () => {
    const snippet = buildWidgetSnippet({ ...baseConfig, framework: "html" });
    expect(snippet).toContain('src="https://cdn.example.com/widget.iife.js"');
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter web exec vitest run --project=unit widgetSnippet.test.ts`
Expected: PASS, 5/5 — `buildWidgetSnippet` already escapes `apiKey` correctly via `JSON.stringify`; no source change needed here.

- [ ] **Step 3: Prove each escaping test is not a tautology**

`buildWidgetSnippet` has three separate `${JSON.stringify(apiKey)}` interpolation sites, one per framework branch (react, angular, html — in that order in the file). Each corresponding test must be proven to actually fail if *that branch's* escaping is removed — do this once per branch, one at a time, reverting fully before moving to the next:

1. Find the `${JSON.stringify(apiKey)}` occurrence inside the `if (framework === "react")` branch. Temporarily change just that one occurrence's wrapping from `${JSON.stringify(apiKey)}` to a raw `"${apiKey}"` (i.e. change `const INSIGHT_STREAM_API_KEY = ${JSON.stringify(apiKey)};` to `const INSIGHT_STREAM_API_KEY = "${apiKey}";` — only within the react branch). Run `pnpm --filter web exec vitest run --project=unit widgetSnippet.test.ts` — expect ONLY the "escapes a malicious apiKey in the react snippet" test to FAIL, all others still PASS. Revert.
2. Repeat for the `if (framework === "angular")` branch's `${JSON.stringify(apiKey)}` occurrence. Expect ONLY the "escapes a malicious apiKey in the angular snippet" test to FAIL. Revert.
3. Repeat for the final `return` (html) branch's `apiKey: ${JSON.stringify(apiKey)},` occurrence. Expect ONLY the "escapes a malicious apiKey ... (html)" test to FAIL. Revert.

After each revert, confirm `git diff apps/web/src/lib/widgetSnippet.ts` is empty before moving to the next branch or to Step 4. If any sabotage step causes a DIFFERENT test to fail than the one named, or causes NO test to fail, stop and report — the corresponding test's malicious payload isn't actually exercising that branch's escaping and needs a different value (e.g. one containing a `"` character, since `JSON.stringify` only diverges from raw interpolation when the input contains characters that need escaping).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/widgetSnippet.test.ts
git commit -m "test(web): regression test buildWidgetSnippet apiKey escaping

Locks in the escaping behavior behind the Phase 1 component-library
review's XSS-adjacent fix. No source change — buildWidgetSnippet was
already correct."
```

---

### Task 5: `usePlanUsage` hook tests

**Files:**
- Create: `apps/web/src/hooks/use-plan-usage.test.tsx`

- [ ] **Step 1: Write the tests**

Create `apps/web/src/hooks/use-plan-usage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePlanUsage } from "./use-plan-usage";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn() } as unknown as typeof api,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

describe("usePlanUsage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("flags isNearLimit when usage crosses the 80% threshold", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        plan: "PRO",
        planName: "Pro",
        feedbacksThisMonth: { current: 80, max: 100 },
        projects: { current: 1, max: 5 },
      },
    });

    const { result } = renderHook(() => usePlanUsage("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isNearLimit).toBe(true);
    expect(result.current.isAtLimit).toBe(false);
  });

  it("does not flag isNearLimit below the 80% threshold", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        plan: "PRO",
        planName: "Pro",
        feedbacksThisMonth: { current: 50, max: 100 },
        projects: { current: 1, max: 5 },
      },
    });

    const { result } = renderHook(() => usePlanUsage("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isNearLimit).toBe(false);
    expect(result.current.isAtLimit).toBe(false);
  });

  it("flags isAtLimit when current meets or exceeds max", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        plan: "PRO",
        planName: "Pro",
        feedbacksThisMonth: { current: 100, max: 100 },
        projects: { current: 1, max: 5 },
      },
    });

    const { result } = renderHook(() => usePlanUsage("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAtLimit).toBe(true);
  });

  it("treats a null max as unlimited — never near or at limit", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        plan: "ENTERPRISE",
        planName: "Enterprise",
        feedbacksThisMonth: { current: 999999, max: null },
        projects: { current: 1, max: null },
      },
    });

    const { result } = renderHook(() => usePlanUsage("team-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isNearLimit).toBe(false);
    expect(result.current.isAtLimit).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter web exec vitest run --project=unit use-plan-usage.test.tsx`
Expected: PASS, 4/4 — `usePlanUsage`/`computeLimitStatus` are already correct; no source change needed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-plan-usage.test.tsx
git commit -m "test(web): unit test usePlanUsage near-limit/at-limit/unlimited thresholds"
```

---

### Task 6: `useComments` hook tests

**Files:**
- Create: `apps/web/src/hooks/useComments.test.tsx`

- [ ] **Step 1: Write the tests**

Create `apps/web/src/hooks/useComments.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useComments } from "./useComments";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  } as unknown as typeof api,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

describe("useComments", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockReset().mockResolvedValue({ data: { id: "c1", content: "hi" } });
    vi.mocked(api.delete).mockReset().mockResolvedValue({ data: {} });
  });

  it("does not submit when the draft is empty or whitespace-only", async () => {
    const { result } = renderHook(() => useComments("feedback-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setDraft("   ");
    });
    // submit() is a no-op guard (`if (!draft.trim()) return;`), so there's no
    // state change to waitFor. Flush the microtask queue explicitly — TanStack
    // Query's mutate() dispatches through a promise chain before it ever
    // reaches mutationFn, so asserting immediately after a bare act() would
    // pass trivially even if the guard were deleted (proven during review).
    await act(async () => {
      result.current.submit();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits the trimmed draft and clears it on success", async () => {
    const { result } = renderHook(() => useComments("feedback-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setDraft("  Great point  ");
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/feedbacks/feedback-1/comments", {
        content: "Great point",
      }),
    );
    await waitFor(() => expect(result.current.draft).toBe(""));
  });

  it("deletes a comment by id", async () => {
    const { result } = renderHook(() => useComments("feedback-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.deleteComment("c1");
    });

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/comments/c1"));
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter web exec vitest run --project=unit useComments.test.tsx`
Expected: PASS, 3/3 — `useComments` is already correct; no source change needed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/useComments.test.tsx
git commit -m "test(web): unit test useComments submit/trim/delete behavior"
```

---

### Task 7: `FeedbackFeed` tab and filter behavior (integration)

**Files:**
- Create: `apps/web/src/components/dashboard/FeedbackFeed.test.tsx`

This is the highest-value target — the exact "regression silently corrupts UX" surface `PLAN.md` names by name.

- [ ] **Step 1: Write the tests**

Create `apps/web/src/components/dashboard/FeedbackFeed.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeedbackStatus, type IFeedback } from "@insightstream/shared-types";
import { FeedbackFeed } from "./FeedbackFeed";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  } as unknown as typeof api,
}));

const feedbackFixtures: IFeedback[] = [
  {
    id: "1",
    content: "Login button is broken on Safari",
    source: "widget",
    sentimentScore: 0.2,
    category: "Bug",
    status: FeedbackStatus.NEW,
    tags: ["ui"],
    userId: "u1",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "2",
    content: "Love the new dashboard design",
    source: "widget",
    sentimentScore: 0.9,
    category: "Feedback",
    status: FeedbackStatus.NEW,
    tags: ["ui"],
    userId: "u1",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z",
  },
  {
    id: "3",
    content: "Please add SSO support",
    source: "email",
    sentimentScore: 0.5,
    category: "Feature",
    status: FeedbackStatus.IN_REVIEW,
    tags: [],
    userId: "u1",
    createdAt: "2026-07-03T10:00:00.000Z",
    updatedAt: "2026-07-03T10:00:00.000Z",
  },
  {
    id: "4",
    content: "Old ticket, no longer relevant",
    source: "widget",
    sentimentScore: 0.5,
    category: "Other",
    status: FeedbackStatus.ARCHIVED,
    tags: [],
    userId: "u1",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
  },
];

function mockApiGet(url: string) {
  if (url === "/feedback") {
    return Promise.resolve({ data: feedbackFixtures });
  }
  if (url === "/feedback/last-seen") {
    return Promise.resolve({ data: { seenAt: null } });
  }
  if (url === "/feedback/trends") {
    return Promise.resolve({ data: [] });
  }
  return Promise.reject(new Error(`Unhandled GET ${url}`));
}

function renderFeedbackFeed() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FeedbackFeed projectId="proj-1" />
    </QueryClientProvider>,
  );
}

describe("FeedbackFeed", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockClear().mockImplementation(mockApiGet);
  });

  it("shows non-archived feedback by default and hides archived items", async () => {
    renderFeedbackFeed();

    expect(
      await screen.findByText("Login button is broken on Safari"),
    ).toBeInTheDocument();
    expect(screen.getByText("Love the new dashboard design")).toBeInTheDocument();
    expect(screen.getByText("Please add SSO support")).toBeInTheDocument();
    expect(
      screen.queryByText("Old ticket, no longer relevant"),
    ).not.toBeInTheDocument();
  });

  it("filters to a single status when its tab is clicked", async () => {
    const user = userEvent.setup();
    renderFeedbackFeed();
    await screen.findByText("Login button is broken on Safari");

    await user.click(screen.getByRole("button", { name: /^In Review\d+$/ }));

    await waitFor(() => {
      expect(screen.getByText("Please add SSO support")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Login button is broken on Safari"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Love the new dashboard design"),
    ).not.toBeInTheDocument();
  });

  it("shows archived items only on the Archived tab", async () => {
    const user = userEvent.setup();
    renderFeedbackFeed();
    await screen.findByText("Login button is broken on Safari");

    await user.click(screen.getByRole("button", { name: /^Archived\d+$/ }));

    await waitFor(() => {
      expect(screen.getByText("Old ticket, no longer relevant")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Login button is broken on Safari"),
    ).not.toBeInTheDocument();
  });

  it("filters to negative sentiment when the sentiment chip is clicked", async () => {
    const user = userEvent.setup();
    renderFeedbackFeed();
    await screen.findByText("Login button is broken on Safari");

    await user.click(screen.getByRole("button", { name: /^😞 Negative$/ }));

    await waitFor(() => {
      expect(
        screen.queryByText("Love the new dashboard design"),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText("Login button is broken on Safari"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Please add SSO support")).not.toBeInTheDocument();
  });
});
```

**Note (added after code review):** `afterEach(cleanup)` is NOT declared in this file — it lives in `apps/web/vitest.setup.ts` (global, applies to every `unit`-project test). Without it, `render()`-based tests with multiple `it` blocks leak DOM across tests within the same file (RTL's automatic cleanup never self-registers because `test.globals: true` is deliberately not set on this shared config — see Task 1). `beforeEach` also calls `.mockClear()` before reassigning `mockImplementation`, so `api.get`'s call history doesn't accumulate across this file's 4 tests. The status-tab/sentiment-chip selectors are anchored rather than bare substring matches, since `StatusTabs` renders each tab's accessible name as `"<label><count>"` with **no separator** (`{tab.label}` immediately followed by a `<span>{tab.count}</span>`, e.g. `"In Review1"` not `"In Review 1"`) — so the anchor is `/^In Review\d+$/` / `/^Archived\d+$/`, not a `\b`-based pattern (`\b` doesn't match between a letter and a digit, both being word characters, so `/^In Review\b/` fails to match `"In Review1"` at all). The sentiment chip has no count badge, so `/^😞 Negative$/` anchors cleanly as originally written.

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter web exec vitest run --project=unit FeedbackFeed.test.tsx`
Expected: PASS, 4/4 — `FeedbackFeed`'s filtering logic is already correct; no source change needed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/FeedbackFeed.test.tsx
git commit -m "test(web): integration test FeedbackFeed status-tab and sentiment filtering

Highest-value target from the Analysis Backlog #2 write-up — the exact
surface named as where 'a regression silently corrupts UX'."
```

---

### Task 8: Final verification and PLAN.md update

**Files:**
- Modify: `docs/architecture/PLAN.md`

- [ ] **Step 1: Run the full web test suite**

Run: `pnpm --filter web test`
Expected: the `unit` project shows 6 test files, all passing — applyFilters 5 + reorderColumns 4 + widgetSnippet 5 + usePlanUsage 4 + useComments 3 + FeedbackFeed 4 = 25 test cases across 6 files, all PASS. (`apps/web`'s `test` script is scoped to `--project=unit`, so the `storybook` project is not part of this run — see Task 1.)

- [ ] **Step 2: Run web typecheck and lint**

Run: `pnpm --filter web typecheck`
Expected: 0 errors (test files are included in `apps/web/tsconfig.json`'s type-checked scope — must be clean).

Run: `pnpm --filter web lint`
Expected: 0 errors.

- [ ] **Step 3: Run the root test/typecheck/lint via turbo**

Run: `pnpm test`
Expected: turbo runs `apps/api` (jest, all specs green) and `apps/web` (vitest, all green) — confirms the new `turbo.json` `test` task works end-to-end from the repo root.

Run: `pnpm typecheck && pnpm lint`
Expected: 0 errors across the monorepo.

If any of these commands cannot run in the current environment, state explicitly which one and why — do not claim completion without having run them.

- [ ] **Step 4: Update `docs/architecture/PLAN.md`**

In the `### 2. Web test pyramid — the empty middle` section under `## 🔍 Analysis Backlog`, insert a new paragraph directly after the existing `**When:**` line:

```markdown
**Web-tests portion — done (2026-07-11):** 6 Vitest (jsdom + Testing Library) unit tests added in `apps/web` (previously zero), covering all four named surfaces — `applyFilters`/`reorderColumns` (extracted from `KanbanBoard.tsx`'s drag handler), `usePlanUsage`, `useComments`, `FeedbackFeed` tab/sentiment filtering — plus a regression test locking in `buildWidgetSnippet`'s apiKey-escaping fix from the Phase 1 component-library review. New jsdom Vitest project added alongside the existing Storybook browser-mode project (`apps/web/vitest.config.ts`). Root `pnpm test` — previously broken despite being documented in `CLAUDE.md` (no root script, no turbo task existed) — now actually fans out to `apps/api` (jest) + `apps/web` (vitest) via a new `turbo.json` `test` task. Design: `docs/superpowers/specs/2026-07-11-web-unit-tests-design.md`. **Billing e2e happy path — still open**, deliberately split off as separate future work (different tooling: Playwright, `apps/e2e`).
```

Then add a new entry at the top of the `## Changelog` section (most recent first):

```markdown
- **2026-07-11** — 🔍 Analysis Backlog #2 (web-tests portion) done: 6 Vitest unit tests added to `apps/web` (previously zero), covering `applyFilters`/`reorderColumns` (`KanbanBoard.tsx`), `usePlanUsage`, `useComments`, `FeedbackFeed` tab/sentiment filtering, and a `buildWidgetSnippet` apiKey-escaping regression test. New jsdom Vitest project added alongside the existing Storybook browser-mode project; new `turbo.json` `test` task makes root `pnpm test` actually run `apps/api` + `apps/web` tests together — previously undocumented-but-broken (no root script existed). Billing e2e happy path split off as separate future work. Design: `docs/superpowers/specs/2026-07-11-web-unit-tests-design.md`.
```

Also bump the "Last updated" date at the top of the file (line 3) to `2026-07-11` if it isn't already, keeping the existing parenthetical note format.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture/PLAN.md
git commit -m "docs(plan): record web unit test pyramid as done (Analysis Backlog #2, web portion)"
```

---

## Self-Review Notes

- **Spec coverage:** all 6 units from the spec's table have a task (Tasks 2–7); infrastructure (jsdom project, deps, turbo task) is Task 1; final verification + `PLAN.md` update per the project's "Update rule" is Task 8. Billing e2e is explicitly out of scope per the spec and reconfirmed in the Task 8 `PLAN.md` note.
- **Type consistency:** `applyFilters(feedbacks, searchText, selectedCategories, sortBySentiment, selectedTags)` signature matches the existing source at `KanbanBoard.tsx:29-35` exactly — no renaming. `reorderColumns(columns, source, destination)` and `ReorderResult { columns, crossColumnMove }` are used identically in both the extraction (Task 3, Step 3) and the test file (Task 3, Step 1).
- **No placeholders:** every step shows complete, runnable code — no "add tests for the above" or "handle errors appropriately" steps.
