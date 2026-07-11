---
id: overview
title: Overview
slug: /
sidebar_position: 1
---

# InsightStream AI

B2B SaaS for collecting and AI-analyzing user feedback. Embeddable widget → dashboard → AI digest.

## Monorepo layout

```
apps/
  api/      — NestJS 11, port 3001
  web/      — Next.js 16 App Router, port 3000
  widget/   — Vite embeddable widget (Preact), port 8080
  landing/  — Next.js marketing/landing page, port 3002
  e2e/      — Playwright end-to-end suite (no dev server)
  docs/     — this site (Docusaurus), port 3003
packages/
  database/       — TypeORM entities + PostgreSQL config
  shared-types/   — Feedback & User TypeScript interfaces
  config/         — placeholder for shared ESLint/TS configs (not yet consumed — each app currently rolls its own eslint.config)
```

## Stack

| Layer      | Tech                                                             |
| ---------- | ----------------------------------------------------------------- |
| API        | NestJS 11, TypeORM, PostgreSQL 15, Socket.io, JWT/OAuth          |
| Web        | Next.js 16 App Router, React 19, TailwindCSS 4, TanStack Query 5 |
| Widget     | Vite, Preact, IIFE bundle — 12.9 KB gzip                         |
| AI         | Google Gemini API (`gemini-2.5-flash`)                           |
| DB         | PostgreSQL (Docker local, AWS RDS in prod — migrated from Supabase 2026-06-30) |
| Infra      | AWS EC2+ALB (API, live prod), Vercel + Amplify in parallel (Web, cutover pending), Docker, GitHub Actions |
| Monitoring | Sentry (API + Web)                                                |

## Getting started

```bash
git clone <repo-url> insightstream-ai
cd insightstream-ai
pnpm install
docker compose up -d      # PostgreSQL :5432 + Redis :6379
pnpm dev                  # runs doppler run -- turbo dev — requires Doppler CLI (`doppler login`), project "insightstream-ai", config "dev"
```

| Service    | URL                     |
| ---------- | ----------------------- |
| Dashboard  | http://localhost:3000   |
| API        | http://localhost:3001   |
| Widget dev | http://localhost:8080   |
| Landing    | http://localhost:3002   |
| This site  | http://localhost:3003   |

See [Ops](./ops) for deployment, and [Architecture](./architecture/full-arch) for how it fits together.
