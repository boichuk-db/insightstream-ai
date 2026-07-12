# InsightStream AI

> Real-time AI-powered user feedback analytics platform with Kanban workflow management.

InsightStream collects user feedback from any website via an embeddable widget, analyzes it with **Google Gemini AI**, and presents actionable insights on a dashboard with drag-and-drop Kanban boards, team collaboration, and AI digests.

Full documentation — architecture, module-by-module breakdown, ops/deploy runbooks, roadmap — lives at **[the docs site](https://boichuk-db.github.io/insightstream-ai/)**.

## Quickstart

```bash
git clone <repo-url> insightstream-ai
cd insightstream-ai
pnpm install
docker compose up -d   # PostgreSQL :5432 + Redis :6379
pnpm dev                # doppler run -- turbo dev — needs `doppler login` first (project insightstream-ai, config dev)
```

| Service    | URL                     |
| ---------- | ----------------------- |
| Dashboard  | http://localhost:3000   |
| API        | http://localhost:3001   |
| Widget dev | http://localhost:5173   |
| Landing    | http://localhost:3002   |
| Docs site  | http://localhost:3003   |

## Commands

```bash
pnpm dev          # run all apps
pnpm build        # build all
pnpm test         # API + landing unit tests
pnpm lint         # ESLint all
pnpm typecheck    # tsc --noEmit all
pnpm format       # Prettier all
```

See [the docs site](https://boichuk-db.github.io/insightstream-ai/) for stack details, architecture diagrams, deployment, and the current roadmap.

## License

Private — All rights reserved.
