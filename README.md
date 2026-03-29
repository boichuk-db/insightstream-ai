# InsightStream AI

> Real-time AI-powered user feedback analytics platform with Kanban workflow management.

InsightStream collects user feedback from any website via an embeddable widget, analyzes it with **Google Gemini AI**, and presents actionable insights on a dark-themed dashboard with drag-and-drop Kanban boards, team collaboration, and AI digests.

---

## Architecture

```
insightstream-ai/
├── apps/
│   ├── api/          # NestJS 11 backend (REST + WebSockets)
│   ├── web/          # Next.js 16 dashboard (React 19)
│   └── widget/       # Embeddable feedback widget (Vite + TS)
├── packages/
│   ├── database/     # TypeORM entities + PostgreSQL config
│   ├── shared-types/ # Shared TypeScript interfaces & enums
│   └── config/       # Shared ESLint / TS configs
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

### Tech Stack

| Layer         | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| **Frontend**  | Next.js 16, React 19, TailwindCSS 4, TanStack Query 5, Recharts  |
| **Backend**   | NestJS 11, TypeORM, Passport JWT, Socket.io                       |
| **AI**        | Google Gemini 2.5 Flash (`@google/generative-ai`)                 |
| **Auth**      | JWT + Google OAuth + GitHub OAuth + email password reset          |
| **Database**  | PostgreSQL 15 (Docker local, Supabase pooled in production)       |
| **Email**     | Nodemailer (SMTP)                                                 |
| **Widget**    | Vite, Vanilla TypeScript, IIFE bundle                             |
| **Monitoring**| Sentry (API + Web)                                                |
| **Infra**     | Railway (API), Vercel (Web), GitHub Actions CI/CD                 |
| **Monorepo**  | pnpm workspaces, Turborepo                                        |

---

## Features

- **Embeddable Widget** — Lightweight JS snippet for any website. API key auth + domain whitelisting.
- **AI Analysis** — Gemini AI extracts sentiment, category, summary, and tags for every submission.
- **Kanban Board** — Drag-and-drop pipeline: New → In Review → In Progress → Done → Rejected.
- **Real-Time Updates** — Socket.io pushes AI results and status changes to the dashboard instantly.
- **Team Collaboration** — Invite members by email, role-based access (Admin / Member / Viewer).
- **AI Digests** — On-demand and scheduled weekly summaries with trends and sentiment shifts.
- **Data Export** — CSV and PDF export with filter support.
- **Activity & Comments** — Real-time activity feed + nested comment threads on cards.
- **Auth** — Email/password, Google OAuth, GitHub OAuth, forgot/reset password flow.
- **Plans & Usage** — Free / Pro / Business tiers with usage meters and feature gating.
- **Error Monitoring** — Sentry on both API and Web with 4xx filtering.

### Planned

- [ ] Webhook integrations (Slack, Discord, Jira)
- [ ] Redis caching for analytics aggregations
- [ ] E2E tests (Playwright)
- [ ] i18n support

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9
- **Docker** & **Docker Compose**

### 1. Clone & Install

```bash
git clone <repo-url> insightstream-ai
cd insightstream-ai
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d   # PostgreSQL :5432 + Redis :6379
```

### 3. Configure Environment

Create `apps/api/.env`:

```env
# Auth
JWT_SECRET=

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=insight_user
DB_PASSWORD=insight_password
DB_DATABASE=insightstream_dev

# AI
GEMINI_API_KEY=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
OAUTH_CALLBACK_BASE_URL=http://localhost:3001

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# App
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Sentry (optional)
SENTRY_DSN=
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SENTRY_DSN=    # optional
SENTRY_AUTH_TOKEN=         # optional, for source maps
```

### 4. Run

```bash
pnpm dev
```

| Service    | URL                   |
| ---------- | --------------------- |
| Dashboard  | http://localhost:3000 |
| API        | http://localhost:3001 |
| Widget dev | http://localhost:8080 |

---

## Widget Integration

```html
<script>
  window.InsightStreamConfig = {
    apiKey: "YOUR_PROJECT_API_KEY",
    serverUrl: "https://your-api.railway.app",
  };
</script>
<script src="https://your-api.railway.app/widget.js"></script>
```

---

## Commands

```bash
pnpm dev          # run all apps
pnpm build        # build all
pnpm test         # API unit tests (Jest)
pnpm lint         # ESLint all
pnpm typecheck    # tsc --noEmit all
pnpm format       # Prettier all
```

---

## Deployment

| App    | Platform | Trigger          |
| ------ | -------- | ---------------- |
| API    | Railway  | push to `main`   |
| Web    | Vercel   | push to `main`   |

Production database: **Supabase** (EU region, pooled connection).
See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup guide.

---

## License

Private — All rights reserved.
