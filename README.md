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

- **AI-Powered Analysis** — Every feedback submission is analyzed by Gemini AI in the background. Extracts sentiment, category, summary, and taxonomy tags (`urgent`, `crash`, etc.) in real-time.

- **Kanban Board** — Drag-and-drop feedback pipeline with 5 columns: `New`, `In Review`, `In Progress`, `Done`, `Rejected`. Features optimistic UI updates via TanStack Query.

- **Advanced Filtering** — Instant search across feedback content and AI summaries. Filter by dynamically generated tags from AI analysis.

- **Real-Time Updates (Socket.io)** — AI results and status changes push to the dashboard instantly. No page refresh required — cards update live as AI finishes processing.

- **Team Collaboration** — Robust invitation system with role-based access control (Admin, Member, Viewer). Shared project management for groups.

- **AI Digests** — On-demand and scheduled weekly summary reports. Generates high-level trends, top issues, and sentiment shifts using Gemini AI.

- **Data Export** — Professional reports exported as CSV or PDF directly from the dashboard, supporting filtered views or individual columns.

- **Activity & Comments** — Real-time activity feed for team actions and nested comment threads on feedback cards for internal discussion.

- **Usage & Subscription** — Integrated plan tier system (Free, Pro, Business) with usage meters and feature gating.

- **Premium Dark UI** — High-performance glassmorphism interface built with Next.js 16, React 19, and TailwindCSS 4.

### In Progress / Planned

- [ ] **Webhook Integrations** — Push feedback events to Slack, Discord, or Jira automatically.
- [ ] **Redis Caching** — Cache frequent analytics aggregations and project configurations for ultra-fast loading.
- [ ] **E2E Testing** — Comprehensive Playwright test suite for the full feedback lifecycle.
- [ ] **Rate Limiting** — Enhanced protection for public widget endpoints from high-volume abuse.
- [ ] **i18n Support** — Multi-language support for both the dashboard and the embeddable widget.
- [ ] **Dark/Light Mode** — Seamless theme switching (currently optimized for premium Dark mode).

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

### `apps/api` — NestJS Backend

```
src/modules/
├── ai/           # Gemini AI integration & prompt engineering
├── auth/         # JWT strategies & RBAC guards
├── events/       # Socket.io gateways for real-time push
├── feedback/     # Feedback CRUD & status management
├── projects/     # Multi-project management & API keys
├── teams/        # Team membership & role management
├── invitations/  # Email-based team invitations
├── digest/       # AI report generation (Preview & Cron)
├── activity/     # Audit logs & team activity tracking
├── comments/     # Internal discussion threads
└── plans/        # Usage limits & subscription tiers
```

### `apps/web` — Next.js Dashboard

```
src/
├── app/
│   ├── (auth)/        # Registration & Login routes
│   └── dashboard/     # Main dashboard with Kanban & Analytics
├── components/
│   ├── analytics/     # Charts (Recharts) & insight cards
│   ├── dashboard/     # KanbanBoard, Sidebar, Modals, ActivityFeed,
│   │                  #   FilterBar, DigestModal, CommentsPanel
│   └── ui/            # Centralized design system components
├── hooks/
│   └── useTeam.ts     # Team & Project context management
└── lib/
    ├── api.ts         # Axios instance with interceptors
    └── exportFeedbacks.ts # CSV & PDF generator logic
```

### `apps/widget` — Embeddable Widget

Built with Vite, outputs a single `widget.js` bundle. Features a floating bubble, AI-ready feedback forms, and domain verification.

---

## License

Private — All rights reserved.
