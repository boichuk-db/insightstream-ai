# Engineering Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three enforcement rules to CLAUDE.md and seed the project memory system with initial facts to eliminate repeated mistakes and unverified "done" claims.

**Architecture:** Two independent changes — (1) CLAUDE.md gains an `## Engineering Rules` section with three explicit rules, (2) the memory system at `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\` gets seeded with initial facts about user preferences and project state. No code changes. No tests. Verification = reading the files and confirming content is correct.

**Tech Stack:** Markdown files, CLAUDE.md, project memory system.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `d:\Work\insight-stream\CLAUDE.md` |
| Already created | `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\MEMORY.md` |
| Already created | `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\feedback_no_guessing.md` |
| Create | `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\user_collab_style.md` |
| Create | `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\project_billing_shipped.md` |
| Update | `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\MEMORY.md` |

---

### Task 1: Add Engineering Rules to CLAUDE.md

**Files:**
- Modify: `d:\Work\insight-stream\CLAUDE.md`

- [ ] **Step 1: Append `## Engineering Rules` section to the end of CLAUDE.md**

Add this exact block after the `## Services & Secrets` section:

```markdown
## Engineering Rules

**Learning Loop:**
After any correction from the user: determine if it represents a reusable project rule. If yes — immediately update `CLAUDE.md` or write a memory file at `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\`. The same mistake must not require correction twice.

**Verification Mandate:**
Never write "done", "ready", or "OK" without running `pnpm typecheck && pnpm lint` and showing actual output. If tests exist for the affected module — run `pnpm test` too. Confidence is not evidence. If commands cannot run — state explicitly why.

**Context Management:**
For tasks with 3+ steps — break into milestones at the start of the conversation. When the conversation becomes long (many code edits, many turns) — summarize completed work and suggest starting a new chat with that summary as context.
```

- [ ] **Step 2: Verify the file looks correct**

Read `d:\Work\insight-stream\CLAUDE.md` and confirm:
- `## Engineering Rules` section is present at the end
- All three rules (Learning Loop, Verification Mandate, Context Management) are present
- No other sections were accidentally modified

---

### Task 2: Seed memory system with initial facts

**Files:**
- Create: `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\user_collab_style.md`
- Create: `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\project_billing_shipped.md`
- Update: `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\MEMORY.md`

Note: `MEMORY.md` and `feedback_no_guessing.md` were already created in the brainstorming session.

- [ ] **Step 1: Create user collaboration style memory**

Write `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\user_collab_style.md`:

```markdown
---
name: user-collab-style
description: User prefers concise direct responses; no invented answers; Ukrainian/English
metadata:
  type: user
---

User communicates in Ukrainian and English (switches freely) — always respond in the same language they wrote in.
Prefers direct, concise responses. No filler, no praise.
If something is unclear — ask one targeted question instead of guessing or assuming.
Experienced developer; doesn't need stack basics explained.
```

- [ ] **Step 2: Create project billing state memory**

Write `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\project_billing_shipped.md`:

```markdown
---
name: project-billing-shipped
description: Stripe billing (checkout, subscriptions, 14-day trial) shipped 2026-06-29
metadata:
  type: project
---

Stripe billing shipped 2026-06-29: checkout, subscriptions, 14-day trial, billing dashboard.

**Why:** B2B SaaS monetization went live — billing/subscription code is in production.

**How to apply:** Treat billing-related code (Stripe webhooks, plan limits, trial logic) carefully — it's live and affects paying users.
```

- [ ] **Step 3: Update MEMORY.md index with new entries**

Rewrite `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\MEMORY.md`:

```markdown
# Memory Index

- [No guessing — ask instead](feedback_no_guessing.md) — never invent facts/conventions; ask a targeted question when uncertain
- [User collab style](user_collab_style.md) — concise/direct, Ukrainian/English, no guessing, experienced dev
- [Billing shipped](project_billing_shipped.md) — Stripe billing live since 2026-06-29; treat billing code carefully
```

- [ ] **Step 4: Verify memory files**

Read each file and confirm content is present and frontmatter is valid (name, description, metadata.type).

---

### Task 3: Commit

**Files:** all modified/created files above

- [ ] **Step 1: Stage and commit CLAUDE.md**

```bash
git add docs/superpowers/specs/2026-06-29-engineering-workflow-design.md
git add CLAUDE.md
git commit -m "docs: add Engineering Rules to CLAUDE.md (learning loop, verification mandate, context management)"
```

- [ ] **Step 2: Verify commit**

Run `git log --oneline -3` and confirm the commit appears.

Note: memory files at `C:\Users\Denys\.claude\` are outside the git repo — no need to commit them.
