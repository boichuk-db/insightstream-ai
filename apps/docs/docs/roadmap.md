---
id: roadmap
title: Roadmap
sidebar_position: 5
---

# Roadmap

The living roadmap — current priorities, status, and the reasoning behind each — lives in one place: [`docs/architecture/PLAN.md`](https://github.com/boichuk-db/insightstream-ai/blob/main/docs/architecture/PLAN.md) on GitHub. It is not duplicated here; PLAN.md is updated in the same PR as any architecture-relevant change, so a copy here would drift immediately.

At a glance, `PLAN.md` uses this status legend:

| Symbol | Meaning |
|---|---|
| ✔ | Done — implemented and verified in code |
| 🔥 | Implement Soon — high ROI at the current stage |
| 🟡 | Future — adopt only when its named trigger fires |
| 🎓 | Learning experiment — intentionally non-optimal tech, kept for its learning value |
| 🏭 | Production recommendation — what a revenue-stage product would do |
| ⛔ | Retired — recommendation from an earlier review, dropped with reason |

Project constraints baked into every roadmap decision: infra cost as close to zero as possible, hands-on learning is a first-class goal (EC2/BullMQ/Socket.io/the AWS migration itself are deliberate choices, not gaps), and no enterprise complexity before it earns its keep.
