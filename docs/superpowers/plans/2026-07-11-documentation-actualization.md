# Documentation Actualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale `README.md`/`DEPLOYMENT.md` and unverified `system-architecture.drawio` with an accurate, phone-readable Docusaurus documentation site (`apps/docs`) deployed to GitHub Pages, sourced from current code and `docs/architecture/PLAN.md`.

**Architecture:** `apps/docs` is a new pnpm-workspace member (Docusaurus 3, TypeScript classic template, docs-only mode) built/linted/typechecked by the existing root `turbo` pipeline and deployed by a new path-filtered GitHub Actions workflow using the official `actions/deploy-pages` flow. The 8 `system-architecture.drawio` pages are corrected for known drift, then exported to committed SVGs via a Docker-based headless-drawio script; the docs site embeds those SVGs rather than re-deriving diagrams. `README.md` and `DEPLOYMENT.md` are cut down to point at the site instead of duplicating it; `PLAN.md`'s Roadmap page on the site links out to GitHub instead of copying the table.

**Tech Stack:** Docusaurus 3.10.2 (TypeScript, classic preset), pnpm workspace + Turborepo, GitHub Actions (`actions/upload-pages-artifact`, `actions/deploy-pages`), Docker (`rlespinasse/drawio-desktop-headless` for SVG export — command verified working during planning).

**Design doc:** `docs/superpowers/specs/2026-07-11-documentation-actualization-design.md`

---

## Notes for the implementer

- The repo is **public** (`boichuk-db/insightstream-ai`) — the deployed GitHub Pages site will be public too. This is intentional and matches `PLAN.md` already being public in-repo (see design doc).
- `.gitignore` currently has a blanket `docs/architecture/**` ignore with only `PLAN.md` and `system-architecture.drawio` excepted (lines 54-57) — **it does not affect `apps/docs`** (verified: `docs/**` in a `.gitignore` with no leading slash is still anchored to the file's own directory when combined with a mid-pattern slash, so it only matches the top-level `docs/` folder, not `apps/docs/`). It **does** currently swallow anything else under `docs/architecture/`, which is why Task 1 fixes it before anything gets exported there.
- On Windows/Git Bash, Docker volume mounts need `MSYS_NO_PATHCONV=1` or Git Bash mangles the `-v host:container` path spec. This was hit and fixed during planning — the script in Task 3 already has it.

---

### Task 1: Allow `docs/architecture/diagrams/` past `.gitignore`

**Files:**
- Modify: `.gitignore:54-57`

- [ ] **Step 1: Add the exception**

Current block (lines 54-57):
```
!docs/architecture/
docs/architecture/**
!docs/architecture/PLAN.md
!docs/architecture/system-architecture.drawio
```

Change to:
```
!docs/architecture/
docs/architecture/**
!docs/architecture/PLAN.md
!docs/architecture/system-architecture.drawio
!docs/architecture/diagrams/
!docs/architecture/diagrams/**
```

- [ ] **Step 2: Verify the exception works**

Run:
```bash
mkdir -p docs/architecture/diagrams && touch docs/architecture/diagrams/probe.svg
git check-ignore -v docs/architecture/diagrams/probe.svg; echo "exit=$?"
rm docs/architecture/diagrams/probe.svg
```
Expected: no output from `git check-ignore` and `exit=1` (meaning: not ignored).

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: allow docs/architecture/diagrams/ past the docs/ gitignore rule"
```

---

### Task 2: Fix known drift in `system-architecture.drawio`

**Problem:** Several diagram pages were verified against code on 2026-06-30/07-03/07-05 and have since gone stale relative to shipped work (Redis JWT cache ✔#6, `plan` dropped from JWT ✔#7, BullMQ worker split ✔#5 changing both the WS room name and which process emits, Railway/Supabase fully retired in favor of EC2+ALB/RDS, CodeBuild/Bedrock verification-gate status). This task fixes the specific drift found — it is not a full pixel-level re-audit (AWS Network, Database ER, and Registration & Onboarding pages were checked during planning and are already current; no changes needed there).

**Files:**
- Modify: `docs/architecture/system-architecture.drawio`

All edits below are **text-attribute-only** changes to existing `value="..."` attributes (and two `fillColor`/`strokeColor`/`dashed` style tweaks called out explicitly) — no shape geometry is added, moved, or resized, so this is safe to do with a plain text editor.

- [ ] **Step 1: Full Architecture page — retire the Railway/Supabase migration-in-progress wording**

Three edits (API is fully cut over to EC2+ALB; DB is fully cut over to RDS — only `apps/web` is still genuinely mid-migration):

```
OLD: value="apps/api — NestJS 11 (Railway → EC2+ALB)"
NEW: value="apps/api — NestJS 11 (AWS EC2 + ALB)"
```
```
OLD: value="PostgreSQL&#xa;Supabase → RDS"
NEW: value="PostgreSQL&#xa;AWS RDS (migrated from Supabase 2026-06-30, old project not decommissioned)"
```
```
OLD: value="CD: Railway+Vercel → EC2/ALB+Amplify"
NEW: value="CD: EC2+ALB (API, live) · Vercel + Amplify parallel run (Web, cutover pending)"
```

- [ ] **Step 2: AWS Infrastructure page — fix the CodeBuild/Bedrock verification-gate status**

The page's own `pendingNote` text block (unchanged, still accurate) already says *"NOT blocked: ...CodeBuild, Amplify, Bedrock (all confirmed unblocked 2026-07-05/06)"* — but the `codebuild` and `bedrock` boxes above it still render them as blocked. Fix the contradiction:

```
OLD: value="CodeBuild — BLOCKED&#xa;0 concurrent-build quota&#xa;(new account)"
NEW: value="CodeBuild&#xa;quota unblocked 2026-07-05 (15 concurrent)&#xa;provisioned, not yet wired to auto-deploy"
```

For the `bedrock` cell (`id="bedrock"`), change both the text and the style (it's currently styled as blocked/red-dashed, matching `cfWidget`/`cfApi`; it should match the done/green style of `apigwDone`):
```
OLD: value="Bedrock&#xa;amazon.nova-micro-v1:0&#xa;(retry, remaining credits)"
NEW: value="✔ Bedrock&#xa;amazon.nova-micro-v1:0&#xa;confirmed unblocked 2026-07-05"
```
```
OLD style: fillColor=#f8cecc;strokeColor=#b85450;dashed=1;
NEW style: fillColor=#d5e8d4;strokeColor=#82b366;
```
(i.e. change the `bedrock` cell's `style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;dashed=1;"` to `style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;"`)

Retitle the container box (`id="pendingBox"`) since it now holds a mix of still-blocked (CloudFront ×2) and already-unblocked (Bedrock, and implicitly CodeBuild/Amplify covered by the note) items:
```
OLD: value="Pending — blocked by new-account AWS verification gate (open since 2026-06-25)"
NEW: value="AWS verification gate — per-service status (opened 2026-06-25; CloudFront still blocked, re-confirmed 2026-07-10)"
```

- [ ] **Step 3: AWS Infrastructure page — fix the Current→Target cutover strip for API and DB**

Railway is fully decommissioned and RDS is fully live — these are no longer "not cut over," only the web frontend (Vercel→Amplify) genuinely still is:

```
OLD: value="Current (live prod traffic) → Target (this diagram — migration in progress, no cutover yet)"
NEW: value="Cutover status per component (2026-07-11): Web still parallel-run; API and DB already cut over"
```
```
OLD: value="Railway (apps/api)"
NEW: value="✔ Railway — decommissioned"
```
```
OLD: value="EC2 + ALB (live, not cut over)"
NEW: value="EC2 + ALB — live prod (cutover complete)"
```
For the `ctApiTgt` cell, also change its style from the "in-progress" orange to the "done" green:
```
OLD style: fillColor=#ffe6cc;strokeColor=#d79b00;
NEW style: fillColor=#d5e8d4;strokeColor=#82b366;
```
```
OLD: value="Supabase (source DB)"
NEW: value="Supabase — legacy, not yet decommissioned"
```
```
OLD: value="RDS (data migrated, not cut over)"
NEW: value="✔ RDS — live prod (cutover complete 2026-06-30)"
```
For the `ctDbTgt` cell, also change its style from red (still reads as "blocked") to green:
```
OLD style: fillColor=#f8cecc;strokeColor=#b85450;
NEW style: fillColor=#d5e8d4;strokeColor=#82b366;
```

- [ ] **Step 4: Request Lifecycle page — reflect the BullMQ worker split and team rooms**

`AiProcessor` (step 6) has run in a separate `WORKER_MODE` process since 2026-07-09 (✔#5), and the Socket.io room changed from `user-{userId}` to `team-{id}` during Team-as-Tenant (✔#7) — the worker process itself has no Socket.io server and instead emits through a Redis-emitter relay picked up by the HTTP process's Socket.io Redis adapter:

```
OLD: value="6. AiProcessor&#xa;BullMQ worker picks up job"
NEW: value="6. AiProcessor&#xa;separate WORKER_MODE process&#xa;picks up job"
```
```
OLD: value="9. Socket.io emit&#xa;feedbackUpdated&#xa;room user-{userId}"
NEW: value="9. Redis-emitter → Socket.io emit&#xa;feedbackUpdated&#xa;room team-{teamId}"
```
```
OLD: value="Verified against code 2026-07-03 (apps/api/src/modules/feedback, ai, events). Steps 1–5 are synchronous HTTP request/response — the widget gets its 200 OK here. Steps 6–10 happen asynchronously, after the response already returned."
NEW: value="Verified against code 2026-07-03; worker-split and team-room updates verified 2026-07-11 (apps/api/src/modules/feedback, ai, events, worker.module.ts). Steps 1–5 are synchronous HTTP request/response — the widget gets its 200 OK here. Steps 6–10 happen asynchronously, after the response already returned; steps 6 and 9 run in a separate WORKER_MODE process since 2026-07-09."
```

- [ ] **Step 5: Authentication Flow page — add the Redis JWT cache, drop `plan` from the JWT payload**

`JwtStrategy.validate()` has read through a Redis cache (TTL 30s, fail-open) since 2026-07-06 (✔#6), and `plan` was dropped from the JWT payload during Team-as-Tenant (✔#7):

```
OLD: value="login(user) — JWT generation&#xa;payload {sub,email,role,plan}&#xa;signed JWT_SECRET, expiresIn 7d"
NEW: value="login(user) — JWT generation&#xa;payload {sub,email,role}&#xa;signed JWT_SECRET, expiresIn 7d"
```
```
OLD: value="Lookup user by sub&#xa;fresh read from PostgreSQL"
NEW: value="Lookup user by sub&#xa;Redis cache first (TTL 30s)&#xa;miss → PostgreSQL, then warm cache"
```

The `authNotesText` block currently claims *"Redis here is reserved for BullMQ, not sessions"* and lists the JWT payload as including `plan` — both now false. Replace the full block:
```
OLD: value="• Stateless — no session store needed; any EC2 instance can validate any request independently.&#xa;• Simplifies horizontal scaling — no sticky sessions or shared session store required for auth (Redis here is reserved for BullMQ, not sessions).&#xa;• Same JWT works for both password and OAuth users — one unified identity payload (sub/email/role/plan) regardless of login method.&#xa;• Trade-off accepted: can&#39;t force-revoke a token before its 7-day expiry (no blacklist) — acceptable at this low-risk, pre-launch stage; refresh-token rotation is a planned hardening step, not yet built."
NEW: value="• Stateless — no session store needed; any EC2 instance can validate any request independently.&#xa;• Simplifies horizontal scaling — no sticky sessions required for auth; the hot JwtStrategy.validate() lookup is read-through cached in Redis (TTL 30s, fail-open on Redis errors) instead of hitting Postgres every request.&#xa;• Same JWT works for both password and OAuth users — one unified identity payload (sub/email/role) regardless of login method.&#xa;• Trade-off accepted: can&#39;t force-revoke a token before its 7-day expiry (no blacklist) — acceptable at this low-risk, pre-launch stage; refresh-token rotation is a planned hardening step, not yet built."
```

- [ ] **Step 6: Deployment Pipeline page — same Railway/EC2 cutover fix**

```
OLD: value="Railway (apps/api) → EC2 + ALB (live via steps above, not cut over)"
NEW: value="Railway (apps/api) → EC2 + ALB — live prod (cutover complete, Railway decommissioned)"
```

- [ ] **Step 7: Sanity-check the file is still well-formed XML**

Run:
```bash
python -c "import xml.dom.minidom as m; m.parse('docs/architecture/system-architecture.drawio'); print('OK: well-formed XML')"
```
Expected: `OK: well-formed XML`

- [ ] **Step 8: Commit**

```bash
git add docs/architecture/system-architecture.drawio
git commit -m "docs(architecture): fix drift in system-architecture.drawio (EC2/RDS cutover, worker split, JWT Redis cache)"
```

---

### Task 3: Diagram export pipeline (drawio → committed SVG)

**Files:**
- Create: `scripts/export-diagrams.sh`
- Create (generated): `docs/architecture/diagrams/*.svg` (8 files)

- [ ] **Step 1: Write the export script**

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

OUT_DIR="docs/architecture/diagrams"
mkdir -p "$OUT_DIR"

# name:page-index pairs, in the order pages appear in system-architecture.drawio
PAGES=(
  "full-arch:0"
  "aws-infra:1"
  "request-lifecycle:2"
  "auth-flow:3"
  "deploy-pipeline:4"
  "aws-network:5"
  "er-diagram:6"
  "reg-onboarding:7"
)

for entry in "${PAGES[@]}"; do
  name="${entry%%:*}"
  index="${entry##*:}"
  echo "Exporting page $index -> $OUT_DIR/$name.svg"
  MSYS_NO_PATHCONV=1 docker run --rm \
    -v "$(pwd)/docs/architecture:/data" \
    rlespinasse/drawio-desktop-headless \
    -x -f svg -o "/data/diagrams/$name.svg" --page-index "$index" \
    /data/system-architecture.drawio
done

echo "Done. Exported ${#PAGES[@]} pages to $OUT_DIR/"
```

- [ ] **Step 2: Make it executable and run it**

```bash
chmod +x scripts/export-diagrams.sh
./scripts/export-diagrams.sh
```
Expected: 8 lines of `Exporting page N -> ...`, then `Done. Exported 8 pages to docs/architecture/diagrams/`. (The `docker run ... -x -f svg -o ... --page-index N ...` invocation was verified working during planning — page 0 exported a 197 KB well-formed SVG.)

- [ ] **Step 3: Verify all 8 files exist and are non-trivial**

```bash
ls -la docs/architecture/diagrams/
```
Expected: 8 `.svg` files, each at least a few KB (not empty/error stubs).

- [ ] **Step 4: Commit**

```bash
git add scripts/export-diagrams.sh docs/architecture/diagrams/
git commit -m "feat: add drawio-to-SVG export script, commit generated diagram SVGs"
```

---

### Task 4: Scaffold `apps/docs` (Docusaurus, TypeScript, workspace-wired)

**Files:**
- Create: `apps/docs/` (Docusaurus scaffold, then trimmed)
- Modify: `apps/docs/package.json`
- Create: `apps/docs/eslint.config.js`

- [ ] **Step 1: Scaffold with create-docusaurus, skipping its own install**

```bash
pnpm dlx create-docusaurus@3.10.2 apps/docs classic --typescript --skip-install
```
Expected: `apps/docs/` created with the standard classic TS template (`docs/`, `blog/`, `src/`, `static/`, `docusaurus.config.ts`, `sidebars.ts`, `package.json`, `tsconfig.json`).

- [ ] **Step 2: Remove the parts we don't want (blog, example docs/pages)**

```bash
rm -rf apps/docs/blog
rm -rf apps/docs/docs/*
rm -f apps/docs/src/pages/index.tsx apps/docs/src/pages/index.module.css
rm -rf apps/docs/src/components/HomepageFeatures
```
Keep `apps/docs/src/css/custom.css` and `apps/docs/static/img/` (default logo/favicon — fine as placeholders, not in scope to redesign per the approved design doc).

- [ ] **Step 3: Fix `package.json` — name, dev port, add lint/typecheck matching workspace conventions**

Read `apps/docs/package.json` after scaffolding, then set it to:
```json
{
  "name": "docs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "docusaurus start --port 3003",
    "start": "docusaurus start --port 3003",
    "build": "docusaurus build",
    "swizzle": "docusaurus swizzle",
    "deploy": "docusaurus deploy",
    "clear": "docusaurus clear",
    "serve": "docusaurus serve",
    "write-translations": "docusaurus write-translations",
    "write-heading-ids": "docusaurus write-heading-ids",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@docusaurus/core": "3.10.2",
    "@docusaurus/preset-classic": "3.10.2",
    "@mdx-js/react": "^3.0.0",
    "clsx": "^2.0.0",
    "prism-react-renderer": "^2.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@docusaurus/module-type-aliases": "3.10.2",
    "@docusaurus/tsconfig": "3.10.2",
    "@docusaurus/types": "3.10.2",
    "@eslint/js": "^9.18.0",
    "eslint": "^9.18.0",
    "globals": "^17.4.0",
    "typescript": "~5.6.2",
    "typescript-eslint": "^8.58.0"
  },
  "engines": {
    "node": ">=18.0"
  }
}
```
(Keep whatever exact dependency versions `create-docusaurus@3.10.2` actually scaffolded if they differ slightly from the above — the important, non-negotiable parts are: `"name": "docs"`, the `dev`/`start` scripts using `--port 3003`, and the added `typecheck`/`lint` scripts, since those are what the root `turbo build/lint/typecheck/dev` pipeline needs to find.)

- [ ] **Step 4: Add an ESLint flat config (mirrors `apps/widget/eslint.config.js`, adapted for React/TSX)**

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['build', '.docusaurus']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
```
Save as `apps/docs/eslint.config.js`.

- [ ] **Step 5: Add `.docusaurus` to the root `.gitignore` build-outputs section (Docusaurus's local cache dir, not covered by the existing `build`/`dist` entries)**

Add a line under the `# Build outputs` section of `.gitignore`:
```
.docusaurus
```

- [ ] **Step 6: Install and verify the workspace picks it up**

```bash
pnpm install
```
Expected: `docs` appears in the pnpm workspace install output, no errors.

```bash
pnpm --filter docs typecheck
```
Expected: exits 0 (the emptied `docs/` folder with no `.md` files is fine — Docusaurus doesn't require content to typecheck the TS/TSX scaffold).

```bash
pnpm --filter docs lint
```
Expected: exits 0 or only pre-existing scaffold warnings, no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/docs pnpm-lock.yaml .gitignore
git commit -m "feat(docs): scaffold apps/docs with Docusaurus 3 (TypeScript, docs-only)"
```

---

### Task 5: Configure `docusaurus.config.ts` and `sidebars.ts` for GitHub Pages + docs-only mode

**Files:**
- Modify: `apps/docs/docusaurus.config.ts`
- Modify: `apps/docs/sidebars.ts`

- [ ] **Step 1: Replace `docusaurus.config.ts` with the GitHub Pages + docs-only configuration**

```ts
import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'InsightStream AI Docs',
  tagline: 'Internal engineering documentation',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://boichuk-db.github.io',
  baseUrl: '/insightstream-ai/',

  organizationName: 'boichuk-db',
  projectName: 'insightstream-ai',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/boichuk-db/insightstream-ai/edit/main/apps/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'InsightStream AI',
      items: [
        {
          href: 'https://github.com/boichuk-db/insightstream-ai',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [],
      copyright: `Internal documentation — InsightStream AI.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
```

- [ ] **Step 2: Replace `sidebars.ts` with an autogenerated sidebar (so adding a doc file in later tasks never requires touching this file again)**

```ts
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'autogenerated',
      dirName: '.',
    },
  ],
};

export default sidebars;
```

- [ ] **Step 3: Verify the build still succeeds with zero content docs**

```bash
pnpm --filter docs build
```
Expected: exits 0. (An empty sidebar/docs folder is valid Docusaurus output at this stage — content is added starting Task 6.)

- [ ] **Step 4: Commit**

```bash
git add apps/docs/docusaurus.config.ts apps/docs/sidebars.ts
git commit -m "feat(docs): configure Docusaurus for GitHub Pages + docs-only routing"
```

---

### Task 6: Overview page

**Files:**
- Create: `apps/docs/docs/overview.md`

- [ ] **Step 1: Write the page**

```markdown
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
```

- [ ] **Step 2: Verify the build**

```bash
pnpm --filter docs build
```
Expected: exits 0, no broken-link errors for the internal `./ops` / `./architecture/full-arch` links once those pages exist later in this plan (Docusaurus resolves doc-to-doc links at build time across the whole `docs/` tree, so this step may show broken-link errors until Tasks 7 and 14 are also done — that's expected and not a regression; re-run this same build command after Task 14 to get a clean baseline).

- [ ] **Step 3: Commit**

```bash
git add apps/docs/docs/overview.md
git commit -m "docs(site): add Overview page"
```

---

### Task 7: Architecture pages (8 pages, one per drawio SVG)

**Files:**
- Create: `apps/docs/docs/architecture/_category_.json`
- Create: `apps/docs/docs/architecture/full-arch.md`
- Create: `apps/docs/docs/architecture/aws-infra.md`
- Create: `apps/docs/docs/architecture/request-lifecycle.md`
- Create: `apps/docs/docs/architecture/auth-flow.md`
- Create: `apps/docs/docs/architecture/deploy-pipeline.md`
- Create: `apps/docs/docs/architecture/aws-network.md`
- Create: `apps/docs/docs/architecture/er-diagram.md`
- Create: `apps/docs/docs/architecture/reg-onboarding.md`
- Create: `apps/docs/static/img/diagrams/*.svg` (copies of the exported SVGs)

- [ ] **Step 1: Category metadata**

```json
{
  "label": "Architecture",
  "position": 2,
  "link": {
    "type": "generated-index",
    "description": "System diagrams, verified against code. Source: docs/architecture/system-architecture.drawio."
  }
}
```
Save as `apps/docs/docs/architecture/_category_.json`.

- [ ] **Step 2: Copy the exported SVGs into the Docusaurus static folder**

Docusaurus serves `static/` at the site root, so images referenced from docs need to live under `apps/docs/static/`, not be referenced from `docs/architecture/diagrams/` directly (that path is outside the `apps/docs` app).

```bash
mkdir -p apps/docs/static/img/diagrams
cp docs/architecture/diagrams/*.svg apps/docs/static/img/diagrams/
```

- [ ] **Step 3: Write each page — frontmatter, embedded SVG, and a caption sourced from what's actually drawn on that page**

Each file follows this shape (shown for `full-arch.md`; repeat the pattern for the other 7, changing `id`/`title`/`sidebar_position`/image filename and the caption text):

```markdown
---
id: full-arch
title: Full Architecture
sidebar_position: 1
---

# Full Architecture

![Full Architecture](/img/diagrams/full-arch.svg)

Monorepo + runtime + external services in one view: the three frontends (`apps/web`, `apps/widget`, `apps/landing`), the NestJS API's modules (Auth, Feedback, Billing, AI/BullMQ worker, Digest, Events Gateway), the two compile-time-only shared packages, the data layer (PostgreSQL, Redis), and the external services each module talks to (Google OAuth/GitHub OAuth, Stripe, Gemini). See [Request Lifecycle](./request-lifecycle) for the verified per-feedback data flow.
```

Required caption content per page (write 2-4 sentences per page based on what the corrected diagram — post Task 2 — actually shows; do not invent detail not present in the diagram):

| File | `id` / `sidebar_position` | What the page must mention |
|---|---|---|
| `full-arch.md` | `full-arch` / 1 | The 3 frontends, API's 6 named modules, the 2 shared packages (compile-time only), data layer, external services |
| `aws-infra.md` | `aws-infra` / 2 | VPC/public+private subnets, ALB→EC2→RDS path, S3+widget, the AWS verification-gate per-service status (CloudFront still blocked, everything else unblocked), SES/SSM/CloudWatch/Budgets |
| `request-lifecycle.md` | `request-lifecycle` / 3 | The 10 numbered steps, the sync/async split (steps 1-5 vs 6-10), that steps 6 and 9 run in the separate `WORKER_MODE` process, the `team-{teamId}` WS room |
| `auth-flow.md` | `auth-flow` / 4 | Password + OAuth paths into one JWT, the `{sub,email,role}` payload, the Redis-cache-first `JwtStrategy.validate()`, no refresh token / no server-side logout |
| `deploy-pipeline.md` | `deploy-pipeline` / 5 | The automated GitHub Actions CI (lint/build/typecheck/tests/e2e) vs. the still-manual AWS deploy (docker build → ECR → SSH → `docker-run.sh`), and that CodeBuild automation is provisioned but not wired up yet |
| `aws-network.md` | `aws-network` / 6 | VPC/subnet/security-group topology, that this is the network-only view (compute/async/monitoring live on the AWS Infrastructure page) |
| `er-diagram.md` | `er-diagram` / 7 | The 10 real entities and their relationships (User, Team, TeamMember, Project, Feedback, Comment, Invitation, ActivityEvent, AuditLog, StripeEvent, UserProjectLastSeen), Team as the billing tenant |
| `reg-onboarding.md` | `reg-onboarding` / 8 | Password vs. OAuth registration, `ensurePersonalTeam()`, the 3 rows written on registration (users/teams/team_members) |

- [ ] **Step 4: Verify the build**

```bash
pnpm --filter docs build
```
Expected: exits 0, no broken image references (`onBrokenLinks: 'throw'` also catches broken `![]()` image paths under `static/`).

- [ ] **Step 5: Commit**

```bash
git add apps/docs/docs/architecture apps/docs/static/img/diagrams
git commit -m "docs(site): add Architecture section (8 pages, embedded SVGs)"
```

---

### Task 8: Modules page — `apps/api`

**Files:**
- Create: `apps/docs/docs/modules/_category_.json`
- Create: `apps/docs/docs/modules/api.md`

- [ ] **Step 1: Category metadata**

```json
{
  "label": "Modules",
  "position": 3,
  "link": {
    "type": "generated-index",
    "description": "What each app and package does, and where to look in the code."
  }
}
```
Save as `apps/docs/docs/modules/_category_.json`.

- [ ] **Step 2: Write `api.md`**

Read `apps/api/src/app.module.ts` and skim each subfolder under `apps/api/src/modules/` (`activity`, `ai`, `auth`, `comments`, `digest`, `events`, `feedback`, `invitations`, `mail`, `plans`, `projects`, `stripe`, `teams`, `users`) before writing, to confirm nothing below has drifted since this plan was written. Required facts to cover:

```markdown
---
id: api
title: apps/api
sidebar_position: 1
---

# apps/api

NestJS 11 backend. REST + WebSockets (Socket.io). Port 3001. Runs in two process modes from the same codebase, branched in `main.ts` on `WORKER_MODE=1`:

- **HTTP mode** (default): full Nest app — REST controllers, Socket.io gateway, `@Cron` schedulers (AI self-healing sweep, weekly digest).
- **Worker mode**: `WorkerModule` only — no HTTP, no Socket.io server, no `ScheduleModule`. Runs the BullMQ `AiProcessor` consumer, emitting realtime updates through a Redis-emitter relay instead of a direct Socket.io server. Deployed as a second container (`insightstream-worker`) alongside `insightstream-api`.

## Domain modules (`apps/api/src/modules/`)

- **auth** — JWT (password + Google/GitHub OAuth), 7-day stateless token, no refresh/no server-side logout. `JwtStrategy.validate()` is read-through cached in Redis (TTL 30s, fail-open).
- **teams** — the billing tenant (not `User`, not `Project`). `ensurePersonalTeam()` lazily backfills a personal team for every user.
- **users** / **invitations** — user CRUD, team invite flow (role-gated).
- **projects** — the thing the widget posts feedback into; `teamId` required, access is membership-only.
- **feedback** — public submission endpoint (throttled, API-key + origin checked) plus the authenticated dashboard CRUD/Kanban surface.
- **ai** — Gemini-backed sentiment/category/summary analysis. `AiQueueService` enqueues, `AiProcessor` (worker-only) consumes, `AiSweepService` (HTTP-only `@Cron`) re-enqueues anything stuck `sentimentScore IS NULL` for 15min-24h.
- **comments** / **activity** — nested comment threads and the team activity feed.
- **stripe** — Checkout/webhooks/Customer Portal. Webhook dedup via a `StripeEvent` log (event id as PK); ordering via an atomic conditional `UPDATE ... WHERE lastStripeEventAt IS NULL OR <= eventCreated`. Guards against a team starting a second concurrent subscription.
- **digest** — weekly AI summary email, scheduled in-process via `@Cron` (Mon 09:00, HTTP-mode only).
- **mail** — SMTP/Nodemailer wrapper used by `digest` and invitations.
- **events** — the Socket.io gateway; clients join `team-{id}` rooms.
- **plans** — `PLAN_CONFIGS` + `PlanLimitsService`, the single source of plan/limit truth, keyed by `teamId`.

## Where to look

- `apps/api/src/app.module.ts` — the HTTP-mode module graph.
- `apps/api/src/worker.module.ts` — the worker-mode module graph (deliberately smaller).
- `apps/api/src/redis/` — the shared `RedisService` (JWT cache; BullMQ and the Socket.io adapter each have their own separate Redis clients).
- `apps/api/src/data-source.ts` — TypeORM migration data source; **new entities must be added here too**, or `migration:generate` silently misses them (`synchronize` masks this everywhere except prod).
```

- [ ] **Step 3: Verify the build**

```bash
pnpm --filter docs build
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/docs/modules/_category_.json apps/docs/docs/modules/api.md
git commit -m "docs(site): add apps/api module page"
```

---

### Task 9: Modules page — `apps/web`

**Files:**
- Create: `apps/docs/docs/modules/web.md`

- [ ] **Step 1: Write the page**

Read `apps/web/src/app/dashboard/` top level and `apps/web/src/components/ui/` before writing to confirm current structure. Required facts:

```markdown
---
id: web
title: apps/web
sidebar_position: 2
---

# apps/web

Next.js 16 App Router dashboard, React 19, TailwindCSS 4, TanStack Query 5. Port 3000. Deployed on Vercel today, with an Amplify deployment running in parallel (cutover pending — see [Ops](../ops)).

## Routes (`apps/web/src/app/`)

- `auth/` — login, register, OAuth callback, forgot/reset password.
- `invite/` — team invite acceptance.
- `dashboard/` — the authenticated app shell: feed/Kanban (root), `analytics/`, `activity/`, `archive/`, `billing/`, `embed/`, `settings/`, and a hidden `devtools/` (the only route that keeps the back-button pattern — see the P1 Navigation design).
- `settings/` — team/project/billing management (owner-gated where relevant).

## Component library (`apps/web/src/components/ui/`)

A real internal UI library — one implementation per pattern (`Modal`, `Popover`, `Tabs`, `Drawer`, `FormField`, `StatusSelect`, `ConfirmDialog`, `CommentThread`, `NavItem`, etc.), each with a Storybook story. Consolidated from 4-5 duplicate implementations per pattern in 2026-07 (see `PLAN.md` P1 — Component library consolidation). Rule: a component may live outside `ui/` only if used by exactly one page.

## State

- `TeamProvider` (`contexts/`) — current team context; not memoized (all consumers re-render on any provider query update — fine at current scale).
- TanStack Query — server state, keyed with `teamId` throughout.
- `useSocket` — Socket.io client, joins `team-{id}` room, receives `feedbackUpdated`.

## Where to look

- `apps/web/src/app/dashboard/layout.tsx` — the authenticated shell.
- `apps/web/src/hooks/` — data-fetching and domain hooks (`useComments`, plan-usage hooks, etc.).
- `apps/web/src/lib/colors.ts` — the semantic color tokens (`--status-success/warning/danger/info`) status colors must use — no raw Tailwind shades like `text-amber-300` in components.
```

- [ ] **Step 2: Verify the build**

```bash
pnpm --filter docs build
```

- [ ] **Step 3: Commit**

```bash
git add apps/docs/docs/modules/web.md
git commit -m "docs(site): add apps/web module page"
```

---

### Task 10: Modules page — `apps/widget`

**Files:**
- Create: `apps/docs/docs/modules/widget.md`

- [ ] **Step 1: Write the page**

```markdown
---
id: widget
title: apps/widget
sidebar_position: 3
---

# apps/widget

The embeddable feedback widget — the product's actual distribution surface. Vite build, **Preact** (not React — rewritten 2026-07-11 to hit a <30 KB gzip budget; result: 12.9 KB gzip), IIFE bundle, Shadow DOM style isolation (no Tailwind preflight leaks into the host page).

## Deployment

Served from S3 at a **versioned** URL — `v1/widget.js` (major-version-only; a future breaking change ships under `v2/widget.js`, `v1` stays frozen). Deployed via `scripts/deploy-widget.sh` (build → upload → verify). CloudFront in front of S3 is planned but still blocked by the AWS new-account verification gate (see [AWS Infrastructure](../architecture/aws-infra)).

## Structure (`apps/widget/src/`)

- `App.tsx` — the whole widget UI (trigger → panel → form → success), Preact function component, plain CSS transitions/keyframes (no framer-motion — dropped in the Preact rewrite).
- `icons.tsx` — 5 hand-copied inline SVGs (path data from `lucide-react`, ISC-licensed) instead of pulling in `preact/compat` + the React-targeted icon package.
- `main.tsx` — mount entry point, IIFE-bundled.

## Integration contract

POSTs `{apiKey, content, source: "Widget"}` to the public feedback endpoint (`apps/api`'s `feedback` module), rate-limited per-IP (20/min) and per-project (300/min) by `WidgetThrottlerGuard`.
```

- [ ] **Step 2: Verify the build**

```bash
pnpm --filter docs build
```

- [ ] **Step 3: Commit**

```bash
git add apps/docs/docs/modules/widget.md
git commit -m "docs(site): add apps/widget module page"
```

---

### Task 11: Modules pages — `apps/landing` and `apps/e2e`

**Files:**
- Create: `apps/docs/docs/modules/landing.md`
- Create: `apps/docs/docs/modules/e2e.md`

- [ ] **Step 1: Write `landing.md`**

Read `apps/landing/src/app/` top level before writing to confirm current routes.

```markdown
---
id: landing
title: apps/landing
sidebar_position: 4
---

# apps/landing

Marketing/landing page. Next.js 16, port 3002, deployed on Vercel. Deliberately **zero `@insightstream/*` dependencies** — fully decoupled from the app/API workspace packages.

## Key routes

- `/` — homepage, hero CTA → `/auth/register`, pricing section → "Start 14-day Trial".
- `/quiz` — interactive quiz; result redirects to `APP_URL/?plan={plan}` (UI pre-selection only — the plan param is not server-enforced, actual plan assignment happens at signup/checkout).

## Note

The footer "Pricing" link currently lands on a login-gated dashboard route, not a public pricing page — a product decision still pending (see `PLAN.md` ✔#7 deferred follow-ups).

PostHog is wired in for landing analytics (`posthog-js`).
```

- [ ] **Step 2: Write `e2e.md`**

```markdown
---
id: e2e
title: apps/e2e
sidebar_position: 5
---

# apps/e2e

Playwright end-to-end suite. No dev server of its own — drives the real `apps/web`/`apps/api` dev servers (or, in CI, freshly built ones).

## Coverage (`apps/e2e/tests/`)

`auth/`, `dashboard/`, `invite/`, `teams/`, `widget/` — login/register/OAuth, the main dashboard flows, team invitations, and a real widget-submission round trip. No billing-flow coverage yet (checkout → webhook → plan change) — see `PLAN.md` 🔍 Analysis Backlog #2 (web test pyramid).

## Running locally

Needs `apps/web` built with `NEXT_PUBLIC_API_URL=http://localhost:3001` (the value is baked in at Next.js build time, not read at runtime) and the docker-compose Postgres/Redis stack up. In CI (`.github/workflows/main.yml`, `e2e` job), migrations run against a fresh Postgres service container before Playwright starts.
```

- [ ] **Step 3: Verify the build**

```bash
pnpm --filter docs build
```

- [ ] **Step 4: Commit**

```bash
git add apps/docs/docs/modules/landing.md apps/docs/docs/modules/e2e.md
git commit -m "docs(site): add apps/landing and apps/e2e module pages"
```

---

### Task 12: Modules page — `packages/*`

**Files:**
- Create: `apps/docs/docs/modules/packages.md`

- [ ] **Step 1: Write the page**

```markdown
---
id: packages
title: packages/*
sidebar_position: 6
---

# packages/*

## `@insightstream/database`

TypeORM entities + PostgreSQL config, imported by `apps/api`. `packages/database/src/entities/` holds the 10 real entities (see the [ER Diagram](../architecture/er-diagram)). `packages/database/src/data-source.ts` is a separate TypeORM data source from `apps/api/src/data-source.ts` — **both** need a new entity registered, or migrations silently miss it.

:::caution
`apps/api` loads compiled entities from `packages/database/dist` — after editing an entity, rebuild the package (`pnpm --filter @insightstream/database build`) or `apps/api`'s dev `synchronize` will run against stale entity definitions.
:::

## `@insightstream/shared-types`

Plain TypeScript interfaces shared between `apps/api` and `apps/web` — `feedback.types.ts`, `project.types.ts`, `user.types.ts`. No runtime code, compile-time only.

## `config`

Placeholder package for shared ESLint/TS config — currently has an empty `package.json` and isn't consumed by any app. Every app (`api`, `web`, `widget`, `landing`, `docs`) rolls its own `eslint.config.*`/`tsconfig.json` today.
```

- [ ] **Step 2: Verify the build**

```bash
pnpm --filter docs build
```

- [ ] **Step 3: Commit**

```bash
git add apps/docs/docs/modules/packages.md
git commit -m "docs(site): add packages/* module page"
```

---

### Task 13: Ops page

**Files:**
- Create: `apps/docs/docs/ops.md`

- [ ] **Step 1: Write the page**

```markdown
---
id: ops
title: Ops
sidebar_position: 4
---

# Ops

## Local dev secrets

Local `.env` values are sourced via [Doppler](https://doppler.com) (`doppler.yaml` → project `insightstream-ai`, config `dev`). `pnpm dev` runs `doppler run -- turbo dev` — you need `doppler login` once, and Doppler CLI installed, before `pnpm dev` will work.

## Production deployment

| App | Platform | Trigger |
|---|---|---|
| API | AWS EC2 (behind an ALB) | Manual today — `scripts/deploy-api.sh`: local `docker build` → push to ECR → SSH to EC2 → `docker-run.sh` pulls + restarts. CodeBuild automation is provisioned (quota unblocked 2026-07-05) but not yet wired up — see [Deployment Pipeline](./architecture/deploy-pipeline). |
| Web | Vercel (live) + AWS Amplify (parallel run, cutover pending) | Push to `main` on both |
| Widget | S3 (`v1/widget.js`) | `scripts/deploy-widget.sh` |

Database: AWS RDS PostgreSQL, private subnet, SSL required, migrated from Supabase 2026-06-30 (old Supabase project still exists, not decommissioned). Backup retention is currently **1 day**, instance is **not Multi-AZ** — see the RDS restore drill finding in `PLAN.md` #10 before relying on this for real customer data.

## Secrets (names only — see SSM Parameter Store / Doppler for values)

`DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE`, `JWT_SECRET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`/`SECRET`, `GITHUB_CLIENT_ID`/`SECRET`, `SMTP_HOST`/`PORT`/`USER`/`PASS`/`FROM`, `SENTRY_DSN` (API + Web separate), `STRIPE_SECRET_KEY`/`WEBHOOK_SECRET`/price IDs, `FRONTEND_URL` (comma-separated list — Vercel + Amplify, during the parallel-run window).

## Known operational gaps

- No graceful shutdown (`app.enableShutdownHooks()`) — a `docker stop` on redeploy hard-kills an in-flight AI job instead of draining it (bounded by the self-healing AI sweep re-enqueueing it later).
- Neither the API nor worker container currently receives `SENTRY_DSN` via `docker-run.sh` — crash loops are invisible to Sentry, visible only via `docker logs`.
- SES is still in sandbox (200 emails/24h, 1/sec) — production access request is parked behind a domain-purchase decision (AWS recommends a verified domain identity over per-address verification).
- ACM certificate + HTTPS listener on the ALB is blocked for the same reason (no domain owned) — but is also likely redundant once unblocked, since `insightstream-api-proxy` (API Gateway) already gives the API free HTTPS and is what both Vercel and Amplify prod use.

Full detail and the reasoning behind every item above lives in [`PLAN.md`](https://github.com/boichuk-db/insightstream-ai/blob/main/docs/architecture/PLAN.md) — this page is a summary, not a substitute.
```

- [ ] **Step 2: Verify the build**

```bash
pnpm --filter docs build
```

- [ ] **Step 3: Commit**

```bash
git add apps/docs/docs/ops.md
git commit -m "docs(site): add Ops page"
```

---

### Task 14: Roadmap page (link-only, no table duplication)

**Files:**
- Create: `apps/docs/docs/roadmap.md`

- [ ] **Step 1: Write the page**

Per `PLAN.md`'s own "don't duplicate across places" rule, and the approved design doc, this page is a short summary plus a link — **not** a copy of the roadmap table.

```markdown
---
id: roadmap
title: Roadmap
sidebar_position: 5
---

# Roadmap

The living roadmap — current priorities, status, and the reasoning behind each — lives in one place: [`docs/architecture/PLAN.md`](https://github.com/boichuk-db/insightstream-ai/blob/main/docs/architecture/PLAN.md) on GitHub. It is not duplicated here; PLAN.md is updated in the same PR as any architecture-relevant change, so a copy here would drift immediately.

At a glance, `PLAN.md` uses this status legend:

| Symbol | Meaning |
|---|---|
| ✔ | Done — implemented and verified in code |
| 🔥 | Implement Soon — high ROI at the current stage |
| 🟡 | Future — adopt only when its named trigger fires |
| 🎓 | Learning experiment — intentionally non-optimal tech, kept for its learning value |
| 🏭 | Production recommendation — what a revenue-stage product would do |
| ⛔ | Retired — recommendation from an earlier review, dropped with reason |

Project constraints baked into every roadmap decision: infra cost as close to zero as possible, hands-on learning is a first-class goal (EC2/BullMQ/Socket.io/the AWS migration itself are deliberate choices, not gaps), and no enterprise complexity before it earns its keep.
```

- [ ] **Step 2: Verify the build**

```bash
pnpm --filter docs build
```
Expected: exits 0 with **no** broken-link errors now that every internal link referenced since Task 6 (`./ops`, `./architecture/full-arch`, etc.) resolves. This is the first fully-clean build of the whole `docs/` tree — treat any broken-link error here as a real bug to fix before moving on.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/docs/roadmap.md
git commit -m "docs(site): add Roadmap page (links to PLAN.md, no duplication)"
```

---

### Task 15: Trim `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the full content**

```markdown
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
| Widget dev | http://localhost:8080   |
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: trim README to a quickstart, point to the new docs site for everything else"
```

---

### Task 16: Retire `DEPLOYMENT.md`

**Problem:** `DEPLOYMENT.md` describes an entirely obsolete stack (Railway, Vercel-only, Supabase/Neon, no Redis, no EC2/RDS/Amplify/Stripe) — it is fiction relative to the current architecture, not just "a bit stale." Per the same one-source-of-truth principle applied to README in Task 15, it is replaced with a stub pointing at the site's Ops page rather than rewritten in place (rewriting it would create a second Ops-equivalent doc to keep in sync).

**Files:**
- Modify: `DEPLOYMENT.md`

- [ ] **Step 1: Replace the full content**

```markdown
# Deployment

This file is retired — it described a Railway/Vercel/Supabase stack this project no longer uses.

Current deployment process, secrets, and known operational gaps: see **[Ops](https://boichuk-db.github.io/insightstream-ai/ops)** on the docs site (source: `apps/docs/docs/ops.md`), and `docs/architecture/PLAN.md` for the full reasoning history.
```

- [ ] **Step 2: Commit**

```bash
git add DEPLOYMENT.md
git commit -m "docs: retire DEPLOYMENT.md in favor of the docs site's Ops page"
```

---

### Task 17: Extend the "Update rule" to cover diagram SVG regeneration

**Files:**
- Modify: `docs/architecture/PLAN.md` (header note area, lines 4-8)
- Modify: `CLAUDE.md` (Architecture Documentation section)

- [ ] **Step 1: Update `PLAN.md`'s header**

In `docs/architecture/PLAN.md`, find:
```
> **Update rule:** any change that alters the architecture (new module, new infra piece, a completed roadmap item, a decision reversed) updates this file in the same PR, and bumps the date above. Tasks for future work are pulled from this plan, not invented ad hoc.
```
Replace with:
```
> **Update rule:** any change that alters the architecture (new module, new infra piece, a completed roadmap item, a decision reversed) updates this file in the same PR, and bumps the date above. If the change also touches `system-architecture.drawio`, run `./scripts/export-diagrams.sh` and commit the regenerated SVGs under `docs/architecture/diagrams/` in the same PR — the docs site embeds the SVGs, not the `.drawio` file directly, so a stale SVG means a stale published diagram even if the source `.drawio` is correct. Tasks for future work are pulled from this plan, not invented ad hoc.
```
Also bump the `> Last updated:` line at the top of the file to today's date with a short note, matching the file's existing convention (e.g. `> Last updated: **2026-07-11** (Documentation actualization: apps/docs site live, README/DEPLOYMENT.md retired, drawio drift fixed)`).

- [ ] **Step 2: Update `CLAUDE.md`'s Architecture Documentation section**

In `CLAUDE.md`, find the "Architecture Documentation" section (`- **Update rule**: any change that alters the architecture ...`) and add one bullet after it:
```
- **Docs site**: `apps/docs` (Docusaurus) is the deployed, phone-readable view of this project — Overview/Architecture/Modules/Ops/Roadmap. Content is written in `apps/docs/docs/`; the Roadmap page links to this file rather than duplicating it. When `system-architecture.drawio` changes, run `./scripts/export-diagrams.sh` before committing so the site's embedded SVGs stay in sync.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/PLAN.md CLAUDE.md
git commit -m "docs: extend the architecture Update rule to cover diagram SVG regeneration"
```

---

### Task 18: GitHub Actions workflow — build and deploy the docs site

**Files:**
- Create: `.github/workflows/docs.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - 'apps/docs/**'
      - 'docs/architecture/**'
      - '.github/workflows/docs.yml'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    name: Build docs site
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Install pnpm
        uses: pnpm/action-setup@v5
        with:
          version: 9.12.0

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build docs site
        run: pnpm --filter docs build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/docs/build

  deploy:
    name: Deploy to GitHub Pages
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/docs.yml
git commit -m "ci: add GitHub Actions workflow to build and deploy the docs site to GitHub Pages"
```

(This workflow will only successfully deploy once GitHub Pages is enabled with "GitHub Actions" as its source — Task 19 does that. Until then, pushes will fail at the `deploy` job with a clear "Pages is not enabled" error, not silently no-op.)

---

### Task 19: Enable GitHub Pages (Source: GitHub Actions)

**This is a one-time repo-setting change, not a code change — flag it to the user before running if `gh auth status` doesn't already show `repo`/admin-level access.**

- [ ] **Step 1: Enable Pages via the API**

```bash
gh api -X POST repos/boichuk-db/insightstream-ai/pages -f build_type=workflow
```
Expected: JSON response describing the new Pages site (`"build_type": "workflow"`, a `"html_url"` like `https://boichuk-db.github.io/insightstream-ai/`).

If this 403s (insufficient token scope), do it manually instead and note that in the final task's summary: **GitHub → repo Settings → Pages → Build and deployment → Source: "GitHub Actions"**.

- [ ] **Step 2: Verify**

```bash
gh api repos/boichuk-db/insightstream-ai/pages
```
Expected: no longer a 404; shows `"status": "building"` or `"built"` once the Task 18 workflow has run at least once on `main`.

---

### Task 20: Push, verify the live deploy, and clean up

**Files:** none (verification only)

- [ ] **Step 1: Push the branch and open a PR (or push directly to `main` if the user has said to work directly on it for this task)**

```bash
git push -u origin <branch-name>
```
Confirm with the user before merging to `main` — merging is what actually triggers Task 18's workflow and makes the site live at a public URL for the first time.

- [ ] **Step 2: After merge to `main`, watch the workflow run**

```bash
gh run list --workflow=docs.yml --limit 1
gh run watch <run-id>
```
Expected: both `build` and `deploy` jobs succeed.

- [ ] **Step 3: Verify the live site**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://boichuk-db.github.io/insightstream-ai/
```
Expected: `200`. Then open it in a browser and spot-check from a phone-sized viewport: Overview renders, all 8 Architecture diagrams load (not broken images — this is the most likely failure mode if the `baseUrl`/static-asset path in Task 5 was wrong), Modules/Ops/Roadmap pages render, the Roadmap page's GitHub link resolves.

- [ ] **Step 4: Confirm the root `pnpm build`/`pnpm lint`/`pnpm typecheck` still pass with `apps/docs` in the workspace**

```bash
pnpm build && pnpm lint && pnpm typecheck
```
Expected: all exit 0 — `apps/docs` is now part of every one of these via `turbo`'s default (unfiltered) task graph, same as every other app.

- [ ] **Step 5: Report the live URL and any deviations from this plan back to the user** (e.g. if Task 19's `gh api` call needed the manual UI fallback, if any diagram SVG needed a re-export after a Task 2 edit was found incomplete, etc.)

---

## Self-review notes (kept for the reviewer, not part of execution)

- **Spec coverage:** every section of the design doc (tool choice, site structure, diagrams pipeline, integration/deploy, README, content sourcing) has a corresponding task. The design doc's "Out of scope" list (Swagger/OpenAPI reference, ADR journal, migrating `docs/superpowers/*` into the site, custom domain) has deliberately no task — confirmed nothing here re-introduces it.
- **Extra scope vs. the design doc, and why:** Task 2 (fixing `.drawio` drift) and Task 16 (retiring `DEPLOYMENT.md`) were not explicit line items in the design doc's "Approach" section, but both are direct, previously-stated requirements: the original `PLAN.md` #13/#19 problem statement explicitly calls for "a full pass over `system-architecture.drawio` to confirm every page matches current code, fixing drift found along the way," and `DEPLOYMENT.md`'s obsolescence is a direct instance of the same "one source of truth" principle the design doc already applies to `README.md`. Both were verified against real file content during planning (drift found via `grep`, JSON/XML sanity-checked) rather than invented.
- **Placeholder scan:** no TBD/TODO. Every content task lists concrete facts to include and concrete source files to check, not "add appropriate content."
- **Type/naming consistency:** page ids used in frontmatter (`full-arch`, `aws-infra`, `request-lifecycle`, `auth-flow`, `deploy-pipeline`, `aws-network`, `er-diagram`, `reg-onboarding`) match the SVG filenames from Task 3 and the drawio `<diagram id=...>` values throughout — checked against the actual file, not assumed.
