---
id: packages
title: packages/*
sidebar_position: 6
---

# packages/\*

## `@insightstream/database`

TypeORM entities + PostgreSQL config, imported by `apps/api`. `packages/database/src/entities/` holds 11 real entities — `User`, `Feedback`, `Project`, `AuditLog`, `Team`, `TeamMember`, `Invitation`, `Comment`, `ActivityEvent`, `UserProjectLastSeen`, `StripeEvent` (see the [ER Diagram](../architecture/er-diagram)). `packages/database/src/data-source.ts` is a separate TypeORM data source from `apps/api/src/data-source.ts` — **both** register the same 11 entities by hand, so a new entity needs adding to **both** files or migrations silently miss it.

:::caution
`apps/api` loads `@insightstream/database` from its build output (`main: dist/index.js` in `packages/database/package.json`) — after editing an entity, rebuild the package (`pnpm --filter @insightstream/database build`) or `apps/api`'s dev `synchronize` will run against stale entity definitions.
:::

## `@insightstream/shared-types`

Plain TypeScript interfaces shared between `apps/api` and `apps/web` — `feedback.types.ts`, `project.types.ts`, `user.types.ts`, re-exported through `index.ts`. No runtime code, compile-time only.

## `config`

Placeholder package for shared ESLint/TS config — `package.json` declares only a name, version, and an empty `scripts` block, with no `eslint-config`/`tsconfig` files and no dependents (`@insightstream/config` doesn't appear as an import anywhere in the monorepo). Every app (`api`, `web`, `widget`, `landing`, `docs`) rolls its own `eslint.config.*`/`tsconfig.json` today.
