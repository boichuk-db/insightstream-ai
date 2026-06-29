# Engineering Workflow: Memory System + Verification Mandate

**Date:** 2026-06-29  
**Status:** Approved for implementation

## Problem

Three recurring issues in the current workflow:

1. **No learning between sessions** — corrections made in one chat are forgotten in the next. The same mistakes repeat.
2. **No verification enforcement** — code is presented as "done" without running build/lint/typecheck. Bugs and type errors are discovered by the user, not caught proactively.
3. **No context management** — large tasks grow into long chats, degrading reasoning quality (dumb zone).

## Solution

Variant B: Memory System + CLAUDE.md rule additions.

## Architecture

### 1. Memory System

**Location:** `C:\Users\Denys\.claude\projects\d--Work-insight-stream\memory\`

**Files:**

| File | Type | Purpose |
|------|------|---------|
| `MEMORY.md` | Index | Auto-loaded each session. One line per memory. Max 200 lines. |
| `feedback_*.md` | Feedback | Rules derived from corrections — what to do / not do |
| `project_*.md` | Project | Active decisions, constraints, goals |
| `user_*.md` | User | Preferences and collaboration style |

**Constraints:**
- Each memory file: one fact, 5-7 lines max
- `MEMORY.md` entry: one line, under 150 characters
- Memory files loaded on-demand (not auto-loaded) — no token overhead beyond the index
- Do not store: code patterns, file paths, git history, anything in CLAUDE.md already

**Initial population:** Seed with known facts from current project context and conversation history.

### 2. CLAUDE.md Rule Additions

Three new rules added to project `CLAUDE.md`:

**Learning Loop:**
> After any correction from the user: determine if it's a reusable project rule. If yes — immediately update `CLAUDE.md` or write a memory file. The same mistake must not require correction twice.

**Verification Mandate (highest priority):**
> Never write "done", "ready", or "OK" without running `pnpm typecheck && pnpm lint` and showing the actual output. If tests exist for the affected module — run `pnpm test` too. Confidence is not evidence. If commands cannot run — state explicitly why.

**Context Management:**
> For tasks with 3+ steps — break into milestones at the start. When the conversation becomes long (many code edits, many turns) — summarize completed work and suggest starting a new chat with the summary as context.

## Data Flow

```
Correction happens
      ↓
Is it a reusable rule?
  YES → update CLAUDE.md or write memory file immediately
  NO  → fix and move on

Code is written
      ↓
Run: pnpm typecheck && pnpm lint [&& pnpm test]
      ↓
Show actual output → only then say "done"

Task has 3+ steps?
      ↓
Break into milestones first → execute → summarize if chat grows long
```

## What Does NOT Change

- Skills system (brainstorming, TDD, verification, code-review) — already in place
- Dev commands in CLAUDE.md — already documented
- Deployment workflow — unchanged
- Global CLAUDE.md communication style — unchanged

## Success Criteria

- User no longer needs to correct the same mistake twice
- "Done" claims are always backed by actual command output
- Large tasks are broken into milestones upfront without being asked

## Out of Scope

- Hooks / automated post-edit verification (Variant C — add later if needed)
- Eval datasets for quality scoring (not applicable to a code project at this stage)
- Structured brief template (user manages how they start conversations)
