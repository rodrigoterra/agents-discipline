---
name: agents-discipline
description: Agents Discipline & Good Project Management for Claude Code. Use when starting a new project, retrofitting an existing repo, or whenever the user mentions CLAUDE.md, AGENTS.md, specs/, INDEX.md, hooks, output-styles, permission allowlists, "spec first", or asks for an OpenAI Codex adversarial review of Claude's work. Bootstraps the "quiet files" that keep agents honest and wires a Claude ↔ Codex adversarial loop.
license: MIT
---

# Agents Discipline

The skill that installs **good project management** for any Claude Code project — the quiet files nobody is posting about, plus an **AGENTS.md** so OpenAI Codex can adversarially review what Claude shipped.

**Tradeoff:** Adds ~15 files of structure. On a 3-line script, skip it. On anything you'll touch more than once, the payoff is huge: less re-explaining, fewer permission prompts, deterministic guardrails, and a second pair of (adversarial) eyes.

---

## The Discipline (what to install and why)

### 1. `CLAUDE.md` — the team rule book
The shared, committed contract. Keep it **under 200 lines**. Put cross-cutting rules here (tone, commit style, "never push to main", etc.). Path-specific rules go in `.claude/rules/` instead.

### 2. `CLAUDE.local.md` — personal overrides (gitignored)
Your voice, your tool preferences ("always run with pnpm"), your shortcuts. Never committed. Don't pollute the team file.

### 3. `AGENTS.md` — the Codex adversarial brief (**this is the differentiator**)
A parallel rule book read by **OpenAI Codex**. Same project context as `CLAUDE.md`, but framed for an **adversarial reviewer**:
- "Assume Claude was over-confident. Find what's missing."
- "Reproduce the bug Claude claims is fixed. Then break it again."
- "Hunt for missing edge cases, dead code, hidden state, and TODOs."
- "Iterate: file a PR comment with a counter-example, not a vibe."

Codex reads `AGENTS.md` the same way Claude reads `CLAUDE.md`. Running the two agents against each other catches what either misses alone.

### 4. `INDEX.md` — the live monorepo map
Every package, entry point, responsibility, and inter-module relationship. Stops Claude from blind grep-ing. Stops you from typing "where does X live?" five times a day.

### 5. `specs/<feature>.md` — spec-first
One spec per feature: requirements, design decisions, tasks, acceptance criteria. The contract that keeps agents honest and lets you version the feature's evolution.

### 6. `.claude/rules/` — path-scoped rules (glob-loaded)
API rules don't bleed into frontend; frontend rules don't bleed into backend. Keeps `CLAUDE.md` lean.

### 7. `.claude/output-styles/` — response presets
e.g. `writing.md` — kills the "be shorter" prompt forever.

### 8. `.claude/hooks/` — deterministic guardrails
- `pre-push.sh` — typecheck + tests before every push.
- `on-mcp-call.sh` — react when an MCP tool fires (log, gate, redact).

### 9. `.claude/settings.json` + `.claude/settings.local.json` — permission allowlist
Pre-approve the ~30 commands you actually use (git, pnpm, docker, …). End the torture of approving the same command every time. `settings.local.json` is personal + gitignored.

### 10. `tests/<file>.test.ts` — the one file you can't skip
Well-written tests are what let you move fast with confidence. Without them, every refactor is Russian roulette.

---

## How to use this skill

When invoked, ask the user which mode to run:

1. **Bootstrap a new project** → install the full structure from `${CLAUDE_PLUGIN_ROOT}/templates/`.
2. **Retrofit an existing project** → diff what's missing, add only what's absent, never overwrite.
3. **Create a new spec** → scaffold `specs/<feature>.md` from `${CLAUDE_PLUGIN_ROOT}/templates/specs/SPEC-TEMPLATE.md`.
4. **Trigger a Codex adversarial review** → produce/refresh `AGENTS.md` for the current branch's diff and explain how to run Codex against it.

The plugin ships matching slash commands:
- `/agents-init` — full bootstrap
- `/agents-spec <feature>` — new spec
- `/agents-review` — refresh `AGENTS.md` for the current diff and brief Codex

### Bootstrap rules
- **Never overwrite** an existing `CLAUDE.md`, `AGENTS.md`, or `INDEX.md`. Append a clearly-marked `<!-- agents-discipline -->` section instead, or write the template to `*.proposed.md` and ask.
- Add `CLAUDE.local.md` and `.claude/settings.local.json` to `.gitignore` if not already ignored.
- Make `.claude/hooks/*.sh` executable (`chmod +x`).
- Keep `CLAUDE.md` under 200 lines. If it would exceed, move the overflow into `.claude/rules/<scope>.md`.

### Retrofit rules
- Detect existing structure first. Report what's present, what's missing, what's stale.
- Propose a diff. Apply only after confirmation.
- If `CLAUDE.md` exists but lacks an `AGENTS.md` counterpart, generate `AGENTS.md` by translating Claude-facing rules into adversarial-reviewer framing.

### Spec discipline
A spec lives in `specs/<feature>.md` and contains:
- **Why** — problem and motivation
- **Requirements** — what must be true
- **Design** — decisions and tradeoffs
- **Tasks** — atomic, checkable
- **Acceptance criteria** — verifiable, ideally as failing tests first

Adopt "spec first": Claude reads the spec, you stop re-explaining, evolutions are versioned in git.

### Adversarial review loop
1. Claude implements against `specs/<feature>.md`, respecting `CLAUDE.md`.
2. Codex is run against the same diff with `AGENTS.md` loaded. Codex's job is to **break it**: reproduce bugs, find missing tests, surface assumptions Claude buried.
3. Codex files findings as PR comments or a `REVIEW.md`.
4. Claude triages: fix, push back with evidence, or escalate to user.
5. Loop until both agents converge (or the user calls it).

This is **not** "two agents agree" — it's "one agent attacks, the other defends, the user adjudicates".

---

## Anti-patterns to refuse

- **Putting everything in `CLAUDE.md`** → move path-scoped stuff to `.claude/rules/`.
- **Committing `CLAUDE.local.md` or `.claude/settings.local.json`** → must be gitignored.
- **Skipping the spec** for anything non-trivial → no spec, no implementation; write the spec first.
- **Letting `AGENTS.md` echo `CLAUDE.md` verbatim** → it must read adversarially or it adds no signal.
- **`pre-push.sh` that runs nothing** → if you have no typecheck or tests, the hook is theater. Either wire it up or delete it.

---

## Templates

All file templates live under `${CLAUDE_PLUGIN_ROOT}/templates/` (the plugin's
install directory — `${CLAUDE_PLUGIN_ROOT}` resolves to the absolute path at
runtime). Always read/copy templates from that path, not a bare `templates/`,
because the working directory at invocation is the target project, not the plugin.

```
${CLAUDE_PLUGIN_ROOT}/templates/
├── CLAUDE.md
├── CLAUDE.local.md
├── AGENTS.md
├── INDEX.md
├── specs/SPEC-TEMPLATE.md
├── tests/.gitkeep
└── .claude/
    ├── settings.json
    ├── settings.local.json
    ├── hooks/pre-push.sh
    ├── hooks/on-mcp-call.sh
    ├── output-styles/writing.md
    └── rules/{api,frontend}.md
```

Copy from `${CLAUDE_PLUGIN_ROOT}/templates/`. Adapt to the target project. Don't add structure the project doesn't earn.
