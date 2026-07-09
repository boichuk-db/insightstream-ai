# Versioned widget URL — Design

> Date: 2026-07-09
> Roadmap item: `docs/architecture/PLAN.md` 🔥 #8 (URL-versioning portion only)

## Problem

`apps/widget` builds to `apps/widget/dist/widget.iife.js` (~380 KB IIFE bundle). Today it is
deployed by a single manual, undocumented-in-code command:

```bash
aws s3 cp apps/widget/dist/widget.iife.js s3://insightstream-widget/widget.js \
  --content-type "application/javascript"
```

documented only inside a historical migration plan
(`docs/superpowers/plans/2026-06-24-aws-migration.md`), with no script and no CI step. The S3
key `widget.js` is a fixed, mutable key: every deploy overwrites it in place. Every customer's
embed snippet points at this one URL
(`https://insightstream-widget.s3.eu-north-1.amazonaws.com/widget.js`, sourced from
`NEXT_PUBLIC_WIDGET_URL`). A breaking change to the widget instantly breaks every embedded
customer site simultaneously, with no rollback path beyond re-running the same manual command
against an old git checkout.

CloudFront is still blocked by an AWS account verification gate (`CreateDistribution` →
`AccessDenied`, confirmed 2026-07-05), so the widget is served directly from S3 with no CDN in
front of it — out of scope for this change.

## Goal

Give the widget URL a compatibility contract without adding process (deploy stays manual, by
explicit choice — see Non-Goals).

## Design

### Versioning scheme

S3 key moves from `widget.js` to `v1/widget.js`. The version is **major-only and mutable**:

- Non-breaking releases keep overwriting `v1/widget.js` — existing customer snippets never need
  to change.
- A future breaking change ships as `v2/widget.js`; `v1/widget.js` stays frozen at its last
  compatible build so old integrations keep working until customers are migrated or `v1` is
  formally sunset.
- No immutable per-build/per-commit copies are kept in S3. Rollback is: check out the last known
  good git ref, rebuild, redeploy over `v1/widget.js`. This is a deliberate simplicity/safety
  trade-off (see Non-Goals) — acceptable because the widget's own release cadence is low and
  there is no traffic-visible history to preserve yet.

### `scripts/deploy-widget.sh` (new)

Mirrors the existing `scripts/deploy-api.sh` conventions: `set -euo pipefail`, env-overridable
config with prod defaults, numbered `==> [n/N]` steps, preflight tool checks, a verify step at
the end that fails the script (non-zero exit) if verification doesn't pass.

```bash
#!/bin/bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-eu-north-1}"
S3_BUCKET="${S3_BUCKET:-insightstream-widget}"
S3_KEY="${S3_KEY:-v1/widget.js}"
WIDGET_PUBLIC_URL="${WIDGET_PUBLIC_URL:-https://$S3_BUCKET.s3.$AWS_REGION.amazonaws.com/$S3_KEY}"

cd "$(git rev-parse --show-toplevel)"

# --- Preflight ---
command -v aws >/dev/null || { echo "❌ aws CLI not found on PATH"; exit 1; }
command -v pnpm >/dev/null || { echo "❌ pnpm not found on PATH"; exit 1; }

# [1/3] Build
pnpm turbo build --filter=widget

# [2/3] Upload
aws s3 cp apps/widget/dist/widget.iife.js "s3://$S3_BUCKET/$S3_KEY" \
  --content-type "application/javascript"

# [3/3] Verify — HTTP 200 + correct content-type on the public URL
```

Config is overridable via env vars (`S3_BUCKET`, `S3_KEY`, `AWS_REGION`) the same way
`deploy-api.sh` exposes `EC2_HOST`/`EC2_KEY`/etc., so a future `v2` deploy is
`S3_KEY=v2/widget.js ./scripts/deploy-widget.sh` with no script edit needed.

### Supporting file updates

- **`infra/aws-ids.txt`** (gitignored, local-only) — `WIDGET_DIRECT_S3_URL` updated to the
  `v1/widget.js` path, for consistency with the new deploy target. This file is not committed;
  the change is applied locally as part of this work but won't appear in the PR diff.
- **`docs/architecture/system-architecture.drawio`** — the S3 bucket node's label
  (`insightstream-widget\nwidget.js, public HTTPS`) updated to reflect the versioned key, per
  this repo's "diagram must match code" rule.
- **`docs/architecture/PLAN.md`** — 🔥 #8 updated to reflect the URL-versioning portion done;
  the bundle-weight/Preact-rewrite portion of #8 stays open as a separate future item. Date and
  Changelog updated per the file's own update rule.

## Data flow

No runtime data flow changes. The customer-facing embed snippet already resolves its script URL
from the `NEXT_PUBLIC_WIDGET_URL` build-time env var
(`apps/web/src/components/settings/EmbedTab.tsx`,
`apps/web/src/components/dashboard/WidgetGeneratorModal.tsx`) — neither file needs a code
change. Only the *value* of that env var (in Amplify/Vercel, outside this repo) needs to move to
the new `v1/widget.js` URL after this change ships and a deploy has happened.

## Testing / Verification

This is an ops script + doc change, not application logic — no unit tests apply.

- `bash -n scripts/deploy-widget.sh` — syntax check.
- The script's own verify step (curl the public URL, assert `200` + correct `Content-Type`) is
  the functional check, but it requires real AWS credentials and a live upload — run manually by
  the user, not part of this session's automated verification.

## Non-Goals (explicit scope cuts, decided during brainstorming)

- **No CI/CD automation.** Deploy stays a manual, human-run script — matches the existing
  `deploy-api.sh` pattern and the "hours" effort budget in PLAN.md #8. Automating widget deploy
  is a separate future item if/when deploy frequency increases.
- **No immutable per-build S3 copies.** Only the mutable `v1/widget.js` key exists. Rollback is
  git-based (rebuild from a prior commit), not S3-based.
- **No code changes in `apps/web`.** The two snippet-generator components already read the URL
  from an env var; only the env var's value changes (external system, post-deploy manual step).
- **No CDN/CloudFront work.** Still blocked by the AWS verification gate; unrelated to this
  change.
- **Pre-existing stale docs left untouched.** `README.md`, `apps/widget/README.md`, and
  `DEPLOYMENT.md` describe an even older pre-AWS-migration deploy mechanism
  (Railway/`@nestjs/serve-static` or copying into `apps/web/public/`). This is pre-existing tech
  debt unrelated to the current S3 deploy path and out of scope here.
