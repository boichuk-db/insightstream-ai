# InsightStream API

NestJS 11 backend — REST + WebSockets + AI analysis pipeline.

## Stack

- **NestJS 11** + TypeORM + PostgreSQL
- **Socket.io** — real-time push to dashboard
- **Google Gemini** — AI feedback analysis
- **Passport JWT** + Google OAuth + GitHub OAuth
- **Nodemailer** — email (invitations, password reset)
- **Sentry** — error monitoring

## Local Development

```bash
pnpm dev          # from monorepo root
# or
pnpm run start:dev  # from apps/api
```

Runs on **http://localhost:3001**

## Environment Variables

```env
# Auth
JWT_SECRET=

# Database (local Docker)
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

## Module Structure

```
src/modules/
├── ai/           # Gemini integration & prompt engineering
├── auth/         # JWT, Google OAuth, GitHub OAuth, password reset
├── events/       # Socket.io gateways
├── feedback/     # CRUD, status, public widget endpoint
├── projects/     # Multi-project + API key management
├── teams/        # Team membership + role-based access
├── invitations/  # Email-based team invitations
├── digest/       # AI digest generation (on-demand + cron)
├── activity/     # Audit log & activity feed
├── comments/     # Internal comment threads
├── mail/         # Email service (Nodemailer)
└── plans/        # Usage limits & subscription tier gating
```

## Commands

```bash
pnpm run build        # compile
pnpm run start:prod   # production (node dist/main)
pnpm run test         # Jest unit tests
pnpm run typecheck    # tsc --noEmit
pnpm run lint         # ESLint
```

## Deployment

Deployed on **Railway** via GitHub Actions on push to `main`.
Production uses **Supabase** pooled PostgreSQL connection.
