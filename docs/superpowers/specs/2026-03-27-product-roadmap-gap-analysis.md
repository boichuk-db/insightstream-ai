# InsightStream AI — Product Roadmap & Gap Analysis

**Дата:** 2026-03-27
**Горизонт:** 0–3 місяці (MVP до ринку → перші платні клієнти)
**Мета:** Визначити, що потрібно для монетизації і утримання перших користувачів

---

## 1. Поточний стан

### Що побудовано і працює

| Область | Статус | Деталі |
|---------|--------|--------|
| Embeddable widget | ✅ Ready | Vanilla TS, конфігурований, анімації Framer Motion |
| AI-аналіз фідбеку | ✅ Ready | Gemini 2.5 Flash: sentiment, категорія, теги, summary |
| Kanban board | ✅ Ready | 5 статусів, drag-and-drop, real-time via Socket.io |
| Команди та ролі | ✅ Backend ready | OWNER/ADMIN/MEMBER/VIEWER, запрошення через email-токен |
| Тарифні плани | ✅ Backend ready | FREE/PRO/BUSINESS в коді, ліміти перевіряються |
| Weekly AI Digest | ✅ Ready | Cron + Gemini HTML summary, email-delivery |
| Коментарі та Activity Feed | ✅ Ready | Коментарі до фідбеків, журнал подій команди |
| CSV/PDF export | ✅ Ready | Експорт відфільтрованих фідбеків |
| Аутентифікація | ✅ Ready | JWT + bcrypt, API key для widget |
| Деплой | ✅ Ready | Vercel + Railway + Supabase, Docker multi-stage |

### В процесі (команди — Phase 2)

- UI для Dashboard команди (`/teams/[teamId]`) — не побудовано
- Edit/Delete team UI у `/settings/team` — не побудовано
- Activity Feed Component — не побудовано

### Технічний борг

- `TYPEORM_SYNCHRONIZE=true` в продакшні — ризик втрати даних
- Debug-логи в `api/main.ts` і `web/lib/api.ts` — потрібно прибрати
- Redis підключений але **не використовується** — rate limiting, caching, jobs відсутні
- Email: Nodemailer без реального провайдера — запрошення і digest не доставляються
- Тести: тільки 1 e2e-тест, нульове покриття бізнес-логіки

---

## 2. Критичні прогалини (Launch Blockers)

Ці питання **блокують залучення перших платних клієнтів**. Жодне з них не складне технічно — усі вирішуються за 1-2 тижні.

| # | Проблема | Чому критично | Зусилля |
|---|----------|---------------|---------|
| 1 | **Stripe billing відсутній** | Тарифи є в коді, але оплатити підписку неможливо — немає checkout, webhooks, plan upgrade flow | M |
| 2 | **Немає реального email-провайдера** | Запрошення в команду, weekly digest, email-notifications фізично не відправляються без Resend/SendGrid | S |
| 3 | **Немає password reset** | Базовий auth flow. Без нього — не можна публічно лончити | S |
| 4 | **TypeORM `synchronize=true` в prod** | Будь-яка зміна entity може дропнути дані. Потрібні міграції | S |
| 5 | **Немає error monitoring** | Продакшн повністю сліпий до помилок. Клієнти бачать 500, ти — нічого | XS |
| 6 | **Немає onboarding flow** | Новий юзер після реєстрації опиняється на пустому dashboard без підказок — йде | M |

---

## 3. Функціональний роадмап

### Phase 1: Launch-Ready (0–6 тижнів)

Все що потрібно, щоб перший платний клієнт міг зареєструватись, отримати email, оплатити план і почати роботу.

#### 3.1 Stripe Billing
- Stripe Checkout для PRO і BUSINESS тарифів
- Webhooks: `checkout.session.completed` → оновити `user.plan` в БД
- Webhook: `customer.subscription.deleted` → downgrade до FREE
- Customer Portal для управління підпискою (Stripe hosted)
- `/pricing` сторінка з реальними CTA кнопками "Upgrade"
- `POST /plans/checkout` endpoint + `GET /plans/portal` для redirect

**Чому зараз:** без payment processing немає Revenue — ключова мета горизонту.

#### 3.2 Email Provider (Resend)
- Замінити Nodemailer на Resend (безкоштовний tier: 3000 emails/month)
- Шаблони (React Email або HTML): invite, digest, password-reset, welcome
- Окремий `EmailModule` з `EmailService`, щоб не дублювати логіку

**Чому зараз:** запрошення в команду і weekly digest зараз мовчать.

#### 3.3 Password Reset
- `POST /auth/forgot-password` — відправляє email з токеном (TTL 1 год)
- `POST /auth/reset-password` — валідує токен, оновлює passwordHash
- UI: `/auth/forgot-password` і `/auth/reset-password?token=...`
- Токени зберігати в Redis або окремій таблиці з expiry

**Чому зараз:** без цього не можна публічно лончити — юзери заблоковані.

#### 3.4 TypeORM Migrations
- Вимкнути `synchronize: true` в production конфігурації
- Налаштувати TypeORM CLI: `typeorm migration:generate`, `migration:run`
- Перший міграційний файл для поточної схеми
- Додати `migration:run` в deployment pipeline

**Чому зараз:** `synchronize=true` може дропнути колонки при зміні entity — це критичний ризик для даних клієнтів.

#### 3.5 Sentry Error Monitoring
- `@sentry/nestjs` у api, `@sentry/nextjs` у web
- Capture exceptions + performance tracing
- DSN через env vars (безкоштовний tier достатній для старту)

**Чому зараз:** мінімальне зусилля (XS), максимальний impact на visibility.

#### 3.6 Onboarding Wizard
- 3-кроковий wizard після першої реєстрації (localStorage flag `onboarding_completed`)
- Крок 1: Створити перший проект (name + domain)
- Крок 2: Встановити widget (покажи snippet, кнопка "copy")
- Крок 3: Дочекайся першого фідбеку або пропусти
- Empty states: якщо немає проектів / немає фідбеків — CTA замість пустого простору

**Чому зараз:** activation rate прямо впливає на retention. Без onboarding більшість юзерів йде після реєстрації.

#### 3.7 Landing Page (Conversion)
- Hero секція з чітким value prop і screenshots
- Social proof placeholder (можна додати пізніше)
- Pricing секція з реальними Stripe CTA
- FAQ розділ (5-7 питань)
- "Book a demo" CTA (Calendly або просто email)

---

### Phase 2: Retention & Growth (6–12 тижнів)

Після того як перші клієнти є — утримати їх і рости.

#### 3.8 Slack Integration
- OAuth App: підключи Slack workspace в налаштуваннях проекту
- Notifications: новий feedback → Slack message з sentiment + category
- Weekly digest summary → Slack channel
- `SlackIntegrationModule` у api, UI в Project Settings

**Чому важливо:** найпопулярніший запит у feedback-tools. Пряме підключення до робочого процесу команди.

#### 3.9 In-App Notifications
- Bell icon у header з unread badge
- Events: новий feedback на твоєму проекті, status change, новий comment
- `Notification` entity: userId, type, payload, readAt
- WebSocket push для real-time badge update

#### 3.10 Advanced Analytics
- Тренди sentiment over time (line chart за тиждень/місяць)
- Feedback volume by day (bar chart)
- Category distribution over time (stacked area chart)
- Week-over-week comparison (sentiment + volume)
- Recharts вже є — потрібен тільки API endpoint з агрегацією

#### 3.11 Mobile Responsiveness
- Kanban board → stack columns vertically на mobile, горизонтальний scroll
- Sidebar → collapsible/drawer на mobile
- Widget вже responsive — dashboard ні

#### 3.12 Public API Documentation
- Swagger/OpenAPI via `@nestjs/swagger` (вже встановлений у NestJS ecosystem)
- `/api/docs` endpoint з інтерактивною документацією
- Потрібен public API key для зовнішніх інтеграцій

#### 3.13 Feedback Voting
- Юзери можуть upvote фідбек (для public boards або внутрішнього пріоритизування)
- `FeedbackVote` entity, uniq constraint userId+feedbackId
- Показати vote count на Kanban картці

---

### Phase 3: Scale (3–12 місяців)

Після product-market fit — масштабування і enterprise.

| Напрям | Що робити |
|--------|-----------|
| **Integrations** | Linear, Jira, GitHub Issues — push feedback as ticket |
| **Webhooks** | POST до custom URL на будь-яку подію (нова feedback, status change) |
| **Advanced AI** | Duplicate detection, auto-assign до member за category, smart clustering |
| **SSO** | Google OAuth, GitHub OAuth login/signup |
| **Enterprise** | SCIM provisioning, granular audit logs, SLA, dedicated support |
| **Multi-region** | EU + US deployment, data residency options |
| **White-label widget** | Кастомний domain для widget.js, custom branding |
| **Public roadmap** | Public-facing board де клієнти бачать що береться в роботу |

---

## 4. Архітектурні покращення

### 4.1 Redis (зараз не використовується)

Redis вже запущений в docker-compose, але в коді його немає. Три очевидних застосування:

- **Rate limiting** на `POST /feedback/public` — захист від спаму в widget endpoint
- **Session/JWT caching** — зменшити кількість DB queries на перевірку токенів
- **Job queue (Bull/BullMQ)** — перенести AI analysis і email в background

### 4.2 Background Jobs (Bull/BullMQ)

Зараз AI analysis і email відправка — синхронні операції прямо в request cycle. Це призводить до:
- Повільних відповідей (`POST /feedback/public` чекає AI response)
- Помилки Gemini API блокують весь запит

Рішення: `FeedbackAnalysisQueue` і `EmailQueue` через BullMQ + Redis. Widget endpoint відповідає одразу, job виконується асинхронно.

### 4.3 API Versioning

Для публічного API (widget, external integrations) потрібен версіонований шлях `/v1/...`. NestJS підтримує це через `app.setGlobalPrefix('v1')` або `VersioningType.URI`.

### 4.4 Webhook System

Замість того щоб клієнти постійно polling API — push-модель:
- `WebhookSubscription` entity: projectId, url, events[], secret
- Після кожного ключового event → HTTP POST до всіх підписаних URL
- Retry logic з exponential backoff (через BullMQ)

---

## 5. Інфраструктура

| # | Що | Чому | Пріоритет |
|---|-----|------|-----------|
| 1 | **Staging environment** | Тестувати зміни перед prod. Окремий Railway service + Supabase project | Must Have |
| 2 | **Database backups** | Supabase auto-backups активувати + перевірити restore процедуру | Must Have |
| 3 | **Monitoring/Alerting** | UptimeRobot (безкоштовно) або Railway alerts — знати про downtime | Must Have |
| 4 | **CDN для widget.js** | Зараз копіюється вручну в `public/`. Потрібен: або Cloudflare R2, або GitHub Actions → Cloudflare Pages | Should Have |
| 5 | **CI/CD auto-deploy** | GitHub Actions вже є. Додати: auto-deploy main → Railway + Vercel on merge | Should Have |
| 6 | **Debug logs cleanup** | Прибрати console.log з `api/main.ts` і `web/lib/api.ts` перед production release | Quick Win |
| 7 | **Environment validation** | `@nestjs/config` + joi/zod schema для env vars — fail fast при неправильній конфігурації | Quick Win |

---

## 6. Дизайн

### 6.1 Light Mode

Зараз тільки dark theme. Для B2B SaaS ринку light mode — стандартне очікування. Реалізація через CSS variables + `prefers-color-scheme` media query + ручний toggle.

### 6.2 Mobile-First Dashboard

Kanban board з 5 колонками на мобільному — неюзабельний. Вирішення:
- Mobile: одна колонка з tab-switcher між статусами
- Tablet: 2-3 колонки, горизонтальний scroll
- Sidebar: collapsible drawer з hamburger icon

### 6.3 Empty States

Зараз якщо нема проектів або фідбеків — пустий div. Потрібно:
- "No projects yet" → ілюстрація + "Create your first project" CTA
- "No feedback yet" → ілюстрація + "Install widget" CTA + snippet preview

### 6.4 Error Pages

- Кастомна 404 сторінка (`not-found.tsx` в Next.js App Router)
- Кастомна 500/error boundary
- Toast notifications для API errors замість console.error

### 6.5 Marketing Landing Page

| Секція | Що покращити |
|--------|-------------|
| Hero | Конкретний value prop: "Collect, analyze and act on feedback — automatically" |
| Social proof | Screenshots продукту, placeholder для testimonials |
| Features | 3-4 ключові фічі з іконками та описом |
| Pricing | Real Stripe CTA кнопки, highlight рекомендованого плану |
| FAQ | 5-7 питань: безпека, інтеграції, ціна, скасування |

---

## 7. Бізнес та Compliance

### 7.1 Юридичне (обов'язково перед монетизацією)

- **Terms of Service** — умови використання сервісу
- **Privacy Policy** — обробка персональних даних, GDPR
- **Cookie Consent Banner** — для EU користувачів
- **GDPR**: `DELETE /users/me` endpoint для видалення акаунту + всіх даних; data export endpoint

### 7.2 Admin Panel (внутрішній)

- Перегляд всіх юзерів: email, план, дата реєстрації, usage stats
- Ручна зміна плану для тест-акаунтів / early adopters
- Технічний борг: список помилок з Sentry у вигляді summary

### 7.3 Trial Period

- 14-day FREE trial PRO для нових реєстрацій
- Після 14 днів → downgrade до FREE або upgrade via Stripe
- Нагадування на 7, 12, 14 день (email через Resend)

### 7.4 Referral Program (Phase 2+)

- Унікальне referral посилання для кожного юзера
- Бонус: +1 місяць PRO за кожного залученого платного клієнта
- `Referral` entity: referrerId, referredUserId, status, rewardedAt

---

## 8. Пріоритизація (MoSCoW для 0–3 місяці)

```
MUST HAVE (launch blockers — без цього нема продукту)
─────────────────────────────────────────────────────
☐ Stripe billing (checkout + webhooks + upgrade flow)
☐ Email provider — Resend integration
☐ Password reset flow
☐ TypeORM migrations (вимкнути synchronize=true)
☐ Sentry error monitoring

SHOULD HAVE (retention — без цього клієнти йдуть)
──────────────────────────────────────────────────
☐ Onboarding wizard (3 кроки)
☐ Empty states з CTA
☐ Slack integration
☐ Mobile responsiveness (dashboard)
☐ Advanced analytics (trends)
☐ Legal: ToS + Privacy Policy + Cookie banner

COULD HAVE (growth — добре мати, але можна пізніше)
────────────────────────────────────────────────────
☐ Webhooks system
☐ Feedback voting
☐ Public API documentation (Swagger)
☐ In-app notifications
☐ Redis rate limiting + BullMQ jobs
☐ Admin panel

WON'T HAVE (зараз)
────────────────────
✗ SSO / OAuth login
✗ Enterprise (SCIM, audit logs, SLA)
✗ Multi-region deployment
✗ White-label widget
✗ Linear / Jira integrations
```

---

## 9. Що нас відрізняє від конкурентів

| Конкурент | Наша перевага |
|-----------|---------------|
| **Canny** | AI-аналіз з sentiment + автоматична категоризація; дешевше |
| **Hotjar** | Фокус на feedback workflow (Kanban), а не heatmaps |
| **UserVoice** | Сучасний стек, простий onboarding, немає legacy |
| **Sentry Feedback** | Командна робота, digest, widget для будь-якого сайту |

**Наш диференціатор:** AI-автоматизація (Gemini) + командний workflow + embeddable widget — все в одному, за ціною нижче ринку.

---

## 10. Порядок виконання (рекомендований)

```
Тиждень 1:  Sentry + Debug logs cleanup + TypeORM migrations
Тиждень 2:  Email provider (Resend) + Password reset
Тиждень 3:  Stripe billing (checkout + webhooks)
Тиждень 4:  Onboarding wizard + Empty states
Тиждень 5:  Legal pages (ToS, Privacy) + Landing page improvements
Тиждень 6:  Mobile responsiveness + Teams Dashboard (Phase 2 completion)
            → LAUNCH / публічний анонс
Тижні 7-12: Slack, Notifications, Advanced Analytics, Trial period
```
