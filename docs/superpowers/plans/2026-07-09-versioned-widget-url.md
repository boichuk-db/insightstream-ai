# Versioned Widget URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the deployed widget bundle from a mutable, unversioned S3 key (`widget.js`) to a versioned one (`v1/widget.js`), with a repeatable deploy script, so a future breaking change doesn't instantly break every embedded customer site.

**Architecture:** No application code changes. Add `scripts/deploy-widget.sh` (build → upload to the new S3 key → verify), point the existing S3 bucket at `v1/widget.js` instead of `widget.js`, and update the two docs that describe this infra (`system-architecture.drawio`, `PLAN.md`). `apps/web`'s snippet generators already read the URL from `NEXT_PUBLIC_WIDGET_URL` at build time, so they need no code change — only the env var's *value* changes, in Amplify/Vercel, after this plan ships.

**Tech Stack:** Bash, AWS CLI (`s3 cp`), pnpm/Turbo (`pnpm turbo build --filter=widget`).

**Spec:** `docs/superpowers/specs/2026-07-09-versioned-widget-url-design.md`

---

### Task 1: Add `scripts/deploy-widget.sh`

**Files:**
- Create: `scripts/deploy-widget.sh`

Mirrors the existing `scripts/deploy-api.sh` conventions in this repo: `set -euo pipefail`,
env-overridable config with prod defaults baked in, preflight tool checks, numbered
`==> [n/N]` step echoes, and a verify step at the end that exits non-zero on failure.

- [ ] **Step 1: Write the script**

```bash
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
```

- [ ] **Step 2: Verify script syntax**

Run: `bash -n scripts/deploy-widget.sh`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/deploy-widget.sh
git commit -m "$(cat <<'EOF'
feat: add scripts/deploy-widget.sh for versioned widget deploys

Uploads apps/widget/dist/widget.iife.js to s3://insightstream-widget/v1/widget.js
(mutable, major-version-only key) instead of the previously undocumented-in-code
manual `aws s3 cp` command, mirroring deploy-api.sh's conventions.
EOF
)"
```

---

### Task 2: Update the architecture diagram

**Files:**
- Modify: `docs/architecture/system-architecture.drawio:310`

The S3 bucket node's label still reads the old unversioned key. This repo's convention
(documented in `CLAUDE.md`) is that any change altering infra must keep this diagram in sync
in the same PR.

- [ ] **Step 1: Update the S3 node label**

Find this line (line 310):

```xml
<mxCell id="s3" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" value="S3 bucket&#xa;insightstream-widget&#xa;widget.js, public HTTPS" vertex="1">
```

Replace `widget.js, public HTTPS` with `v1/widget.js, public HTTPS` so the full line reads:

```xml
<mxCell id="s3" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" value="S3 bucket&#xa;insightstream-widget&#xa;v1/widget.js, public HTTPS" vertex="1">
```

- [ ] **Step 2: Verify the edit**

Run: `grep -n "v1/widget.js" docs/architecture/system-architecture.drawio`
Expected: one match, the line edited above. Also run
`grep -n 'value="S3 bucket' docs/architecture/system-architecture.drawio` and confirm the
printed line no longer contains the bare `widget.js, public HTTPS` (unversioned) text.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/system-architecture.drawio
git commit -m "$(cat <<'EOF'
docs: update widget S3 node to v1/widget.js in architecture diagram

Keeps the diagram in sync with the versioned deploy key introduced in
scripts/deploy-widget.sh.
EOF
)"
```

---

### Task 3: Update `docs/architecture/PLAN.md`

**Files:**
- Modify: `docs/architecture/PLAN.md:96-99` (🔥 #8 section)
- Modify: `docs/architecture/PLAN.md` Changelog section (top of the list, currently starting at line 347)

- [ ] **Step 1: Replace the 🔥 #8 section**

Find (current lines 96-99):

```markdown
### 8. Widget: versioned URL now, weight later
**Problem:** `widget.iife.js` is a 380 KB React bundle served from an unversioned S3 URL — any breaking change instantly breaks every customer site with no rollback; the weight hurts customers' page scores (the widget *is* the product).
**Action:** publish to `/v1/widget.js` immediately (compat + rollback story). Next widget cycle: Preact or vanilla TS, target under 30 KB gzipped.
**Effort:** hours now + a future cycle. **Type:** product surface.
```

Replace with:

```markdown
### 8. Widget: versioned URL now, weight later
**Problem:** `widget.iife.js` is a 380 KB React bundle served from an unversioned S3 URL — any breaking change instantly breaks every customer site with no rollback; the weight hurts customers' page scores (the widget *is* the product).
**URL versioning — done (2026-07-09):** S3 key moved from the mutable `widget.js` to the mutable `v1/widget.js` (major-version-only: a future breaking change ships under a new key, e.g. `v2/widget.js`, while `v1` stays frozen for old integrations). New `scripts/deploy-widget.sh` (build → upload → verify, mirrors `deploy-api.sh`'s conventions) replaces the previously script-less manual `aws s3 cp` command that only lived inside a historical migration plan doc. Rollback is git-based (check out an old commit, re-run the script) — no immutable per-build S3 history, a deliberate simplicity trade-off. **Manual step still required:** production `NEXT_PUBLIC_WIDGET_URL` (Amplify/Vercel) still points at the old key and must be updated by hand, plus a real `./scripts/deploy-widget.sh` run — this plan is repo-side only. Design: `docs/superpowers/specs/2026-07-09-versioned-widget-url-design.md`.
**Still open — weight:** next widget cycle should target Preact or vanilla TS, under 30 KB gzipped.
**Effort:** hours now (✔ done) + a future cycle (open). **Type:** product surface.
```

- [ ] **Step 2: Add a Changelog entry**

Find the first line of the Changelog section:

```markdown
- **2026-07-09** — 🔥 #9 done: deleted the SQS → Lambda feedback-processor stub.
```

Insert a new bullet immediately above it (so it becomes the new first Changelog entry):

```markdown
- **2026-07-09** — 🔥 #8 (URL-versioning portion) done: widget deploy target moved from the mutable, script-less `s3://insightstream-widget/widget.js` to `s3://insightstream-widget/v1/widget.js`. New `scripts/deploy-widget.sh` (build + upload + verify) replaces the manual `aws s3 cp` command previously documented only inside a historical AWS-migration plan file. `system-architecture.drawio`'s S3 node label updated to match. Bundle-weight/Preact-rewrite portion of #8 stays open, tracked separately. Design: `docs/superpowers/specs/2026-07-09-versioned-widget-url-design.md`. **Not done in this pass:** the production `NEXT_PUBLIC_WIDGET_URL` env var in Amplify/Vercel still points at the old key — needs a manual console update and a real deploy run before the new URL is actually serving customer traffic.
```

- [ ] **Step 3: Verify**

Run: `grep -n "URL-versioning portion" docs/architecture/PLAN.md`
Expected: two matches — one in the 🔥 #8 section, one in the new Changelog entry.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/PLAN.md
git commit -m "$(cat <<'EOF'
docs(plan): mark widget URL-versioning portion of #8 done

Bundle-weight/Preact rewrite stays open as a separate future item.
EOF
)"
```

---

### Task 4: Update the local (gitignored) infra reference

**Files:**
- Modify: `infra/aws-ids.txt:25` (local-only, gitignored — not part of any commit)

- [ ] **Step 1: Update the recorded widget URL**

Find (line 25):

```
WIDGET_DIRECT_S3_URL=https://insightstream-widget.s3.eu-north-1.amazonaws.com/widget.js
```

Replace with:

```
WIDGET_DIRECT_S3_URL=https://insightstream-widget.s3.eu-north-1.amazonaws.com/v1/widget.js
```

- [ ] **Step 2: Verify**

Run: `grep -n "WIDGET_DIRECT_S3_URL" infra/aws-ids.txt`
Expected: `WIDGET_DIRECT_S3_URL=https://insightstream-widget.s3.eu-north-1.amazonaws.com/v1/widget.js`

No commit for this task — `infra/aws-ids.txt` is gitignored by design (contains
account-specific resource IDs); confirm with `git status --porcelain infra/aws-ids.txt`
that it prints nothing (ignored files don't show up in plain `git status`).

---

## Post-Plan Manual Steps (not part of this plan's automated work)

These require AWS/Amplify/Vercel credentials this session doesn't have — call them out to the
user rather than attempting them:

1. Run `./scripts/deploy-widget.sh` for real (needs AWS creds) to actually publish
   `v1/widget.js`.
2. Update `NEXT_PUBLIC_WIDGET_URL` in the Amplify console (and Vercel, during the parallel-run
   window — see PLAN.md ✔ #11) to
   `https://insightstream-widget.s3.eu-north-1.amazonaws.com/v1/widget.js`, then redeploy
   `apps/web` so the new value is baked into the build (Next.js `NEXT_PUBLIC_*` vars are
   build-time, not runtime — see the existing project memory on this).
3. Confirm the old `s3://insightstream-widget/widget.js` object can be deleted once no traffic
   hits it (optional cleanup, not required for this change to be safe — the old key keeps
   working until deleted).

---

## Self-Review Notes

- **Spec coverage:** deploy script (Task 1) ✅, infra file update (Task 4) ✅, diagram update
  (Task 2) ✅, PLAN.md status + changelog (Task 3) ✅, no `apps/web` code changes ✅ (spec
  explicitly says none needed), no CI/CD ✅ (spec explicitly excludes it).
- **Placeholder scan:** none found — every step has literal file contents/diffs, not
  descriptions.
- **Type/name consistency:** `S3_KEY=v1/widget.js`, `S3_BUCKET=insightstream-widget`,
  `WIDGET_PUBLIC_URL` are used consistently across Task 1's script and referenced identically
  in Task 3/4's doc text.
