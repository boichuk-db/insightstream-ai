---
id: reg-onboarding
title: Registration & Onboarding Flow
sidebar_position: 8
---

# Registration & Onboarding Flow

![Registration and Onboarding Flow](/img/diagrams/reg-onboarding.svg)

Two registration paths, one shared team-creation step. The password path — driven from `apps/landing`'s CTAs into `apps/web`'s `/auth/register` — runs through `AuthService.register()`: `POST /auth/register` (public, no guard) → `isEmailAllowed()` invite-only check (403 if blocked) → duplicate check by email (409 if exists) → `bcrypt.hash(password, 10)` → `usersService.create()` (`INSERT INTO users`) → `teamsService.ensurePersonalTeam(userId)` (`INSERT INTO teams` with `plan: free`, `INSERT INTO team_members` with `role: owner`) → `login(user)` signing a JWT (`{sub, email, role}`, 7-day expiry). The OAuth path (`GET /auth/google|github` → provider callback → find-by-provider-id / auto-link-by-email / create-if-new) calls the same idempotent `ensurePersonalTeam()`, so no OAuth user ends up teamless. Registration writes exactly 3 rows: one in `users`, one in `teams` (name "Personal", plan free), one in `team_members` (role owner) — there is no email verification step, so a valid JWT is returned immediately. The Quiz's `?plan=` query param is a UI pre-selection only and is not applied server-side during registration.
