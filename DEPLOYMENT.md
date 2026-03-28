# Deployment Guide: InsightStream AI (Free Tier)

This guide walks through deploying InsightStream AI using a hybrid free-tier approach with no ongoing costs.

## Architecture Overview

```
┌─────────────────┐
│   Vercel CDN    │
│  Next.js Web    │ <- Free tier
│  (Frontend)     │
└────────┬────────┘
         │ HTTPS
         └─────────────────────┐
                               │
                    ┌──────────▼──────────┐
                    │ Railway Container   │
                    │ NestJS API          │ <- Free tier ($5 credit)
                    │ (Backend)           │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Supabase/Neon       │
                    │ PostgreSQL          │ <- Free tier
                    │ (Database)          │
                    └─────────────────────┘
```

## Prerequisites

- GitHub account (for code repo)
- Vercel account (vercel.com) — free signup
- Railway account (railway.app) — free signup with GitHub
- Supabase account (supabase.com) OR Neon account (neon.tech) — free signup

## Step 1: Generate New Secrets

Generate a strong JWT secret for production:

```bash
openssl rand -base64 64
```

Save this value — you'll use it later.

## Step 2: Set Up PostgreSQL Database

### Option A: Supabase (Recommended)

1. Go to [supabase.com](https://supabase.com), sign up with GitHub
2. Create a new project:
   - **Name**: `insightstream`
   - **Password**: Strong password (save it!)
   - **Region**: Closest to you
3. Once created, go to **Settings → Database → Connection string**
4. Copy the **Pooling Connection** URL (not Direct)
5. It looks like: `postgresql://postgres.xxxxx:password@aws-0-region.pooling.supabase.com:6543/postgres`
6. **Save this URL** — you'll need it for Railway

#### Create Tables

You have two options:

**Option 1: Auto-sync (quick, for pet projects)**

- Just set `synchronize: true` in the .env.prod when deploying
- TypeORM will create tables automatically on first API startup
- ⚠️ Not recommended for production, but fine for a pet project

**Option 2: Manual migrations (safer)**

- Run locally: `npm run typeorm migration:generate` (then commit migrations)
- But you don't have migrations yet, so Option 1 is easier for now

### Option B: Neon

1. Go to [neon.tech](https://neon.tech), sign up
2. Create a new project
3. Copy the connection string from the **Connection string** tab
4. Use the "Pooled connection" variant
5. Save this URL

---

## Step 3: Deploy NestJS API to Railway

Railway provides a free tier with $5 monthly credit (enough for a pet project).

### 3a. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (authorize Railway)
3. Click **+ New Project**
4. Select **Deploy from GitHub**
5. Select your `insightstream-ai` repository
6. Select **Deploy a custom Dockerfile**
7. Choose **Use root directory** (the mono-root)
8. Wait for build to complete

### 3b. Configure Build & Start Commands

In Railway dashboard, go to **Settings** for the deployment:

- **Build Command**:

  ```
  pnpm install && pnpm turbo build --filter=api
  ```

- **Start Command**:

  ```
  node apps/api/dist/main
  ```

- **Root Directory**: `.` (root)

### 3c. Add Environment Variables

Go to **Variables** tab in Railway and add:

```
GEMINI_API_KEY=[YOUR-GOOGLE-GEMINI-API-KEY]
DB_HOST=your-supabase-host-from-connection-string
DB_PORT=6543
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-password
DB_DATABASE=postgres
NODE_ENV=production
JWT_SECRET=<paste the OpenSSL output from Step 1>
FRONTEND_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_API_URL=<Railway public API URL — Railway generates this>
PORT=3001
```

**Note**: Railway auto-generates a public URL for your API. Copy it from the **Deployments** tab (looks like `https://insightstream-api-production.up.railway.app`) and paste into `NEXT_PUBLIC_API_URL`.

### 3d. Enable Persistent Volume (Optional)

If you want to preserve database backups:

- Go to **Volumes** → **+ Add Volume**
- Mount path: `/data`
- This persists data if the container restarts

### 3e. Verify Deployment

Wait for the build to finish. Once live:

```bash
curl https://your-railway-api-url/
```

Should return something (API route or health check).

---

## Step 4: Deploy Next.js Frontend to Vercel

### 4a. Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. **Root Directory**: `apps/web`
5. **Framework Preset**: Next.js (auto-detected)

### 4b. Configure Build Settings

- **Build Command**: `cd ../.. && pnpm turbo build --filter=web`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

### 4c. Add Environment Variables

In Vercel project settings, go to **Environment Variables** and add:

```
NEXT_PUBLIC_API_URL=https://your-railway-api-url
```

**Important**: Must start with `NEXT_PUBLIC_` to be exposed to the browser.

### 4d. Deploy

Click **Deploy**. Vercel will build and deploy automatically.

Once live, you'll get a URL like `https://insightstream-ai.vercel.app`.

---

## Step 5: Update API Environment with Frontend URL

Now that you have the Vercel domain, update the API on Railway:

1. Go back to Railway dashboard
2. Edit the **FRONTEND_URL** variable:
   ```
   FRONTEND_URL=https://your-vercel-domain.vercel.app
   ```
3. Redeploy (or manually trigger a restart)

This tells the API to allow CORS requests from your Vercel frontend.

---

## Step 6: Connect Frontend to API (Optional — Usually Auto-detected)

If the frontend doesn't auto-connect to the API, ensure `.env.production` or Vercel env vars have:

```
NEXT_PUBLIC_API_URL=https://your-railway-api-url
```

This is the URL the browser will use to call the API.

---

## Step 7: Test the Deployment

### Frontend

1. Open your Vercel URL
2. You should see the login page
3. Try logging in (may require an account to exist in the DB)

### WebSocket (Kanban Board)

1. Log in
2. Navigate to the Kanban board
3. Open browser DevTools → Network tab
4. Look for a WebSocket connection to your Railway API
5. If connected, drag tasks around (should work in real-time)

### Scheduled Digest (Monday 9 AM)

The `@Cron` decorator in `digest.service.ts` will fire every Monday at 9 AM because Railway keeps the process alive.

### Widget

If you're serving the widget from Next.js `public/`:

- Build widget locally: `pnpm turbo build --filter=widget`
- Copy `apps/widget/dist/widget.iife.js` to `apps/web/public/widget.js`
- Access at: `https://your-vercel-domain.vercel.app/widget.js`

---

## Troubleshooting

### "Cannot connect to database"

- **Check**: Is `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` correct in Railway?
- **Check**: Supabase connection string is the **Pooled** version, not Direct
- **Check**: Firewall — Supabase defaults to IP whitelist. Allow Railway IPs:
  - Go to Supabase → Settings → Database → Firewall
  - Add Railway's IP or disable (for pet projects)

### "CORS error in browser"

- **Check**: `FRONTEND_URL` in Railway matches your Vercel domain exactly
- **Check**: Browser console shows which origin is being blocked
- **Verify**: API is receiving the correct `FRONTEND_URL` env var

### "WebSocket fails to connect"

- **Check**: Railway API is live (`curl` the health endpoint)
- **Check**: `NEXT_PUBLIC_API_URL` in Vercel env vars is correct Railway URL
- **Check**: No firewall blocking the WebSocket upgrade

### "Database tables don't exist"

If schema isn't created:

- Option 1: Set `synchronize: true` temporarily in production (only do once)
- Option 2: Create a manual SQL script to initialize tables
- Option 3: Use migrations (requires setting up migration files first)

For a pet project, Option 1 is fine.

---

## Cost Breakdown

| Service  | Free Tier       | Notes                            |
| -------- | --------------- | -------------------------------- |
| Vercel   | Unlimited       | Generous free tier for Next.js   |
| Railway  | $5/month credit | More than enough for a small API |
| Supabase | 500 MB database | Enough for thousands of records  |
| Neon     | 10 GB database  | Larger free tier if you need it  |

**Total**: **$0-5 per month**

---

## Local Development vs Production

**Local** (docker-compose.yml):

- Uses local `.env` with `localhost` URLs
- PostgreSQL in Docker
- Redis in Docker (unused but provisioned)
- Separate containers for API, web, DB

**Production** (this guide):

- API on Railway (always-on container)
- Frontend on Vercel (serverless, auto-scaling)
- Database on Supabase/Neon (managed)
- No Redis needed (not used in code)

---

## Next Steps

1. [x] Create Supabase/Neon project
2. [x] Deploy API to Railway
3. [x] Deploy frontend to Vercel
4. [ ] Test all three components together
5. [ ] Configure custom domain (optional)
6. [ ] Set up monitoring (optional)

---

## Custom Domain (Optional)

If you want `insightstream.com` instead of `vercel.app`:

### Vercel

1. Vercel → Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### Railway API

1. Railway → Deployment → Custom Domain
2. Add your domain for API (e.g., `api.insightstream.com`)
3. Update DNS records as instructed

Both provide detailed DNS setup guides.

---

## Support & Debugging

- **Railway logs**: Dashboard → Deployments → Logs tab
- **Vercel logs**: Dashboard → Deployments → → View logs
- **Supabase logs**: Dashboard → Logs
- **Browser Console**: Right-click → Inspect → Console tab (WebSocket errors)

---

Good luck! 🚀
