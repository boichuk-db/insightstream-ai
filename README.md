# InsightStream AI

> Real-time AI-powered user feedback analytics platform with Kanban workflow management.

InsightStream collects user feedback from any website via an embeddable widget, analyzes it with **Google Gemini AI** in real-time, and presents actionable insights on a premium dark-themed dashboard with drag-and-drop Kanban boards.

---

## Architecture

```
insightstream-ai/
├── apps/
│   ├── api/          # NestJS backend (REST + WebSockets)
│   ├── web/          # Next.js 16 dashboard (React 19)
│   └── widget/       # Embeddable feedback widget (Vite + Vanilla TS)
├── packages/
│   ├── database/     # TypeORM entities (User, Project, Feedback, AuditLog)
│   ├── shared-types/ # Shared TypeScript interfaces & enums
│   └── config/       # Shared ESLint / TS configs
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TailwindCSS 4, Framer Motion, Recharts |
| **Backend** | NestJS 11, TypeORM, Passport JWT, Socket.io |
| **AI Engine** | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| **Database** | PostgreSQL 15 (Docker) |
| **Cache** | Redis 7 (Docker, reserved for future use) |
| **Widget** | Vite, Vanilla TypeScript, PostCSS |
| **Monorepo** | pnpm workspaces, Turborepo |

---

## Features

### Completed

- **Embeddable Feedback Widget** — Lightweight JS snippet that can be embedded on any website. Validates API keys and enforces domain whitelisting for security.

- **AI-Powered Analysis** — Every feedback submission is analyzed by Gemini AI in the background (non-blocking). Extracts:
  - Sentiment score (0–1)
  - Category (Bug, Feature, UI/UX, Performance, etc.)
  - Summary (≤15 words)
  - Tags from a predefined taxonomy (`urgent`, `crash`, `login`, `api`, etc.)

- **Kanban Board** — Drag-and-drop feedback pipeline with 5 columns:
  - `New` → `In Review` → `In Progress` → `Done` → `Rejected`
  - Optimistic UI updates via `@tanstack/react-query`
  - Uses `@hello-pangea/dnd` for smooth drag interactions

- **Real-Time Updates (Socket.io)** — AI analysis results push to the dashboard instantly via WebSockets. No page refresh required — cards update live as AI finishes processing.

- **Multi-Project Support** — Users can create multiple projects, each with its own API key, domain whitelist, and isolated feedback stream.

- **Analytics Overview** — Visual dashboard section with sentiment distribution and category breakdown charts (Recharts).

- **Authentication** — JWT-based auth with Passport. Registration, login, and protected API routes.

- **Premium Dark UI** — Glassmorphism, custom thin scrollbars, micro-animations, gradient accents, and responsive layout.

### In Progress / Planned

- [ ] **Weekly AI Digests** — Automated summary emails with trends, top issues, and sentiment shifts
- [ ] **Advanced Filtering** — Filter Kanban cards by category, sentiment, tags, date range
- [ ] **User Roles & Teams** — Invite team members, assign feedback cards, role-based access
- [ ] **Redis Caching** — Cache frequent queries (feedback lists, analytics aggregations)
- [ ] **Webhook Integrations** — Push feedback events to Slack, Discord, Jira
- [ ] **Export** — CSV/PDF export of feedback data and analytics reports
- [ ] **Production Deployment** — Docker multi-stage builds, CI/CD pipeline, environment configs
- [ ] **E2E Tests** — Playwright tests for the full feedback lifecycle
- [ ] **Rate Limiting** — Protect public widget endpoint from abuse
- [ ] **Audit Log UI** — Display the `AuditLog` entity data in the dashboard

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9
- **Docker** & **Docker Compose** (for PostgreSQL)

### 1. Clone & Install

```bash
git clone <repo-url> insightstream-ai
cd insightstream-ai
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts **PostgreSQL** on `localhost:5432` and **Redis** on `localhost:6379`.

### 3. Configure Environment

Create `apps/api/.env`:

```env
JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=your_gemini_api_key_here

# Database (matches docker-compose defaults)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=insight_user
DB_PASSWORD=insight_password
DB_DATABASE=insightstream_dev
```

### 4. Run Development Servers

```bash
pnpm dev
```

This starts both services via Turborepo:

| Service | URL |
|---|---|
| **Dashboard (Next.js)** | http://localhost:3000 |
| **API (NestJS)** | http://localhost:3001 |

### 5. First Steps

1. Open http://localhost:3000 and **register** a new account
2. A default project is created automatically
3. Use the **"Manual Input Testing"** form to submit test feedback
4. Watch AI analysis appear on the card in real-time (2–4 seconds)
5. **Drag cards** between Kanban columns to manage workflow
6. Click **"Embed Widget"** to get the JS snippet for your website

---

## Widget Integration

Add this snippet to any website to start collecting feedback:

```html
<script>
  window.InsightStreamConfig = {
    apiKey: 'YOUR_PROJECT_API_KEY',
    serverUrl: 'http://localhost:3001'
  };
</script>
<script src="http://localhost:3001/widget.js"></script>
```

The widget respects the **domain whitelist** set on your project. Requests from unauthorized domains are blocked.

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login, returns JWT |

### Projects (🔒 JWT Required)
| Method | Path | Description |
|---|---|---|
| `GET` | `/projects` | List user's projects |
| `POST` | `/projects` | Create new project |
| `DELETE` | `/projects/:id` | Delete project |

### Feedback (🔒 JWT Required)
| Method | Path | Description |
|---|---|---|
| `GET` | `/feedback` | List all user's feedback |
| `POST` | `/feedback` | Create feedback (internal) |
| `PATCH` | `/feedback/:id/status` | Update Kanban status |
| `DELETE` | `/feedback/:id` | Delete feedback |

### Feedback (Public)
| Method | Path | Description |
|---|---|---|
| `POST` | `/feedback/public` | Submit via widget (API Key auth) |

### WebSocket Events
| Event | Direction | Description |
|---|---|---|
| `feedbackUpdated:{userId}` | Server → Client | Emitted when AI analysis completes or status changes |

---

## Project Structure Details

### `apps/api` — Backend

```
src/modules/
├── ai/          # Gemini AI integration, prompt engineering
├── auth/        # JWT strategy, guards, login/register
├── events/      # Socket.io gateway for real-time push
├── feedback/    # CRUD + status updates + public widget endpoint
├── projects/    # Multi-project management, API key generation
└── users/       # User entity management
```

### `apps/web` — Dashboard

```
src/
├── app/
│   ├── page.tsx           # Landing / auth page
│   └── dashboard/page.tsx # Main dashboard with Kanban
├── components/
│   ├── analytics/         # Charts and overview cards
│   ├── dashboard/         # Sidebar, KanbanBoard, KanbanColumn, KanbanCard,
│   │                      #   WidgetGeneratorModal, CreateProjectModal
│   └── ui/                # Button, Input, reusable primitives
├── hooks/
│   └── useSocket.ts       # Real-time Socket.io hook
└── lib/
    ├── api.ts             # Axios instance with JWT interceptor
    └── utils.ts           # cn() utility
```

### `apps/widget` — Embeddable Widget

Built with Vite, outputs a single `widget.js` bundle. Features floating action button, feedback form, and customizable themes.

---

## License

Private — All rights reserved.
