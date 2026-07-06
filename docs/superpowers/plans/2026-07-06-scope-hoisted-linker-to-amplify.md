# Scope Hoisted Linker to Amplify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the GitHub Actions CI regression (every run failing on "Run database migrations" since commit `6102c0a`) by scoping pnpm's `node-linker=hoisted` setting to Amplify's build container only, instead of applying it repo-wide via a committed root `.npmrc`.

**Architecture:** Delete the repo-root `.npmrc` (restores pnpm's default isolated linker for local dev and GitHub Actions). Inject the hoisted setting only inside Amplify's own ephemeral build container, via one `echo` line in `amplify.yml`'s `preBuild` phase, before `pnpm install` runs there.

**Tech Stack:** pnpm workspaces, GitHub Actions, AWS Amplify (`amplify.yml` buildspec).

Spec: `docs/superpowers/specs/2026-07-06-scope-hoisted-linker-to-amplify-design.md`

---

## Task 1: Delete the repo-wide hoisted linker setting and scope it to Amplify

**Files:**
- Delete: `.npmrc`
- Modify: `amplify.yml:5-8`

- [ ] **Step 1: Delete the root `.npmrc`**

Run:
```bash
rm .npmrc
```

This file currently contains only `node-linker=hoisted`. Deleting it restores pnpm's default ("isolated") linker for every environment that reads the committed repo config — local dev machines and GitHub Actions.

- [ ] **Step 2: Verify pnpm falls back to the isolated linker locally**

Run:
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

Expected: install completes with no errors. Then confirm the isolated (symlinked) layout is back:

```bash
ls -la apps/api/node_modules/typeorm
```

Expected: this is a symlink (the `l` permission bit, e.g. `lrwxrwxrwx ... apps/api/node_modules/typeorm -> /path/to/.pnpm/typeorm@.../node_modules/typeorm`), not a real directory. This confirms the hoisted setting is gone and pnpm is back to its default per-package symlink structure.

- [ ] **Step 3: Rebuild the shared database package and confirm the migration script's target file now resolves**

```bash
pnpm --filter @insightstream/database build
ls apps/api/node_modules/typeorm/cli-ts-node-commonjs.js
```

Expected: the `ls` succeeds (file exists) — this is the exact file the CI failure (`Cannot find module './cli-ts-node-commonjs.js'`) couldn't find under the hoisted layout.

- [ ] **Step 4: Run the API test suite to confirm no regressions from the reinstall**

```bash
pnpm --filter api test
```

Expected: `Test Suites: 16 passed, 16 total`, `Tests: 109 passed, 109 total` (same counts as before this change — this step doesn't test the linker itself, it just confirms the reinstall didn't break anything else).

- [ ] **Step 5: Scope the hoisted setting into Amplify's own build container**

Open `amplify.yml`. It currently reads:

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
            - npx turbo build --filter=web
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - ../../node_modules/**/*
          - .next/cache/**/*
    appRoot: apps/web
```

Change the `preBuild.commands` list from:

```yaml
        preBuild:
          commands:
            - npm install -g pnpm@9
            - pnpm install --frozen-lockfile
```

to:

```yaml
        preBuild:
          commands:
            - npm install -g pnpm@9
            - echo "node-linker=hoisted" >> .npmrc
            - pnpm install --frozen-lockfile
```

Leave every other line in `amplify.yml` unchanged.

- [ ] **Step 6: Commit**

```bash
git add .npmrc amplify.yml
git commit -m "fix(infra): scope hoisted node-linker to Amplify's build only"
```

(Note: `git add .npmrc` stages the deletion — `git status` will show `deleted: .npmrc` before this commit.)

---

## Task 2: Push and confirm both CI and Amplify are green

**Files:** None (verification-only task, no further file changes).

- [ ] **Step 1: Push the commit**

```bash
git push
```

- [ ] **Step 2: Watch the new GitHub Actions run and confirm it passes**

```bash
gh run list --limit 3
```

Find the run triggered by the commit from Task 1 (matching its commit message). Then:

```bash
gh run view <run-id>
```

Expected: all three jobs (`Lint, Typecheck, Build`, `Backend Tests`, `E2E Tests`) show a checkmark, including the `Run database migrations` step inside `E2E Tests` that was previously failing. If `gh run view` still shows it running, wait and re-run the command — do not report success until the run has actually completed with a pass.

- [ ] **Step 3: Confirm Amplify's own build still succeeds**

This push also triggers Amplify's auto-build on `main` (per PLAN.md 🔥 #11, Amplify is connected to the GitHub repo with branch auto-build). Check via the AWS CLI (adjust the app id if it has changed — it was `d4bl0rp7zigqy` as of 2026-07-06 per `docs/architecture/PLAN.md`):

```bash
aws amplify list-jobs --app-id d4bl0rp7zigqy --branch-name main --max-results 1
```

Expected: the most recent job's `status` is `SUCCEED` (it may show `RUNNING` or `PENDING` immediately after the push — if so, wait and re-run the command rather than reporting success prematurely). This confirms the `preBuild`-scoped `echo "node-linker=hoisted" >> .npmrc` step is doing its job inside Amplify's container.

- [ ] **Step 4: Update `docs/architecture/PLAN.md`**

Find the Changelog section (near the bottom of `docs/architecture/PLAN.md`) and add a new topmost bullet, dated with today's date (check the current date rather than assuming):

```
- **YYYY-MM-DD** — Fixed a CI regression from the same-day Amplify `.npmrc` change (🔥 #11): the repo-wide `node-linker=hoisted` setting broke `apps/api`'s `migration:run` script (hardcoded `node_modules/typeorm/cli-ts-node-commonjs.js` path assumes pnpm's default isolated linker). Deleted the committed root `.npmrc`; the hoisted setting now lives only in `amplify.yml`'s `preBuild` phase (`echo "node-linker=hoisted" >> .npmrc` before `pnpm install`), scoped to Amplify's own ephemeral build container. GitHub Actions and local dev are back on pnpm's default linker. Design: `docs/superpowers/specs/2026-07-06-scope-hoisted-linker-to-amplify-design.md`.
```

Replace `YYYY-MM-DD` with the actual current date (check with `date` or equivalent — do not assume it matches an earlier date already in the file).

Commit:

```bash
git add docs/architecture/PLAN.md
git commit -m "docs: record the hoisted-linker CI regression fix in PLAN.md"
git push
```

---

## Self-Review Checklist (for whoever executes this plan)

- [ ] `.npmrc` is deleted (not just emptied) at the repo root.
- [ ] `amplify.yml`'s only change is the one added `echo` line in `preBuild.commands` — nothing else in the file was touched.
- [ ] Local `pnpm --filter api test` passes with the same 109/109 count as before this change.
- [ ] The GitHub Actions run triggered by this work's push is actually observed to complete (not just started) with all three jobs green.
- [ ] Amplify's own next build is actually observed to complete (not just started) with `SUCCEED` status.
- [ ] `docs/architecture/PLAN.md` Changelog has a new entry with the real current date, not a guessed one.
