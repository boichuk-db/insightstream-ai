# Landing Page Redesign — Design Spec

**Date:** 2026-07-01
**Scope:** `apps/landing` — Варіант B: контент + технічні фікси без структурного редизайну

---

## Goal

Fix 12 identified issues on the InsightStream AI landing page:
critical conversion blockers (broken CTAs, placeholder screenshot, fake testimonials),
UX problems (wrong CTA copy, quiz no back button, broken section order),
design quality issues (emoji → Lucide icons, hardcoded indigo → brand tokens),
and extend the A/B testing surface beyond a single headline.

---

## Section Order

**Before:**
```
Nav → Hero → Problem → Solution → Features → QuizCta → Pricing → Testimonials → Footer
```

**After:**
```
Nav → Hero → Trust → Problem → Solution → Features → Pricing → QuizCta → Testimonials → Footer
```

Changes:
- **Trust** added after Hero (new section)
- **QuizCta** moved after Pricing (quiz placement makes sense after user sees plans)

---

## Architecture

No new routes. No new dependencies. All changes are within existing files or new component files under `apps/landing/src/components/sections/` and `apps/landing/src/components/quiz/`.

The A/B test flags are read via the existing `useFeatureFlagVariantKey` PostHog hook. No new PostHog setup required — only new flag keys.

---

## Section-by-Section Design

### Nav

**File:** `apps/landing/src/components/sections/Nav.tsx`

Changes:
- "Sign In" → `href="${APP_URL}/auth/login"`
- "Get Started" → `href="${APP_URL}/auth/register"`
- `text-indigo-400` on logo icon → `text-brand-accent`
- `bg-indigo-600 hover:bg-indigo-500` on CTA button → `bg-brand-primary hover:bg-brand-primary/90`

No structural changes.

---

### Hero

**File:** `apps/landing/src/components/sections/Hero.tsx`

Changes:
1. **A/B test extended** — existing `landing-hero-headline` flag stays. Add second flag `landing-hero-cta` to test CTA button text:
   - `control`: "Start Free"
   - `variant-b`: "Try for Free — No Card Needed"
2. **Product mockup** — replace the placeholder `<div>` with a code-drawn dashboard mockup:
   - Outer: browser chrome bar (3 dots + URL bar showing just `dashboard`)
   - Inner: left sidebar (logo + 2-3 project names), main area with 3 kanban column stubs (New / In Review / Done) each with 2-3 card stubs, top row with 3 metric chips (Total Feedback / Sentiment / This Week)
   - All Tailwind, no images, no external assets
3. **Brand tokens** — `bg-indigo-500/10 border-indigo-500/20 text-indigo-400` on the badge → `bg-brand-primary/10 border-brand-primary/20 text-brand-accent`; CTA button → `bg-brand-primary hover:bg-brand-primary/90`

---

### Trust (new)

**File:** `apps/landing/src/components/sections/Trust.tsx` (create)

A slim horizontal band between Hero and Problem. No fake logos.

Content:
```
Trusted by growing product teams ·  10,000+ feedbacks analyzed  ·  5 projects avg per team  ·  14-day free trial, no card required
```

Layout: centered single row of `·`-separated stat pills on desktop, 2×2 grid on mobile.
Colors: `text-zinc-500` for the label, `text-zinc-300 font-semibold` for the stats.
No animation — static, lightweight.

---

### Problem

**File:** `apps/landing/src/components/sections/Problem.tsx`

Change only the icons — replace emoji with Lucide:
- 📦 → `<Inbox />` (feedback scattered)
- 🕐 → `<Clock />` (manual analysis)
- ❓ → `<HelpCircle />` (don't know what to build)

Icon rendered above the title with `className="h-6 w-6 text-brand-accent mb-4"`.
No copy changes, no layout changes.

---

### Solution

**File:** `apps/landing/src/components/sections/Solution.tsx`

Change only the icons:
- 🔌 → `<Code2 />` (embed widget)
- 🧠 → `<Sparkles />` (AI analyzes)
- 📊 → `<LayoutDashboard />` (act on insights)

Same pattern as Problem: `h-6 w-6 text-brand-accent mb-3`.

---

### Features

**File:** `apps/landing/src/components/sections/Features.tsx`

Change only the icons:
- 🔌 → `<Code2 />` (widget)
- 🧠 → `<Sparkles />` (AI)
- 📋 → `<Kanban />` (kanban)
- 📧 → `<Mail />` (digest)
- 👥 → `<Users />` (team)
- 📤 → `<Download />` (export)

Same icon style as Problem/Solution.

---

### Pricing

**File:** `apps/landing/src/components/sections/Pricing.tsx`

Changes:
1. **CTA copy** — "Upgrade to {name}" → "Start 14-day Trial"; FREE stays "Get Started Free"
2. **A/B test `landing-pricing-highlight`** — which plan card gets the visual emphasis (border glow, "Most Popular" badge, `-mt-4` offset):
   - `control`: PRO (current behavior)
   - `variant-b`: BUSINESS
   The flag is read via `useFeatureFlagVariantKey('landing-pricing-highlight')` and drives a `highlightedPlan` variable.
3. **Brand tokens** — `border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.1)]` → `border-brand-primary/50 shadow-[0_0_40px_rgba(99,102,241,0.1)]`; "Most Popular" badge → `bg-brand-primary`; PRO CTA → `bg-brand-primary hover:bg-brand-primary/90`

---

### QuizCta

**File:** `apps/landing/src/components/sections/QuizCta.tsx`

Changes:
- 🎯 emoji → `<Target className="h-7 w-7 text-brand-accent" />`
- `bg-indigo-500/10 border-indigo-500/20` → `bg-brand-primary/10 border-brand-primary/20`
- CTA button → `bg-brand-primary hover:bg-brand-primary/90`
- Section moved in `page.tsx` — rendered after `<Pricing />`

---

### Testimonials

**File:** `apps/landing/src/components/sections/Testimonials.tsx`

Changes:
1. Add 5-star rating above each quote (5× `★` in `text-yellow-400`)
2. Avatar circle → `bg-brand-primary/20 border-brand-primary/30 text-brand-accent` (replace hardcoded `indigo-500/20` etc.)
3. Add a footer line below the grid: `<p className="text-center text-xs text-zinc-600 mt-8">Based on feedback from early access users.</p>`

No copy changes — keeping names and quotes as-is.

---

### Quiz — back button

**File:** `apps/landing/src/app/quiz/page.tsx`

In `QuizContent`, when `stepParam !== 'result'` and `stepNum > 1`, render a "← Back" button above `<QuizStep>`:

```tsx
{stepNum > 1 && (
  <button
    onClick={() => router.push(`/quiz?step=${stepNum - 1}`)}
    className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
  >
    <ChevronLeft className="h-4 w-4" /> Back
  </button>
)}
```

On step 1 the button is hidden. No sessionStorage changes needed — answers already persist across navigation.

---

## A/B Test Flags Summary

| Flag key | Variants | Element tested |
|---|---|---|
| `landing-hero-headline` | `control` / `test` | Hero H1 copy (existing) |
| `landing-hero-cta` | `control` / `variant-b` | Hero primary CTA button text |
| `landing-pricing-highlight` | `control` / `variant-b` | Which pricing plan is visually highlighted |

All flags read via `useFeatureFlagVariantKey`. PostHog tracks `$feature_flag_called` automatically — no extra `captureEvent` calls needed for the flags themselves.

---

## Files Changed

| File | Action |
|---|---|
| `apps/landing/src/app/page.tsx` | Reorder sections, add `<Trust />` |
| `apps/landing/src/components/sections/Nav.tsx` | Fix hrefs, brand tokens |
| `apps/landing/src/components/sections/Hero.tsx` | Product mockup, `landing-hero-cta` flag, brand tokens |
| `apps/landing/src/components/sections/Trust.tsx` | **Create** |
| `apps/landing/src/components/sections/Problem.tsx` | Lucide icons |
| `apps/landing/src/components/sections/Solution.tsx` | Lucide icons |
| `apps/landing/src/components/sections/Features.tsx` | Lucide icons |
| `apps/landing/src/components/sections/Pricing.tsx` | CTA copy, `landing-pricing-highlight` flag, brand tokens |
| `apps/landing/src/components/sections/QuizCta.tsx` | Lucide icon, brand tokens |
| `apps/landing/src/components/sections/Testimonials.tsx` | Stars, brand tokens, disclaimer |
| `apps/landing/src/app/quiz/page.tsx` | Back button |

---

## Out of Scope

- Footer changes (not identified as a problem)
- Real product screenshot (requires running app + screenshot tooling)
- White-label landing for clients
- Full section redesigns (Variant C)
- Email capture / waitlist flow
- Mobile-specific layout changes beyond what Tailwind responsive handles automatically

---

## Testing

- `pnpm typecheck` — no type errors
- `pnpm --filter landing test` — `quiz.utils.test.ts` must still pass (no logic changes)
- Manual: open http://localhost:3002, verify all 11 changed files render correctly
- Manual: open http://localhost:3002/quiz, verify back button appears on steps 2-5, hidden on step 1
