---
id: auth-flow
title: Authentication Flow
sidebar_position: 4
---

# Authentication Flow

![Authentication Flow](/img/diagrams/auth-flow.svg)

Two entry paths converge on one JWT: the password path (`POST /auth/login` → `validateUser()` bcrypt compare) and the OAuth path (`GET /auth/google|github` → provider redirect → callback → `oauthLogin()`, which finds by provider ID, auto-links by email, or creates a new user). Both call `login(user)`, which signs a JWT with payload `{sub, email, role}` (`JWT_SECRET`, 7-day expiry) — the password path returns `{ access_token, user }` as JSON, the OAuth path redirects to `FRONTEND_URL/auth/oauth/callback?token=...`. Protected requests flow through `JwtAuthGuard` → `JwtStrategy.validate()`, which looks up the user Redis-cache-first (TTL 30s, falling back to PostgreSQL on a miss and warming the cache) before attaching `req.user`. There is no refresh token and no server-side logout endpoint — logout is just the client deleting the token locally, and a token can't be force-revoked before its 7-day expiry.
