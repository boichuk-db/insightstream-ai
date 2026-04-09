# Plan Limit CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser `alert()`/`confirm()` dialogs with a styled upgrade flow — proactive banner at 80% usage and a blocking modal at 100% — using `sonner` for toasts.

**Architecture:** Install `sonner` and add `<Toaster />` to the root layout. A `usePlanUsage` hook fetches `GET /plans/usage` (already exists) and computes `isNearLimit`/`isAtLimit`. `PlanLimitBanner` shows on the dashboard when near limit (dismissible per month via localStorage). `PlanLimitModal` opens when a `PlanLimitExceeded` 403 is returned. All `window.alert()`/`confirm()` in the dashboard are replaced with `toast.error()`.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query 5, Tailwind CSS 4, `sonner`, TypeScript strict

**Commit strategy:** 2 commits total — one chore for the dependency, one feat for all feature code.

> **Note on testing:** The web app has no test infrastructure (no Jest/Vitest configured). Tests in this plan cover only the pure computed logic via Node.js scripts. Component behaviour is verified manually in the smoke test task.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/package.json` | Add `sonner` dependency |
| Modify | `apps/web/src/app/layout.tsx` | Add `<Toaster />` |
| Create | `apps/web/src/hooks/use-plan-usage.ts` | TanStack Query hook + computed isNearLimit/isAtLimit |
| Create | `apps/web/src/components/plan-limit-banner.tsx` | Dismissible amber banner for 80% usage |
| Create | `apps/web/src/components/plan-limit-modal.tsx` | Blocking upgrade modal for 100% usage |
| Modify | `apps/web/src/app/dashboard/page.tsx` | Wire banner + modal, replace alert/confirm |

---

## Task 1: Install sonner

- [ ] **Step 1: Install sonner**

```bash
cd d:/Work/fullstack-app && pnpm add sonner --filter web
```

Expected: `sonner` added to `apps/web/package.json` dependencies.

- [ ] **Step 2: Verify**

```bash
node -e "require('d:/Work/fullstack-app/apps/web/node_modules/sonner'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd d:/Work/fullstack-app && git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: install sonner toast library"
```

---

## Task 2: Add Toaster to root layout

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

Current file content:
```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/providers";
// ... fonts, metadata ...
export default function RootLayout({ children }) {
  return (
    <html ...>
      <body className="min-h-full flex flex-col font-sans bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 1: Add Toaster import and usage**

Open `apps/web/src/app/layout.tsx`. Add the import after the existing imports:

```tsx
import { Toaster } from "sonner";
```

Inside `<body>`, after `<Providers>{children}</Providers>`, add `<Toaster />`:

```tsx
<body className="min-h-full flex flex-col font-sans bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30">
  <Providers>{children}</Providers>
  <Toaster position="bottom-right" richColors />
</body>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd d:/Work/fullstack-app/apps/web && pnpm typecheck 2>&1 | tail -5
```

Expected: no errors.

---

## Task 3: usePlanUsage hook

**Files:**
- Create: `apps/web/src/hooks/use-plan-usage.ts`

The response shape from `GET /plans/usage` (already existing endpoint):
```typescript
{
  plan: 'FREE' | 'PRO' | 'BUSINESS',
  planName: string,
  feedbacksThisMonth: { current: number, max: number | null },
  projects: { current: number, max: number | null }
}
```
`max: null` means unlimited (BUSINESS plan).

- [ ] **Step 1: Create the hook**

Create `apps/web/src/hooks/use-plan-usage.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PlanUsageData {
  plan: string;
  planName: string;
  feedbacksThisMonth: { current: number; max: number | null };
  projects: { current: number; max: number | null };
}

function computeLimitStatus(current: number, max: number | null) {
  if (max === null) return { isNearLimit: false, isAtLimit: false };
  const ratio = current / max;
  return {
    isNearLimit: ratio >= 0.8,
    isAtLimit: current >= max,
  };
}

export function usePlanUsage() {
  const { data, isError } = useQuery<PlanUsageData>({
    queryKey: ["planUsage"],
    queryFn: () => api.get<PlanUsageData>("/plans/usage").then((r) => r.data),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const feedbackStatus = data
    ? computeLimitStatus(
        data.feedbacksThisMonth.current,
        data.feedbacksThisMonth.max,
      )
    : { isNearLimit: false, isAtLimit: false };

  return {
    data,
    isError,
    isNearLimit: feedbackStatus.isNearLimit,
    isAtLimit: feedbackStatus.isAtLimit,
  };
}
```

- [ ] **Step 2: Verify the computed logic manually**

```bash
node -e "
function computeLimitStatus(current, max) {
  if (max === null) return { isNearLimit: false, isAtLimit: false };
  const ratio = current / max;
  return { isNearLimit: ratio >= 0.8, isAtLimit: current >= max };
}
console.assert(!computeLimitStatus(79, 100).isNearLimit,  '79% should NOT be near limit');
console.assert(computeLimitStatus(80, 100).isNearLimit,   '80% should be near limit');
console.assert(!computeLimitStatus(80, 100).isAtLimit,    '80% should NOT be at limit');
console.assert(computeLimitStatus(200, 200).isAtLimit,    '100% should be at limit');
console.assert(computeLimitStatus(200, 200).isNearLimit,  '100% should be near limit');
console.assert(!computeLimitStatus(999, null).isNearLimit,'unlimited should NOT be near limit');
console.assert(!computeLimitStatus(999, null).isAtLimit,  'unlimited should NOT be at limit');
console.log('All assertions passed');
"
```

Expected: `All assertions passed`

- [ ] **Step 3: Verify TypeScript**

```bash
cd d:/Work/fullstack-app/apps/web && pnpm typecheck 2>&1 | tail -5
```

Expected: no errors.

---

## Task 4: PlanLimitBanner component

**Files:**
- Create: `apps/web/src/components/plan-limit-banner.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/plan-limit-banner.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";
import { PlanUsageData } from "@/hooks/use-plan-usage";

interface PlanLimitBannerProps {
  data: PlanUsageData;
  isAtLimit: boolean;
}

function getDismissKey() {
  const now = new Date();
  return `plan_banner_dismissed_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function PlanLimitBanner({ data, isAtLimit }: PlanLimitBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(getDismissKey()) === "true");
  }, []);

  if (dismissed) return null;

  const { current, max } = data.feedbacksThisMonth;
  // max is guaranteed non-null here (caller checks isNearLimit which returns false for null)
  const percent = Math.round((current / max!) * 100);

  const message = isAtLimit
    ? `You've reached your monthly feedback limit (${current}/${max}). Upgrade to keep collecting.`
    : `You've used ${percent}% of your monthly feedback limit (${current}/${max}). Upgrade to continue collecting insights.`;

  const handleDismiss = () => {
    localStorage.setItem(getDismissKey(), "true");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => router.push("/pricing")}
        className="shrink-0 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition-colors"
      >
        Upgrade Plan
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 hover:text-amber-200 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd d:/Work/fullstack-app/apps/web && pnpm typecheck 2>&1 | tail -5
```

Expected: no errors.

---

## Task 5: PlanLimitModal component

**Files:**
- Create: `apps/web/src/components/plan-limit-modal.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/plan-limit-modal.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { X, Zap } from "lucide-react";

export interface PlanLimitErrorData {
  message: string;
  currentPlan: string;
  limit: number;
  current: number;
}

interface PlanLimitModalProps {
  open: boolean;
  onClose: () => void;
  errorData: PlanLimitErrorData | null;
}

export function PlanLimitModal({ open, onClose, errorData }: PlanLimitModalProps) {
  const router = useRouter();

  if (!open || !errorData) return null;

  const handleUpgrade = () => {
    onClose();
    router.push("/pricing");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Plan Limit Reached</h2>
          </div>

          <p className="text-zinc-300 text-sm leading-relaxed">
            {errorData.message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Upgrade Plan
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd d:/Work/fullstack-app/apps/web && pnpm typecheck 2>&1 | tail -5
```

Expected: no errors.

---

## Task 6: Wire everything into the dashboard + commit all feature code

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`

This task makes four changes to `dashboard/page.tsx`, then commits **all feature code** (Tasks 2–6) in one commit.

- [ ] **Step 1: Add imports**

At the top of `apps/web/src/app/dashboard/page.tsx`, add to the existing imports:

```tsx
import { toast } from "sonner";
import { usePlanUsage } from "@/hooks/use-plan-usage";
import { PlanLimitBanner } from "@/components/plan-limit-banner";
import { PlanLimitModal, PlanLimitErrorData } from "@/components/plan-limit-modal";
```

- [ ] **Step 2: Add planLimitError state and usePlanUsage**

Inside the `Dashboard` component, after the existing `useState` declarations (around line 34), add:

```tsx
const [planLimitError, setPlanLimitError] = useState<PlanLimitErrorData | null>(null);
const { data: planUsage, isNearLimit, isAtLimit } = usePlanUsage();
```

- [ ] **Step 3: Replace onError in createMutation**

Find the `onError` handler in `createMutation` (lines ~133–145). Replace:

```tsx
// REMOVE:
onError: (error: any) => {
  if (error.response?.data?.error === "PlanLimitExceeded") {
    if (
      confirm(
        `${error.response.data.message}\n\nWould you like to upgrade your plan?`,
      )
    ) {
      router.push("/pricing");
    }
  } else {
    alert("Failed to send feedback.");
  }
},
```

With:

```tsx
onError: (error: any) => {
  if (error.response?.data?.error === "PlanLimitExceeded") {
    setPlanLimitError(error.response.data);
  } else {
    toast.error("Failed to send feedback.");
  }
},
```

- [ ] **Step 4: Replace alert in deleteProjectMutation**

Find `onError` in `deleteProjectMutation` (line ~158). Replace:

```tsx
// REMOVE:
onError: () => {
  alert("Failed to delete project.");
},
```

With:

```tsx
onError: () => {
  toast.error("Failed to delete project.");
},
```

- [ ] **Step 5: Add PlanLimitBanner to JSX**

Inside the `<div className="flex-1 overflow-y-auto overflow-x-hidden w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8 sm:gap-10 max-w-full">` div, add the banner as the first child (before `{/* Header */}`):

```tsx
{/* Plan limit banner */}
{isNearLimit && planUsage && (
  <PlanLimitBanner data={planUsage} isAtLimit={isAtLimit} />
)}
```

- [ ] **Step 6: Add PlanLimitModal to JSX**

At the end of the component's returned JSX, just before the final `</div>` that closes the root `flex h-screen` div, add:

```tsx
<PlanLimitModal
  open={planLimitError !== null}
  onClose={() => setPlanLimitError(null)}
  errorData={planLimitError}
/>
```

- [ ] **Step 7: Verify TypeScript**

```bash
cd d:/Work/fullstack-app/apps/web && pnpm typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 8: Build**

```bash
cd d:/Work/fullstack-app/apps/web && pnpm build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 9: Commit all feature code in one commit**

```bash
cd d:/Work/fullstack-app && git add \
  apps/web/src/app/layout.tsx \
  apps/web/src/hooks/use-plan-usage.ts \
  apps/web/src/components/plan-limit-banner.tsx \
  apps/web/src/components/plan-limit-modal.tsx \
  apps/web/src/app/dashboard/page.tsx
git commit -m "feat: add plan limit CTA — banner at 80%, modal at 100%, sonner toasts"
```

---

## Task 7: Smoke test

- [ ] **Step 1: Start the app locally**

```bash
cd d:/Work/fullstack-app && docker compose up -d && pnpm dev
```

- [ ] **Step 2: Verify Toaster renders**

Open `http://localhost:3000/dashboard`. Open DevTools → Elements. Confirm there is a `[data-sonner-toaster]` element in the DOM.

- [ ] **Step 3: Verify banner shows at 80%**

Temporarily set the FREE plan feedback limit to `1` in `packages/database/src/plans/plan-config.ts`:

```typescript
// TEMPORARY — revert after testing
FREE: { maxFeedbacksPerMonth: 1, ... }
```

Restart the API (`pnpm dev` in `apps/api`). Make sure your account has 1 feedback submitted this month. Reload the dashboard — the amber `PlanLimitBanner` should appear at the top of the content area.

**Revert the plan config change after testing.**

- [ ] **Step 4: Verify modal on limit hit**

With the FREE plan limit still at `1`, submit a second feedback from the dashboard. Expected: `PlanLimitModal` opens with the API message, "Upgrade Plan" and "Maybe later" buttons. Click "Upgrade Plan" → navigates to `/pricing`. Click "Maybe later" → modal closes.

- [ ] **Step 5: Verify toast on generic error**

Stop the API (`Ctrl+C`). Try submitting feedback. Expected: `toast.error("Failed to send feedback.")` appears bottom-right. No `alert()` dialog.

---

## Environment Variables

No new env vars required. `GET /plans/usage` uses existing JWT auth.
