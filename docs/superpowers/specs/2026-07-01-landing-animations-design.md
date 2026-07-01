# Landing Page Animations — Design Spec

**Date:** 2026-07-01
**Scope:** `apps/landing` — Modern SaaS animation layer, no heavy dependencies

---

## Goal

Add scroll-triggered animations and visual flair to the InsightStream AI landing page. Style: modern B2B SaaS (Linear, Vercel, Resend). Principle: every animation must have a reason — guide attention, reward scroll, reinforce the product's technical credibility. No decorative noise.

---

## Tech Stack

- **Framer Motion** (already installed `^12.38.0`) — all entrance and hover animations
- **CSS keyframes** — background blob pulse (no JS overhead for ambient effects)
- **SVG `stroke-dashoffset`** — animated connector path in Solution section
- No new dependencies

---

## Animations by Section

### 1. Hero

**File:** `apps/landing/src/components/sections/Hero.tsx`

Current state: one static glow div + Framer Motion entrance (opacity/y) on headline, subtext, CTAs, mockup.

Changes:
- Replace the static glow `<div>` with **two animated blobs** using CSS keyframes:
  - Blob 1 (large, primary): centered, pulses between `scale(1)` and `scale(1.15)`, opacity 0.06 → 0.1, 8s ease-in-out infinite
  - Blob 2 (small, accent): offset bottom-left, counter-phase pulse, 6s ease-in-out infinite, `bg-brand-accent/5`
- Both blobs are `pointer-events-none`, `blur-[120px]`, absolute positioned
- Add the keyframe definition to a `<style>` tag in the component (scoped, no globals change needed)

```tsx
// keyframes
@keyframes blob-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.06; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.1; }
}
@keyframes blob-pulse-2 {
  0%, 100% { transform: scale(1); opacity: 0.04; }
  50% { transform: scale(1.2); opacity: 0.07; }
}
```

No changes to headline/CTA/mockup animations — those already work.

---

### 2. Trust

**File:** `apps/landing/src/components/sections/Trust.tsx`

Current state: completely static.

Changes:
- Wrap the section content in `motion.div` with `whileInView` + `viewport={{ once: true }}`
- Desktop row: each item (`motion.span`) gets staggered `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}` with `transition={{ delay: i * 0.1 }}`
- Mobile grid: same stagger per item
- Add `'use client'` directive (needed for Framer Motion)

---

### 3. Problem

**File:** `apps/landing/src/components/sections/Problem.tsx`

Current state: likely has `motion.div` entrance already — verify and enhance.

Changes:
- Each pain card: `whileInView` + `viewport={{ once: true }}` with `initial={{ opacity: 0, y: 24 }}`, stagger delay `i * 0.12s`
- Icon wrapper: `whileHover={{ scale: 1.1 }}` + add `drop-shadow` class on hover via Tailwind `group-hover:drop-shadow-[0_0_8px_#3d8a84]`
- Cards use `group` class on the card div so icon reacts to card hover

---

### 4. Solution — animated SVG connector

**File:** `apps/landing/src/components/sections/Solution.tsx`

Current state: 3 steps rendered as cards/items, no visual connector.

This is the most impactful new visual. A dashed horizontal SVG line connects the 3 steps and "draws" itself when the section enters the viewport.

Changes:
- Add an SVG connector between the 3 step items (desktop only, `hidden md:block`):
  ```tsx
  <svg width="100%" height="2" className="absolute top-8 left-0 hidden md:block pointer-events-none">
    <line
      x1="16.6%" y1="1" x2="83.3%" y2="1"
      stroke="#3d8a84" strokeWidth="1.5" strokeDasharray="6 4"
      strokeDashoffset={animated ? 0 : 200}
      style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
    />
  </svg>
  ```
- Use `useInView` from Framer Motion to trigger the animation when section enters viewport
- Steps stagger: delay 0 / 0.3 / 0.6s — each step appears after the line reaches it
- The section wrapper needs `position: relative` for SVG positioning

---

### 5. Features

**File:** `apps/landing/src/components/sections/Features.tsx`

Current state: 6-card grid, static or basic entrance.

Changes:
- Each feature card: `whileInView` + `viewport={{ once: true }}` with `initial={{ opacity: 0, y: 20 }}`, stagger `i * 0.08s` (6 cards × 80ms = 480ms total cascade — fast enough to feel snappy)
- Each card: `whileHover={{ y: -4 }}` (Framer Motion handles the spring)
- Add teal glow on hover via CSS: `hover:shadow-[0_0_20px_rgba(61,138,132,0.15)] hover:border-brand-primary/40 transition-all duration-300`
- No structural changes

---

### 6. Pricing

**File:** `apps/landing/src/components/sections/Pricing.tsx`

Current state: highlighted plan has `border-brand-primary/50 shadow-[...]` but it's static.

Changes:
- Add CSS pulse animation to the highlighted plan's border glow:
  ```css
  @keyframes pricing-glow {
    0%, 100% { box-shadow: 0 0 40px rgba(61,138,132,0.08); }
    50% { box-shadow: 0 0 60px rgba(61,138,132,0.18); }
  }
  ```
- Apply via inline style on the highlighted card: `style={{ animation: 'pricing-glow 3s ease-in-out infinite' }}`
- Add `<style>` tag in the component for the keyframe
- Non-highlighted cards: `whileHover={{ y: -2 }}` subtle lift
- Section entrance: `whileInView` + `viewport={{ once: true }}` fade-in on the whole pricing grid

---

### 7. Testimonials

**File:** `apps/landing/src/components/sections/Testimonials.tsx`

Current state: static cards (stars and disclaimer were added earlier).

Changes:
- Each testimonial card: `whileInView` with `initial={{ opacity: 0, y: 16 }}`, stagger `i * 0.15s`
- `whileHover={{ y: -2 }}` — subtle lift, no glow (keep it clean for social proof)
- Cards need `viewport={{ once: true }}` so they don't re-animate on scroll back

---

## Performance Notes

- All `whileInView` use `viewport={{ once: true }}` — animates once, no re-trigger
- CSS keyframes for blobs and pricing glow run on GPU (transform + opacity only)
- SVG path animation uses CSS transition, not JS
- No canvas, no requestAnimationFrame loops, no heavy libraries

---

## Files Changed

| File | Change type |
|---|---|
| `apps/landing/src/components/sections/Hero.tsx` | Enhance blob animations (CSS keyframes) |
| `apps/landing/src/components/sections/Trust.tsx` | Add staggered whileInView entrance |
| `apps/landing/src/components/sections/Problem.tsx` | Staggered cards + hover icon glow |
| `apps/landing/src/components/sections/Solution.tsx` | Animated SVG connector + staggered steps |
| `apps/landing/src/components/sections/Features.tsx` | Staggered grid + hover lift + teal glow |
| `apps/landing/src/components/sections/Pricing.tsx` | CSS pulse glow on highlighted + entrance |
| `apps/landing/src/components/sections/Testimonials.tsx` | Staggered cards + hover lift |

---

## Out of Scope

- Particle systems / canvas effects
- Typewriter animations on headlines
- Parallax on content blocks
- Real product screenshots / photography
- Lottie animations
- QuizCta, Footer, Nav — no changes
