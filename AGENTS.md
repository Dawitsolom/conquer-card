# Conquer Card — AI Agent Roles & Collaboration Guide

This file defines how each AI tool contributes to the project.
All agents must read this before starting any work session.

---

## Agent Roles

### Claude Code (Primary Implementation Engineer)
**Scope:** Everything that touches the codebase directly.
- Read and write files across all packages
- Run terminal commands (npm, prisma, git, tests)
- Debug errors and fix broken code
- Implement features end-to-end
- Enforce architecture rules (see CLAUDE.md)
- Review and validate work from other agents before committing

**Always do before writing code:**
1. Read CLAUDE.md
2. Read docs/conquer_tech_spec_v1.2.md for the relevant section
3. Read the existing files in the area you are changing
4. Report what you see before writing anything

**Never do:**
- Reimplement game logic in mobile or server (engine is source of truth)
- Send opponent hand data to clients
- Trust client-side timing for turn timer
- Commit directly to main or develop (always use feature branches)

---

### GitHub Copilot (Inline Autocomplete Assistant)
**Scope:** Passive autocomplete only — triggered as the developer types.
- Complete repetitive patterns (route handlers, test cases, component props)
- Suggest imports and type annotations
- Fill in boilerplate that matches surrounding code patterns

**Limitations:**
- Does not read the full project — only sees the current open file
- Cannot run commands or edit multiple files
- Do not rely on it for architecture or business logic decisions
- Always review its suggestions against CLAUDE.md rules before accepting

---

### Codex / ChatGPT (Planning & Prompt Engineer)
**Scope:** Upstream planning before Claude Code executes.
- Generate structured execution prompts for Claude Code
- Break large features into ordered steps
- Suggest test cases and acceptance criteria
- Review deliverable summaries from Claude Code

**How to use:**
1. Describe the feature or problem to Codex
2. Codex generates a structured prompt
3. Add any missing rules from CLAUDE.md to the prompt
4. Hand the prompt to Claude Code for execution
5. Bring Claude Code's deliverable summary back to Codex for review if needed

**Never use Codex to:**
- Write code directly into the repo without Claude Code review
- Override architecture decisions in CLAUDE.md
- Generate game logic (engine is source of truth)

---

### Claude Chat (Architect & Decision Maker)
**Scope:** High-level decisions, document updates, reviews.
- Architecture decisions that affect multiple phases
- Updating project documents (rules, GDD, tech spec, UX brief)
- Reviewing code when something looks architecturally wrong
- Explaining concepts and debugging complex problems
- Any decision that cannot be resolved by reading the existing docs

---

## Collaboration Workflow

```
1. PLAN    — Codex generates execution prompt
               ↓
2. ENRICH  — Add missing rules from CLAUDE.md to the prompt
               ↓
3. EXECUTE — Claude Code implements against real files
               ↓
4. REVIEW  — Check deliverables against acceptance criteria
               ↓
5. MERGE   — Claude Code commits to feature branch, opens PR to develop
```

---

## Current Project Status

| Phase | Status |
|---|---|
| Phase 1 — Game Engine | COMPLETE — 100 tests passing |
| Phase 2 — Server | COMPLETE — running on Railway |
| Phase 3 — Mobile App | IN PROGRESS |
| Phase 4 — QA & Launch | NOT STARTED |

## Active Branch
`feature/mobile-phase3` — branched from `develop`

---

## Git Rules (All Agents Must Follow)

- `main` — production only, never commit directly
- `develop` — integration branch, merge via PR only
- `feature/*` — all work happens here
- `hotfix/*` — urgent fixes from main only
- Commit messages: `feat(scope): description` or `fix(scope): description`
- Keep commits small and focused on one concern

---

## File Ownership by Agent

| Area | Primary Agent |
|---|---|
| `packages/engine/**` | Claude Code only — no other agent touches engine logic |
| `packages/server/**` | Claude Code — Codex can plan, Claude Code executes |
| `packages/mobile/store/**` | Claude Code — Codex can plan |
| `packages/mobile/screens/**` | Claude Code — Copilot assists inline |
| `packages/mobile/components/**` | Claude Code — Copilot assists inline |
| `docs/**` | Claude Chat only — updated here, copied to repo |
| `CLAUDE.md` | Claude Chat only |
| `AGENTS.md` | Claude Chat only |

---

## Non-Negotiable Rules (Every Agent)

1. Engine is the source of truth — never reimplement game rules anywhere else
2. Server is authoritative — mobile only renders state and sends intents
3. Opponent hands are never sent to clients — only handCount
4. Turn timer is server-side — client only shows countdown UI
5. All coin operations are atomic PostgreSQL transactions
6. No commits to main or develop directly
7. Read before writing — always audit existing code first
8. One concern per commit — small focused changes only

---

## Key Documents (Read Before Working)

| Document | Location | What it covers |
|---|---|---|
| Project context | `CLAUDE.md` | Full project overview, stack, rules |
| Game rules | `docs/conquer_rules_v1.2.docx` | Every game rule — canonical reference |
| Tech spec | `docs/conquer_tech_spec_v1.2.md` | Types, endpoints, schema, build order |
| Game design | `docs/conquer_gdd_v1.2.docx` | Screens, flows, game states |
| UI/UX brief | `docs/conquer_ux_brief_v1.2.docx` | Visual design, interactions, animations |
| QA checklist | `docs/conquer_qa_v1.2.docx` | Everything to test before launch |

---

*Last updated: Phase 3 start*
*Maintained by: Claude Chat*
