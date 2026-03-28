# InsightStream AI — Project Context

B2B SaaS для збору та AI-аналізу user feedback. Embeddable widget → dashboard → AI digest.

## Monorepo Structure

```
apps/
  api/      — NestJS 11, port 3001
  web/      — Next.js 16 App Router, port 3000
  widget/   — Vite embeddable widget, port 8080
packages/
  database/       — TypeORM entities + PostgreSQL config
  shared-types/   — Feedback & User TypeScript interfaces
  config/         — Shared ESLint/TS configs
```

## Stack

| Layer      | Tech                                                             |
| ---------- | ---------------------------------------------------------------- |
| API        | NestJS 11, TypeORM, PostgreSQL 15, Socket.io, JWT/OAuth          |
| Web        | Next.js 16 App Router, React 19, TailwindCSS 4, TanStack Query 5 |
| Widget     | Vite, TypeScript, IIFE bundle                                    |
| AI         | Google Gemini API                                                |
| DB         | PostgreSQL (Docker local, Supabase EU pooled in prod)            |
| Infra      | Railway (API), Vercel (Web), Docker, GitHub Actions              |
| Monitoring | Sentry (API + Web)                                               |

## Dev Commands

```bash
pnpm dev          # run all apps (Turbo)
pnpm build        # build all
pnpm lint         # ESLint all
pnpm typecheck    # tsc --noEmit all
pnpm format       # Prettier all
pnpm test         # API unit tests (Jest)
docker compose up -d  # start local PostgreSQL + Redis
```

## Key Conventions

- **TypeScript**: `strict: true` у web, relaxed (decorators) у api
- **Path alias**: `@/*` → `./src/*` у web
- **Prettier**: `singleQuote: true`, `trailingComma: "all"`
- **API modules**: NestJS domain modules у `apps/api/src/modules/`
- **Web routing**: Next.js App Router у `apps/web/src/app/`
- **Shared entities**: import з `@insightstream/database`
- **Shared types**: import з `@insightstream/shared-types`

## Development Workflow

| Етап                 | Інструмент                                         |
| -------------------- | -------------------------------------------------- |
| Ідея                 | `superpowers:brainstorming` skill                  |
| Ресерч               | Explore agents + WebSearch                         |
| Вимоги + Архітектура | `superpowers:writing-plans` → Plan mode            |
| Дизайн               | Figma MCP                                          |
| Код                  | `superpowers:test-driven-development` skill        |
| Ревʼю                | `superpowers:requesting-code-review` skill         |
| Верифікація          | `superpowers:verification-before-completion` skill |
| Деплой               | Git push → GitHub Actions → Railway + Vercel       |

## Services & Secrets

- **Database**: Supabase pooled connection (`DB_HOST`, `DB_*` env vars)
- **AI**: Google Gemini (`GEMINI_API_KEY`)
- **Auth**: JWT (`JWT_SECRET`), Google OAuth, GitHub OAuth
- **Email**: SMTP Nodemailer (`SMTP_*` env vars)
- **Sentry**: DSN у env vars (API + Web окремо)
- **CORS**: Dynamic domain validation, whitelist per project in DB
