#!/bin/bash
set -e

source /home/ec2-user/scripts/ssm-env.sh

ECR_REGISTRY="000946352819.dkr.ecr.eu-north-1.amazonaws.com"
ECR_REPO="insightstream-api"
IMAGE="$ECR_REGISTRY/$ECR_REPO:latest"

aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
docker pull $IMAGE

docker network create insightstream-net 2>/dev/null || true

if ! docker ps --filter name=redis --format '{{.Names}}' | grep -q redis; then
  docker run -d \
    --name redis \
    --network insightstream-net \
    --restart unless-stopped \
    redis:7-alpine
fi

docker stop insightstream-api 2>/dev/null || true
docker rm insightstream-api 2>/dev/null || true

docker run -d \
  --name insightstream-api \
  --network insightstream-net \
  --restart unless-stopped \
  -p 3001:3001 \
  --log-driver=json-file \
  --log-opt max-size=10m \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e REDIS_URL=redis://redis:6379 \
  -e DB_SSL=true \
  -e DB_HOST="$DB_HOST" \
  -e DB_PORT="$DB_PORT" \
  -e DB_USERNAME="$DB_USERNAME" \
  -e DB_PASSWORD="$DB_PASSWORD" \
  -e DB_DATABASE="$DB_DATABASE" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e FRONTEND_URL="$FRONTEND_URL" \
  -e GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID" \
  -e GITHUB_CLIENT_SECRET="$GITHUB_CLIENT_SECRET" \
  -e GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  -e GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  -e AWS_REGION="$AWS_REGION" \
  -e SES_FROM_EMAIL="$SES_FROM_EMAIL" \
  -e API_GLOBAL_LIMIT="$API_GLOBAL_LIMIT" \
  -e AUTH_LOGIN_LIMIT="$AUTH_LOGIN_LIMIT" \
  -e AUTH_REGISTER_LIMIT="$AUTH_REGISTER_LIMIT" \
  -e WIDGET_IP_LIMIT="$WIDGET_IP_LIMIT" \
  -e WIDGET_PROJECT_LIMIT="$WIDGET_PROJECT_LIMIT" \
  -e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  -e STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  -e STRIPE_PRO_MONTHLY_PRICE_ID="$STRIPE_PRO_MONTHLY_PRICE_ID" \
  -e STRIPE_PRO_ANNUAL_PRICE_ID="$STRIPE_PRO_ANNUAL_PRICE_ID" \
  -e STRIPE_BUSINESS_MONTHLY_PRICE_ID="$STRIPE_BUSINESS_MONTHLY_PRICE_ID" \
  -e STRIPE_BUSINESS_ANNUAL_PRICE_ID="$STRIPE_BUSINESS_ANNUAL_PRICE_ID" \
  $IMAGE

echo "API started: $(docker ps --filter name=insightstream-api --format '{{.Status}}')"
