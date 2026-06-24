# AWS Migration Design — InsightStream AI

**Date:** 2026-06-24  
**Goal:** Migrate InsightStream AI from Railway/Vercel/Supabase to AWS for hands-on learning and portfolio building.  
**Constraint:** AWS Free Tier only ($0/month target).  
**Approach:** EC2-Centric — start with fundamentals, add managed services phase by phase.

---

## Context

**Current stack:**
- Railway → NestJS 11 API
- Vercel → Next.js 16 Web
- Supabase → PostgreSQL 15
- Doppler → Secrets management
- Nodemailer/SMTP → Email
- NestJS `@Cron` → Weekly digest job
- GitHub Actions → CI/CD
- Sentry → Monitoring

**Why AWS:** Learning hands-on AWS experience for career/portfolio. Zero AWS experience prior to this migration.

---

## AWS Services Map

| Current | AWS Replacement | Concept Learned |
|---------|----------------|-----------------|
| Railway (NestJS API) | EC2 t2.micro | Servers, SSH, Security Groups |
| Supabase PostgreSQL | RDS PostgreSQL t3.micro | Managed DB, private subnets |
| Vercel (Next.js) | AWS Amplify | Frontend hosting, CI/CD |
| Widget CDN (none) | S3 + CloudFront | Object storage, CDN, SSL |
| NestJS @Cron (digest) | Lambda + EventBridge | Serverless, scheduling |
| Nodemailer/SMTP | SES | Transactional email |
| Doppler (secrets) | SSM Parameter Store | Secrets management, IAM roles |
| GitHub Actions | CodeBuild + CodePipeline | AWS-native CI/CD |
| Sentry | CloudWatch + SNS | Logs, metrics, alarms |
| — | VPC + Subnets + Security Groups | Network security |
| — | IAM | Roles and access policies |
| — | ACM | Free SSL certificates |
| — | ECR | Docker image registry |

**Total: 18 AWS services, all within Free Tier.**

---

## Architecture Diagram

```
Internet
    │
    ├──► CloudFront ──► S3 (widget.js, static assets)
    │
    ├──► Amplify (Next.js Web)
    │         │
    │         ▼
    └──► EC2 t2.micro (NestJS API, Docker)   ← direct, no ALB (ALB is paid)
              │  [public subnet]
              │
    ┌─────────┴─────────────────────────────┐
    │          VPC private subnet           │
    │                                       │
    │   RDS PostgreSQL t3.micro             │
    │                                       │
    │   Lambda (digest)  ← must be in VPC  │
    └───────────────────────────────────────┘
              │              │
           SQS Queue    SSM Params (fetched at EC2 startup via IAM role)
              │
             SES (email send)

Ops layer:
  CloudWatch Logs ◄── EC2 + Lambda
  CloudWatch Alarms ──► SNS ──► Email alert

CI/CD:
  GitHub ──► CodePipeline ──► CodeBuild ──► ECR ──► EC2
```

---

## Phases

### Phase 1 — Network Foundation: IAM + VPC
**Goal:** Set up security and networking before deploying anything.

- Create IAM user (not root) with programmatic access
- Create IAM role for EC2 (allows SSM, CloudWatch, ECR access)
- Create VPC with CIDR `10.0.0.0/16`
- Create 2 subnets:
  - Public subnet `10.0.1.0/24` — for EC2 (has internet access)
  - Private subnet `10.0.2.0/24` — for RDS (no internet access)
- Create Internet Gateway → attach to VPC
- Create Route Table for public subnet → route `0.0.0.0/0` to IGW
- Create Security Groups:
  - `sg-api`: allows inbound 80, 443, 3001 from internet; allows inbound 22 (SSH) from your IP only
  - `sg-rds`: allows inbound 5432 from `sg-api` only (DB never exposed to internet)

**Key concept:** The database lives in a private subnet — no direct internet access. Only the EC2 API can reach it.

**Free tier:** IAM and VPC are always free.

---

### Phase 2 — Server and Database: EC2 + RDS + SSM
**Goal:** Replace Railway and Supabase.

**EC2:**
- Launch `t2.micro` (Amazon Linux 2023) in public subnet
- Attach IAM role with SSM + ECR permissions
- Install Docker on EC2
- Pull and run NestJS API Docker image

**RDS:**
- Launch `db.t3.micro` PostgreSQL 15 in private subnet
- Multi-AZ: disabled (free tier)
- Storage: 20GB gp2 (free tier limit)
- No public accessibility — only reachable from EC2 via security group

**SSM Parameter Store:**
- Store all secrets: `DB_HOST`, `DB_PASSWORD`, `JWT_SECRET`, `GEMINI_API_KEY`, etc.
- EC2 reads secrets at startup via IAM role (no `.env` files on server)
- Startup script: fetch params from SSM → set as environment variables → `docker run`

**Code changes:**
- None to NestJS modules
- Add SSM fetch script to EC2 user-data or startup script

**Free tier:** EC2 t2.micro (750h/month), RDS t3.micro (750h/month, 20GB storage). SSM Parameter Store standard tier is free.

---

### Phase 3 — CDN and Storage: S3 + CloudFront + ACM
**Goal:** Serve the embeddable widget via CDN.

**S3:**
- Create bucket `insightstream-widget`
- Disable public access on bucket itself
- Allow CloudFront Origin Access Control (OAC) only

**CloudFront:**
- Create distribution with S3 origin
- Origin Access Control (OAC) — CloudFront fetches from S3, users never hit S3 directly
- Cache behavior: `widget.js` cached with long TTL, invalidated on new deploy

**ACM:**
- Request SSL certificate for custom domain (e.g., `cdn.insightstream.com`)
- ACM is free, auto-renews
- Attach to CloudFront distribution

**Deploy widget:**
- Build locally: `pnpm build --filter=widget`
- Upload `apps/widget/dist/widget.iife.js` to S3
- CloudFront URL becomes the widget embed URL for customers

**Free tier:** S3 (5GB, 20K GET/month), CloudFront (1TB transfer, 10M requests/month). ACM is always free.

---

### Phase 4 — Frontend: AWS Amplify
**Goal:** Replace Vercel with AWS Amplify for Next.js hosting.

- Connect GitHub repo to Amplify
- Set root directory to `apps/web`
- Configure build command: `cd ../.. && pnpm turbo build --filter=web`
- Add all environment variables (`NEXT_PUBLIC_API_URL`, etc.)
- Preview deployments per branch (similar to Vercel)
- Custom domain via Route 53 or external DNS

**Code changes:** None to Next.js code.

**Free tier:** Amplify — 1000 build minutes/month, 15GB hosting storage, 5GB data transfer/month.

---

### Phase 5 — Async Processing: SQS + Lambda + EventBridge
**Goal:** Add event queue and replace NestJS `@Cron` digest with Lambda.

**SQS:**
- Create standard queue `insightstream-feedback-events`
- NestJS publishes a message to SQS when new feedback arrives (using AWS SDK v3)
- Lambda (or future consumer) processes events asynchronously
- Decouples API from processing — if processing is slow, queue buffers it

**Lambda (Digest job):**
- Extract digest logic from `apps/api/src/modules/digest/digest.service.ts`
- Create Lambda function in Node.js 20
- Lambda must be configured with VPC settings (same private subnet + `sg-api` security group) to access RDS
- Lambda calls Gemini API and sends email via SES
- Note: Lambda in VPC requires a NAT Gateway for internet access (calls to Gemini API). NAT Gateway is paid (~$32/month). Workaround: call Gemini from EC2 API instead, Lambda only handles DB reads/writes and triggers SES directly.

**EventBridge Scheduler:**
- Cron schedule: `cron(0 9 ? * MON *)` → every Monday at 9:00 UTC
- Target: Lambda digest function

**Code changes:**
- Add `@aws-sdk/client-sqs` to API, publish event in feedback creation flow
- Extract digest logic into standalone Lambda handler file

**Free tier:** SQS (1M requests/month), Lambda (1M invocations, 400K GB-seconds/month), EventBridge (14M events/month).

---

### Phase 6 — Email: SES
**Goal:** Replace Nodemailer/SMTP with AWS SES.

- Verify sending domain in SES (add DNS TXT/CNAME records)
- Request SES production access (exit sandbox) — required to send to unverified recipients
- Update `apps/api/src/modules/mail/mail.service.ts`:
  - Remove Nodemailer transport
  - Add `@aws-sdk/client-ses`
  - EC2 IAM role gets `ses:SendEmail` permission

**Free tier:** SES — 3,000 messages/month when sent from EC2.

---

### Phase 7 — CI/CD: ECR + CodeBuild + CodePipeline
**Goal:** Automate Docker build and deploy to EC2 on every push to `main`.

**ECR:**
- Create repository `insightstream-api`
- Store Docker images (free: 500MB/month)

**CodeBuild:**
- `buildspec.yml` in repo root:
  1. `docker build` the API image
  2. `docker push` to ECR
  3. SSH into EC2, `docker pull` new image, restart container
- Note: Deploying via SSH from CodeBuild is intentionally simple (avoids CodeDeploy complexity). Sufficient for learning; a production setup would use CodeDeploy or ECS rolling updates.

**CodePipeline:**
- Source: GitHub (via CodeStar connection)
- Build: CodeBuild project
- No separate Deploy stage (CodeBuild handles EC2 SSH deploy)

**IAM:** CodeBuild role needs ECR push permissions + EC2 SSH key stored in SSM.

**Free tier:** CodeBuild (100 build minutes/month), CodePipeline (1 free pipeline/month). ECR (500MB/month).

---

### Phase 8 — Monitoring: CloudWatch + SNS
**Goal:** Replace Sentry with AWS-native monitoring.

**CloudWatch Logs:**
- Install CloudWatch Agent on EC2
- Stream NestJS Docker logs to Log Group `/insightstream/api`
- Lambda logs auto-stream to CloudWatch

**CloudWatch Metrics + Alarms:**
- Alarm: EC2 CPU > 80% for 5 minutes → notify
- Alarm: RDS storage < 2GB → notify
- Alarm: Lambda errors > 0 → notify

**SNS:**
- Create topic `insightstream-alerts`
- Subscribe your email
- All alarms publish to this topic

**CloudWatch Dashboard:**
- Single dashboard: API request count, error rate, DB connections, Lambda invocations

**Free tier:** CloudWatch (10 custom metrics, 5GB log ingestion, 3 dashboards, 10 alarms). SNS (1M publishes, 1K email deliveries/month).

---

## Key Technical Decisions

### Secrets: SSM Parameter Store (not .env files)
EC2 fetches all secrets at startup via IAM role. No credentials stored on disk. Follows AWS security best practices. Standard tier is free.

### NestJS on EC2 via Docker
Uses existing `Dockerfile.api`. No refactoring needed. EC2 startup script: `docker pull ECR_IMAGE && docker run --env-file <(ssm-fetch) ECR_IMAGE`.

### Widget delivery
S3 + CloudFront is the correct pattern for static file CDN on AWS. OAC ensures S3 is never publicly accessible directly.

### Digest as Lambda, not EC2 cron
Running a weekly job on a persistent server is wasteful. Lambda runs for seconds, costs nothing (free tier), and is independently scalable. This is the correct AWS pattern for scheduled jobs.

### Database in private subnet
RDS is never exposed to the internet. Only EC2 (via security group rule) can connect. This is non-negotiable for any production database.

### Amplify vs Vercel for Next.js
Amplify supports Next.js SSR natively. Chosen over Vercel to gain AWS experience with frontend hosting. Free tier is comparable.

---

## What We Are NOT Changing

- NestJS module code (auth, projects, feedback, ai, teams, etc.)
- TypeORM entities and relations
- Next.js page and component code
- Socket.io (stays on EC2, no API Gateway WebSocket migration — out of scope)
- Redis (not currently used in code — skip ElastiCache)

---

## Free Tier Budget Estimate

| Service | Free Tier Limit | Expected Usage |
|---------|----------------|----------------|
| EC2 t2.micro | 750h/month | ~720h (1 instance 24/7) |
| RDS t3.micro | 750h/month | ~720h (1 instance 24/7) |
| S3 | 5GB, 20K GET | <1GB, <1K GET |
| CloudFront | 1TB transfer | <10GB |
| Lambda | 1M invocations | <100 (weekly digest) |
| SQS | 1M requests | <10K |
| SES | 3K emails/month | <500 |
| CloudWatch | 5GB logs, 10 alarms | Within limits |
| Amplify | 1000 build min, 15GB | Within limits |
| CodeBuild | 100 build min/month | Within limits |
| ECR | 500MB | ~300MB |

**Estimated cost: $0/month** (within Free Tier for 12 months from account creation)

**One exception:** Route 53 hosted zone = $0.50/month if using custom domain. Optional — can skip and use AWS-generated domains.

---

## Success Criteria

By the end of this migration:
- [ ] NestJS API running on EC2, reachable publicly
- [ ] PostgreSQL on RDS, accessible only from EC2
- [ ] Next.js on Amplify, connected to API
- [ ] Widget served from CloudFront
- [ ] Digest running as Lambda every Monday
- [ ] Emails sent via SES
- [ ] All secrets in SSM (no .env files on server)
- [ ] Auto-deploy on push to `main` via CodePipeline
- [ ] CloudWatch dashboard + email alerts on errors
- [ ] Able to explain every service and WHY it's used in an interview
