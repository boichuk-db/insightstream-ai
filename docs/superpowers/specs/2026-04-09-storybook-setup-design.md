# Storybook Setup — Design Spec

**Date:** 2026-04-09  
**Scope:** `apps/web/` — живa документація UI компонентів  
**Goal:** Ознайомлення з Storybook + жива документація всіх компонентів у `components/`

---

## Підхід

Використовуємо `npx storybook@latest init` у `apps/web/` — автоматично визначає Next.js та встановлює `@storybook/nextjs` framework. Стандартний webpack-based білд (не experimental Vite).

---

## Конфігурація

**`.storybook/main.ts`**
- Framework: `@storybook/nextjs`
- Stories: `src/**/*.stories.@(ts|tsx)`
- Addons: `@storybook/addon-essentials` (Controls, Actions, Docs — йдуть з init)

**`.storybook/preview.ts`**
- Імпортуємо `../src/app/globals.css` — підхоплює Tailwind 4 стилі
- Декоратор для padding щоб компоненти не впирались в край

**Запуск:** `pnpm --filter web storybook` → `http://localhost:6006`  
**Build:** `pnpm --filter web build-storybook` (для статичного виводу, опціонально)  
**Turbo:** Storybook НЕ додається до `pnpm dev` — запускається окремо вручну.

---

## Stories

Кожна story — файл `.stories.tsx` поруч із компонентом.

### `components/ui/`
| Файл | Stories |
|------|---------|
| `button.tsx` | Primary, Secondary, Destructive, Outline, Ghost; розміри sm/md/lg; Disabled |
| `input.tsx` | Default, With placeholder, Error state, Disabled |
| `select.tsx` | Default, With options, Disabled |

### `components/` (root)
| Файл | Stories |
|------|---------|
| `plan-limit-banner.tsx` | At 80% usage |
| `plan-limit-modal.tsx` | Open state |

### `components/dashboard/`
| Файл | Stories |
|------|---------|
| `Sidebar.tsx` | Default |
| `KanbanBoard.tsx` | With mock feedback items |
| `KanbanCard.tsx` | Default card |
| `KanbanColumn.tsx` | With cards |
| `FilterBar.tsx` | Default |
| `ActivityFeed.tsx` | With mock items |
| `CommentsPanel.tsx` | Open state |
| `DigestModal.tsx` | Open state |
| `CreateProjectModal.tsx` | Open state |
| `WidgetGeneratorModal.tsx` | Open state |

### `components/analytics/`
| Файл | Stories |
|------|---------|
| `AnalyticsOverview.tsx` | With mock data |

### `components/teams/`
| Файл | Stories |
|------|---------|
| `CreateTeamModal.tsx` | Open state |
| `CreateTeamProjectModal.tsx` | Open state |

---

## Mock Data

Складні компоненти (KanbanBoard, AnalyticsOverview, ActivityFeed) потребують mock props. Створюємо `src/stories/mocks.ts` із спільними mock об'єктами для повторного використання в stories.

---

## Що НЕ робимо

- Не додаємо Chromatic або будь-який хостинг
- Не інтегруємо в CI/CD
- Не деплоїмо Storybook
- Не покриваємо `providers.tsx` (це context wrapper, не UI)
- Не додаємо visual regression tests
