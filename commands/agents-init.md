---
description: Bootstrap Agents Discipline structure (CLAUDE.md, AGENTS.md, INDEX.md, specs/, .claude/) in the current project.
---

You are bootstrapping the **Agents Discipline** structure into the current repository.

## Steps

1. **Survey** — `ls -la` the repo root. Detect existing `CLAUDE.md`, `AGENTS.md`, `INDEX.md`, `.claude/`, `specs/`, `tests/`, `.gitignore`. Report what's present and what's missing in one short table.
2. **Confirm** — ask the user: "Bootstrap full structure, retrofit only what's missing, or dry-run?" Default: retrofit.
3. **Copy templates** from this plugin's `templates/` directory into the target repo. Never overwrite existing files — if a file exists, write the template to `<name>.proposed.md` instead and tell the user.
4. **Customize**:
   - Fill the project name, primary language/framework, and package manager into `CLAUDE.md`, `AGENTS.md`, and `INDEX.md`.
   - Detect package manager from lockfiles (`pnpm-lock.yaml` → pnpm, etc.) and wire it into `pre-push.sh`.
5. **Wire `.gitignore`** — append `CLAUDE.local.md` and `.claude/settings.local.json` if not already ignored.
6. **`chmod +x .claude/hooks/*.sh`**.
7. **Summarize** — what was created, what was skipped, what needs the user's review (especially any `*.proposed.md`).

## Rules
- Never overwrite. Ever.
- Don't add structure the project doesn't need. If there are no packages, don't pretend it's a monorepo in `INDEX.md`.
- Keep `CLAUDE.md` under 200 lines. Overflow → `.claude/rules/`.
- Don't commit. Stage nothing. Let the user review and commit.

Reference the `agents-discipline` skill for the full philosophy.
