---
id: er-diagram
title: Database ER Diagram
sidebar_position: 7
---

# Database ER Diagram

![Database ER Diagram](/img/diagrams/er-diagram.svg)

Eleven real entities, verified against `packages/database/src/entities` (2026-07-05, count re-confirmed 2026-07-12): `User`, `Team`, `TeamMember`, `Project`, `Feedback`, `Comment`, `Invitation`, `ActivityEvent`, `AuditLog`, `StripeEvent`, and `UserProjectLastSeen`. `User` owns `Team`s and `Project`s; `Team` is the billing tenant — plan, plan status, and Stripe fields (`stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `trialEndsAt`, `lastStripeEventAt`) live on `Team`, not `User` or `Project`, since the 2026-07-05 Team-as-Tenant migration. `TeamMember` joins `User` and `Team` with a role enum; `Project` cascades from `Team` and holds the widget-facing `apiKey`; `Feedback` belongs to a `Project` and carries AI-analysis fields directly as columns (no separate analysis table); `Comment` belongs to `Feedback` and is authored by a `User`; `Invitation` belongs to a `Team`. Several relations are soft FKs (a UUID column with no `@ManyToOne` in code, shown dashed) — `ActivityEvent`, `AuditLog`, `StripeEvent`, and `UserProjectLastSeen` all use this pattern. A footnote documents entities assumed but not present as separate tables: Widget (really a `Project`'s public endpoint), FeedbackAnalysis (columns on `Feedback`), Subscription (columns on `Team`), and API Key (plain columns on both `User` and `Project`).
