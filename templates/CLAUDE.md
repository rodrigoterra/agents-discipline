# <Project Name> — CLAUDE.md

> The team's shared rule book for Claude Code. Keep this file under 200 lines.
> Personal overrides → `CLAUDE.local.md` (gitignored).
> Path-scoped rules → `.claude/rules/<scope>.md` (loaded on glob match).

## Project context
- **Stack:** <language / framework / runtime>
- **Package manager:** <pnpm | npm | yarn | uv | cargo | …>
- **Entry points:** <e.g. apps/web, apps/api>
- **Monorepo map:** see `INDEX.md`
- **Active specs:** see `specs/`

## Workflow

1. **Spec first.** For anything non-trivial, write or update `specs/<feature>.md` before touching code.
2. **Tests are the contract.** New behavior ships with a test that would have failed before the change.
3. **Surgical changes.** Touch only what the task requires. No drive-by refactors.
4. **Adversarial review.** Significant changes get an OpenAI Codex pass via `AGENTS.md` before merge.

## Conventions
- **Branches:** `<author>/<short-slug>`
- **Commits:** imperative, present tense. Explain the *why* in the body.
- **PR title:** <70 chars. Detail goes in the body.
- **Never** push to `main`. Never `--force` push to a shared branch.

## Tooling
- Run tests: `<command>`
- Run typecheck: `<command>`
- Run lint: `<command>`
- Run dev server: `<command>`

## What lives where
- `specs/` — one markdown per feature; requirements, design, tasks, acceptance criteria.
- `tests/` — see `INDEX.md` for the test layout.
- `.claude/rules/` — path-scoped rules. Open the ones that match your edits.
- `.claude/hooks/` — deterministic guardrails (pre-push typecheck+tests, MCP gating).
- `.claude/output-styles/` — response presets.
- `.claude/settings.json` — pre-approved command allowlist.

## Hard rules
- Never commit secrets. `.env*` is gitignored — keep it that way.
- Never weaken security/auth code without an explicit, written request.
- Never silently change a public API. Bump the version and write a migration note.

## Out of scope for this file
Long lists, framework tutorials, or path-specific lint rules — put those in `.claude/rules/`.


# Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
- All API endpoints must have tests
- add docstrings when suitable on code to explain changes or code blocks

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
