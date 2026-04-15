# Marketing Landing + Quiz Funnel + PostHog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `apps/landing` Next.js app with a story-driven marketing page, 5-step configurable quiz funnel, and PostHog analytics across landing + web.

**Architecture:** `apps/landing` is an independent Next.js 16 app (port 3002) with dark theme matching `apps/web`. Quiz state lives in component state + sessionStorage. PostHog initialises with one project key in both apps, linking user journeys via `distinct_id`.

**Tech Stack:** Next.js 16, React 19, TailwindCSS 4, posthog-js, Plus Jakarta Sans, Vitest (quiz unit tests), `@insightstream/database` (PLAN_CONFIGS only)

---

## File Map

### New files — `apps/landing`

| File | Responsibility |
|------|---------------|
| `apps/landing/package.json` | App deps + `dev -p 3002` script |
| `apps/landing/tsconfig.json` | TypeScript config (mirrors web) |
| `apps/landing/next.config.ts` | Minimal Next.js config |
| `apps/landing/vitest.config.ts` | Unit test config for quiz.utils |
| `apps/landing/src/app/globals.css` | TailwindCSS 4 + brand tokens |
| `apps/landing/src/app/layout.tsx` | Root layout + PostHogProvider + metadata |
| `apps/landing/src/app/page.tsx` | Assembles all landing sections |
| `apps/landing/src/app/robots.ts` | robots.txt |
| `apps/landing/src/app/sitemap.ts` | sitemap.xml |
| `apps/landing/src/app/quiz/page.tsx` | Step-based quiz page (URL param routing) |
| `apps/landing/src/components/providers/PostHogProvider.tsx` | posthog.init + `'use client'` wrapper |
| `apps/landing/src/components/providers/PostHogPageView.tsx` | Tracks pageviews via usePathname |
| `apps/landing/src/components/sections/Nav.tsx` | Logo + Sign In + Get Started |
| `apps/landing/src/components/sections/Hero.tsx` | Bold headline (A/B via feature flag) + CTA |
| `apps/landing/src/components/sections/Problem.tsx` | 3 pain points |
| `apps/landing/src/components/sections/Solution.tsx` | Widget → Dashboard → AI Digest (3 steps) |
| `apps/landing/src/components/sections/Features.tsx` | 2×3 feature grid |
| `apps/landing/src/components/sections/QuizCta.tsx` | "Find your plan" banner |
| `apps/landing/src/components/sections/Pricing.tsx` | 3 plan cards from PLAN_CONFIGS |
| `apps/landing/src/components/sections/Testimonials.tsx` | 3 placeholder testimonials |
| `apps/landing/src/components/sections/Footer.tsx` | Links + copyright |
| `apps/landing/src/components/quiz/QuizProgress.tsx` | Step progress bar |
| `apps/landing/src/components/quiz/QuizStep.tsx` | Renders cards/radio/multiselect question |
| `apps/landing/src/components/quiz/QuizResult.tsx` | Recommended plan + CTA |
| `apps/landing/src/config/quiz.config.ts` | QuizConfig types + 5 default questions |
| `apps/landing/src/lib/quiz.utils.ts` | `recommendPlan()` scoring function |
| `apps/landing/src/lib/quiz.utils.test.ts` | Unit tests for recommendPlan |
| `apps/landing/src/lib/posthog.ts` | posthog instance export + event helpers |
| `apps/landing/public/og-image.png` | Placeholder (copy from web or 1200×630 solid) |

### Modified files — `apps/web`

| File | Change |
|------|--------|
| `apps/web/src/lib/posthog.ts` | New: posthog instance for web |
| `apps/web/src/components/providers/PostHogProvider.tsx` | New: same pattern as landing |
| `apps/web/src/components/providers/PostHogPageView.tsx` | New: pageview tracking |
| `apps/web/src/components/providers.tsx` | Wrap existing `<Providers>` with PostHogProvider |
| `apps/web/src/app/page.tsx` | Fire `user_signed_up` on auth success |
| `apps/web/src/app/dashboard/page.tsx` | Fire `dashboard_viewed` on mount |
| `apps/web/src/app/pricing/page.tsx` | Fire `upgrade_clicked` + `plan_upgraded` |

---

## Task 1: Scaffold apps/landing

**Files:**
- Create: `apps/landing/package.json`
- Create: `apps/landing/tsconfig.json`
- Create: `apps/landing/next.config.ts`
- Create: `apps/landing/src/app/globals.css`
- Create: `apps/landing/src/app/layout.tsx`

- [ ] **Step 1: Create `apps/landing/package.json`**

```json
{
  "name": "landing",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "predev": "npx kill-port 3002",
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@insightstream/database": "workspace:*",
    "framer-motion": "^12.38.0",
    "lucide-react": "^1.7.0",
    "next": "16.2.2",
    "posthog-js": "^1.240.5",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^25",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.2",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.4"
  }
}
```

- [ ] **Step 2: Create `apps/landing/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/landing/next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@insightstream/database'],
}

export default nextConfig
```

- [ ] **Step 4: Create `apps/landing/src/app/globals.css`**

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-plus-jakarta);

  --color-brand-primary: var(--color-indigo-500);
  --color-brand-bg: #09090b;
  --color-brand-surface: #161618;
  --color-brand-border: #2a2a2d;
  --color-brand-muted: #71717a;
  --color-brand-accent: var(--color-indigo-400);
}

@layer base {
  *, ::after, ::before {
    border-width: 0;
    border-style: solid;
  }
}
```

- [ ] **Step 5: Create `apps/landing/src/app/layout.tsx`** (minimal, no PostHog yet)

```tsx
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'InsightStream AI — AI-Powered Feedback Analytics for B2B SaaS',
  description:
    'Collect user feedback with an embeddable widget, analyze it with AI, and get weekly digests. Start free.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="bg-brand-bg text-white antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: Create placeholder `apps/landing/src/app/page.tsx`**

```tsx
export default function LandingPage() {
  return (
    <main>
      <p className="text-white p-8">Landing — coming soon</p>
    </main>
  )
}
```

- [ ] **Step 7: Install deps and verify app starts**

```bash
cd d:/Work/fullstack-app
pnpm install
cd apps/landing
pnpm dev
```

Expected: Next.js starts on http://localhost:3002 with no errors.

- [ ] **Step 8: Commit**

```bash
cd d:/Work/fullstack-app
git add apps/landing/
git commit -m "feat(landing): scaffold Next.js app with TailwindCSS 4"
```

---

## Task 2: Quiz config + `recommendPlan` (TDD)

**Files:**
- Create: `apps/landing/vitest.config.ts`
- Create: `apps/landing/src/config/quiz.config.ts`
- Create: `apps/landing/src/lib/quiz.utils.ts`
- Create: `apps/landing/src/lib/quiz.utils.test.ts`

- [ ] **Step 1: Create `apps/landing/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Create `apps/landing/src/config/quiz.config.ts`**

```ts
export type QuestionType = 'cards' | 'radio' | 'multiselect'

export interface QuizOption {
  value: string
  label: string
  icon?: string
}

export interface QuizQuestion {
  id: string
  question: string
  type: QuestionType
  options: QuizOption[]
}

export interface QuizConfig {
  title: string
  subtitle: string
  questions: QuizQuestion[]
}

export const QUIZ_CONFIG: QuizConfig = {
  title: 'Find your perfect plan',
  subtitle: 'Answer 5 quick questions and we\'ll recommend the right plan for you.',
  questions: [
    {
      id: 'team-size',
      question: 'What best describes your team?',
      type: 'cards',
      options: [
        { value: 'solo', label: 'Solo founder', icon: '👤' },
        { value: 'small', label: 'Small team (2–10)', icon: '👥' },
        { value: 'mid', label: 'Mid-size (11–50)', icon: '🏢' },
        { value: 'enterprise', label: 'Enterprise (50+)', icon: '🏗️' },
      ],
    },
    {
      id: 'feedback-volume',
      question: 'How much feedback do you collect per month?',
      type: 'radio',
      options: [
        { value: 'lt-100', label: 'Less than 100' },
        { value: '100-1k', label: '100 – 1,000' },
        { value: '1k-10k', label: '1,000 – 10,000' },
        { value: '10k+', label: '10,000+' },
      ],
    },
    {
      id: 'use-case',
      question: "What's your primary use case?",
      type: 'cards',
      options: [
        { value: 'product', label: 'Product feedback', icon: '🚀' },
        { value: 'support', label: 'Customer support', icon: '💬' },
        { value: 'nps', label: 'NPS surveys', icon: '📊' },
        { value: 'research', label: 'User research', icon: '🔍' },
      ],
    },
    {
      id: 'priority-features',
      question: 'Which features matter most?',
      type: 'multiselect',
      options: [
        { value: 'ai-analysis', label: 'AI Analysis' },
        { value: 'kanban', label: 'Kanban Dashboard' },
        { value: 'widget', label: 'Embeddable Widget' },
        { value: 'digest', label: 'Weekly Digest' },
        { value: 'teams', label: 'Team Access' },
      ],
    },
    {
      id: 'budget',
      question: "What's your monthly budget?",
      type: 'radio',
      options: [
        { value: 'free', label: 'Free (just getting started)' },
        { value: '30', label: 'Up to $30/month' },
        { value: '100', label: 'Up to $100/month' },
        { value: 'custom', label: 'Custom / Enterprise' },
      ],
    },
  ],
}
```

- [ ] **Step 3: Write failing tests in `apps/landing/src/lib/quiz.utils.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { recommendPlan } from './quiz.utils'

describe('recommendPlan', () => {
  it('returns free for solo with minimal usage and free budget', () => {
    expect(
      recommendPlan({
        'team-size': 'solo',
        'feedback-volume': 'lt-100',
        'priority-features': [],
        budget: 'free',
      })
    ).toBe('free')
  })

  it('returns pro for small team with ai-analysis and moderate volume', () => {
    expect(
      recommendPlan({
        'team-size': 'small',
        'feedback-volume': '100-1k',
        'priority-features': ['ai-analysis'],
        budget: '30',
      })
    ).toBe('pro')
  })

  it('returns business for enterprise with high volume and high budget', () => {
    expect(
      recommendPlan({
        'team-size': 'enterprise',
        'feedback-volume': '10k+',
        'priority-features': ['ai-analysis', 'teams'],
        budget: '100',
      })
    ).toBe('business')
  })

  it('returns free for empty answers (all unknowns score 0)', () => {
    expect(recommendPlan({})).toBe('free')
  })

  it('counts each selected feature independently', () => {
    // teams(2) + ai(2) + digest(1) = 5, plus small(1) = 6 → pro (score 3–7)
    expect(
      recommendPlan({
        'team-size': 'small',
        'priority-features': ['ai-analysis', 'teams', 'digest'],
      })
    ).toBe('pro')
  })
})
```

- [ ] **Step 4: Run tests — expect FAIL**

```bash
cd apps/landing && pnpm test
```

Expected: `Error: Cannot find module './quiz.utils'`

- [ ] **Step 5: Implement `apps/landing/src/lib/quiz.utils.ts`**

```ts
export function recommendPlan(
  answers: Record<string, string | string[]>
): 'free' | 'pro' | 'business' {
  let score = 0

  const teamMap: Record<string, number> = {
    solo: 0,
    small: 1,
    mid: 3,
    enterprise: 5,
  }
  score += teamMap[answers['team-size'] as string] ?? 0

  const volumeMap: Record<string, number> = {
    'lt-100': 0,
    '100-1k': 1,
    '1k-10k': 3,
    '10k+': 5,
  }
  score += volumeMap[answers['feedback-volume'] as string] ?? 0

  const features = (answers['priority-features'] as string[]) ?? []
  if (features.includes('ai-analysis')) score += 2
  if (features.includes('teams')) score += 2
  if (features.includes('digest')) score += 1

  const budgetMap: Record<string, number> = {
    free: 0,
    '30': 2,
    '100': 4,
    custom: 6,
  }
  score += budgetMap[answers['budget'] as string] ?? 0

  if (score >= 8) return 'business'
  if (score >= 3) return 'pro'
  return 'free'
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd apps/landing && pnpm test
```

Expected: `5 passed`

- [ ] **Step 7: Commit**

```bash
cd d:/Work/fullstack-app
git add apps/landing/vitest.config.ts apps/landing/src/config/quiz.config.ts apps/landing/src/lib/
git commit -m "feat(landing): add quiz config and recommendPlan with tests"
```

---

## Task 3: PostHog setup — apps/landing

**Files:**
- Create: `apps/landing/src/lib/posthog.ts`
- Create: `apps/landing/src/components/providers/PostHogProvider.tsx`
- Create: `apps/landing/src/components/providers/PostHogPageView.tsx`
- Modify: `apps/landing/src/app/layout.tsx`

- [ ] **Step 1: Create `apps/landing/src/lib/posthog.ts`**

```ts
import posthog from 'posthog-js'

export { posthog }

export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  posthog.capture(event, properties)
}
```

- [ ] **Step 2: Create `apps/landing/src/components/providers/PostHogProvider.tsx`**

```tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import { PostHogPageView } from './PostHogPageView'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      capture_pageview: false,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
```

- [ ] **Step 3: Create `apps/landing/src/components/providers/PostHogPageView.tsx`**

```tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { captureEvent } from '@/lib/posthog'

export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`
      }
      captureEvent('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}
```

- [ ] **Step 4: Update `apps/landing/src/app/layout.tsx` to add PostHogProvider**

```tsx
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'InsightStream AI — AI-Powered Feedback Analytics for B2B SaaS',
  description:
    'Collect user feedback with an embeddable widget, analyze it with AI, and get weekly digests. Start free.',
  openGraph: {
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="bg-brand-bg text-white antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Add env vars to `.env.example` (or `.env.local` for local dev)**

Add to the project root `.env.example` (if it exists) or create `apps/landing/.env.local`:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_APP_URL=https://app.insightstream.ai
```

- [ ] **Step 6: Verify app still starts**

```bash
cd apps/landing && pnpm dev
```

Expected: starts on port 3002, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
cd d:/Work/fullstack-app
git add apps/landing/src/lib/posthog.ts apps/landing/src/components/ apps/landing/src/app/layout.tsx
git commit -m "feat(landing): add PostHog provider and pageview tracking"
```

---

## Task 4: Quiz UI components + `/quiz` page

**Files:**
- Create: `apps/landing/src/components/quiz/QuizProgress.tsx`
- Create: `apps/landing/src/components/quiz/QuizStep.tsx`
- Create: `apps/landing/src/components/quiz/QuizResult.tsx`
- Create: `apps/landing/src/app/quiz/page.tsx`

- [ ] **Step 1: Create `apps/landing/src/components/quiz/QuizProgress.tsx`**

```tsx
interface QuizProgressProps {
  current: number
  total: number
}

export function QuizProgress({ current, total }: QuizProgressProps) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div className="flex justify-between text-xs text-zinc-500 mb-2">
        <span>Question {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `apps/landing/src/components/quiz/QuizStep.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { QuizQuestion } from '@/config/quiz.config'

interface QuizStepProps {
  question: QuizQuestion
  onAnswer: (questionId: string, answer: string | string[]) => void
}

export function QuizStep({ question, onAnswer }: QuizStepProps) {
  const [selected, setSelected] = useState<string[]>([])

  const handleSelect = (value: string) => {
    if (question.type === 'multiselect') {
      setSelected((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      )
    } else {
      onAnswer(question.id, value)
    }
  }

  const handleMultiSubmit = () => {
    onAnswer(question.id, selected)
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8">{question.question}</h2>

      {question.type === 'cards' && (
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="flex flex-col items-center gap-2 p-5 bg-zinc-900 border border-brand-border rounded-xl hover:border-indigo-500 hover:bg-zinc-800 transition-all text-center"
            >
              {opt.icon && <span className="text-3xl">{opt.icon}</span>}
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {question.type === 'radio' && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="flex items-center gap-3 p-4 bg-zinc-900 border border-brand-border rounded-xl hover:border-indigo-500 hover:bg-zinc-800 transition-all text-left"
            >
              <div className="w-4 h-4 rounded-full border-2 border-zinc-600 shrink-0" />
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {question.type === 'multiselect' && (
        <>
          <div className="flex flex-col gap-2 mb-6">
            {question.options.map((opt) => {
              const isSelected = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center gap-3 p-4 border rounded-xl transition-all text-left ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-brand-border bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-600'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={handleMultiSubmit}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            Continue →
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `apps/landing/src/components/quiz/QuizResult.tsx`**

```tsx
import { recommendPlan } from '@/lib/quiz.utils'
import { PLAN_CONFIGS, PlanType } from '@insightstream/database'

const PLAN_LABEL: Record<'free' | 'pro' | 'business', PlanType> = {
  free: PlanType.FREE,
  pro: PlanType.PRO,
  business: PlanType.BUSINESS,
}

const HIGHLIGHT_FEATURES: Record<PlanType, string[]> = {
  [PlanType.FREE]: ['1 project', '200 feedbacks/month', 'Basic AI analysis'],
  [PlanType.PRO]: ['5 projects', '10,000 feedbacks/month', 'Full AI analysis', 'Weekly digest', 'Data export'],
  [PlanType.BUSINESS]: ['Unlimited projects', 'Unlimited feedbacks', 'Full AI + whitelabel', 'Team access'],
}

interface QuizResultProps {
  answers: Record<string, string | string[]>
}

export function QuizResult({ answers }: QuizResultProps) {
  const recommendation = recommendPlan(answers)
  const planType = PLAN_LABEL[recommendation]
  const config = PLAN_CONFIGS[planType]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.insightstream.ai'

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold mb-6">
        ✨ Based on your answers
      </div>
      <h2 className="text-3xl font-bold mb-2">
        <span className="text-indigo-400">{config.name}</span> is perfect for you
      </h2>
      <p className="text-zinc-400 mb-8">{config.description}</p>

      <div className="bg-zinc-900 border border-brand-border rounded-2xl p-6 mb-8 text-left">
        <div className="text-sm font-semibold text-zinc-300 mb-4">What's included:</div>
        <ul className="space-y-2">
          {HIGHLIGHT_FEATURES[planType].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="text-emerald-400">✓</span> {f}
            </li>
          ))}
        </ul>
        {config.price > 0 && (
          <div className="mt-4 pt-4 border-t border-brand-border">
            <span className="text-2xl font-bold">${config.price}</span>
            <span className="text-zinc-500 text-sm">/month</span>
          </div>
        )}
      </div>

      <a
        href={`${appUrl}/?plan=${recommendation}`}
        className="inline-block w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-lg"
      >
        {config.price === 0 ? 'Get Started Free →' : 'Start Free Trial →'}
      </a>
      <p className="text-xs text-zinc-600 mt-3">No credit card required</p>
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/landing/src/app/quiz/page.tsx`**

```tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QUIZ_CONFIG } from '@/config/quiz.config'
import { QuizProgress } from '@/components/quiz/QuizProgress'
import { QuizStep } from '@/components/quiz/QuizStep'
import { QuizResult } from '@/components/quiz/QuizResult'
import { captureEvent } from '@/lib/posthog'

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

  // Fire quiz_started on first step
  useEffect(() => {
    if (stepParam === '1') {
      captureEvent('quiz_started')
    }
  }, [stepParam])

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

  if (!question) {
    router.replace('/quiz?step=1')
    return null
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <QuizProgress current={stepNum} total={TOTAL} />
        <QuizStep question={question} onAnswer={handleAnswer} />
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

- [ ] **Step 5: Verify quiz works end-to-end**

```bash
cd apps/landing && pnpm dev
```

Open http://localhost:3002/quiz — step through all 5 questions, verify result screen shows the recommended plan.

- [ ] **Step 6: Commit**

```bash
cd d:/Work/fullstack-app
git add apps/landing/src/components/quiz/ apps/landing/src/app/quiz/
git commit -m "feat(landing): add quiz UI components and step-based quiz page"
```

---

## Task 5: Landing sections — Nav, Hero (A/B), Problem, Solution, Features

**Files:**
- Create: `apps/landing/src/components/sections/Nav.tsx`
- Create: `apps/landing/src/components/sections/Hero.tsx`
- Create: `apps/landing/src/components/sections/Problem.tsx`
- Create: `apps/landing/src/components/sections/Solution.tsx`
- Create: `apps/landing/src/components/sections/Features.tsx`

- [ ] **Step 1: Create `apps/landing/src/components/sections/Nav.tsx`**

```tsx
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.insightstream.ai'

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-brand-border bg-brand-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          InsightStream
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${APP_URL}/`}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </a>
          <a
            href={`${APP_URL}/`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create `apps/landing/src/components/sections/Hero.tsx`**

```tsx
'use client'

import { useFeatureFlagVariantKey } from 'posthog-js/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.insightstream.ai'

const HEADLINES = {
  control: 'Turn every feedback into actionable insights.',
  test: 'Stop guessing. Start knowing. AI feedback analytics for B2B teams.',
} as const

export function Hero() {
  const variant = useFeatureFlagVariantKey('landing-hero-headline')
  const headline = variant === 'test' ? HEADLINES.test : HEADLINES.control

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold mb-8"
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
            href={`${APP_URL}/`}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-lg flex items-center gap-2"
          >
            Start Free <ArrowRight className="h-5 w-5" />
          </a>
          <Link
            href="/quiz"
            className="px-8 py-4 border border-brand-border hover:border-zinc-500 text-zinc-300 font-semibold rounded-xl transition-colors text-lg"
          >
            Find my plan →
          </Link>
        </motion.div>

        {/* Dashboard placeholder screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 rounded-2xl border border-brand-border bg-zinc-900 overflow-hidden shadow-2xl"
        >
          <div className="h-8 bg-zinc-800 flex items-center gap-1.5 px-4">
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="mx-auto text-xs text-zinc-600">app.insightstream.ai/dashboard</div>
          </div>
          <div className="h-80 flex items-center justify-center text-zinc-700 text-sm">
            Dashboard screenshot placeholder
          </div>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create `apps/landing/src/components/sections/Problem.tsx`**

```tsx
import { motion } from 'framer-motion'

const PAINS = [
  {
    icon: '📦',
    title: 'Feedback scattered everywhere',
    description:
      'Emails, Slack messages, support tickets, surveys — feedback lives in silos with no central place to see the big picture.',
  },
  {
    icon: '🕐',
    title: 'Manual analysis takes hours',
    description:
      'Reading through hundreds of responses, tagging them manually, trying to spot patterns — a full-time job that never ends.',
  },
  {
    icon: '❓',
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
              <div className="text-3xl mb-4">{pain.icon}</div>
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

- [ ] **Step 4: Create `apps/landing/src/components/sections/Solution.tsx`**

```tsx
import { motion } from 'framer-motion'

const STEPS = [
  {
    num: '01',
    icon: '🔌',
    title: 'Embed the widget',
    description:
      'One script tag. Your users can submit feedback directly inside your app — no context switching, no extra tools.',
  },
  {
    num: '02',
    icon: '🧠',
    title: 'AI analyzes everything',
    description:
      'Gemini AI reads every piece of feedback, categorizes it, detects sentiment, and surfaces patterns you\'d never find manually.',
  },
  {
    num: '03',
    icon: '📊',
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
              <div className="text-3xl mb-3">{step.icon}</div>
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

- [ ] **Step 5: Create `apps/landing/src/components/sections/Features.tsx`**

```tsx
import { motion } from 'framer-motion'

const FEATURES = [
  { icon: '🔌', title: 'Embeddable Widget', desc: 'Drop-in feedback widget with customizable themes and branding.' },
  { icon: '🧠', title: 'AI Analysis', desc: 'Gemini-powered categorization, sentiment detection, and pattern recognition.' },
  { icon: '📋', title: 'Kanban Board', desc: 'Organize feedback into columns. Drag, filter, and prioritize at a glance.' },
  { icon: '📧', title: 'Weekly AI Digest', desc: 'Automated email summary of top insights and emerging trends.' },
  { icon: '👥', title: 'Team Collaboration', desc: 'Invite team members, assign feedback, add comments and context.' },
  { icon: '📤', title: 'CSV Data Export', desc: 'Export all your feedback data anytime. No lock-in.' },
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
              <div className="text-2xl mb-3">{f.icon}</div>
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

- [ ] **Step 6: Commit**

```bash
cd d:/Work/fullstack-app
git add apps/landing/src/components/sections/Nav.tsx apps/landing/src/components/sections/Hero.tsx apps/landing/src/components/sections/Problem.tsx apps/landing/src/components/sections/Solution.tsx apps/landing/src/components/sections/Features.tsx
git commit -m "feat(landing): add Nav, Hero (A/B), Problem, Solution, Features sections"
```

---

## Task 6: Landing sections — QuizCta, Pricing, Testimonials, Footer + assemble page

**Files:**
- Create: `apps/landing/src/components/sections/QuizCta.tsx`
- Create: `apps/landing/src/components/sections/Pricing.tsx`
- Create: `apps/landing/src/components/sections/Testimonials.tsx`
- Create: `apps/landing/src/components/sections/Footer.tsx`
- Modify: `apps/landing/src/app/page.tsx`

- [ ] **Step 1: Create `apps/landing/src/components/sections/QuizCta.tsx`**

```tsx
import Link from 'next/link'

export function QuizCta() {
  return (
    <section className="py-16 px-6 border-t border-brand-border">
      <div className="max-w-3xl mx-auto">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <h2 className="text-2xl font-bold mb-2">Not sure which plan is right?</h2>
          <p className="text-zinc-400 mb-6">
            Take our 2-minute quiz and we'll recommend the perfect plan based on your team and usage.
          </p>
          <Link
            href="/quiz"
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
          >
            Find my plan →
          </Link>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create `apps/landing/src/components/sections/Pricing.tsx`**

```tsx
'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { PLAN_CONFIGS, PlanType } from '@insightstream/database'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.insightstream.ai'
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
            const isPro = planType === PlanType.PRO
            return (
              <motion.div
                key={planType}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col bg-zinc-900 rounded-2xl p-7 border ${
                  isPro
                    ? 'border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.1)] md:-mt-4'
                    : 'border-brand-border'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full">
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
                    isPro
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {config.price === 0 ? 'Get Started Free' : `Upgrade to ${config.name}`}
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

- [ ] **Step 3: Create `apps/landing/src/components/sections/Testimonials.tsx`**

```tsx
import { motion } from 'framer-motion'

const TESTIMONIALS = [
  {
    quote:
      "InsightStream cut our feedback review time from 4 hours a week to 20 minutes. The AI summaries are surprisingly accurate.",
    author: 'Sarah K.',
    role: 'Head of Product, Fintech startup',
    avatar: 'SK',
  },
  {
    quote:
      "We finally know which bugs our users care about most. The Kanban board and AI analysis changed how we prioritize our roadmap.",
    author: 'Marcus T.',
    role: 'CTO, B2B SaaS company',
    avatar: 'MT',
  },
  {
    quote:
      "The embeddable widget took 5 minutes to set up. Now we get structured feedback instead of random emails. Worth every penny.",
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
              className="bg-zinc-900 border border-brand-border rounded-2xl p-6"
            >
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
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
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Create `apps/landing/src/components/sections/Footer.tsx`**

```tsx
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.insightstream.ai'

export function Footer() {
  return (
    <footer className="border-t border-brand-border py-12 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 font-bold">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          InsightStream AI
        </div>
        <nav className="flex items-center gap-6 text-sm text-zinc-500">
          <Link href="/quiz" className="hover:text-zinc-300 transition-colors">Quiz</Link>
          <a href={`${APP_URL}/pricing`} className="hover:text-zinc-300 transition-colors">Pricing</a>
          <a href={`${APP_URL}/`} className="hover:text-zinc-300 transition-colors">Sign In</a>
        </nav>
        <div className="text-xs text-zinc-600">
          © {new Date().getFullYear()} InsightStream. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Update `apps/landing/src/app/page.tsx`** to assemble all sections

```tsx
import { Nav } from '@/components/sections/Nav'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Features } from '@/components/sections/Features'
import { QuizCta } from '@/components/sections/QuizCta'
import { Pricing } from '@/components/sections/Pricing'
import { Testimonials } from '@/components/sections/Testimonials'
import { Footer } from '@/components/sections/Footer'

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <QuizCta />
        <Pricing />
        <Testimonials />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 6: Open http://localhost:3002 and verify the full landing page renders without errors**

- [ ] **Step 7: Commit**

```bash
cd d:/Work/fullstack-app
git add apps/landing/src/components/sections/ apps/landing/src/app/page.tsx
git commit -m "feat(landing): add all landing sections and assemble full page"
```

---

## Task 7: SEO — sitemap, robots, JSON-LD

**Files:**
- Create: `apps/landing/src/app/sitemap.ts`
- Create: `apps/landing/src/app/robots.ts`
- Modify: `apps/landing/src/app/page.tsx` (add JSON-LD)
- Create: `apps/landing/public/og-image.png` (placeholder)

- [ ] **Step 1: Create `apps/landing/src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://insightstream.ai'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/quiz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
```

- [ ] **Step 2: Create `apps/landing/src/app/robots.ts`**

```ts
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://insightstream.ai'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 3: Add `NEXT_PUBLIC_LANDING_URL` to the env example**

Add to `apps/landing/.env.local`:

```
NEXT_PUBLIC_LANDING_URL=http://localhost:3002
```

- [ ] **Step 4: Add JSON-LD structured data to `apps/landing/src/app/page.tsx`**

Add a `<script>` tag inside the page (before the sections):

```tsx
import { Nav } from '@/components/sections/Nav'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Features } from '@/components/sections/Features'
import { QuizCta } from '@/components/sections/QuizCta'
import { Pricing } from '@/components/sections/Pricing'
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
        <Problem />
        <Solution />
        <Features />
        <QuizCta />
        <Pricing />
        <Testimonials />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Create a placeholder OG image**

Copy `apps/web/public/vercel.svg` to `apps/landing/public/og-image.png` as a placeholder, or create a 1×1 pixel PNG. The real OG image can be designed later.

```bash
# Create a minimal placeholder (any image file will do for now)
cp apps/web/public/globe.svg apps/landing/public/og-image.png
```

- [ ] **Step 6: Verify sitemap and robots at runtime**

```bash
cd apps/landing && pnpm dev
```

Open http://localhost:3002/sitemap.xml — expect XML with `/` and `/quiz` entries.  
Open http://localhost:3002/robots.txt — expect `User-agent: *` + sitemap URL.

- [ ] **Step 7: Commit**

```bash
cd d:/Work/fullstack-app
git add apps/landing/src/app/sitemap.ts apps/landing/src/app/robots.ts apps/landing/src/app/page.tsx apps/landing/public/
git commit -m "feat(landing): add SEO — sitemap, robots, JSON-LD structured data"
```

---

## Task 8: PostHog integration — apps/web

**Files:**
- Create: `apps/web/src/lib/posthog.ts`
- Create: `apps/web/src/components/providers/PostHogProvider.tsx`
- Create: `apps/web/src/components/providers/PostHogPageView.tsx`
- Modify: `apps/web/src/components/providers.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/app/pricing/page.tsx`

- [ ] **Step 1: Install posthog-js in apps/web**

```bash
cd apps/web && pnpm add posthog-js
```

- [ ] **Step 2: Create `apps/web/src/lib/posthog.ts`**

```ts
import posthog from 'posthog-js'

export { posthog }

export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  posthog.capture(event, properties)
}
```

- [ ] **Step 3: Create `apps/web/src/components/providers/PostHogProvider.tsx`**

```tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import { PostHogPageView } from './PostHogPageView'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      capture_pageview: false,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
```

- [ ] **Step 4: Create `apps/web/src/components/providers/PostHogPageView.tsx`**

```tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { captureEvent } from '@/lib/posthog'

export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`
      }
      captureEvent('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}
```

- [ ] **Step 5: Update `apps/web/src/components/providers.tsx`** to wrap with PostHogProvider

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { PostHogProvider } from './providers/PostHogProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  useEffect(() => {
    const handler = (event: PageTransitionEvent) => {
      if (event.persisted) {
        queryClient.invalidateQueries()
      }
    }
    window.addEventListener('pageshow', handler)
    return () => window.removeEventListener('pageshow', handler)
  }, [queryClient])

  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PostHogProvider>
  )
}
```

- [ ] **Step 6: Add `user_signed_up` event to `apps/web/src/app/page.tsx`**

In the `AuthForm` component, in the `onSuccess` handler of `authMutation`, fire the event only on registration (when `!isLogin`). Find the `onSuccess` block (around line 34) and add:

```tsx
// Add import at top of file
import { captureEvent } from '@/lib/posthog'

// In onSuccess handler — fire only on registration:
onSuccess: (data) => {
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token)
    if (!isLogin) {
      captureEvent('user_signed_up', { method: 'email' })
    }
    router.push('/dashboard')
  } else if (!isLogin) {
    captureEvent('user_signed_up', { method: 'email' })
    setIsLogin(true)
    setPassword('')
  }
},
```

- [ ] **Step 7: Add `dashboard_viewed` event to `apps/web/src/app/dashboard/page.tsx`**

In the `Dashboard` component, add a `useEffect` after the existing hooks:

```tsx
// Add import at top of file
import { captureEvent } from '@/lib/posthog'

// In Dashboard component body, after existing hooks:
useEffect(() => {
  captureEvent('dashboard_viewed')
}, [])
```

- [ ] **Step 8: Add `upgrade_clicked` and `plan_upgraded` events to `apps/web/src/app/pricing/page.tsx`**

In `handleUpgrade`, add events around the upgrade call. Find the `handleUpgrade` function and update:

```tsx
// Add import at top of file
import { captureEvent } from '@/lib/posthog'

// Updated handleUpgrade function:
const handleUpgrade = async (plan: PlanType) => {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null
  if (!token) {
    router.push('/')
    return
  }

  captureEvent('upgrade_clicked', { to_plan: plan })
  setUpgrading(plan)
  try {
    await api.patch('/plans/upgrade', { plan })
    captureEvent('plan_upgraded', { plan })
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    queryClient.invalidateQueries({ queryKey: ['planUsage'] })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
    router.push('/dashboard')
  } catch {
    alert('Failed to upgrade. Please try again.')
  } finally {
    setUpgrading(null)
  }
}
```

- [ ] **Step 9: Add POSTHOG env vars to apps/web**

Add to `apps/web/.env.local` (Doppler will provide in production):

```
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

- [ ] **Step 10: Verify apps/web starts with no TypeScript errors**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
cd d:/Work/fullstack-app
git add apps/web/src/lib/posthog.ts apps/web/src/components/providers/ apps/web/src/components/providers.tsx apps/web/src/app/page.tsx apps/web/src/app/dashboard/page.tsx apps/web/src/app/pricing/page.tsx
git commit -m "feat(web): add PostHog analytics with signup, dashboard, and upgrade events"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run typecheck across the monorepo**

```bash
cd d:/Work/fullstack-app && pnpm typecheck
```

Expected: no errors in landing or web.

- [ ] **Step 2: Run landing unit tests**

```bash
cd apps/landing && pnpm test
```

Expected: `5 passed`.

- [ ] **Step 3: Run pnpm dev and verify all apps start**

```bash
cd d:/Work/fullstack-app && pnpm dev
```

Expected: api on 3001, web on 3000, landing on 3002 — all start without errors.

- [ ] **Step 4: Manual smoke test**

- http://localhost:3002 — landing page with all 9 sections
- http://localhost:3002/quiz — quiz steps 1→5→result, result shows recommended plan
- http://localhost:3002/quiz?step=3 — deep link to step 3 works
- http://localhost:3002/sitemap.xml — returns valid XML
- http://localhost:3002/robots.txt — returns valid robots.txt
- http://localhost:3000 — web app still works, no regressions

- [ ] **Step 5: Final commit**

```bash
cd d:/Work/fullstack-app
git add .
git commit -m "feat: marketing landing + quiz funnel + PostHog analytics"
```
