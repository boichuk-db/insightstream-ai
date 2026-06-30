# InsightStream AI — Project Context

> Цей файл — живий документ. Оновлюй після кожної значної сесії розробки.
> Детальний roadmap: [docs/superpowers/specs/2026-03-27-product-roadmap-gap-analysis.md](superpowers/specs/2026-03-27-product-roadmap-gap-analysis.md)

---

## Поточний стан (станом на 2026-06-29)

| Фіча                       | Статус | Деталі |
|----------------------------|--------|--------|
| Embeddable widget          | ✅     | Vanilla TS, IIFE bundle, Vite, конфігурований через `data-*` attrs |
| AI-аналіз фідбеку          | ✅     | Gemini 2.5 Flash: sentiment, category, tags, summary |
| Kanban board               | ✅     | 5 статусів, drag-and-drop, real-time via Socket.io |
| Команди та ролі            | ✅     | OWNER/ADMIN/MEMBER/VIEWER, email-invite токени |
| Тарифні плани              | ✅     | FREE/PRO/BUSINESS — ліміти + Stripe billing повністю підключено |
| Stripe billing             | ✅     | Checkout, Portal, webhooks, 14-day trial, `/dashboard/billing` |
| Weekly AI Digest           | ✅     | Cron + Gemini HTML summary, email-delivery |
| Коментарі та Activity Feed | ✅     | Коментарі до фідбеків, журнал подій команди |
| CSV/PDF export             | ✅     | Експорт відфільтрованих фідбеків |
| Password reset             | ✅     | forgot-password + reset-password (email токен, TTL 1 год) |
| Google OAuth               | ✅     | Passport Google strategy, auto-link by email |
| GitHub OAuth               | ✅     | Passport GitHub strategy, auto-link by email |
| Sentry                     | ✅     | `@sentry/nestjs` (api) + `@sentry/nextjs` (web) |
| JWT Auth                   | ✅     | JWT + bcrypt, API key для widget |
| Email (SES)                | ✅     | AWS SES замість Nodemailer/SMTP (SESClient з `@aws-sdk/client-ses`) |
| Деплой                     | ✅     | Railway (API) + Vercel (Web) + Supabase (DB) |
| TypeORM migrations         | ✅     | synchronize=false в prod, CLI DataSource, baseline migration |
| Dashboard UI               | ✅     | DashboardShell, PageHeader, уніфіковані лейаути всіх сторінок |
| AWS інфраструктура         | 🚧     | SQS, SES, Lambda, CodeBuild — чекаємо верифікацію акаунту |
| Teams Dashboard UI         | 🚧     | Backend ready, UI компоненти частково зроблені |

---

## Що зроблено в останніх сесіях

### 2026-06-29 — Stripe Billing + Dashboard UI Refactor

**Stripe billing (повна реалізація):**
- `packages/database` — User entity: 5 нових полів (`stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `planStatus`, `trialEndsAt`)
- `apps/api/src/migrations/1774830000000-AddStripeFieldsToUser.ts` — production migration з IF NOT EXISTS guards
- `apps/api/src/modules/stripe/` — `StripeService`, `StripeWebhookService`, `StripeController`, `StripeWebhookController`, `StripeModule`
  - `POST /plans/checkout` — Stripe Checkout Session з 14-day trial і metadata.userId
  - `GET /plans/portal` — Stripe Customer Portal
  - `GET /plans/status` — поточний стан підписки з БД
  - `POST /webhooks/stripe` — обробляє 4 webhook events (rawBody: true в main.ts)
- `apps/api/src/modules/plans/plan-limits.service.ts` — `past_due`/`canceled` → повертає FREE план
- Видалено дірку безпеки: `PATCH /plans/upgrade` (дозволяв безкоштовно апгрейдити план)
- `apps/web/src/lib/queries.ts` — `PlanStatus` interface + `planStatusQuery` (staleTime: 60s)
- `apps/web/src/components/billing/` — `TrialBanner`, `CurrentPlanCard`, `UsageMetrics`, `PricingCards`
- `apps/web/src/app/dashboard/billing/page.tsx` — білінг сторінка з toast на `?success=true`
- `apps/web/src/app/dashboard/layout.tsx` — TrialBanner на всіх dashboard сторінках
- Stripe Price IDs: PRO $9/mo, PRO $90/yr, BUSINESS $29/mo, BUSINESS $290/yr

**Dashboard UI уніфікація:**
- `apps/web/src/components/dashboard/DashboardShell.tsx` — обгортка з Sidebar для всіх sub-сторінок
- `apps/web/src/components/dashboard/PageHeader.tsx` — уніфікований header: `←` кнопка + icon + title + subtitle
- Settings перенесено з `/settings/*` → `/dashboard/settings/*` (отримують TrialBanner і layout)
- Виправлено sidebar height (`h-screen` → `lg:h-full`), archive подвійний padding

**AWS (в процесі):**
- SES email вже реалізовано (замінено Nodemailer)
- SQS publishing, Lambda functions, CodeBuild spec додано в `infra/`
- Чекаємо верифікацію AWS акаунту перед деплоєм

### 2026-03-30 — TypeORM Migrations + Debug Logs Cleanup
- `apps/api/src/modules/ai/ai.service.ts` — замінено 4x `console.error/warn` на NestJS `Logger`
- `apps/api/src/data-source.ts` — новий CLI DataSource для TypeORM migrations
- `apps/api/src/app.module.ts` — `synchronize` тепер `false` в prod, додано `migrations` + `migrationsRun: true`
- `apps/api/package.json` — додано скрипти `migration:generate`, `migration:run`, `migration:revert`, `migration:create`
- `apps/api/src/migrations/1774825125475-InitialSchema.ts` — порожній baseline (схема вже в БД через попередній sync)
- `packages/database/src/data-source.ts` — додано 5 пропущених entities (Team, TeamMember, Invitation, Comment, ActivityEvent)

### 2026-03-27 — Auth: Password Reset + OAuth
- `packages/database` — User entity: додано `googleId`, `githubId`, `resetPwdToken`, `resetPwdExpires`, `passwordHash` став nullable
- `apps/api` — `auth.service.ts`: `forgotPassword`, `resetPassword`, `oauthLogin`
- `apps/api` — `google.strategy.ts`, `github.strategy.ts` (Passport)
- `apps/api` — `auth.controller.ts`: нові endpoints + OAuth callback redirects
- `apps/web` — `/auth/forgot-password`, `/auth/reset-password`, `/auth/oauth/callback`
- `apps/web` — `page.tsx`: Google/GitHub кнопки, "Forgot password?" link, OAuth error/success banners
- Unit tests: `auth.service.spec.ts` (9 тестів), `users.service.spec.ts` (5 тестів)

---

## Технічний борг

| Проблема | Ризик | Пріоритет |
|----------|-------|-----------|
| AWS верифікація не пройдена | SQS/Lambda/CodeBuild не активні | 🔴 Чекаємо |
| Stripe env vars локально не в .env.example | Новий девелопер не знатиме про них | 🟡 Середній |
| Redis підключений але не використовується | Немає rate limiting, queue, caching | 🟡 Середній |
| Settings має старий `PATCH /plans/upgrade` через `upgradeMutation` | Виклик видаленого endpoint — треба прибрати або замінити на Stripe portal | 🟡 Середній |

---

## Роадмап (MoSCoW)

### MUST HAVE — launch blockers

- [x] **Stripe billing** — Checkout + webhooks + 14-day trial + `/dashboard/billing` ✅
- [x] **TypeORM migrations** — synchronize=false, CLI DataSource, baseline migration ✅
- [ ] **AWS верифікація** — чекаємо верифікацію акаунту, після якої активуються SES, SQS, Lambda
- [ ] **Landing page + `/pricing`** — публічна сторінка з Stripe CTA перед launch

### SHOULD HAVE — retention

- [ ] **Onboarding wizard** — 3 кроки: create project → install widget → get first feedback
- [ ] **Empty states** — "No projects" + "No feedback" з CTA замість пустих div-ів
- [ ] **Slack integration** — OAuth App, notify on new feedback, digest summary
- [ ] **Mobile responsiveness** — Kanban collapsible, sidebar drawer
- [ ] **Legal** — Terms of Service, Privacy Policy, Cookie consent banner (обов'язково перед монетизацією)
- [ ] **Landing page** — hero, pricing з Stripe CTA, FAQ, social proof

### COULD HAVE — growth

- [ ] **Webhooks system** — POST до custom URL на events, retry logic
- [ ] **Feedback voting** — upvote, унікальний constraint, vote count на картці
- [ ] **Swagger API docs** — `/api/docs` endpoint
- [ ] **In-app notifications** — bell icon, unread badge, WebSocket push
- [ ] **Redis rate limiting** — захист `POST /feedback/public` від спаму
- [ ] **BullMQ background jobs** — AI analysis та email асинхронно (зараз синхронні)
- [ ] **Advanced analytics** — тренди sentiment over time, volume by day

---

## Рекомендований порядок виконання

```
Тиждень 1:  ✅ TypeORM migrations + debug logs cleanup
Тиждень 2:  Email provider (Resend) — замінити Nodemailer повністю
Тиждень 3:  Stripe billing (checkout + webhooks + pricing page)
Тиждень 4:  Onboarding wizard + empty states
Тиждень 5:  Legal pages (ToS, Privacy, Cookie) + landing page improvements
Тиждень 6:  Mobile responsiveness + Teams Dashboard UI completion
            → LAUNCH / публічний анонс
Тижні 7+:   Slack, notifications, analytics, BullMQ, webhooks
```

---

## Env Vars чеклист

### `apps/api/.env`

```
# Database
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=

# Auth
JWT_SECRET=

# AI
GEMINI_API_KEY=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# URLs
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Email (SMTP / Resend)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Sentry
SENTRY_DSN=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_...

# AWS (SES, SQS, Lambda — чекаємо верифікацію)
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=
SQS_FEEDBACK_QUEUE_URL=
```

### `apps/web/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WIDGET_URL=http://localhost:8080/dist/widget.iife.js
SENTRY_DSN=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_...
```

---

## Ключові файли для орієнтації

| Область | Файл |
|---------|------|
| Auth API | `apps/api/src/modules/auth/auth.service.ts` |
| Auth controller | `apps/api/src/modules/auth/auth.controller.ts` |
| User entity | `packages/database/src/entities/user.entity.ts` |
| Feedback entity | `packages/database/src/entities/feedback.entity.ts` |
| AI analysis | `apps/api/src/modules/ai/ai.service.ts` |
| Stripe service | `apps/api/src/modules/stripe/stripe.service.ts` |
| Stripe webhooks | `apps/api/src/modules/stripe/stripe-webhook.service.ts` |
| Plan limits | `apps/api/src/modules/plans/plan-limits.service.ts` |
| Dashboard layout | `apps/web/src/app/dashboard/layout.tsx` |
| DashboardShell | `apps/web/src/components/dashboard/DashboardShell.tsx` |
| PageHeader | `apps/web/src/components/dashboard/PageHeader.tsx` |
| Billing page | `apps/web/src/app/dashboard/billing/page.tsx` |
| Login page | `apps/web/src/app/page.tsx` |
| Dashboard | `apps/web/src/app/dashboard/page.tsx` |
| Widget entry | `apps/widget/src/main.ts` |
| AWS infra | `infra/` |
