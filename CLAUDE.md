# InsightStream AI — Project Context

B2B SaaS для збору та AI-аналізу user feedback. Embeddable widget → dashboard → AI digest.

## Monorepo Structure

```
apps/
  api/      — NestJS 11, port 3001
  web/      — Next.js 16 App Router, port 3000
  widget/   — Vite embeddable widget, port 8080
  landing/  — Next.js marketing/landing page, port 3002
  e2e/      — Playwright end-to-end suite (no dev server)
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
| DB         | PostgreSQL (Docker local, AWS RDS in prod — migrated from Supabase 2026-06-30) |
| Infra      | AWS EC2+ALB (API), Vercel + Amplify in parallel (Web, cutover pending), Docker, GitHub Actions |
| Monitoring | Sentry (API + Web)                                               |

## Dev Commands

```bash
pnpm dev          # run all apps (Turbo)
pnpm build        # build all
pnpm lint         # ESLint all
pnpm typecheck    # tsc --noEmit all
pnpm format       # Prettier all
pnpm test         # API (Jest) + Web (Vitest) unit tests
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
| Деплой               | API: `scripts/deploy-api.sh` → EC2 (CodeBuild webhook unblocked but unverified end-to-end). Web: Git push → Vercel + Amplify (parallel run) |

## Services & Secrets

- **Database**: AWS RDS PostgreSQL, private subnet, SSL required (`DB_HOST`, `DB_*` env vars). Supabase is legacy — data migrated 2026-06-30, old project not yet decommissioned
- **AI**: Google Gemini (`GEMINI_API_KEY`)
- **Auth**: JWT (`JWT_SECRET`), Google OAuth, GitHub OAuth
- **Email**: SMTP Nodemailer (`SMTP_*` env vars)
- **Sentry**: DSN у env vars (API + Web окремо)
- **CORS**: Dynamic domain validation, whitelist per project in DB

## Architecture Documentation

- `docs/architecture/system-architecture.drawio` — **diagrams only** (system views, request flows, network topology, ER diagram). No prose roadmaps or text-only pages here.
- `docs/architecture/PLAN.md` — the living architecture plan: current priorities (🔥 Implement Soon / 🟡 Future / ✅ Keep As-Is / ⛔ Retired), reasoning, and status. This is the source of truth for what to work on next — pull architecture-related tasks from here rather than inventing them ad hoc.
- **Update rule**: any change that alters the architecture (new module, new infra piece, a completed roadmap item, a reversed decision) updates `PLAN.md` in the same PR and bumps its date. If a diagram becomes stale relative to the code, fix it in the same PR too.
- Project constraints baked into `PLAN.md` — keep them in mind before recommending anything: infra cost ≈ zero, hands-on learning is a first-class goal (EC2/BullMQ/Socket.io/AWS migration are intentional choices, not gaps), no enterprise complexity before it earns its keep.

## Engineering Rules

**Learning Loop:**
After any correction from the user: determine if it represents a reusable project rule. If yes — immediately update `CLAUDE.md` or write a memory file at `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\`. The same mistake must not require correction twice.

**Verification Mandate:**
Never write "done", "ready", or "OK" without running `pnpm typecheck && pnpm lint` and showing actual output. If tests exist for the affected module — run `pnpm test` too. Confidence is not evidence. If commands cannot run — state explicitly why.

**Context Management:**
For tasks with 3+ steps — break into milestones at the start of the conversation. When the conversation becomes long (many code edits, many turns) — summarize completed work and suggest starting a new chat with that summary as context.

**Background/Sub-Agent Dispatch:**
`isolation: "worktree"` on a dispatched agent is not a guarantee — verify it actually held before treating the result as isolated/discardable: run `git worktree list` and `git log --oneline -5` on the main branch. If the agent's commits landed directly on `main` (or whatever branch was checked out) instead of a separate worktree, extract them onto a new branch and reset the affected branch back to its pre-dispatch tip before reviewing or merging (`git branch <name>`, `git reset --hard <prior-tip>`, restore any stashed local changes). Confirmed to actually happen once (2026-07-10, P0 color-contrast task) — recoverable because the agent had no push/deploy access, but don't assume isolation without checking. Never grant a background/dispatched agent `git push` or deploy-script access; that boundary is what makes an isolation failure a non-event instead of an incident.

**Escalation for architecture decisions:** use `docs/architecture/PLAN.md`'s own status legend as the source of truth, not judgment calls. Only the four 🎓-tagged items (EC2, BullMQ, Socket.io, the AWS migration itself) require escalation before replacing with a managed alternative. Everything else already resolved via an external service (Stripe, RDS, SES, Sentry, Gemini) is accepted default practice, not a pending decision.
