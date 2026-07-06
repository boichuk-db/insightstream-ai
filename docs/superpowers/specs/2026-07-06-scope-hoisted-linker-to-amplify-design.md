# Scope the hoisted pnpm linker to Amplify only

> Design spec. Fixes a CI regression introduced by commit `6102c0a` ("fix(infra): hoist node_modules for Amplify Next.js SSR bundling").

## Problem

The root `.npmrc` (`node-linker=hoisted`) applies to every `pnpm install` — local dev, GitHub Actions CI, and Amplify — even though it was only needed to fix Amplify's SSR runtime-bundling step for monorepos (documented in `docs/architecture/PLAN.md` 🔥 #11).

Since that commit landed (2026-07-06, run `28790555056`), every GitHub Actions run has failed on the E2E job's "Run database migrations" step:

```
Error: Cannot find module './cli-ts-node-commonjs.js'
```

Root cause: `apps/api/package.json`'s `typeorm` script invokes `ts-node ... node_modules/typeorm/cli-ts-node-commonjs.js` — a path that assumes pnpm's default ("isolated") linker, which always symlinks a package's direct dependencies into that package's own `node_modules/` folder. Under `node-linker=hoisted`, pnpm flattens dependencies toward the workspace root instead, so `apps/api/node_modules/typeorm` is no longer guaranteed to exist at that exact path, and ts-node's script-mode path resolution (`path.resolve(cwd, 'node_modules/typeorm/cli-ts-node-commonjs.js')`) is a literal filesystem join, not a Node-style upward `node_modules` search — so it fails outright.

Confirms as CI-wide, not code-specific: the Lint/Typecheck/Build job's own `pnpm build` (Next.js/Turbo) has passed on every run since `6102c0a`, including with the hoisted linker active — only the migration step's hardcoded path breaks. This means the hoisted layout is not required for the build itself, only for Amplify's separate post-build SSR packaging step.

## Goal

Restore the previously-green CI (local dev, GitHub Actions) without touching Amplify's already-verified, already-deployed fix.

## Design

1. **`.npmrc`** (repo root): remove `node-linker=hoisted`. This restores pnpm's default isolated linker for every environment that reads the committed repo config — local dev machines and GitHub Actions.
2. **`amplify.yml`**, `preBuild` phase: write the hoisted setting into Amplify's own ephemeral build container only, before its `pnpm install --frozen-lockfile`:
   ```yaml
   preBuild:
     commands:
       - npm install -g pnpm@9
       - echo "node-linker=hoisted" >> .npmrc
       - pnpm install --frozen-lockfile
   ```
   This appends to (or creates) `.npmrc` inside Amplify's cloned checkout at build time — never committed, never affecting any other environment's install.

No application code, migration script, or test changes. This is a two-file infra-config change.

## Why this is the right fix, not just a different way to paper over it

The hoisted requirement is real but narrowly scoped: Amplify's SSR runtime-bundling step for monorepos doesn't survive pnpm's symlinked `node_modules` (documented, already verified working in production per PLAN #11). Nothing else in the repo depends on hoisted layout — grepped for `node-linker`, `vercel.json`; found only the one `.npmrc` line. Scoping the setting to where it's actually required, instead of applying it repo-wide, removes the regression at its source instead of adapting the migration tooling to tolerate two different linker layouts.

## Testing / Verification

- No automated test can cover "GitHub Actions is green" from inside this session. Verification is:
  1. Locally: after removing `.npmrc`'s hoisted line, confirm `apps/api/node_modules/typeorm` is a symlink again (`ls -la`), and `pnpm --filter api test` still passes (109 tests, no regressions — the test suite doesn't exercise the `migration:run` script, so this mainly confirms nothing else broke).
  2. Push and check the next GitHub Actions run (`gh run list` / `gh run view`) — the E2E job's "Run database migrations" step should now succeed.
  3. Amplify's own next auto-build (triggered by the same push, since it tracks `main`) should still succeed, confirming the `preBuild`-scoped hoisting still does its job. If desired, this can also be checked via the Amplify console/CLI, but is not required to close this fix — Amplify build success is observable from its own next run same as GitHub Actions.

## Files touched

- `.npmrc` — delete the file entirely (its only content was the `node-linker=hoisted` line; an empty `.npmrc` serves no purpose).
- `amplify.yml` — add one `echo` line to `preBuild.commands`, before `pnpm install --frozen-lockfile`.
