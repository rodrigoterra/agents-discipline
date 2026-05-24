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
