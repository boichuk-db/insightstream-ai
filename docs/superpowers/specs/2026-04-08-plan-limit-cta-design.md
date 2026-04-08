# Plan Limit CTA — Design Spec

**Date:** 2026-04-08  
**Status:** Approved  
**Scope:** `apps/web` (frontend), `apps/api` (no changes needed — endpoint exists)

---

## Problem

When users hit their plan limits, they see native `window.confirm()` / `window.alert()` dialogs — unstyled browser popups with no brand consistency and poor UX. There is no proactive warning before hitting the limit. This causes lost upgrade conversions.

---

## Goals

1. **Proactive:** Show a dismissible banner when usage ≥ 80% of monthly feedback limit
2. **Reactive:** Show a styled modal when a `PlanLimitExceeded` error is returned (403)
3. **Polish:** Replace all `window.alert()` / `window.confirm()` with `sonner` toasts

---

## Non-Goals

- In-app plan selection flow (upgrade goes to `/pricing`)
- Limits on projects or team members (feedback is the primary conversion blocker for now)

---

## API

`GET /plans/usage` already exists at `apps/api/src/modules/plans/plans.controller.ts`.

**Response shape:**
```json
{
  "plan": "FREE",
  "planName": "Free",
  "price": 0,
  "projects": { "current": 1, "max": 1 },
  "feedbacksThisMonth": { "current": 180, "max": 200 },
  "features": { "aiAnalysis": "basic", "weeklyDigest": false, ... }
}
```

`max: null` means unlimited (BUSINESS plan). No API changes required.

---

## New Dependency

**`sonner`** — lightweight toast library (~3kb), built for React/Next.js, works with Tailwind.

```bash
pnpm add sonner --filter web
```

---

## New Files

### `apps/web/src/hooks/use-plan-usage.ts`

TanStack Query hook that fetches `GET /plans/usage`.

- `staleTime`: 60 seconds
- `gcTime`: 5 minutes
- Returns: `{ data, isNearLimit, isAtLimit }`
  - `isNearLimit`: `feedbacksThisMonth.current / feedbacksThisMonth.max >= 0.8` (false if max is null)
  - `isAtLimit`: `feedbacksThisMonth.current >= feedbacksThisMonth.max` (false if max is null)

### `apps/web/src/components/plan-limit-banner.tsx`

Dismissible amber/yellow banner shown at the top of the dashboard when `isNearLimit`.

- Shows: "You've used X% of your monthly feedback limit (N/M). Upgrade to continue collecting insights." When `isAtLimit` is true, message changes to: "You've reached your monthly feedback limit (N/N). Upgrade to keep collecting."
- Two buttons: "Upgrade Plan" (→ `/pricing`) and "×" (dismiss)
- Dismiss stores `plan_banner_dismissed_YYYY-MM` in `localStorage` — auto-resets each month
- Does NOT render when `isNearLimit` is false or when dismissed this month
- Does NOT render for unlimited plans (max === null)

### `apps/web/src/components/plan-limit-modal.tsx`

Blocking modal shown when a `PlanLimitExceeded` error is received.

- Props: `open: boolean`, `onClose: () => void`, `errorData: { message, currentPlan, limit, current } | null`
- Shows: error message from API + "Upgrade Plan" button (→ `/pricing`, closes modal) + "Maybe later" button (closes modal)
- Implementation: fixed overlay (`position: fixed, inset-0, bg-black/50`), centered card with Tailwind, no external modal library

---

## Modified Files

### `apps/web/src/app/layout.tsx`

Add `<Toaster />` from `sonner` inside the root layout (after `<body>`).

```tsx
import { Toaster } from 'sonner';
// ...
<Toaster position="bottom-right" richColors />
```

### `apps/web/src/app/dashboard/page.tsx`

Three changes:

1. **Replace `window.confirm()` + `window.alert()` with sonner toasts:**
   - `confirm(...)` block → open `<PlanLimitModal />` with error data
   - `alert("Failed to send feedback.")` → `toast.error("Failed to send feedback")`
   - `alert("Failed to delete project.")` → `toast.error("Failed to delete project")`

2. **Add `<PlanLimitBanner />`** at the top of the dashboard content area (below the header)

3. **Add `<PlanLimitModal />`** with state: `planLimitError` (null or error data), controlled by `onError` callback

---

## Data Flow

### Proactive (80% banner)

```
Dashboard mounts
  → usePlanUsage() fetches GET /plans/usage
  → if feedbacksThisMonth.current / max >= 0.8
    → isNearLimit = true
    → PlanLimitBanner renders
    → user clicks "×" → localStorage key set → banner hidden for month
```

### Reactive (100% modal)

```
User submits feedback
  → POST /feedback/public returns 403 { error: "PlanLimitExceeded", message, currentPlan, limit, current }
  → TanStack Query onError fires
  → setPlanLimitError(error.response.data)
  → PlanLimitModal opens
  → user clicks "Upgrade Plan" → router.push("/pricing") + modal closes
  → user clicks "Maybe later" → modal closes
```

---

## Edge Cases

- **BUSINESS plan** (unlimited): `max === null` → `isNearLimit` and `isAtLimit` always false → no banner, no modal
- **`/plans/usage` request fails**: fail silently — `isNearLimit` defaults to false, dashboard still loads
- **Modal while navigating**: modal closes on route change (use `useEffect` cleanup or `onClose` in `router.push`)
- **Banner dismiss resets monthly**: localStorage key includes `YYYY-MM` suffix, so it re-appears next month automatically

---

## Testing

- `use-plan-usage.ts`: unit tests for `isNearLimit` at 79% (false), 80% (true), 100% (true), null max (false)
- `plan-limit-banner.tsx`: renders when `isNearLimit`, hidden after dismiss, does not render for unlimited
- `plan-limit-modal.tsx`: renders with error data, "Upgrade Plan" navigates to `/pricing`, "Maybe later" closes

---

## Out of Scope

- Project limit CTA (only feedback limit for now)
- Team member limit CTA
- Email notification when approaching limit
- Stripe integration or payment flow
