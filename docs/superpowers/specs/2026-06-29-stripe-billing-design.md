# InsightStream AI — Stripe Billing Design

**Дата:** 2026-06-29
**Статус:** Approved
**Мета:** Додати монетизацію через Stripe — checkout, subscriptions, 14-day trial, Customer Portal, billing dashboard

---

## 1. Scope

- Stripe Checkout (hosted) для PRO і BUSINESS планів
- Місячний і річний billing
- 14-денний trial для нових підписників
- Stripe Customer Portal для управління підпискою та інвойсами
- `/dashboard/billing` сторінка з поточним планом, usage, upgrade options
- Trial banner у layout
- Webhook handler для синхронізації стану підписки в БД

**Поза scope:** Stripe Payment Element (embedded checkout), custom invoice UI, referral/coupon system.

---

## 2. Дані

### 2.1 Розширення User entity

Нові поля на існуючій `User` entity (без нової таблиці):

```typescript
stripeCustomerId     string | null  // Stripe Customer ID (cus_...)
stripeSubscriptionId string | null  // Stripe Subscription ID (sub_...)
stripePriceId        string | null  // активний Price ID (price_...)
planStatus           enum           // active | trialing | past_due | canceled
trialEndsAt          Date | null
```

Існуюче поле `plan: enum(FREE/PRO/BUSINESS)` залишається — source of truth для feature gating.

### 2.2 Stripe об'єкти

| Stripe об'єкт | Кількість | Опис |
|---|---|---|
| Product | 2 | InsightStream PRO, InsightStream BUSINESS |
| Price | 4 | PRO monthly, PRO annual, BUSINESS monthly, BUSINESS annual |
| Customer | 1 per user | створюється при першому checkout |
| Subscription | 1 per paying user | Stripe управляє, ми зберігаємо ID |

### 2.3 PlanStatus логіка

```
active     → повний доступ згідно plan
trialing   → повний доступ (trial period)
past_due   → treat як FREE (оплата не пройшла)
canceled   → treat як FREE (підписка скасована)
```

---

## 3. Backend

### 3.1 StripeModule

Новий NestJS модуль `apps/api/src/modules/stripe/`:

```
stripe/
├── stripe.module.ts
├── stripe.service.ts        — Stripe SDK wrapper, business logic
├── stripe.controller.ts     — /plans/* endpoints (JWT protected)
├── stripe-webhook.controller.ts  — /webhooks/stripe (public, raw body)
└── stripe.service.spec.ts
```

### 3.2 Endpoints

**`POST /plans/checkout`** (JWT required)
```typescript
body: { priceId: string }
// 1. Якщо немає stripeCustomerId → створити Stripe Customer
// 2. Створити Checkout Session з:
//    - customer: stripeCustomerId
//    - metadata: { userId: user.id }  ← обов'язково для webhook lookup
//    - trial_period_days: 14
//    - success_url: /dashboard/billing?success=true
//    - cancel_url: /dashboard/billing
// 3. Повернути { url: session.url }
```

**`GET /plans/portal`** (JWT required)
```typescript
// 1. Отримати stripeCustomerId з user
// 2. Створити Customer Portal Session
// 3. Повернути { url: session.url }
```

**`GET /plans/status`** (JWT required)
```typescript
// Повернути { plan, planStatus, trialEndsAt, currentPeriodEnd, stripePriceId }
// Для billing page UI — не звертатись до Stripe API, читати з БД
```

### 3.3 Webhook Handler

**`POST /webhooks/stripe`** (public, no JWT, raw body required)

```typescript
// 1. stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
// 2. switch(event.type):

'checkout.session.completed'
  → знайти user по stripeCustomerId або metadata.userId
  → оновити: stripeSubscriptionId, stripePriceId, plan, planStatus, trialEndsAt

'customer.subscription.updated'
  → оновити: plan, planStatus, stripePriceId, trialEndsAt

'customer.subscription.deleted'
  → plan = FREE, planStatus = canceled
  → stripeSubscriptionId = null, stripePriceId = null

'invoice.payment_failed'
  → planStatus = past_due
```

**Ідемпотентність:** перевіряти `event.id` через Stripe's built-in idempotency (не обробляти двічі через retry). Логувати кожен webhook event.

**Raw body:** NestJS за замовчуванням парсить JSON — для `/webhooks/stripe` потрібен `express.raw()` middleware або `@RawBody()` декоратор, щоб Stripe міг верифікувати підпис.

### 3.4 PlanLimitsService

Існуючий сервіс розширюємо: при перевірці лімітів враховуємо `planStatus`:

```typescript
effectivePlan = (planStatus === 'past_due' || planStatus === 'canceled')
  ? PlanType.FREE
  : user.plan
```

### 3.5 Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_...
```

---

## 4. Frontend

### 4.1 Сторінка `/dashboard/billing`

Нова сторінка `apps/web/src/app/dashboard/billing/page.tsx`.

**Layout:**

```
┌─────────────────────────────────────────────┐
│ Current Plan                                │
│ ┌─────────────────────────────────────────┐ │
│ │ PRO  •  Trialing  •  ends Jun 15        │ │
│ │ [Manage subscription →]                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Usage                                       │
│  Feedback    ████████░░  847 / 1000         │
│  Projects    ███░░░░░░░  3 / 10             │
│                                             │
│ Upgrade Plan                [monthly/annual]│
│ ┌──────────────┐  ┌──────────────────────┐ │
│ │     PRO      │  │      BUSINESS        │ │
│ │   $19/mo     │  │      $49/mo          │ │
│ │  $190/yr ✓   │  │     $490/yr ✓        │ │
│ │  [Upgrade]   │  │     [Upgrade]        │ │
│ └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Компоненти:**

| Компонент | Опис |
|---|---|
| `CurrentPlanCard` | Поточний план, статус, trial countdown, кнопка "Manage subscription" |
| `UsageMetrics` | Progress bars: feedback count, projects count |
| `PricingCards` | Monthly/annual toggle, 2 картки (PRO, BUSINESS), кнопка Upgrade |
| `TrialBanner` | Показується у dashboard layout якщо `planStatus === 'trialing'` |

**Дані:** TanStack Query `useQuery(['plan-status'], GET /plans/status)`.

### 4.2 Trial Banner

Додається до `DashboardLayout` — видимий на всіх dashboard сторінках:

```
⚡ 7 days left in your PRO trial  [Upgrade now →]
```

Показується якщо `planStatus === 'trialing'`. Ховається після upgrade або закінчення trial.

### 4.3 Upgrade Flow

```
1. Клік [Upgrade] на PricingCard
2. POST /plans/checkout { priceId: selectedPriceId }
3. window.location.href = response.url  (redirect → Stripe Checkout)
4. Після оплати → Stripe redirect → /dashboard/billing?success=true
5. Toast: "You're now on PRO!"
6. Invalidate plan-status query
```

### 4.4 Sidebar

Новий пункт у navigation:
```
Settings
└── Billing  (badge "Trial" якщо planStatus === 'trialing')
```

---

## 5. TypeORM Migration

Новий migration файл для нових полів User:

```sql
ALTER TABLE "user"
  ADD COLUMN "stripeCustomerId" varchar,
  ADD COLUMN "stripeSubscriptionId" varchar,
  ADD COLUMN "stripePriceId" varchar,
  ADD COLUMN "planStatus" varchar NOT NULL DEFAULT 'active',
  ADD COLUMN "trialEndsAt" timestamp;
```

---

## 6. Тестування

### 6.1 Unit тести

- `StripeService` — мокати Stripe SDK, тестувати логіку checkout session creation
- `StripeWebhookService` — тестувати кожен event handler: `subscription.updated` → plan змінився, `subscription.deleted` → downgrade до FREE, `invoice.payment_failed` → past_due
- `PlanLimitsService` — `past_due` і `canceled` трактуються як FREE

### 6.2 Ручне тестування

```bash
# Запустити Stripe CLI webhook listener:
stripe listen --forward-to localhost:3001/webhooks/stripe

# Тригерити events вручну:
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

**Тестові картки:**
- `4242 4242 4242 4242` — успішна оплата
- `4000 0000 0000 0341` — payment failed

### 6.3 E2E (Playwright)

Happy path: FREE user → `/dashboard/billing` → Upgrade → mock Stripe redirect → `?success=true` → PRO plan відображається.

---

## 7. Порядок імплементації

1. Stripe Dashboard: створити Products і Prices (6 штук), отримати Price IDs
2. TypeORM migration для нових User fields
3. `StripeModule` — service, controller, webhook controller
4. Env vars у `.env` та Railway
5. `PlanLimitsService` — додати `planStatus` logic
6. Frontend: `BillingPage`, компоненти, TanStack Query hook
7. Trial banner у DashboardLayout
8. Sidebar navigation update
9. Тестування через Stripe CLI
