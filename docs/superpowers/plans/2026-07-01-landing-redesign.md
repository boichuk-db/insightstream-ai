# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 12 identified issues on the InsightStream AI landing page — broken CTAs, placeholder screenshot, emoji icons, hardcoded indigo colors, quiz UX, and extend A/B testing surface.

**Architecture:** Variant B — 11 existing files modified, 1 new file created (`Trust.tsx`). No new dependencies, no new routes. All A/B flags use existing PostHog `useFeatureFlagVariantKey` hook.

**Tech Stack:** Next.js 16 App Router, React 19, TailwindCSS 4, Framer Motion, Lucide React, PostHog

---

## File Map

| File | Action |
|---|---|
| `apps/landing/src/components/sections/Nav.tsx` | Fix hrefs, brand tokens |
| `apps/landing/src/components/sections/Hero.tsx` | Product mockup, `landing-hero-cta` flag, brand tokens |
| `apps/landing/src/components/sections/Trust.tsx` | **Create** — new section |
| `apps/landing/src/components/sections/Problem.tsx` | Lucide icons |
| `apps/landing/src/components/sections/Solution.tsx` | Lucide icons |
| `apps/landing/src/components/sections/Features.tsx` | Lucide icons |
| `apps/landing/src/components/sections/Pricing.tsx` | CTA copy, `landing-pricing-highlight` flag, brand tokens |
| `apps/landing/src/components/sections/QuizCta.tsx` | Lucide icon, brand tokens |
| `apps/landing/src/components/sections/Testimonials.tsx` | Stars, brand tokens, disclaimer |
| `apps/landing/src/app/quiz/page.tsx` | Back button |
| `apps/landing/src/app/page.tsx` | Add Trust, reorder sections |

---

## Task 1: Fix Nav — hrefs and brand tokens

**Files:**
- Modify: `apps/landing/src/components/sections/Nav.tsx`

- [ ] **Step 1: Replace Nav.tsx**

```tsx
import { Sparkles } from 'lucide-react'
import { APP_URL } from '@/lib/constants'

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-brand-border bg-brand-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-5 w-5 text-brand-accent" />
          InsightStream
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${APP_URL}/auth/login`}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </a>
          <a
            href={`${APP_URL}/auth/register`}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Nav.tsx
git commit -m "fix(landing): Nav — correct Sign In/Get Started hrefs, brand tokens"
```

---

## Task 2: Hero — product mockup, CTA A/B flag, brand tokens

**Files:**
- Modify: `apps/landing/src/components/sections/Hero.tsx`

- [ ] **Step 1: Replace Hero.tsx**

```tsx
'use client'

import { useFeatureFlagVariantKey } from 'posthog-js/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { APP_URL } from '@/lib/constants'

const HEADLINES = {
  control: 'Turn every feedback into actionable insights.',
  test: 'Stop guessing. Start knowing. AI feedback analytics for B2B teams.',
} as const

const CTA_TEXT = {
  control: 'Start Free',
  'variant-b': 'Try for Free — No Card Needed',
} as const

export function Hero() {
  const headlineVariant = useFeatureFlagVariantKey('landing-hero-headline')
  const ctaVariant = useFeatureFlagVariantKey('landing-hero-cta')

  const headline = headlineVariant === 'test' ? HEADLINES.test : HEADLINES.control
  const ctaText = ctaVariant === 'variant-b' ? CTA_TEXT['variant-b'] : CTA_TEXT.control

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-6 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-accent text-xs font-semibold mb-8"
        >
          ✨ AI-Powered Feedback Analytics
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6"
        >
          {headline}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10"
        >
          Collect feedback with an embeddable widget, analyze it with AI, and get
          weekly digests that turn noise into decisions.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href={`${APP_URL}/auth/register`}
            className="px-8 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl transition-colors text-lg flex items-center gap-2"
          >
            {ctaText} <ArrowRight className="h-5 w-5" />
          </a>
          <Link
            href="/quiz"
            className="px-8 py-4 border border-brand-border hover:border-zinc-500 text-zinc-300 font-semibold rounded-xl transition-colors text-lg"
          >
            Find my plan →
          </Link>
        </motion.div>

        {/* Code-drawn dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 rounded-2xl border border-brand-border bg-zinc-900 overflow-hidden shadow-2xl"
        >
          {/* Browser chrome */}
          <div className="h-8 bg-zinc-800 flex items-center gap-1.5 px-4 border-b border-brand-border">
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="mx-auto text-xs text-zinc-600 bg-zinc-700/50 rounded px-3 py-0.5">
              dashboard
            </div>
          </div>
          {/* Dashboard layout */}
          <div className="flex h-72">
            {/* Sidebar */}
            <div className="w-44 bg-zinc-900 border-r border-brand-border p-3 flex flex-col gap-1 shrink-0">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">
                Projects
              </div>
              {['Mobile App', 'Web Dashboard', 'API Docs'].map((name, i) => (
                <div
                  key={name}
                  className={`text-xs px-2 py-1.5 rounded-md ${
                    i === 0
                      ? 'bg-brand-primary/20 text-brand-accent font-medium'
                      : 'text-zinc-500'
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
              {/* Metrics row */}
              <div className="flex gap-3">
                {[
                  { label: 'Total Feedback', value: '1,284' },
                  { label: 'Avg Sentiment', value: '4.2 / 5' },
                  { label: 'This Week', value: '+48' },
                ].map((metric) => (
                  <div key={metric.label} className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 min-w-0">
                    <div className="text-xs text-zinc-500 truncate">{metric.label}</div>
                    <div className="text-sm font-bold text-zinc-200">{metric.value}</div>
                  </div>
                ))}
              </div>
              {/* Kanban columns */}
              <div className="flex gap-3 flex-1 overflow-hidden">
                {[
                  { col: 'New', count: 3, color: 'bg-blue-500/20 text-blue-400' },
                  { col: 'In Review', count: 2, color: 'bg-yellow-500/20 text-yellow-400' },
                  { col: 'Done', count: 4, color: 'bg-emerald-500/20 text-emerald-400' },
                ].map(({ col, count, color }) => (
                  <div
                    key={col}
                    className="flex-1 bg-zinc-800/50 rounded-lg p-2 flex flex-col gap-2 min-w-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-zinc-400">{col}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
                        {count}
                      </span>
                    </div>
                    {Array.from({ length: Math.min(count, 2) }).map((_, i) => (
                      <div key={i} className="bg-zinc-700/60 rounded p-2">
                        <div className="h-1.5 bg-zinc-600 rounded w-3/4 mb-1" />
                        <div className="h-1.5 bg-zinc-600/50 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Hero.tsx
git commit -m "feat(landing): Hero — product mockup, landing-hero-cta A/B flag, brand tokens"
```

---

## Task 3: Create Trust section

**Files:**
- Create: `apps/landing/src/components/sections/Trust.tsx`

- [ ] **Step 1: Create Trust.tsx**

```tsx
const STATS = [
  'AI-powered analysis',
  'Embeddable in 5 minutes',
  '14-day free trial, no card required',
]

export function Trust() {
  return (
    <section className="py-8 px-6 border-t border-brand-border">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <span className="text-zinc-500">Built for product teams</span>
        {STATS.map((stat) => (
          <span key={stat} className="flex items-center gap-2 text-zinc-300 font-medium">
            <span className="text-brand-accent">·</span>
            {stat}
          </span>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Trust.tsx
git commit -m "feat(landing): add Trust section — product facts strip below Hero"
```

---

## Task 4: Update page.tsx — add Trust, reorder sections

**Files:**
- Modify: `apps/landing/src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx**

```tsx
import { Nav } from '@/components/sections/Nav'
import { Hero } from '@/components/sections/Hero'
import { Trust } from '@/components/sections/Trust'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Features } from '@/components/sections/Features'
import { Pricing } from '@/components/sections/Pricing'
import { QuizCta } from '@/components/sections/QuizCta'
import { Testimonials } from '@/components/sections/Testimonials'
import { Footer } from '@/components/sections/Footer'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'InsightStream AI',
  applicationCategory: 'BusinessApplication',
  description:
    'AI-powered feedback analytics platform. Collect user feedback with an embeddable widget, analyze with AI, get weekly digests.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free plan available. Paid plans from $9/month.',
  },
  operatingSystem: 'Web',
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        <Hero />
        <Trust />
        <Problem />
        <Solution />
        <Features />
        <Pricing />
        <QuizCta />
        <Testimonials />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/app/page.tsx
git commit -m "feat(landing): add Trust to page, move QuizCta after Pricing"
```

---

## Task 5: Problem — replace emoji with Lucide icons

**Files:**
- Modify: `apps/landing/src/components/sections/Problem.tsx`

- [ ] **Step 1: Replace Problem.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'
import { Inbox, Clock, HelpCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const PAINS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Inbox,
    title: 'Feedback scattered everywhere',
    description:
      'Emails, Slack messages, support tickets, surveys — feedback lives in silos with no central place to see the big picture.',
  },
  {
    icon: Clock,
    title: 'Manual analysis takes hours',
    description:
      'Reading through hundreds of responses, tagging them manually, trying to spot patterns — a full-time job that never ends.',
  },
  {
    icon: HelpCircle,
    title: "You don't know what to build next",
    description:
      "Without structured insights, every roadmap decision is a guess. You build features users didn't ask for and miss what they actually need.",
  },
]

export function Problem() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">The problem</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Sound familiar?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {PAINS.map((pain, i) => (
            <motion.div
              key={pain.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900 border border-brand-border rounded-2xl p-6"
            >
              <pain.icon className="h-6 w-6 text-brand-accent mb-4" />
              <h3 className="font-bold text-lg mb-2">{pain.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{pain.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Problem.tsx
git commit -m "refactor(landing): Problem — emoji → Lucide icons"
```

---

## Task 6: Solution — replace emoji with Lucide icons

**Files:**
- Modify: `apps/landing/src/components/sections/Solution.tsx`

- [ ] **Step 1: Replace Solution.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'
import { Code2, Sparkles, LayoutDashboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STEPS: { num: string; icon: LucideIcon; title: string; description: string }[] = [
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
  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">The solution</div>
          <h2 className="text-3xl sm:text-4xl font-bold">From raw feedback to clear decisions</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
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

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Solution.tsx
git commit -m "refactor(landing): Solution — emoji → Lucide icons"
```

---

## Task 7: Features — replace emoji with Lucide icons

**Files:**
- Modify: `apps/landing/src/components/sections/Features.tsx`

- [ ] **Step 1: Replace Features.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'
import { Code2, Sparkles, LayoutGrid, Mail, Users, Download } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Code2, title: 'Embeddable Widget', desc: 'Drop-in feedback widget with customizable themes and branding.' },
  { icon: Sparkles, title: 'AI Analysis', desc: 'Gemini-powered categorization, sentiment detection, and pattern recognition.' },
  { icon: LayoutGrid, title: 'Kanban Board', desc: 'Organize feedback into columns. Drag, filter, and prioritize at a glance.' },
  { icon: Mail, title: 'Weekly AI Digest', desc: 'Automated email summary of top insights and emerging trends.' },
  { icon: Users, title: 'Team Collaboration', desc: 'Invite team members, assign feedback, add comments and context.' },
  { icon: Download, title: 'CSV Data Export', desc: 'Export all your feedback data anytime. No lock-in.' },
]

export function Features() {
  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Features</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Everything you need, nothing you don't</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900 border border-brand-border rounded-xl p-6 hover:border-zinc-600 transition-colors"
            >
              <f.icon className="h-5 w-5 text-brand-accent mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-zinc-500 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Features.tsx
git commit -m "refactor(landing): Features — emoji → Lucide icons"
```

---

## Task 8: Pricing — CTA copy, A/B flag, brand tokens

**Files:**
- Modify: `apps/landing/src/components/sections/Pricing.tsx`

- [ ] **Step 1: Replace Pricing.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useFeatureFlagVariantKey } from 'posthog-js/react'
import { PLAN_CONFIGS, PlanType } from '@/config/plans.config'
import { APP_URL } from '@/lib/constants'

const PLAN_ORDER = [PlanType.FREE, PlanType.PRO, PlanType.BUSINESS] as const

const FEATURES = [
  { key: 'maxProjects', label: 'Projects' },
  { key: 'maxFeedbacksPerMonth', label: 'Feedbacks/month' },
  { key: 'aiAnalysis', label: 'AI Analysis' },
  { key: 'weeklyDigest', label: 'Weekly Digest' },
  { key: 'dataExport', label: 'CSV Export' },
] as const

function formatValue(key: string, value: unknown): string | boolean {
  if (typeof value === 'boolean') return value
  if (value === Infinity || value === null) return 'Unlimited'
  if (typeof value === 'number') return String(value)
  if (key === 'aiAnalysis') {
    if (value === 'none') return false
    if (value === 'basic') return 'Basic'
    return 'Full'
  }
  return String(value)
}

export function Pricing() {
  const pricingVariant = useFeatureFlagVariantKey('landing-pricing-highlight')
  const highlightedPlan = pricingVariant === 'variant-b' ? PlanType.BUSINESS : PlanType.PRO

  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Pricing</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Simple, transparent pricing</h2>
          <p className="text-zinc-400 mt-3">Start free, upgrade when you need more power. No hidden fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_ORDER.map((planType, i) => {
            const config = PLAN_CONFIGS[planType]
            const isHighlighted = planType === highlightedPlan
            return (
              <motion.div
                key={planType}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col bg-zinc-900 rounded-2xl p-7 border ${
                  isHighlighted
                    ? 'border-brand-primary/50 shadow-[0_0_40px_rgba(99,102,241,0.1)] md:-mt-4'
                    : 'border-brand-border'
                }`}
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
                  href={`${APP_URL}/auth/register?plan=${planType.toLowerCase()}`}
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
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Pricing.tsx
git commit -m "feat(landing): Pricing — fix CTA copy, landing-pricing-highlight A/B flag, brand tokens"
```

---

## Task 9: QuizCta — Lucide icon and brand tokens

**Files:**
- Modify: `apps/landing/src/components/sections/QuizCta.tsx`

- [ ] **Step 1: Replace QuizCta.tsx**

```tsx
import Link from 'next/link'
import { Target } from 'lucide-react'

export function QuizCta() {
  return (
    <section className="py-16 px-6 border-t border-brand-border">
      <div className="max-w-3xl mx-auto">
        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-10 text-center">
          <Target className="h-7 w-7 text-brand-accent mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">Not sure which plan is right?</h2>
          <p className="text-zinc-400 mb-6">
            Take our 2-minute quiz and we'll recommend the perfect plan based on your team and usage.
          </p>
          <Link
            href="/quiz"
            className="inline-block px-8 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl transition-colors"
          >
            Find my plan →
          </Link>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/QuizCta.tsx
git commit -m "refactor(landing): QuizCta — emoji → Target icon, brand tokens"
```

---

## Task 10: Testimonials — star ratings, brand tokens, disclaimer

**Files:**
- Modify: `apps/landing/src/components/sections/Testimonials.tsx`

- [ ] **Step 1: Replace Testimonials.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'

const TESTIMONIALS = [
  {
    quote: "InsightStream cut our feedback review time from 4 hours a week to 20 minutes. The AI summaries are surprisingly accurate.",
    author: 'Sarah K.',
    role: 'Head of Product, Fintech startup',
    avatar: 'SK',
  },
  {
    quote: "We finally know which bugs our users care about most. The Kanban board and AI analysis changed how we prioritize our roadmap.",
    author: 'Marcus T.',
    role: 'CTO, B2B SaaS company',
    avatar: 'MT',
  },
  {
    quote: "The embeddable widget took 5 minutes to set up. Now we get structured feedback instead of random emails. Worth every penny.",
    author: 'Ana R.',
    role: 'Founder, E-commerce tool',
    avatar: 'AR',
  },
]

export function Testimonials() {
  return (
    <section className="py-24 px-6 border-t border-brand-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Testimonials</div>
          <h2 className="text-3xl sm:text-4xl font-bold">Loved by product teams</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900 border border-brand-border rounded-2xl p-6 flex flex-col"
            >
              <div className="flex mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="text-yellow-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6 flex-1">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-xs font-bold text-brand-accent">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.author}</div>
                  <div className="text-xs text-zinc-500">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-zinc-600 mt-8">Based on feedback from early access users.</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter landing typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/landing/src/components/sections/Testimonials.tsx
git commit -m "refactor(landing): Testimonials — add star ratings, brand tokens, disclaimer"
```

---

## Task 11: Quiz — add back button

**Files:**
- Modify: `apps/landing/src/app/quiz/page.tsx`

- [ ] **Step 1: Replace quiz/page.tsx**

```tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { QUIZ_CONFIG } from '@/config/quiz.config'
import { QuizProgress } from '@/components/quiz/QuizProgress'
import { QuizStep } from '@/components/quiz/QuizStep'
import { QuizResult } from '@/components/quiz/QuizResult'
import { captureEvent } from '@/lib/posthog'
import { recommendPlan } from '@/lib/quiz.utils'

const STORAGE_KEY = 'insightstream-quiz-answers'
const TOTAL = QUIZ_CONFIG.questions.length

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step') ?? '1'

  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    if (stepParam === '1') {
      const hasExisting = sessionStorage.getItem(STORAGE_KEY)
      if (!hasExisting) {
        captureEvent('quiz_started')
      }
    }
  }, [stepParam])

  useEffect(() => {
    if (stepParam === 'result') {
      const alreadyFired = sessionStorage.getItem('insightstream-quiz-completed')
      if (!alreadyFired) {
        sessionStorage.setItem('insightstream-quiz-completed', '1')
        try {
          const saved = sessionStorage.getItem(STORAGE_KEY)
          const savedAnswers = saved ? (JSON.parse(saved) as Record<string, string | string[]>) : {}
          captureEvent('quiz_completed', {
            recommended_plan: recommendPlan(savedAnswers),
          })
        } catch {
          // sessionStorage unavailable
        }
      }
    }
  }, [stepParam])

  useEffect(() => {
    if (stepParam !== 'result') {
      const stepNum = parseInt(stepParam)
      if (isNaN(stepNum) || !QUIZ_CONFIG.questions[stepNum - 1]) {
        router.replace('/quiz?step=1')
      }
    }
  }, [stepParam, router])

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    const stepNum = parseInt(stepParam)
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newAnswers))

    captureEvent('quiz_step_completed', {
      step: stepNum,
      question_id: questionId,
      answer,
    })

    if (stepNum >= TOTAL) {
      router.push('/quiz?step=result')
    } else {
      router.push(`/quiz?step=${stepNum + 1}`)
    }
  }

  if (stepParam === 'result') {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4 py-16">
        <QuizResult answers={answers} />
      </div>
    )
  }

  const stepNum = parseInt(stepParam)
  const question = QUIZ_CONFIG.questions[stepNum - 1]

  if (!question) return null

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <QuizProgress current={stepNum} total={TOTAL} />
        {stepNum > 1 && (
          <button
            onClick={() => router.push(`/quiz?step=${stepNum - 1}`)}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-2 mb-4"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}
        <QuizStep key={question.id} question={question} onAnswer={handleAnswer} />
      </div>
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Typecheck and run tests**

Run: `pnpm --filter landing typecheck && pnpm --filter landing test`
Expected: no type errors, `quiz.utils.test.ts` passes (no logic was changed)

- [ ] **Step 3: Manual verify**

Open http://localhost:3002/quiz?step=2
Expected: "← Back" button appears above the question
Open http://localhost:3002/quiz?step=1
Expected: no "← Back" button

- [ ] **Step 4: Commit**

```bash
git add apps/landing/src/app/quiz/page.tsx
git commit -m "feat(landing): quiz — add Back button on steps 2+"
```

---

## Task 12: Final verification and push

- [ ] **Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: all packages pass, 0 errors

- [ ] **Step 2: Run landing tests**

Run: `pnpm --filter landing test`
Expected: `quiz.utils.test.ts` passes

- [ ] **Step 3: Manual smoke test**

Open http://localhost:3002 and verify:
- Nav: "Sign In" and "Get Started" have different hrefs
- Hero: dashboard mockup renders (sidebar + metrics + kanban stubs), no placeholder text
- Trust: strip with 4 stat pills visible below Hero
- Problem/Solution/Features: Lucide icons instead of emoji
- Pricing: "Get Started Free" on Free, "Start 14-day Trial" on Pro and Business
- QuizCta appears AFTER Pricing (not before)
- Testimonials: 5 stars above each quote, disclaimer at bottom
- Open http://localhost:3002/quiz?step=2 — Back button present

- [ ] **Step 4: Push**

```bash
git push
```
