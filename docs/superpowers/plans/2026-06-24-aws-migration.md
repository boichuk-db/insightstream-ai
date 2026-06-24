# AWS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate InsightStream AI from Railway/Vercel/Supabase to 18 AWS services on Free Tier, learning each service hands-on.

**Architecture:** EC2-centric — network foundation first (VPC/IAM), then compute (EC2/RDS), CDN (S3/CloudFront), frontend (Amplify), async (SQS/Lambda), email (SES), CI/CD (ECR/CodeBuild/CodePipeline), monitoring (CloudWatch/SNS). NestJS business logic stays untouched — only infrastructure and adapter-layer changes.

**Tech Stack:** AWS Console + AWS CLI v2, Docker, NestJS + @aws-sdk/client-sqs + @aws-sdk/client-ses, Lambda Node.js 20, EventBridge Scheduler, CodeBuild + CodePipeline, CloudWatch Agent.

---

## Before You Start

**Region:** This plan uses `eu-central-1` (Frankfurt). To use a different region, replace `eu-central-1` everywhere.

**Save IDs as you go.** Create `infra/aws-ids.txt` (gitignored) and fill in IDs as AWS assigns them:

```
VPC_ID=
PUBLIC_SUBNET_ID=
PRIVATE_SUBNET_ID=
IGW_ID=
RTB_PUBLIC_ID=
SG_API_ID=
SG_RDS_ID=
RDS_ENDPOINT=
EC2_INSTANCE_ID=
EC2_PUBLIC_IP=
ECR_REGISTRY=
SQS_FEEDBACK_QUEUE_URL=
AMPLIFY_APP_ID=
```

---

## Files Overview

**New files:**
- `infra/aws-ids.txt` — local resource ID notes (gitignored)
- `scripts/ssm-env.sh` — EC2: fetch secrets from SSM at startup
- `scripts/docker-run.sh` — EC2: start API container with SSM env vars
- `lambda/feedback-processor/index.mjs` — Lambda: SQS feedback event consumer
- `lambda/digest-trigger/index.mjs` — Lambda: weekly EventBridge digest trigger
- `buildspec.yml` — CodeBuild: build Docker image + SSH deploy to EC2
- `infra/cloudwatch-agent-config.json` — CloudWatch agent log + metrics config
- `amplify.yml` — Amplify: Next.js monorepo build config

**Modified files:**
- `apps/api/package.json` — add `@aws-sdk/client-sqs`, `@aws-sdk/client-ses`
- `apps/api/src/modules/feedback/feedback.service.ts` — publish to SQS on feedback create
- `apps/api/src/modules/mail/mail.service.ts` — replace Nodemailer with SES
- `apps/api/src/modules/digest/digest.controller.ts` — add internal HTTP trigger endpoint

---

## Task 0: Prerequisites — AWS Account + CLI

> **What you're learning:** AWS account basics, IAM root vs user, AWS CLI setup.

- [ ] **Step 1: Create AWS account**
  Go to https://aws.amazon.com → Create account. Use a personal email. Add credit card (required, but Free Tier means $0 charged). Select "Basic support" (free).

- [ ] **Step 2: Set account alias**
  AWS Console → top-right menu → Account → Account alias → set e.g. `insightstream`

- [ ] **Step 3: Enable MFA on root account**
  AWS Console → IAM → Dashboard → "Add MFA for root user" → follow prompts with authenticator app. Root account is the nuclear option — protect it.

- [ ] **Step 4: Install AWS CLI v2 on your machine**
  Windows: download installer from https://awscli.amazonaws.com/AWSCLIV2.msi → run it.
  Verify: `aws --version`
  Expected: `aws-cli/2.x.x Python/3.x.x Windows/...`

- [ ] **Step 5: Create `infra/aws-ids.txt`**

  ```
  # AWS Resource IDs — keep this file local, do not commit
  REGION=eu-central-1
  ```

- [ ] **Step 6: Add `infra/aws-ids.txt` to `.gitignore`**

  Add to `.gitignore`:
  ```
  infra/aws-ids.txt
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add .gitignore
  git commit -m "chore: gitignore aws-ids.txt"
  ```

---

## Phase 1 — IAM + VPC

> **What you're learning:** Identity and Access Management (IAM) controls WHO can do WHAT on AWS. VPC (Virtual Private Cloud) is your own private network inside AWS — like a data center you define.

---

### Task 1: Create IAM Admin User + Configure CLI

> IAM best practice: never use the root account for daily work. Create a separate IAM user with admin access.

- [ ] **Step 1: Create IAM user**
  AWS Console → IAM → Users → Create user
  - Username: `insightstream-admin`
  - ✓ Provide user access to the AWS Management Console → NO (CLI only)
  - Next → Attach policies directly → `AdministratorAccess` → Next → Create user

- [ ] **Step 2: Create access key for CLI**
  IAM → Users → `insightstream-admin` → Security credentials → Access keys → Create access key
  - Use case: CLI → Next → Create access key
  - **Download the CSV file** or copy both keys immediately — secret key shown only once

- [ ] **Step 3: Configure AWS CLI**

  ```bash
  aws configure
  ```

  Enter when prompted:
  ```
  AWS Access Key ID: [paste from Step 2]
  AWS Secret Access Key: [paste from Step 2]
  Default region name: eu-central-1
  Default output format: json
  ```

- [ ] **Step 4: Verify CLI works**

  ```bash
  aws sts get-caller-identity
  ```

  Expected:
  ```json
  {
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/insightstream-admin"
  }
  ```

---

### Task 2: Create IAM Role for EC2

> EC2 instances need an IAM role to call other AWS services (SSM, ECR, SES, SQS, CloudWatch). A role is like a badge — the EC2 wears it and gains permissions automatically. No hardcoded keys needed.

- [ ] **Step 1: Create the role**
  IAM → Roles → Create role
  - Trusted entity: AWS service → EC2 → Next
  - Attach these policies (search each one):
    - `AmazonSSMReadOnlyAccess` — read secrets from Parameter Store
    - `AmazonEC2ContainerRegistryReadOnly` — pull Docker images from ECR
    - `CloudWatchAgentServerPolicy` — send logs and metrics to CloudWatch
    - `AmazonSESFullAccess` — send emails via SES
    - `AmazonSQSFullAccess` — publish messages to SQS queues
  - Next → Role name: `InsightStreamEC2Role` → Create role

- [ ] **Step 2: Verify role was created**

  ```bash
  aws iam get-role --role-name InsightStreamEC2Role --query "Role.RoleName"
  ```

  Expected: `"InsightStreamEC2Role"`

---

### Task 3: Create VPC + Subnets + Security Groups

> VPC = your private network. EC2 goes in a public subnet (reachable from internet). RDS goes in a private subnet (only reachable from EC2 — never from internet).

- [ ] **Step 1: Create VPC**

  ```bash
  aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --region eu-central-1 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=insightstream-vpc}]'
  ```

  Copy `VpcId` from output → save to `infra/aws-ids.txt` as `VPC_ID=vpc-xxxxx`

- [ ] **Step 2: Enable DNS hostnames on VPC** (required for RDS)

  ```bash
  aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
  ```

- [ ] **Step 3: Create public subnet** (for EC2)

  ```bash
  aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone eu-central-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=insightstream-public}]'
  ```

  Copy `SubnetId` → save as `PUBLIC_SUBNET_ID=subnet-xxxxx`

- [ ] **Step 4: Create private subnet** (for RDS)

  ```bash
  aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone eu-central-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=insightstream-private}]'
  ```

  Copy `SubnetId` → save as `PRIVATE_SUBNET_ID=subnet-xxxxx`

- [ ] **Step 5: Create Internet Gateway** (allows EC2 to reach the internet)

  ```bash
  aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=insightstream-igw}]'
  ```

  Copy `InternetGatewayId` → save as `IGW_ID=igw-xxxxx`

- [ ] **Step 6: Attach IGW to VPC**

  ```bash
  aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
  ```

- [ ] **Step 7: Create route table for public subnet**

  ```bash
  aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=insightstream-rtb-public}]'
  ```

  Copy `RouteTableId` → save as `RTB_PUBLIC_ID=rtb-xxxxx`

- [ ] **Step 8: Add route to internet via IGW**

  ```bash
  aws ec2 create-route \
    --route-table-id $RTB_PUBLIC_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id $IGW_ID
  ```

- [ ] **Step 9: Associate public subnet with route table**

  ```bash
  aws ec2 associate-route-table --route-table-id $RTB_PUBLIC_ID --subnet-id $PUBLIC_SUBNET_ID
  ```

- [ ] **Step 10: Create security group for EC2** (`sg-api`)

  ```bash
  aws ec2 create-security-group \
    --group-name sg-api \
    --description "InsightStream API server" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=sg-api}]'
  ```

  Copy `GroupId` → save as `SG_API_ID=sg-xxxxx`

- [ ] **Step 11: Add inbound rules to sg-api**

  Replace `YOUR_IP` with your public IP (check: https://checkip.amazonaws.com):

  ```bash
  # SSH — only from your IP
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_API_ID \
    --protocol tcp --port 22 --cidr YOUR_IP/32

  # API port — public
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_API_ID \
    --protocol tcp --port 3001 --cidr 0.0.0.0/0

  # HTTP — public (for future ALB or health checks)
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_API_ID \
    --protocol tcp --port 80 --cidr 0.0.0.0/0
  ```

- [ ] **Step 12: Create security group for RDS** (`sg-rds`)

  ```bash
  aws ec2 create-security-group \
    --group-name sg-rds \
    --description "InsightStream RDS database" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=sg-rds}]'
  ```

  Copy `GroupId` → save as `SG_RDS_ID=sg-xxxxx`

- [ ] **Step 13: Allow RDS to accept connections only from EC2** (sg-api → sg-rds)

  ```bash
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_RDS_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $SG_API_ID
  ```

- [ ] **Step 14: Verify networking setup**

  ```bash
  aws ec2 describe-vpcs --filters Name=tag:Name,Values=insightstream-vpc --query "Vpcs[0].VpcId"
  aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID --query "Subnets[*].[Tags[0].Value,CidrBlock]"
  ```

  Expected: 2 subnets with CIDRs 10.0.1.0/24 and 10.0.2.0/24

---

## Phase 2 — EC2 + RDS + SSM

> **What you're learning:** SSM Parameter Store stores secrets securely. RDS is a managed PostgreSQL. EC2 is your virtual server. Together they replace Railway + Supabase.

---

### Task 4: Store Secrets in SSM Parameter Store

> SSM Parameter Store = secure config service. EC2 fetches these at startup using its IAM role — no `.env` files on disk, no secrets in source code.

- [ ] **Step 1: Store each secret as a SecureString**

  Replace `[VALUE]` with actual values from your current `.env` / Doppler. Run each command:

  ```bash
  # Database (you'll have RDS endpoint after Task 5 — use placeholder for now, update after)
  aws ssm put-parameter --name "/insightstream/prod/DB_HOST" --type "SecureString" --value "PLACEHOLDER_UPDATE_AFTER_RDS" --region eu-central-1
  aws ssm put-parameter --name "/insightstream/prod/DB_PORT" --type "SecureString" --value "5432" --region eu-central-1
  aws ssm put-parameter --name "/insightstream/prod/DB_USERNAME" --type "SecureString" --value "insightstream" --region eu-central-1
  aws ssm put-parameter --name "/insightstream/prod/DB_PASSWORD" --type "SecureString" --value "[YOUR_DB_PASSWORD]" --region eu-central-1
  aws ssm put-parameter --name "/insightstream/prod/DB_DATABASE" --type "SecureString" --value "insightstream" --region eu-central-1

  # Auth
  aws ssm put-parameter --name "/insightstream/prod/JWT_SECRET" --type "SecureString" --value "[YOUR_JWT_SECRET]" --region eu-central-1

  # AI
  aws ssm put-parameter --name "/insightstream/prod/GEMINI_API_KEY" --type "SecureString" --value "[YOUR_GEMINI_KEY]" --region eu-central-1

  # Frontend URL (update with Amplify URL after Phase 4)
  aws ssm put-parameter --name "/insightstream/prod/FRONTEND_URL" --type "SecureString" --value "PLACEHOLDER_UPDATE_AFTER_AMPLIFY" --region eu-central-1

  # Internal secret for Lambda→EC2 communication
  aws ssm put-parameter --name "/insightstream/prod/INTERNAL_SECRET" --type "SecureString" --value "[RANDOM_32_CHAR_STRING]" --region eu-central-1

  # AWS (for SES + SQS from EC2)
  aws ssm put-parameter --name "/insightstream/prod/AWS_REGION" --type "String" --value "eu-central-1" --region eu-central-1
  aws ssm put-parameter --name "/insightstream/prod/SES_FROM_EMAIL" --type "String" --value "[YOUR_EMAIL]" --region eu-central-1

  # SQS (update after Task 14)
  aws ssm put-parameter --name "/insightstream/prod/SQS_FEEDBACK_QUEUE_URL" --type "String" --value "PLACEHOLDER_UPDATE_AFTER_SQS" --region eu-central-1
  ```

- [ ] **Step 2: Verify parameters were stored**

  ```bash
  aws ssm get-parameters-by-path --path "/insightstream/prod/" --region eu-central-1 --query "Parameters[*].Name"
  ```

  Expected: list of 12+ parameter names

---

### Task 5: Create RDS PostgreSQL Instance

> RDS = managed PostgreSQL. AWS handles backups, patches, failover. Lives in private subnet — no internet access.

- [ ] **Step 1: Create DB subnet group** (tells RDS which subnets to use)

  ```bash
  aws rds create-db-subnet-group \
    --db-subnet-group-name insightstream-subnet-group \
    --db-subnet-group-description "InsightStream private subnets" \
    --subnet-ids $PUBLIC_SUBNET_ID $PRIVATE_SUBNET_ID \
    --region eu-central-1
  ```

  Note: RDS subnet group requires at least 2 subnets in different AZs (even for single-AZ). We use our public + private subnets — but RDS will be placed in the private one via the security group.

- [ ] **Step 2: Launch RDS instance via Console**

  AWS Console → RDS → Create database:
  - Creation method: Standard create
  - Engine: PostgreSQL 15
  - Template: **Free tier** (important — auto-selects db.t3.micro, single-AZ, 20GB)
  - DB instance identifier: `insightstream-db`
  - Master username: `insightstream`
  - Master password: [same as DB_PASSWORD in SSM]
  - DB instance class: db.t3.micro (already selected by Free tier)
  - Storage: 20 GB gp2 (already selected)
  - VPC: select `insightstream-vpc`
  - DB subnet group: `insightstream-subnet-group`
  - Public access: **No**
  - VPC security groups: remove default, add `sg-rds`
  - Database name: `insightstream`
  - Backups: 1 day (Free tier includes this)
  - → Create database

  Wait ~5 minutes for status to show "Available".

- [ ] **Step 3: Get RDS endpoint**

  ```bash
  aws rds describe-db-instances \
    --db-instance-identifier insightstream-db \
    --region eu-central-1 \
    --query "DBInstances[0].Endpoint.Address"
  ```

  Copy the endpoint (looks like `insightstream-db.xxxx.eu-central-1.rds.amazonaws.com`) → save to `infra/aws-ids.txt` as `RDS_ENDPOINT=`

- [ ] **Step 4: Update DB_HOST in SSM**

  ```bash
  aws ssm put-parameter \
    --name "/insightstream/prod/DB_HOST" \
    --type "SecureString" \
    --value "[RDS_ENDPOINT from above]" \
    --overwrite \
    --region eu-central-1
  ```

---

### Task 6: Launch EC2 Instance

> EC2 = your virtual server. Amazon Linux 2023 is the recommended OS — like CentOS but maintained by AWS.

- [ ] **Step 1: Create key pair** (for SSH access)

  ```bash
  aws ec2 create-key-pair \
    --key-name insightstream-key \
    --query "KeyMaterial" \
    --output text \
    --region eu-central-1 > ~/.ssh/insightstream-key.pem

  chmod 600 ~/.ssh/insightstream-key.pem
  ```

- [ ] **Step 2: Find latest Amazon Linux 2023 AMI ID**

  ```bash
  aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" \
    --query "sort_by(Images, &CreationDate)[-1].ImageId" \
    --region eu-central-1
  ```

  Copy the AMI ID (looks like `ami-xxxxx`) → save as `AMI_ID=`

- [ ] **Step 3: Create instance profile** (attach IAM role to EC2)

  ```bash
  aws iam create-instance-profile --instance-profile-name InsightStreamEC2Profile
  aws iam add-role-to-instance-profile \
    --instance-profile-name InsightStreamEC2Profile \
    --role-name InsightStreamEC2Role
  ```

- [ ] **Step 4: Launch EC2 instance**

  ```bash
  aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type t2.micro \
    --key-name insightstream-key \
    --subnet-id $PUBLIC_SUBNET_ID \
    --security-group-ids $SG_API_ID \
    --iam-instance-profile Name=InsightStreamEC2Profile \
    --associate-public-ip-address \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=insightstream-api}]' \
    --user-data '#!/bin/bash
dnf update -y
dnf install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user
mkdir -p /home/ec2-user/scripts
mkdir -p /var/log/insightstream
chown ec2-user:ec2-user /home/ec2-user/scripts /var/log/insightstream' \
    --region eu-central-1
  ```

  Copy `InstanceId` → save as `EC2_INSTANCE_ID=i-xxxxx`

- [ ] **Step 5: Wait for EC2 to be running**

  ```bash
  aws ec2 wait instance-running --instance-ids $EC2_INSTANCE_ID --region eu-central-1
  echo "EC2 is running"
  ```

- [ ] **Step 6: Get EC2 public IP**

  ```bash
  aws ec2 describe-instances \
    --instance-ids $EC2_INSTANCE_ID \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --region eu-central-1
  ```

  Save as `EC2_PUBLIC_IP=` in `infra/aws-ids.txt`

- [ ] **Step 7: SSH into EC2 and verify Docker**

  ```bash
  ssh -i ~/.ssh/insightstream-key.pem ec2-user@$EC2_PUBLIC_IP
  ```

  Inside EC2:
  ```bash
  docker --version
  aws --version
  aws sts get-caller-identity
  ```

  Expected: Docker version, AWS CLI version, and your account identity (EC2 uses its IAM role automatically). Exit SSH: `exit`

---

### Task 7: Write EC2 Startup Scripts

> These scripts run on EC2 to fetch secrets from SSM and start the API container. No hardcoded credentials anywhere.

- [ ] **Step 1: Create `scripts/ssm-env.sh`**

  ```bash
  #!/bin/bash
  # Fetch all /insightstream/prod/ parameters from SSM and export as env vars
  eval $(aws ssm get-parameters-by-path \
    --path "/insightstream/prod/" \
    --with-decryption \
    --region eu-central-1 \
    --query 'Parameters[*].[Name,Value]' \
    --output text | \
    awk '{split($1,a,"/"); printf "export %s=%s\n", a[length(a)], $2}')
  ```

- [ ] **Step 2: Create `scripts/docker-run.sh`**

  Replace `[ECR_REGISTRY]` with actual value (you'll get it in Phase 7, Task 20 — for now use placeholder and update later):

  ```bash
  #!/bin/bash
  set -e

  # Load secrets from SSM
  source /home/ec2-user/scripts/ssm-env.sh

  ECR_REGISTRY="[ECR_REGISTRY]"
  ECR_REPO="insightstream-api"
  IMAGE="$ECR_REGISTRY/$ECR_REPO:latest"

  # Pull latest image
  aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
  docker pull $IMAGE

  # Stop old container if running
  docker stop insightstream-api 2>/dev/null || true
  docker rm insightstream-api 2>/dev/null || true

  # Start new container
  docker run -d \
    --name insightstream-api \
    --restart unless-stopped \
    -p 3001:3001 \
    --log-driver=json-file \
    --log-opt max-size=10m \
    -e NODE_ENV=production \
    -e PORT=3001 \
    -e DB_HOST="$DB_HOST" \
    -e DB_PORT="$DB_PORT" \
    -e DB_USERNAME="$DB_USERNAME" \
    -e DB_PASSWORD="$DB_PASSWORD" \
    -e DB_DATABASE="$DB_DATABASE" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e GEMINI_API_KEY="$GEMINI_API_KEY" \
    -e FRONTEND_URL="$FRONTEND_URL" \
    -e AWS_REGION="$AWS_REGION" \
    -e SES_FROM_EMAIL="$SES_FROM_EMAIL" \
    -e SQS_FEEDBACK_QUEUE_URL="$SQS_FEEDBACK_QUEUE_URL" \
    -e INTERNAL_SECRET="$INTERNAL_SECRET" \
    $IMAGE

  echo "API started: $(docker ps --filter name=insightstream-api --format '{{.Status}}')"
  ```

- [ ] **Step 3: Copy scripts to EC2**

  ```bash
  scp -i ~/.ssh/insightstream-key.pem scripts/ssm-env.sh scripts/docker-run.sh ec2-user@$EC2_PUBLIC_IP:/home/ec2-user/scripts/
  ssh -i ~/.ssh/insightstream-key.pem ec2-user@$EC2_PUBLIC_IP "chmod +x /home/ec2-user/scripts/*.sh"
  ```

- [ ] **Step 4: Commit scripts**

  ```bash
  git add scripts/ssm-env.sh scripts/docker-run.sh infra/
  git commit -m "feat(aws): add EC2 SSM fetch and docker-run scripts"
  ```

---

### Task 8: Deploy NestJS API to EC2 Manually (First Time)

> First deploy is manual — later Task 20-22 automates it via CodePipeline.

- [ ] **Step 1: Build Docker image locally**

  ```bash
  docker build -f Dockerfile.api -t insightstream-api:local .
  ```

  Wait for build to complete.

- [ ] **Step 2: Verify image works locally**

  ```bash
  docker run --rm -p 3001:3001 \
    -e NODE_ENV=production \
    -e PORT=3001 \
    -e DB_HOST=localhost \
    insightstream-api:local
  ```

  Expected: NestJS startup logs (will fail to connect to DB, that's OK — we're just checking it starts).
  Stop with Ctrl+C.

- [ ] **Step 3: Save Docker image as tarball and copy to EC2**

  Since ECR isn't set up yet, we'll load the image directly:

  ```bash
  docker save insightstream-api:local | gzip > /tmp/insightstream-api.tar.gz
  scp -i ~/.ssh/insightstream-key.pem /tmp/insightstream-api.tar.gz ec2-user@$EC2_PUBLIC_IP:/home/ec2-user/
  ```

- [ ] **Step 4: Load and run image on EC2**

  ```bash
  ssh -i ~/.ssh/insightstream-key.pem ec2-user@$EC2_PUBLIC_IP
  ```

  Inside EC2:
  ```bash
  # Load image
  docker load < /home/ec2-user/insightstream-api.tar.gz

  # Fetch secrets and run (using local image name for now)
  source /home/ec2-user/scripts/ssm-env.sh
  docker run -d \
    --name insightstream-api \
    --restart unless-stopped \
    -p 3001:3001 \
    -e NODE_ENV=production \
    -e PORT=3001 \
    -e DB_HOST="$DB_HOST" \
    -e DB_PORT="$DB_PORT" \
    -e DB_USERNAME="$DB_USERNAME" \
    -e DB_PASSWORD="$DB_PASSWORD" \
    -e DB_DATABASE="$DB_DATABASE" \
    -e JWT_SECRET="$JWT_SECRET" \
    -e GEMINI_API_KEY="$GEMINI_API_KEY" \
    -e FRONTEND_URL="$FRONTEND_URL" \
    -e AWS_REGION=eu-central-1 \
    -e INTERNAL_SECRET="$INTERNAL_SECRET" \
    insightstream-api:local

  docker logs insightstream-api --tail 30
  ```

  Expected: NestJS startup logs ending with "Application is running on: http://..."
  Exit SSH: `exit`

- [ ] **Step 5: Verify API is reachable from internet**

  ```bash
  curl http://$EC2_PUBLIC_IP:3001/health
  ```

  If you have a `/health` endpoint, expected: `{"status":"ok"}`. If not, any response (even 404) means the API is up.

---

## Phase 3 — S3 + CloudFront + ACM

> **What you're learning:** S3 stores files (objects) in buckets. CloudFront is AWS's CDN — it caches and serves files from edge locations worldwide. ACM provides free SSL certificates.

---

### Task 9: Create S3 Bucket for Widget

- [ ] **Step 1: Create S3 bucket**

  ```bash
  aws s3api create-bucket \
    --bucket insightstream-widget \
    --region eu-central-1 \
    --create-bucket-configuration LocationConstraint=eu-central-1
  ```

- [ ] **Step 2: Block all public access** (CloudFront will be the only way to access files)

  ```bash
  aws s3api put-public-access-block \
    --bucket insightstream-widget \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  ```

- [ ] **Step 3: Build widget and upload to S3**

  ```bash
  pnpm turbo build --filter=widget
  aws s3 cp apps/widget/dist/widget.iife.js s3://insightstream-widget/widget.js \
    --content-type "application/javascript"
  ```

  Expected: `upload: apps/widget/dist/widget.iife.js to s3://insightstream-widget/widget.js`

---

### Task 10: Request ACM SSL Certificate

> ACM certificates are free and auto-renew. CloudFront requires certificates in `us-east-1` region (global CDN requirement, even if your other resources are in eu-central-1).

- [ ] **Step 1: Request certificate** (must be in us-east-1 for CloudFront)

  AWS Console → ACM → **Switch region to us-east-1** → Request certificate
  - Certificate type: Public certificate
  - Domain name: `*.yourdomain.com` (if you have a domain) OR `cdn.yourdomain.com`
  - If you don't have a domain yet: skip ACM for now, CloudFront will use its default `*.cloudfront.net` domain with built-in SSL
  - Validation: DNS validation → Request

- [ ] **Step 2: If using custom domain — add DNS CNAME records**

  ACM shows you CNAME records to add to your DNS. Add them in your domain registrar. Wait 5-30 minutes for status to become "Issued".

  If skipping custom domain: proceed to Task 11, CloudFront gives a free `xxxxx.cloudfront.net` HTTPS URL.

---

### Task 11: Create CloudFront Distribution

- [ ] **Step 1: Create CloudFront Origin Access Control (OAC)**

  AWS Console → CloudFront → Origin Access Control → Create control setting:
  - Name: `insightstream-s3-oac`
  - Origin type: S3
  - Signing behavior: Sign requests
  - → Create

  Copy the OAC ID.

- [ ] **Step 2: Create CloudFront distribution**

  AWS Console → CloudFront → Create distribution:
  - Origin domain: select `insightstream-widget.s3.eu-central-1.amazonaws.com`
  - Origin access: Origin access control settings → select `insightstream-s3-oac`
  - Default cache behavior:
    - Viewer protocol policy: Redirect HTTP to HTTPS
    - Cache policy: CachingOptimized
  - Web Application Firewall: Do not enable (paid)
  - Price class: Use only North America and Europe (cheaper)
  - If you have ACM cert: add it under Alternate domain name + Custom SSL cert
  - → Create distribution

  Wait 5-10 minutes for deployment. Copy the distribution domain (e.g., `d1234abcd.cloudfront.net`) → save as `CDN_URL=`

- [ ] **Step 3: Update S3 bucket policy to allow CloudFront**

  AWS Console shows a popup "Copy policy" — click it and go to S3 → bucket → Permissions → Bucket policy → paste the policy → Save.

  OR via CLI (replace `DISTRIBUTION_ARN` and `ACCOUNT_ID`):

  ```bash
  aws s3api put-bucket-policy --bucket insightstream-widget --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {"Service": "cloudfront.amazonaws.com"},
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::insightstream-widget/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }]
  }'
  ```

- [ ] **Step 4: Verify widget is served via CDN**

  ```bash
  curl https://$CDN_URL/widget.js | head -c 100
  ```

  Expected: first 100 characters of widget JavaScript code.

- [ ] **Step 5: Commit**

  ```bash
  git add scripts/
  git commit -m "feat(aws): phase 3 complete — S3 + CloudFront for widget CDN"
  ```

---

## Phase 4 — AWS Amplify

> **What you're learning:** Amplify = Vercel-like hosting for AWS. Connects to GitHub, builds your app on every push, hosts it globally.

---

### Task 12: Create `amplify.yml` Build Config

- [ ] **Step 1: Create `amplify.yml` in repo root**

  ```yaml
  version: 1
  applications:
    - frontend:
        phases:
          preBuild:
            commands:
              - npm install -g pnpm@9
              - pnpm install --frozen-lockfile
          build:
            commands:
              - pnpm turbo build --filter=web
        artifacts:
          baseDirectory: apps/web/.next
          files:
            - '**/*'
        cache:
          paths:
            - node_modules/**/*
            - apps/web/.next/cache/**/*
      appRoot: .
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add amplify.yml
  git commit -m "feat(aws): add Amplify build config for Next.js monorepo"
  ```

---

### Task 13: Connect GitHub to AWS Amplify

- [ ] **Step 1: Create Amplify app**

  AWS Console → Amplify → Create new app → GitHub → Authorize AWS Amplify
  - Select repository: `insight-stream`
  - Branch: `main`
  - App name: `insightstream-web`
  - Build settings: Amplify will auto-detect `amplify.yml` → confirm it's shown
  - → Next → Save and deploy

- [ ] **Step 2: Add environment variables in Amplify**

  Amplify → App → Environment variables → Manage variables → Add:
  ```
  NEXT_PUBLIC_API_URL = http://[EC2_PUBLIC_IP]:3001
  NEXTAUTH_SECRET = [your secret]
  NEXTAUTH_URL = https://[amplify-generated-domain].amplifyapp.com
  NEXT_PUBLIC_POSTHOG_KEY = [your key if using PostHog]
  ```

  Click Save.

- [ ] **Step 3: Trigger redeploy with env vars**

  Amplify → App → main branch → Redeploy this version (or push any commit).

- [ ] **Step 4: Wait for build and get Amplify URL**

  Build takes 3-7 minutes. When complete, copy the app URL (e.g., `https://main.d1234abcd.amplifyapp.com`) → save as `AMPLIFY_URL=`

- [ ] **Step 5: Update FRONTEND_URL in SSM**

  ```bash
  aws ssm put-parameter \
    --name "/insightstream/prod/FRONTEND_URL" \
    --type "SecureString" \
    --value "[AMPLIFY_URL]" \
    --overwrite \
    --region eu-central-1
  ```

- [ ] **Step 6: Restart API container on EC2 to pick up new FRONTEND_URL**

  ```bash
  ssh -i ~/.ssh/insightstream-key.pem ec2-user@$EC2_PUBLIC_IP \
    "docker restart insightstream-api"
  ```

- [ ] **Step 7: Verify frontend loads and can reach API**

  Open `AMPLIFY_URL` in browser → login page should appear.

---

## Phase 5 — SQS + Lambda + EventBridge

> **What you're learning:** SQS = message queue (async decoupling). Lambda = serverless function (runs on demand, no server). EventBridge = event scheduler and router.

---

### Task 14: Create SQS Queue + Update NestJS to Publish Events

- [ ] **Step 1: Create SQS queue**

  ```bash
  aws sqs create-queue \
    --queue-name insightstream-feedback-events \
    --region eu-central-1
  ```

  Copy `QueueUrl` from output → save as `SQS_FEEDBACK_QUEUE_URL=`

- [ ] **Step 2: Update SQS_FEEDBACK_QUEUE_URL in SSM**

  ```bash
  aws ssm put-parameter \
    --name "/insightstream/prod/SQS_FEEDBACK_QUEUE_URL" \
    --type "String" \
    --value "[SQS_FEEDBACK_QUEUE_URL]" \
    --overwrite \
    --region eu-central-1
  ```

- [ ] **Step 3: Add AWS SDK SQS dependency**

  ```bash
  cd apps/api
  pnpm add @aws-sdk/client-sqs
  cd ../..
  ```

- [ ] **Step 4: Write unit test for SQS publishing in feedback.service.spec.ts**

  Find the existing spec file at `apps/api/src/modules/feedback/feedback.service.spec.ts` (or create if absent):

  ```typescript
  import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

  // Add to existing test suite:
  it('should publish to SQS after creating feedback', async () => {
    const sendSpy = jest.spyOn(SQSClient.prototype, 'send').mockResolvedValue({} as never);
    process.env.SQS_FEEDBACK_QUEUE_URL = 'https://sqs.eu-central-1.amazonaws.com/123/test';
    process.env.AWS_REGION = 'eu-central-1';

    await service.create(mockFeedbackDto, mockProjectId);

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ QueueUrl: process.env.SQS_FEEDBACK_QUEUE_URL }) })
    );
  });
  ```

- [ ] **Step 5: Run test to verify it fails**

  ```bash
  cd apps/api && pnpm test --testPathPattern=feedback.service
  ```

  Expected: FAIL (SQS publish not implemented yet)

- [ ] **Step 6: Update `apps/api/src/modules/feedback/feedback.service.ts`**

  Add SQS publishing after feedback is saved. Add at the top of the file:

  ```typescript
  import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
  ```

  Add as a class field:

  ```typescript
  private readonly sqsClient = new SQSClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });
  ```

  In the `create` method, after `await this.feedbackRepository.save(feedback)` add:

  ```typescript
  if (process.env.SQS_FEEDBACK_QUEUE_URL) {
    await this.sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.SQS_FEEDBACK_QUEUE_URL,
      MessageBody: JSON.stringify({
        feedbackId: feedback.id,
        projectId: feedback.projectId,
        type: feedback.type,
        createdAt: feedback.createdAt,
      }),
    })).catch((err) => console.error('SQS publish failed (non-fatal):', err));
  }
  ```

  The `.catch` makes it non-fatal — SQS failure won't break feedback creation.

- [ ] **Step 7: Run test to verify it passes**

  ```bash
  pnpm test --testPathPattern=feedback.service
  cd ../..
  ```

  Expected: PASS

- [ ] **Step 8: Commit**

  ```bash
  git add apps/api/src/modules/feedback/feedback.service.ts \
            apps/api/src/modules/feedback/feedback.service.spec.ts \
            apps/api/package.json \
            pnpm-lock.yaml
  git commit -m "feat(aws): publish feedback events to SQS on create"
  ```

---

### Task 15: Create Lambda — SQS Feedback Processor

> Lambda function triggered by each SQS message. Currently logs the event — can be extended with webhooks, analytics, Slack notifications, etc.

- [ ] **Step 1: Create `lambda/feedback-processor/index.mjs`**

  ```javascript
  /**
   * Triggered by SQS — processes InsightStream feedback events.
   * SQS batch: up to 10 messages per invocation.
   */
  export const handler = async (event) => {
    console.log(`Processing ${event.Records.length} feedback event(s)`);

    for (const record of event.Records) {
      const body = JSON.parse(record.body);
      console.log('Feedback event:', JSON.stringify({
        feedbackId: body.feedbackId,
        projectId: body.projectId,
        type: body.type,
        receivedAt: new Date().toISOString(),
      }));

      // Extend here: webhooks, Slack, analytics, real-time counters, etc.
    }

    return { batchItemFailures: [] }; // empty = all messages processed successfully
  };
  ```

- [ ] **Step 2: Create Lambda function via Console**

  AWS Console → Lambda → Create function:
  - Author from scratch
  - Function name: `insightstream-feedback-processor`
  - Runtime: Node.js 20.x
  - Architecture: x86_64
  - → Create function

  In the function editor: replace `index.mjs` content with the code above → Deploy.

- [ ] **Step 3: Add SQS trigger to Lambda**

  Lambda → Configuration → Triggers → Add trigger:
  - Source: SQS
  - SQS queue: select `insightstream-feedback-events`
  - Batch size: 10
  - → Add

- [ ] **Step 4: Test the integration**

  Send a test message to SQS:

  ```bash
  aws sqs send-message \
    --queue-url $SQS_FEEDBACK_QUEUE_URL \
    --message-body '{"feedbackId":"test-123","projectId":"proj-456","type":"bug"}' \
    --region eu-central-1
  ```

  AWS Console → Lambda → `insightstream-feedback-processor` → Monitor → View logs in CloudWatch.
  Expected: log entry with `feedbackId: test-123`

---

### Task 16: Create Lambda — Digest Trigger

> Weekly Lambda calls EC2 API to generate digest. Lambda has no DB connection — EC2 handles all business logic.

- [ ] **Step 1: Add internal trigger endpoint to digest controller**

  Open `apps/api/src/modules/digest/digest.controller.ts`. Add at the end of the class:

  ```typescript
  @Post('internal/trigger')
  async internalTrigger(@Headers('x-internal-secret') secret: string) {
    if (!secret || secret !== process.env.INTERNAL_SECRET) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    await this.digestService.generateAndSendDigest();
    return { ok: true, triggeredAt: new Date().toISOString() };
  }
  ```

  Ensure `Post`, `Headers`, `UnauthorizedException` are imported from `@nestjs/common`.

- [ ] **Step 2: Create `lambda/digest-trigger/index.mjs`**

  ```javascript
  /**
   * Triggered by EventBridge Scheduler — calls EC2 API to generate weekly digest.
   * Lambda itself has no DB access — EC2 API handles Gemini + DB.
   */
  export const handler = async () => {
    const apiUrl = process.env.API_URL;
    const secret = process.env.INTERNAL_SECRET;

    console.log(`Triggering digest at ${apiUrl}`);

    const response = await fetch(`${apiUrl}/digest/internal/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
    });

    const text = await response.text();
    console.log(`Digest trigger response: ${response.status} — ${text}`);

    if (!response.ok) {
      throw new Error(`Digest trigger failed: ${response.status} ${text}`);
    }

    return { statusCode: response.status };
  };
  ```

- [ ] **Step 3: Create Lambda function via Console**

  AWS Console → Lambda → Create function:
  - Function name: `insightstream-digest-trigger`
  - Runtime: Node.js 20.x
  - → Create function

  In the editor: replace `index.mjs` content → Deploy.

- [ ] **Step 4: Add environment variables to Lambda**

  Lambda → Configuration → Environment variables → Edit → Add:
  ```
  API_URL = http://[EC2_PUBLIC_IP]:3001
  INTERNAL_SECRET = [same value as in SSM]
  ```
  Save.

- [ ] **Step 5: Test Lambda manually**

  Lambda → Test → Create new test event (empty JSON `{}`) → Test.
  Expected: "Digest trigger response: 200" in logs (or 401 if INTERNAL_SECRET mismatch — fix the env var).

- [ ] **Step 6: Commit**

  ```bash
  git add lambda/ apps/api/src/modules/digest/digest.controller.ts
  git commit -m "feat(aws): add Lambda SQS processor and digest trigger with internal endpoint"
  ```

---

### Task 17: Create EventBridge Scheduler — Weekly Digest

- [ ] **Step 1: Create IAM role for EventBridge to invoke Lambda**

  ```bash
  # Create role
  aws iam create-role \
    --role-name EventBridgeInvokeLambdaRole \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "scheduler.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }'

  # Attach Lambda invoke policy
  aws iam attach-role-policy \
    --role-name EventBridgeInvokeLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaRole
  ```

- [ ] **Step 2: Create the schedule**

  AWS Console → EventBridge → Schedules → Create schedule:
  - Schedule name: `insightstream-weekly-digest`
  - Schedule pattern: Recurring schedule → Cron-based
  - Cron expression: `0 9 ? * MON *` (every Monday at 9:00 AM UTC)
  - Timezone: UTC
  - Flexible time window: Off
  - → Next
  - Target: Lambda → select `insightstream-digest-trigger`
  - Execution role: Use existing → `EventBridgeInvokeLambdaRole`
  - → Next → Create schedule

- [ ] **Step 3: Verify schedule was created**

  AWS Console → EventBridge → Schedules → `insightstream-weekly-digest` → should show next invocation time.

---

## Phase 6 — SES

> **What you're learning:** SES (Simple Email Service) = AWS transactional email. More reliable than Nodemailer, built for scale, monitored via CloudWatch.

---

### Task 18: Set Up SES + Verify Sending Email

- [ ] **Step 1: Verify your sending email address in SES**

  AWS Console → SES → **Verified identities** → Create identity:
  - Identity type: Email address
  - Email: [your email, e.g. noreply@yourdomain.com or your personal Gmail for testing]
  - → Create identity

  Check your inbox for verification email → click the link.

- [ ] **Step 2: If using a domain, verify the domain instead**

  SES → Create identity → Domain → enter domain → SES shows DNS records to add.
  Add TXT + CNAME records in your DNS registrar. Wait for status "Verified".

- [ ] **Step 3: Request SES production access** (sandbox only allows sending to verified addresses)

  SES → Account dashboard → Request production access:
  - Use case: Transactional email for SaaS users
  - Describe your use case: feedback digest emails for B2B users who signed up
  - → Submit

  AWS reviews in 24-48h. For testing, sandbox mode is fine (send to verified email only).

- [ ] **Step 4: Test sending via CLI**

  ```bash
  aws ses send-email \
    --from "[YOUR_VERIFIED_EMAIL]" \
    --destination "ToAddresses=[YOUR_VERIFIED_EMAIL]" \
    --message "Subject={Data=Test from SES,Charset=UTF-8},Body={Html={Data=<h1>Hello from AWS SES</h1>,Charset=UTF-8}}" \
    --region eu-central-1
  ```

  Expected: `{ "MessageId": "..." }` and email arrives in your inbox.

---

### Task 19: Update mail.service.ts to Use SES

- [ ] **Step 1: Add @aws-sdk/client-ses dependency**

  ```bash
  cd apps/api && pnpm add @aws-sdk/client-ses && cd ../..
  ```

- [ ] **Step 2: Write test for SES sending in mail.service.spec.ts**

  Create/update `apps/api/src/modules/mail/mail.service.spec.ts`:

  ```typescript
  import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

  describe('MailService', () => {
    it('should send email via SES', async () => {
      const sendSpy = jest.spyOn(SESClient.prototype, 'send').mockResolvedValue({ MessageId: 'test-id' } as never);
      process.env.SES_FROM_EMAIL = 'noreply@test.com';
      process.env.AWS_REGION = 'eu-central-1';

      await service.sendEmail('user@test.com', 'Test Subject', '<p>Hello</p>');

      expect(sendSpy).toHaveBeenCalledWith(expect.any(SendEmailCommand));
    });
  });
  ```

- [ ] **Step 3: Run test to verify it fails**

  ```bash
  cd apps/api && pnpm test --testPathPattern=mail.service
  ```

  Expected: FAIL

- [ ] **Step 4: Rewrite `apps/api/src/modules/mail/mail.service.ts`**

  Replace the Nodemailer implementation with SES. Keep the same method signatures so callers don't change:

  ```typescript
  import { Injectable, Logger } from '@nestjs/common';
  import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

  @Injectable()
  export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly sesClient = new SESClient({
      region: process.env.AWS_REGION ?? 'eu-central-1',
    });

    async sendEmail(to: string, subject: string, html: string): Promise<void> {
      await this.sesClient.send(new SendEmailCommand({
        Source: process.env.SES_FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
      }));
      this.logger.log(`Email sent to ${to}: ${subject}`);
    }

    // If you have a sendMail(options) signature used elsewhere, add:
    async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
      return this.sendEmail(options.to, options.subject, options.html);
    }
  }
  ```

  Remove Nodemailer imports and any transporter setup. Remove `nodemailer` from `apps/api/package.json` if it's a direct dep.

- [ ] **Step 5: Run test to verify it passes**

  ```bash
  pnpm test --testPathPattern=mail.service && cd ../..
  ```

  Expected: PASS

- [ ] **Step 6: Run full test suite to check for regressions**

  ```bash
  cd apps/api && pnpm test && cd ../..
  ```

  Expected: all tests pass

- [ ] **Step 7: Commit**

  ```bash
  git add apps/api/src/modules/mail/ apps/api/package.json pnpm-lock.yaml
  git commit -m "feat(aws): replace Nodemailer with AWS SES for transactional email"
  ```

---

## Phase 7 — ECR + CodeBuild + CodePipeline

> **What you're learning:** ECR stores Docker images. CodeBuild builds them. CodePipeline orchestrates GitHub → Build → Deploy on every push to main.

---

### Task 20: Create ECR Repository + Push First Image

- [ ] **Step 1: Create ECR repository**

  ```bash
  aws ecr create-repository \
    --repository-name insightstream-api \
    --region eu-central-1
  ```

  Copy `repositoryUri` from output (looks like `123456789012.dkr.ecr.eu-central-1.amazonaws.com/insightstream-api`) → save as `ECR_REGISTRY=123456789012.dkr.ecr.eu-central-1.amazonaws.com` and `ECR_REPO=insightstream-api`

- [ ] **Step 2: Authenticate Docker to ECR**

  ```bash
  aws ecr get-login-password --region eu-central-1 | \
    docker login --username AWS --password-stdin $ECR_REGISTRY
  ```

  Expected: `Login Succeeded`

- [ ] **Step 3: Build, tag, and push image to ECR**

  ```bash
  docker build -f Dockerfile.api -t $ECR_REGISTRY/$ECR_REPO:latest .
  docker push $ECR_REGISTRY/$ECR_REPO:latest
  ```

- [ ] **Step 4: Update `scripts/docker-run.sh` with real ECR_REGISTRY**

  Edit `scripts/docker-run.sh` — replace `[ECR_REGISTRY]` placeholder with actual value.

- [ ] **Step 5: Test pulling and running from ECR on EC2**

  ```bash
  ssh -i ~/.ssh/insightstream-key.pem ec2-user@$EC2_PUBLIC_IP
  ```

  Inside EC2:
  ```bash
  aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
  docker pull $ECR_REGISTRY/insightstream-api:latest
  /home/ec2-user/scripts/docker-run.sh
  docker logs insightstream-api --tail 20
  ```

  Expected: NestJS startup logs. Exit: `exit`

- [ ] **Step 6: Store deploy SSH key in SSM** (CodeBuild will need it)

  ```bash
  aws ssm put-parameter \
    --name "/insightstream/deploy/EC2_DEPLOY_KEY" \
    --type "SecureString" \
    --value "$(cat ~/.ssh/insightstream-key.pem)" \
    --region eu-central-1

  aws ssm put-parameter \
    --name "/insightstream/deploy/EC2_HOST" \
    --type "String" \
    --value "$EC2_PUBLIC_IP" \
    --region eu-central-1
  ```

- [ ] **Step 7: Commit updated scripts**

  ```bash
  git add scripts/docker-run.sh
  git commit -m "feat(aws): update docker-run.sh with ECR registry"
  ```

---

### Task 21: Create `buildspec.yml` + CodeBuild Project

- [ ] **Step 1: Create `buildspec.yml` in repo root**

  ```yaml
  version: 0.2

  env:
    parameter-store:
      EC2_HOST: /insightstream/deploy/EC2_HOST
      DEPLOY_KEY: /insightstream/deploy/EC2_DEPLOY_KEY

  phases:
    pre_build:
      commands:
        - echo Logging in to ECR...
        - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
        - IMAGE_TAG=$CODEBUILD_RESOLVED_SOURCE_VERSION
    build:
      commands:
        - echo Building Docker image...
        - docker build -f Dockerfile.api -t $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG -t $ECR_REGISTRY/$ECR_REPO:latest .
        - docker push $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG
        - docker push $ECR_REGISTRY/$ECR_REPO:latest
    post_build:
      commands:
        - echo Deploying to EC2...
        - echo "$DEPLOY_KEY" > /tmp/deploy_key.pem
        - chmod 600 /tmp/deploy_key.pem
        - ssh -o StrictHostKeyChecking=no -i /tmp/deploy_key.pem ec2-user@$EC2_HOST "/home/ec2-user/scripts/docker-run.sh"
        - echo Deploy complete.
  ```

- [ ] **Step 2: Create IAM role for CodeBuild**

  AWS Console → IAM → Roles → Create role:
  - Trusted entity: AWS service → CodeBuild
  - Policies: `AmazonEC2ContainerRegistryFullAccess`, `AmazonSSMReadOnlyAccess`, `CloudWatchLogsFullAccess`
  - Role name: `InsightStreamCodeBuildRole`

- [ ] **Step 3: Create CodeBuild project**

  AWS Console → CodeBuild → Create build project:
  - Project name: `insightstream-api-build`
  - Source: GitHub → Connect → select your repository → Branch: main
  - Environment:
    - Managed image: Amazon Linux 2023
    - Runtime: Standard
    - Image: latest
    - Privileged: ✓ (required for Docker build)
  - Service role: `InsightStreamCodeBuildRole`
  - Buildspec: Use a buildspec file (auto-detected from repo root)
  - Environment variables:
    ```
    ECR_REGISTRY = [your ECR registry, e.g. 123456789012.dkr.ecr.eu-central-1.amazonaws.com]
    ECR_REPO = insightstream-api
    ```
  - → Create build project

- [ ] **Step 4: Test build manually**

  CodeBuild → `insightstream-api-build` → Start build.
  Watch the build log. Expected:
  - Pre-build: ECR login success
  - Build: Docker build + push
  - Post-build: SSH deploy + container restart

- [ ] **Step 5: Commit buildspec**

  ```bash
  git add buildspec.yml
  git commit -m "feat(aws): add CodeBuild buildspec for Docker build and EC2 deploy"
  ```

---

### Task 22: Create CodePipeline

> CodePipeline = orchestrator. Watches GitHub, triggers CodeBuild automatically on every push to `main`.

- [ ] **Step 1: Create IAM role for CodePipeline**

  AWS Console → IAM → Roles → Create role:
  - Trusted entity: CodePipeline
  - Policies: `AWSCodePipelineFullAccess`, `AWSCodeBuildAdminAccess`
  - Role name: `InsightStreamCodePipelineRole`

- [ ] **Step 2: Create pipeline**

  AWS Console → CodePipeline → Create pipeline:
  - Pipeline name: `insightstream-api`
  - Service role: `InsightStreamCodePipelineRole`
  - → Next
  - Source:
    - Provider: GitHub (Version 2) → Connect to GitHub → authorize
    - Repository: select `insight-stream`
    - Branch: `main`
    - Trigger: Push to branch
  - → Next
  - Build:
    - Provider: CodeBuild
    - Project: `insightstream-api-build`
  - → Next
  - Deploy: **Skip deploy stage** (CodeBuild handles deploy via SSH)
  - → Create pipeline

- [ ] **Step 3: Verify auto-trigger works**

  Push any small change (e.g., add a comment to `buildspec.yml`):

  ```bash
  echo "# updated" >> buildspec.yml
  git add buildspec.yml && git commit -m "test: trigger CodePipeline" && git push
  ```

  AWS Console → CodePipeline → `insightstream-api` → watch pipeline execute automatically.
  Expected: Source → Build both show green checkmarks within ~5 minutes.

---

## Phase 8 — CloudWatch + SNS

> **What you're learning:** CloudWatch = AWS observability (logs, metrics, alarms). SNS = pub/sub notification service. Together they replace Sentry for basic monitoring.

---

### Task 23: Install CloudWatch Agent on EC2

- [ ] **Step 1: Create `infra/cloudwatch-agent-config.json`**

  ```json
  {
    "logs": {
      "logs_collected": {
        "files": {
          "collect_list": [
            {
              "file_path": "/var/lib/docker/containers/**/*-json.log",
              "log_group_name": "/insightstream/api",
              "log_stream_name": "{instance_id}/docker",
              "timezone": "UTC",
              "multi_line_start_pattern": "\\{"
            }
          ]
        }
      }
    },
    "metrics": {
      "namespace": "InsightStream/EC2",
      "metrics_collected": {
        "cpu": {
          "measurement": ["cpu_usage_active"],
          "metrics_collection_interval": 60
        },
        "mem": {
          "measurement": ["mem_used_percent"],
          "metrics_collection_interval": 60
        },
        "disk": {
          "measurement": ["disk_used_percent"],
          "resources": ["/"],
          "metrics_collection_interval": 60
        }
      }
    }
  }
  ```

- [ ] **Step 2: Copy config to EC2 and install CloudWatch agent**

  ```bash
  scp -i ~/.ssh/insightstream-key.pem \
    infra/cloudwatch-agent-config.json \
    ec2-user@$EC2_PUBLIC_IP:/home/ec2-user/

  ssh -i ~/.ssh/insightstream-key.pem ec2-user@$EC2_PUBLIC_IP
  ```

  Inside EC2:
  ```bash
  # Install CloudWatch agent
  sudo dnf install -y amazon-cloudwatch-agent

  # Move config to expected location
  sudo cp /home/ec2-user/cloudwatch-agent-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

  # Start agent
  sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

  # Verify agent is running
  sudo systemctl status amazon-cloudwatch-agent
  ```

  Expected: `Active: active (running)`
  Exit: `exit`

- [ ] **Step 3: Verify logs appear in CloudWatch**

  AWS Console → CloudWatch → Log groups → `/insightstream/api` should appear within 2-3 minutes.
  Click the log group → log stream → you should see Docker JSON logs from the API container.

- [ ] **Step 4: Commit config**

  ```bash
  git add infra/cloudwatch-agent-config.json
  git commit -m "feat(aws): add CloudWatch agent config for EC2 logs and metrics"
  ```

---

### Task 24: Create SNS Topic + CloudWatch Alarms

- [ ] **Step 1: Create SNS topic for alerts**

  ```bash
  aws sns create-topic --name insightstream-alerts --region eu-central-1
  ```

  Copy `TopicArn` → save as `SNS_ALERTS_ARN=`

- [ ] **Step 2: Subscribe your email to the topic**

  ```bash
  aws sns subscribe \
    --topic-arn $SNS_ALERTS_ARN \
    --protocol email \
    --notification-endpoint [YOUR_EMAIL] \
    --region eu-central-1
  ```

  Check email inbox → click "Confirm subscription".

- [ ] **Step 3: Create alarm — EC2 CPU high**

  ```bash
  aws cloudwatch put-metric-alarm \
    --alarm-name "insightstream-ec2-cpu-high" \
    --alarm-description "EC2 CPU above 80% for 5 minutes" \
    --metric-name cpu_usage_active \
    --namespace InsightStream/EC2 \
    --statistic Average \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions $SNS_ALERTS_ARN \
    --region eu-central-1
  ```

- [ ] **Step 4: Create alarm — RDS storage low**

  ```bash
  aws cloudwatch put-metric-alarm \
    --alarm-name "insightstream-rds-storage-low" \
    --alarm-description "RDS free storage below 2GB" \
    --metric-name FreeStorageSpace \
    --namespace AWS/RDS \
    --dimensions Name=DBInstanceIdentifier,Value=insightstream-db \
    --statistic Average \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 2000000000 \
    --comparison-operator LessThanThreshold \
    --alarm-actions $SNS_ALERTS_ARN \
    --region eu-central-1
  ```

- [ ] **Step 5: Create alarm — Lambda digest trigger errors**

  ```bash
  aws cloudwatch put-metric-alarm \
    --alarm-name "insightstream-lambda-digest-errors" \
    --alarm-description "Digest trigger Lambda had errors" \
    --metric-name Errors \
    --namespace AWS/Lambda \
    --dimensions Name=FunctionName,Value=insightstream-digest-trigger \
    --statistic Sum \
    --period 3600 \
    --evaluation-periods 1 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --alarm-actions $SNS_ALERTS_ARN \
    --region eu-central-1
  ```

- [ ] **Step 6: Verify alarms exist**

  ```bash
  aws cloudwatch describe-alarms --region eu-central-1 --query "MetricAlarms[*].AlarmName"
  ```

  Expected: 3 alarm names listed.

---

### Task 25: Create CloudWatch Dashboard

- [ ] **Step 1: Create dashboard via Console**

  AWS Console → CloudWatch → Dashboards → Create dashboard → Name: `InsightStream`:
  - Add widget → Line → Metrics:
    - InsightStream/EC2 → `cpu_usage_active` (EC2 CPU)
    - InsightStream/EC2 → `mem_used_percent` (Memory)
    - AWS/RDS → DBInstanceIdentifier=insightstream-db → `DatabaseConnections`
  - Add widget → Number:
    - AWS/Lambda → FunctionName=insightstream-digest-trigger → `Invocations`
    - AWS/Lambda → FunctionName=insightstream-feedback-processor → `Invocations`
  - Add widget → Alarm status:
    - Select all 3 alarms from Task 24
  - → Save dashboard

- [ ] **Step 2: Final end-to-end verification**

  Run through the complete system:

  ```bash
  # 1. API is up
  curl http://$EC2_PUBLIC_IP:3001/health

  # 2. Widget is served via CDN
  curl https://[CDN_URL]/widget.js | head -c 50

  # 3. SQS receives feedback event (test)
  aws sqs send-message \
    --queue-url $SQS_FEEDBACK_QUEUE_URL \
    --message-body '{"feedbackId":"final-test","projectId":"proj-1","type":"general"}' \
    --region eu-central-1

  # 4. Check Lambda processed it
  # CloudWatch → Log groups → /aws/lambda/insightstream-feedback-processor → latest stream
  ```

  Open Amplify URL in browser → verify full app works end to end.

- [ ] **Step 3: Final commit — update documentation**

  Update `infra/aws-ids.txt` with all final values (still gitignored).

  ```bash
  git add .
  git commit -m "feat(aws): phase 8 complete — CloudWatch monitoring + SNS alerts

  Migration complete: 18 AWS services deployed.
  Railway → EC2, Supabase → RDS, Vercel → Amplify, Nodemailer → SES,
  NestJS Cron → Lambda+EventBridge, GitHub Actions → CodePipeline."
  ```

---

## Migration Complete ✓

**18 AWS services deployed:**

| Service | Replaces | Status |
|---------|---------|--------|
| IAM | Doppler user management | ✓ |
| VPC + Subnets + SG | — | ✓ |
| EC2 t2.micro | Railway | ✓ |
| RDS PostgreSQL | Supabase | ✓ |
| SSM Parameter Store | Doppler | ✓ |
| S3 | — | ✓ |
| CloudFront | — | ✓ |
| ACM | — | ✓ |
| AWS Amplify | Vercel | ✓ |
| SQS | — | ✓ |
| Lambda (2 functions) | NestJS @Cron | ✓ |
| EventBridge Scheduler | — | ✓ |
| SES | Nodemailer | ✓ |
| ECR | — | ✓ |
| CodeBuild | GitHub Actions | ✓ |
| CodePipeline | GitHub Actions | ✓ |
| CloudWatch | Sentry | ✓ |
| SNS | — | ✓ |

**You can now explain in an interview:**
- Why EC2 is in a public subnet and RDS in a private subnet
- What an IAM role is and why EC2 uses one instead of hardcoded keys
- Why Lambda doesn't call RDS directly (no NAT Gateway) and uses HTTP to EC2 instead
- What CloudFront OAC does and why S3 is not publicly accessible
- How CodePipeline connects GitHub to EC2 deployment
