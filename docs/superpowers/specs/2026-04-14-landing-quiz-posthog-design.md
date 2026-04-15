# Marketing Landing + Quiz Funnel + PostHog — Design Spec

**Date:** 2026-04-14  
**Status:** Approved

## Overview

Окремий маркетинговий лендінг `apps/landing` (Next.js 16, Vercel) з story-driven структурою, 5-кроковим quiz-квізом для рекомендації плану, PostHog аналітикою в landing + web, та SEO.

---

## 1. Архітектура

### Monorepo

```
apps/
  landing/     ← новий Next.js 16 додаток, порт 3002
  api/         ← незмінний
  web/         ← PostHog додається
  widget/      ← незмінний
```

### `apps/landing`

- Повністю незалежний Next.js 16 додаток
- Деплоїться на Vercel окремо від `apps/web`
- Імпортує `@insightstream/shared-types` (типи) та `@insightstream/database` (тільки `PLAN_CONFIGS` — чистий TS, без DB з'єднання)
- Темна тема: zinc-950 фон + indigo акценти (як у `apps/web`)
- Власний `package.json`, `next.config.ts`, TailwindCSS 4

### PostHog

- Обидва додатки (`apps/landing`, `apps/web`) ініціалізуються з одним `NEXT_PUBLIC_POSTHOG_KEY`
- PostHog автоматично зʼєднує user journey через `distinct_id`
- Landing трекає воронку (quiz, CTA), web — onboarding і upgrade
- Env vars: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

---

## 2. Структура лендінгу

### Маршрути

```
/          ← головна сторінка (всі секції)
/quiz      ← квіз (step-based, query param ?step=1..5,result)
/sitemap.xml
/robots.txt
```

### Секції на `/` (Story-driven, зверху вниз)

| # | Секція | Зміст |
|---|--------|-------|
| 1 | **Nav** | Logo + "Sign In" (→ app.insightstream.ai) + "Get Started" CTA |
| 2 | **Hero** | Bold headline (A/B via PostHog flag) + підзаголовок + "Start Free" CTA + screenshot дашборду |
| 3 | **Problem** | 3 pain points: "Feedback scattered", "No AI analysis", "Manual work" |
| 4 | **Solution** | Як InsightStream вирішує: Widget → Dashboard → AI Digest (3 кроки) |
| 5 | **Features** | Grid 2×3: widget, AI analysis, Kanban board, weekly digest, teams, CSV export |
| 6 | **Quiz CTA** | Банер: "Find your perfect plan — Take 2-min quiz" |
| 7 | **Pricing** | 3 плани (Free / Pro / Business) з `PLAN_CONFIGS` з `packages/database` |
| 8 | **Testimonials** | 3 статичних відгуки (hardcoded placeholder контент) |
| 9 | **Footer** | Nav links + © InsightStream |

### A/B тест — PostHog feature flag `landing-hero-headline`

- **control:** *"Turn every feedback into actionable insights"*
- **test:** *"Stop guessing. Start knowing. AI feedback analytics for B2B teams"*

---

## 3. Quiz система

### Маршрут

`/quiz` — окрема сторінка. Query param `?step=1` → `?step=5` → `?step=result`.  
Progress bar зверху (1/5 → 2/5 → ... → Done).

### Config

**Файл:** `apps/landing/src/config/quiz.config.ts`

```ts
export type QuestionType = 'cards' | 'radio' | 'multiselect'

export interface QuizOption {
  value: string
  label: string
  icon?: string       // emoji або назва lucide іконки
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
```

### Дефолтні 5 питань

| # | Тип | Питання | Опції |
|---|-----|---------|-------|
| 1 | `cards` | What best describes your team? | Solo founder / Small team (2–10) / Mid-size (11–50) / Enterprise (50+) |
| 2 | `radio` | How much feedback do you collect per month? | < 100 / 100–1,000 / 1,000–10,000 / 10,000+ |
| 3 | `cards` | What's your primary use case? | Product feedback / Customer support / NPS surveys / User research |
| 4 | `multiselect` | Which features matter most? | AI Analysis / Kanban Dashboard / Embeddable Widget / Weekly Digest / Team Access |
| 5 | `radio` | What's your monthly budget? | Free / ~$30/mo / ~$100/mo / Custom / Enterprise |

### Логіка рекомендації

**Файл:** `apps/landing/src/lib/quiz.utils.ts`

Функція `recommendPlan(answers: Record<string, string | string[]>): 'free' | 'pro' | 'business'`:
- Простий scoring: кожна відповідь додає бали до плану
- Повертає план з найбільшим score

### Фінальний екран (`?step=result`)

- Заголовок: *"Based on your answers, **PRO** is perfect for you"*
- Summary відповідей (що вибрав юзер)
- Features included у рекомендованому плані
- CTA: "Start Free Trial" → redirect на `${APP_URL}/` (signup з `?plan=pro` query param)

### PostHog Events (quiz)

| Event | Properties |
|-------|-----------|
| `quiz_started` | — |
| `quiz_step_completed` | `{ step: number, question_id: string, answer: string \| string[] }` |
| `quiz_completed` | `{ recommended_plan: 'free' \| 'pro' \| 'business' }` |
| `quiz_cta_clicked` | `{ plan: string }` |

---

## 4. PostHog інтеграція

### Setup (обидва додатки)

`PostHogProvider` — `'use client'` компонент в `app/layout.tsx`:

```ts
posthog.init(NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  capture_pageview: false,         // вручну через usePathname
  autocapture: true,
  session_recording: {
    maskAllInputs: true,           // маскує паролі та email
  },
})
```

Pageview трекінг через `usePathname()` в окремому `PostHogPageView` компоненті.

### Feature Flag (A/B тест)

```ts
// apps/landing/src/components/sections/Hero.tsx
const variant = useFeatureFlagVariantKey('landing-hero-headline')
const headline = variant === 'test'
  ? 'Stop guessing. Start knowing. AI feedback analytics for B2B teams'
  : 'Turn every feedback into actionable insights'
```

### PostHog Events (`apps/web`)

| Event | Properties |
|-------|-----------|
| `user_signed_up` | `{ method: 'email' \| 'google' \| 'github' }` |
| `dashboard_viewed` | — |
| `upgrade_clicked` | `{ from_plan: string, to_plan: string }` |
| `plan_upgraded` | `{ plan: string }` |

---

## 5. SEO

| Файл | Зміст |
|------|-------|
| `app/layout.tsx` | `generateMetadata` — title, description, OG tags, Twitter card, canonical URL |
| `app/sitemap.ts` | Автогенерація `sitemap.xml` (/ та /quiz) |
| `app/robots.ts` | `robots.txt` (allow all, sitemap посилання) |
| `app/page.tsx` | JSON-LD `SoftwareApplication` schema |
| `public/og-image.png` | Статичний OG image 1200×630 |

**Metadata приклад:**
```ts
title: 'InsightStream AI — AI-Powered Feedback Analytics for B2B SaaS'
description: 'Collect user feedback with an embeddable widget, analyze it with AI, and get weekly digests. Start free.'
openGraph: { images: ['/og-image.png'], type: 'website' }
```

---

## 6. Turbo + Dev

`turbo.json` — додати `landing` до pipeline.  
`pnpm dev` запускає всі 3 додатки: api (3001), web (3000), landing (3002).

Env vars для landing:
```
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_APP_URL=https://app.insightstream.ai
```

---

## Out of scope

- Backend для quiz (відповіді не зберігаються в БД)
- Email capture в квізі
- Real testimonials (placeholder контент)
- Платіжна інтеграція на лендінгу (redirect на app для upgrade)
