# Landing Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scroll-triggered animations and teal blob visual flair to all 7 landing sections.

**Architecture:** Framer Motion (already installed) handles all entrance and hover animations via `whileInView` / `whileHover`. CSS keyframes handle ambient background blobs and the Pricing glow — no JS needed for those. The Solution SVG connector uses `useInView` + CSS transition on `strokeDashoffset` to draw a line between steps on scroll.

**Tech Stack:** Framer Motion `^12.38.0` (already installed), CSS keyframes, SVG stroke animation, Next.js 16 App Router.

---

## File Map

| File | What changes |
|---|---|
| `apps/landing/src/components/sections/Hero.tsx` | Replace static glow div with 2 CSS-animated blobs |
| `apps/landing/src/components/sections/Trust.tsx` | Add `'use client'` + staggered `whileInView` on 4 items |
| `apps/landing/src/components/sections/Problem.tsx` | Add `group` + icon hover glow (already has card stagger) |
| `apps/landing/src/components/sections/Solution.tsx` | Add `useInView` + animated SVG connector between 3 steps |
| `apps/landing/src/components/sections/Features.tsx` | Add `whileHover={{ y: -4 }}` + teal glow on hover |
| `apps/landing/src/components/sections/Pricing.tsx` | Add CSS pulse glow on highlighted plan + fix rgba colour |
| `apps/landing/src/components/sections/Testimonials.tsx` | Add `whileHover={{ y: -2 }}` on cards |

---

### Task 1: Hero — animated teal blobs

**Files:**
- Modify: `apps/landing/src/components/sections/Hero.tsx`

The current file has one static glow div at line 28. Replace it with two animated blobs and a scoped `<style>` tag.

- [ ] **Step 1: Open the file and replace the static blob div with two animated blobs**

Replace lines 27–28 (the `<section>` open tag and the single static glow `<div>`):

```tsx
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-6 overflow-hidden">
      <style>{`
        @keyframes blob-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.06; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.11; }
        }
        @keyframes blob-pulse-2 {
          0%, 100% { transform: scale(1); opacity: 0.04; }
          50% { transform: scale(1.25); opacity: 0.08; }
        }
      `}</style>
      {/* Primary blob — centred */}
      <div
        className="absolute top-1/3 left-1/2 w-[700px] h-[500px] bg-brand-primary rounded-full blur-[120px] pointer-events-none"
        style={{ animation: 'blob-pulse 8s ease-in-out infinite' }}
      />
      {/* Secondary blob — offset bottom-left */}
      <div
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-brand-accent rounded-full blur-[100px] pointer-events-none"
        style={{ animation: 'blob-pulse-2 6s ease-in-out infinite' }}
      />
```

Everything else in the file stays exactly the same.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter landing typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Hero.tsx
git commit -m "feat(landing): Hero — animated teal blobs"
```

---

### Task 2: Trust — staggered entrance

**Files:**
- Modify: `apps/landing/src/components/sections/Trust.tsx`

Currently static (no `'use client'`, no animations). Replace the entire file:

- [ ] **Step 1: Replace Trust.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'

const ITEMS = [
  'Built for product teams',
  'AI-powered analysis',
  'Embeddable in 5 minutes',
  '14-day free trial, no card required',
]

export function Trust() {
  return (
    <section className="py-8 border-y border-brand-border">
      <div className="max-w-4xl mx-auto px-6">
        {/* Desktop: horizontal row */}
        <div className="hidden sm:flex items-center justify-center gap-6 flex-wrap">
          {ITEMS.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-6"
            >
              <span className="text-sm font-semibold text-zinc-300">{label}</span>
              {i < ITEMS.length - 1 && (
                <span className="text-zinc-700">·</span>
              )}
            </motion.div>
          ))}
        </div>
        {/* Mobile: 2×2 grid */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {ITEMS.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="text-center"
            >
              <span className="text-sm font-semibold text-zinc-300">{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter landing typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Trust.tsx
git commit -m "feat(landing): Trust — staggered whileInView entrance"
```

---

### Task 3: Problem — icon hover glow

**Files:**
- Modify: `apps/landing/src/components/sections/Problem.tsx`

Cards already have stagger + whileInView. Add `group` class to cards and icon hover glow:

- [ ] **Step 1: Add group + icon hover to Problem.tsx**

Replace lines 36–49 (the `PAINS.map` block inside the grid):

```tsx
        <div className="grid md:grid-cols-3 gap-8">
          {PAINS.map((pain, i) => (
            <motion.div
              key={pain.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="group bg-zinc-900 border border-brand-border rounded-2xl p-6"
            >
              <motion.div whileHover={{ scale: 1.12 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                <pain.icon className="h-6 w-6 text-brand-accent mb-4 group-hover:drop-shadow-[0_0_8px_#6eb5af] transition-all" />
              </motion.div>
              <h3 className="font-bold text-lg mb-2">{pain.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{pain.description}</p>
            </motion.div>
          ))}
        </div>
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter landing typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Problem.tsx
git commit -m "feat(landing): Problem — icon hover glow"
```

---

### Task 4: Solution — animated SVG connector

**Files:**
- Modify: `apps/landing/src/components/sections/Solution.tsx`

This is the most impactful change. A dashed teal SVG line draws itself across the 3 steps when the section enters the viewport.

- [ ] **Step 1: Replace Solution.tsx entirely**

```tsx
'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Code2, Sparkles, LayoutDashboard } from 'lucide-react'

const STEPS = [
  {
    num: '01',
    icon: Code2,
    title: 'Embed the widget',
    description:
      'One script tag. Your users can submit feedback directly inside your app — no context switching, no extra tools.',
  },
  {
    num: '02',
    icon: Sparkles,
    title: 'AI analyzes everything',
    description:
      "Gemini AI reads every piece of feedback, categorizes it, detects sentiment, and surfaces patterns you'd never find manually.",
  },
  {
    num: '03',
    icon: LayoutDashboard,
    title: 'Act on clear insights',
    description:
      'A Kanban board, weekly AI digest, and analytics overview give your team everything needed to make confident product decisions.',
  },
]

export function Solution() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">The solution</div>
          <h2 className="text-3xl sm:text-4xl font-bold">From raw feedback to clear decisions</h2>
        </div>
        <div ref={ref} className="relative grid md:grid-cols-3 gap-8">
          {/* Animated SVG connector — desktop only, sits behind step numbers */}
          <svg
            className="absolute top-[36px] left-0 w-full hidden md:block pointer-events-none"
            height="2"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1="20%"
              y1="1"
              x2="80%"
              y2="1"
              stroke="#3d8a84"
              strokeWidth="1.5"
              strokeDasharray="1000"
              strokeDashoffset={isInView ? 0 : 1000}
              style={{ transition: 'stroke-dashoffset 1.2s ease-out 0.4s' }}
            />
          </svg>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.3 + 0.3 }}
              className="relative"
            >
              <div className="text-6xl font-black text-zinc-800 mb-4">{step.num}</div>
              <step.icon className="h-6 w-6 text-brand-accent mb-3" />
              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

Note: `top-[36px]` aligns the line with the vertical centre of the step number (`text-6xl` ≈ 72px tall, half = 36px). The SVG connector spans from 20%–80% of the grid width to avoid clipping into the first/last card text.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter landing typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Solution.tsx
git commit -m "feat(landing): Solution — animated SVG connector between steps"
```

---

### Task 5: Features — hover lift + teal glow

**Files:**
- Modify: `apps/landing/src/components/sections/Features.tsx`

Cards already have whileInView stagger. Add `whileHover` lift and teal border glow:

- [ ] **Step 1: Update the FEATURES.map block**

Replace lines 33–46 (the `motion.div` inside the grid):

```tsx
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-zinc-900 border border-brand-border rounded-xl p-6 hover:border-brand-primary/40 hover:shadow-[0_0_20px_rgba(61,138,132,0.12)] transition-all duration-300 cursor-default"
            >
              <div className="mb-3">{ICON_MAP[f.icon]}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-zinc-500 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter landing typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Features.tsx
git commit -m "feat(landing): Features — hover lift and teal glow"
```

---

### Task 6: Pricing — CSS pulse glow on highlighted plan

**Files:**
- Modify: `apps/landing/src/components/sections/Pricing.tsx`

The highlighted plan card currently has a static shadow with an old indigo rgba value. Replace with an animated teal pulse:

- [ ] **Step 1: Add `<style>` tag with keyframe and update the highlighted card className**

At the top of the `return` statement, add a `<style>` tag. Then update the `motion.div` `className` to use `pricing-glow` animation and fix the rgba colour.

The full updated `Pricing` component `return` block (replace from `return (` to the closing `)`):

```tsx
  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <style>{`
        @keyframes pricing-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(61,138,132,0.08); }
          50%       { box-shadow: 0 0 60px rgba(61,138,132,0.20); }
        }
      `}</style>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Pricing</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Simple, transparent pricing</h2>
          <p className="text-zinc-400 mt-3">Start free, upgrade when you need more power. No hidden fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_ORDER.map((planType, i) => {
            const config = PLAN_CONFIGS[planType]
            const isHighlighted = config.name === highlightedPlan
            return (
              <motion.div
                key={planType}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={!isHighlighted ? { y: -2 } : undefined}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col bg-zinc-900 rounded-2xl p-7 border ${
                  isHighlighted
                    ? 'border-brand-primary/50 md:-mt-4'
                    : 'border-brand-border'
                }`}
                style={isHighlighted ? { animation: 'pricing-glow 3s ease-in-out infinite' } : undefined}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-primary text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1">{config.name}</h3>
                <p className="text-sm text-zinc-500 mb-6">{config.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">
                    {config.price === 0 ? 'Free' : `$${config.price}`}
                  </span>
                  {config.price > 0 && <span className="text-zinc-500 text-sm">/month</span>}
                </div>
                <div className="flex-1 space-y-3 mb-8">
                  {FEATURES.map(({ key, label }) => {
                    const display = formatValue(key, config[key as keyof typeof config])
                    const enabled = display !== false
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {enabled ? (
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-zinc-700 shrink-0" />
                        )}
                        <span className={enabled ? 'text-zinc-300' : 'text-zinc-600'}>
                          {typeof display === 'string' ? `${label}: ${display}` : label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <a
                  href={`${APP_URL}/?plan=${planType.toLowerCase()}`}
                  className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-colors ${
                    isHighlighted
                      ? 'bg-brand-primary hover:bg-brand-primary/90 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {config.price === 0 ? 'Get Started Free' : 'Start 14-day Trial'}
                </a>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter landing typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Pricing.tsx
git commit -m "feat(landing): Pricing — animated teal pulse glow on highlighted plan"
```

---

### Task 7: Testimonials — hover lift

**Files:**
- Modify: `apps/landing/src/components/sections/Testimonials.tsx`

Cards already have whileInView stagger. Add `whileHover` lift only:

- [ ] **Step 1: Add whileHover to testimonial cards**

Replace lines 36–43 (the `motion.div` opening tag for each testimonial):

```tsx
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-zinc-900 border border-brand-border rounded-2xl p-6"
            >
```

Everything inside the card (stars, quote, avatar) stays unchanged.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter landing typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Testimonials.tsx
git commit -m "feat(landing): Testimonials — hover lift"
```

---

### Task 8: Final verification

**Files:** none modified.

- [ ] **Step 1: Full typecheck**

```bash
pnpm --filter landing typecheck
```

Expected: no errors.

- [ ] **Step 2: Run tests**

```bash
pnpm --filter landing test
```

Expected: 5/5 passing (quiz utils — no logic changed).

- [ ] **Step 3: Push**

```bash
git push
```

- [ ] **Step 4: Manual smoke test**

Start landing dev server: `pnpm --filter landing dev`

Open http://localhost:3002 and verify:
- Hero: two teal blobs pulse softly in background
- Trust: 4 items fade in with stagger on scroll
- Problem: cards stagger in; hovering a card glows + scales the icon
- Solution: SVG line draws across from left when section appears
- Features: cards stagger in; hover lifts card and shows teal border glow
- Pricing: highlighted plan breathes with teal pulse; other plans lift on hover
- Testimonials: cards stagger in; hover lifts slightly
