#!/bin/bash
# Manual widget deploy: build → upload to S3 (v1/widget.js) → verify.
#
# Deploy is intentionally manual — see docs/architecture/PLAN.md 🔥 #8 and
# docs/superpowers/specs/2026-07-09-versioned-widget-url-design.md.
#
# The S3 key is major-version-only and mutable: this script always overwrites
# v1/widget.js. A future breaking change ships under a new key (S3_KEY=v2/widget.js)
# so v1 stays frozen for old customer integrations. There is no immutable per-build
# history in S3 — rollback is git-based: check out the last known-good commit and
# re-run this script.
#
# Run from the repo root on a machine with pnpm + AWS creds configured.
#
set -euo pipefail

AWS_REGION="${AWS_REGION:-eu-north-1}"
S3_BUCKET="${S3_BUCKET:-insightstream-widget}"
S3_KEY="${S3_KEY:-v1/widget.js}"
WIDGET_PUBLIC_URL="${WIDGET_PUBLIC_URL:-https://$S3_BUCKET.s3.$AWS_REGION.amazonaws.com/$S3_KEY}"

cd "$(git rev-parse --show-toplevel)"

# --- Preflight ---------------------------------------------------------------
command -v aws  >/dev/null || { echo "❌ aws CLI not found on PATH"; exit 1; }
command -v pnpm >/dev/null || { echo "❌ pnpm not found on PATH"; exit 1; }

echo "==> [1/3] Build apps/widget"
pnpm turbo build --filter=widget

DIST_FILE="apps/widget/dist/widget.iife.js"
[ -f "$DIST_FILE" ] || { echo "❌ $DIST_FILE not found after build"; exit 1; }

echo "==> [2/3] Upload to s3://$S3_BUCKET/$S3_KEY"
aws s3 cp "$DIST_FILE" "s3://$S3_BUCKET/$S3_KEY" \
  --content-type "application/javascript"

echo "==> [3/3] Verify"
code="$(curl -s -o /dev/null -w '%{http_code}' "$WIDGET_PUBLIC_URL")"
if [ "$code" != "200" ]; then
  echo "❌ GET $WIDGET_PUBLIC_URL -> $code (expected 200)"
  exit 1
fi
content_type="$(curl -s -o /dev/null -D - "$WIDGET_PUBLIC_URL" | grep -i '^content-type:' | tr -d '\r')"
echo "   GET $WIDGET_PUBLIC_URL -> 200"
echo "   $content_type"
case "$content_type" in
  *javascript*) echo "✅ Deploy verified: $WIDGET_PUBLIC_URL is live and serving JS." ;;
  *) echo "❌ Unexpected content-type (expected 'javascript' in header): $content_type"; exit 1 ;;
esac
