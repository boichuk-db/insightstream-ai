# InsightStream Web

Next.js 16 App Router dashboard — feedback Kanban, analytics, team management.

## Stack

- **Next.js 16** App Router + React 19
- **TailwindCSS 4** — dark theme (`#09090b` base)
- **TanStack Query 5** — server state + optimistic updates
- **Recharts** — analytics charts
- **Socket.io client** — real-time AI result push
- **Sentry** — error monitoring (client + server + edge)

## Local Development

```bash
pnpm dev          # from monorepo root
# or
pnpm run dev      # from apps/web
```

Runs on **http://localhost:3000**

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001

# OAuth (must match API config)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# Sentry (optional)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

## Route Structure

```
src/app/
├── page.tsx                  # Landing page
├── pricing/                  # Pricing page
├── auth/
│   ├── forgot-password/      # Password reset request
│   ├── reset-password/       # Password reset form
│   └── oauth/callback/       # OAuth redirect handler
├── dashboard/
│   ├── page.tsx              # Main Kanban + Analytics
│   ├── archive/              # Archived feedback
│   ├── activity/             # Team activity feed
│   └── embed/                # Widget configuration & install
├── settings/
│   ├── page.tsx              # Account & subscription
│   └── team/                 # Team members & invitations
└── invite/accept/            # Team invitation acceptance
```

## Key Components

- `KanbanBoard` — drag-and-drop pipeline (New → In Review → In Progress → Done → Rejected)
- `KanbanCard` — AI summary, sentiment bar, tags, comments
- `AnalyticsOverview` — sentiment trend + category distribution charts
- `DigestModal` — AI digest generation & display
- `Sidebar` — project switcher, team context, navigation
- `ActivityFeed` — real-time team actions
- `WidgetGeneratorModal` — embed code generator

## Commands

```bash
pnpm run build      # Next.js production build
pnpm run typecheck  # tsc --noEmit
pnpm run lint       # ESLint
```

## Deployment

Deployed on **Vercel** via GitHub Actions on push to `main`.
