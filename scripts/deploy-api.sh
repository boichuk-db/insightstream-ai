#!/bin/bash
# Manual API deploy: build → push to ECR → restart the container on EC2 → verify.
#
# Deploy is intentionally manual (no CI image build yet — see docs/architecture/PLAN.md
# "Automated CD" trigger). Run from the repo root on a machine with Docker + AWS creds.
#
# Config is overridable via env; the defaults below are the live prod values (eu-north-1).
# The one value you MUST supply if it isn't at the default path is the SSH key:
#
#   EC2_KEY=~/.ssh/your-key.pem ./scripts/deploy-api.sh
#
set -euo pipefail

AWS_REGION="${AWS_REGION:-eu-north-1}"
ECR_REGISTRY="${ECR_REGISTRY:-000946352819.dkr.ecr.eu-north-1.amazonaws.com}"
ECR_REPO="${ECR_REPO:-insightstream-api}"
IMAGE="$ECR_REGISTRY/$ECR_REPO"
EC2_HOST="${EC2_HOST:-16.171.47.132}"
EC2_USER="${EC2_USER:-ec2-user}"
EC2_KEY="${EC2_KEY:-$HOME/.ssh/insightstream-key.pem}"

cd "$(git rev-parse --show-toplevel)"
GIT_SHA="$(git rev-parse --short HEAD)$(git diff --quiet || echo -dirty)"

# --- Preflight ---------------------------------------------------------------
command -v docker >/dev/null || { echo "❌ docker not found on PATH"; exit 1; }
command -v aws    >/dev/null || { echo "❌ aws CLI not found on PATH"; exit 1; }
[ -f "$EC2_KEY" ] || { echo "❌ SSH key not found at '$EC2_KEY' — set EC2_KEY=/path/to/key.pem"; exit 1; }
if ! git diff --quiet; then
  echo "⚠️  Working tree has uncommitted changes — the image will include them (tag: $GIT_SHA)."
fi

echo "==> [1/5] Build $IMAGE:$GIT_SHA (+ :latest) from apps/api/Dockerfile"
docker build --platform linux/amd64 -f apps/api/Dockerfile \
  -t "$IMAGE:$GIT_SHA" -t "$IMAGE:latest" .

echo "==> [2/5] ECR login + push"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
docker push "$IMAGE:$GIT_SHA"
docker push "$IMAGE:latest"

echo "==> [3/5] Sync deploy scripts to EC2 (picks up docker-run.sh without INTERNAL_SECRET)"
scp -i "$EC2_KEY" -o StrictHostKeyChecking=accept-new \
  scripts/ssm-env.sh scripts/docker-run.sh "$EC2_USER@$EC2_HOST:/home/ec2-user/scripts/"

echo "==> [4/5] Pull :latest and restart the container on EC2"
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
  "chmod +x /home/ec2-user/scripts/*.sh && /home/ec2-user/scripts/docker-run.sh"

echo "==> [5/5] Verify"
ok=""
for i in $(seq 1 12); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://$EC2_HOST:3001/")" = "200" ]; then
    ok=1; break
  fi
  sleep 3
done
[ -n "$ok" ] || { echo "❌ API did not return 200 on GET / after restart"; exit 1; }
echo "   GET /                       -> 200 (up)"

code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://$EC2_HOST:3001/digest/internal-trigger")"
echo "   POST /digest/internal-trigger -> $code (expect 404 — endpoint removed)"
if [ "$code" = "404" ]; then
  echo "✅ Deploy verified: digest internal-trigger endpoint is gone."
else
  echo "❌ Expected 404 (got $code) — the running image may still be the old one. Check the deploy."
  exit 1
fi
