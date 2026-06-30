# InsightStream AI — Architecture Hardening Design

**Дата:** 2026-06-30
**Статус:** Approved
**Мета:** Закрити 3 архітектурні ризики, виявлені під час architecture review: відсутність Redis adapter для Socket.io (блокер горизонтального скейлу), необмежений `GET /feedback` запит без скоупу по проекту, та відсутність індексу на `feedbacks`.

---

## 1. Scope

- Socket.io Redis adapter — підготовка до горизонтального скейлу API (2+ інстанси)
- `GET /feedback` → scoped по `projectId`, з композитним індексом і безпечним cap
- Frontend: dashboard query переходить на `["feedbacks", projectId]`, прибирається client-side фільтрація по проекту

**Поза scope (свідомо не чіпаємо):**
- SQS `feedback-processor` Lambda-стаб (лише логує, не робить AI-аналіз) — лишається як заготовка під майбутню фічу (Slack/webhook notifications), не дублює і не конфліктує з BullMQ AI-обробкою
- `feedbackService.findAllByTeam` — мертвий код, ніде не викликається з контролера. Можливий окремий баг (team members не бачать team feedback через цей шлях) — потребує окремого розслідування, не частина цього фіксу
- Порожні директорії `apps/api/lambda/*` — залишки старої структури, прибрати окремим дрібним cleanup, не зараз
- Повноцінна UI-пагінація (page controls) — не підходить для Kanban-дошки, замінена на projectId-скоуп + cap

---

## 2. Socket.io Redis Adapter

### Проблема
`EventsGateway` тримає WebSocket-з'єднання в пам'яті процесу (`client.join('user-{id}')`). При 2+ інстансах API за ALB подія, надіслана з інстанса A (`emitFeedbackUpdated`), не дійде до клієнта, підключеного до інстанса B. Зараз — один EC2/один процес, тому не виявляється, але стане silent failure в момент додавання другого інстанса.

### Рішення
- Нові залежності: `@socket.io/redis-adapter`, `ioredis` (той самий `REDIS_URL`, що вже використовує `BullModule.forRoot` в [app.module.ts](../../../apps/api/src/app.module.ts))
- У [main.ts](../../../apps/api/src/main.ts): перед `app.listen()` створити pub/sub `ioredis`-клієнти, обгорнути в `RedisIoAdapter` (NestJS `IoAdapter` subclass), викликати `app.useWebSocketAdapter(adapter)`
- [events.gateway.ts](../../../apps/api/src/modules/events/events.gateway.ts) — без змін, `server.to(room).emit(...)` після adapter'а автоматично йде через Redis pub/sub
- Якщо Redis недоступний при старті — застосунок падає з чітким помилковим логом (fail-fast), без мовчазної деградації до in-memory adapter

### Тестування
Unit-тести гейтвея не змінюються (логіка `handleConnection`/`emitFeedbackUpdated` та сама). Adapter — інфраструктурний шар, юніт-тестами не покривається; перевірка вручну: підняти 2 інстанси API локально (різні порти, спільний Redis), відкрити дашборд у 2 вкладках з різними інстансами через прокси, переконатись що подія з одного інстанса доходить до сокета на іншому.

---

## 3. Feedback Query Scope + Index + Cap

### Проблема
`GET /feedback` (→ `findAllByUser`) повертає **весь** feedback користувача по **всіх проектах одразу**, без `LIMIT`. Frontend ([dashboard/page.tsx](../../../apps/web/src/app/dashboard/page.tsx)) фільтрує client-side до активного проекту й рендерить як Kanban-дошку. При рості кількості feedback/проектів — лінійне зростання обсягу відповіді й часу запиту, хоча реально потрібен тільки один проект. Додатково: `feedbacks` — єдина "гаряча" таблиця без жодного індексу (на відміну від `projects`, `users`, `team_members` тощо), хоча постійно фільтрується по `projectId`/`status` і сортується по `createdAt`.

### Рішення

**DB (`packages/database/src/entities/feedback.entity.ts`):**
```typescript
@Index(['projectId', 'createdAt'])
@Entity('feedbacks')
export class Feedback { ... }
```
Генерується міграція через `pnpm migration:generate` (TypeORM CLI, стандартний flow проекту).

**Backend ([feedback.service.ts](../../../apps/api/src/modules/feedback/feedback.service.ts)):**
- `findAllByUser(userId)` → `findByProject(projectId, userId)`:
  - перевірка доступу до проекту (як у `findOne` — прямий власник або team member)
  - `WHERE projectId = :projectId ORDER BY createdAt DESC LIMIT 500`
- [feedback.controller.ts](../../../apps/api/src/modules/feedback/feedback.controller.ts): `GET /feedback` → `GET /feedback?projectId=X`, `projectId` обов'язковий query param (400 Bad Request без нього — єдиний реальний споживач, dashboard, завжди передає активний проект)

**Frontend:**
- [queries.ts](../../../apps/web/src/lib/queries.ts): `feedbacksQuery` стає функцією `feedbacksQuery(projectId: string)`, `queryKey: ["feedbacks", projectId]`
- [dashboard/page.tsx](../../../apps/web/src/app/dashboard/page.tsx): `useQuery({ ...feedbacksQuery(activeProject?.id), enabled: !!activeProject?.id })`, прибрати client-side `.filter(fb => fb.projectId === activeProject?.id)` (бекенд вже фільтрує), лишити тільки `status !== "Archived"`. `useSocket`-invalidate переходить на `queryKey: ["feedbacks", activeProject?.id]`

### Тестування
TDD для `feedback.service.ts`: `findByProject` повертає тільки feedback вказаного проекту, відмовляє в доступі для чужого проекту (як `findOne`), сортування DESC, респектує LIMIT. Контролер: 400 без `projectId`. Frontend: ручна перевірка, що перемикання проекту в сайдбарі коректно перезавантажує Kanban (вже мало б працювати через `queryKey`, що включає `projectId`).

---

## 4. SQS Stub — без змін

`lambda/feedback-processor/index.mjs` логує подію, не робить AI-аналіз (це робить тільки BullMQ-воркер у `ai.processor.ts`). Лишається як заготовка під майбутню фічу (Slack/webhook notifications). Жодних змін коду.
