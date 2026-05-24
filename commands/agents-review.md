---
description: Refresh AGENTS.md for the current branch diff and brief OpenAI Codex for an adversarial review.
---

Set up (or refresh) an **adversarial review** of the current branch by OpenAI Codex.

## Steps

1. **Diff the branch** — `git diff $(git merge-base HEAD origin/main)...HEAD` (fall back to `main` or `master` as the base). Identify files changed, new tests, new public APIs.
2. **Locate or create `AGENTS.md`** — at repo root. If missing, copy from `templates/AGENTS.md` and pre-fill project context.
3. **Append a `## Current Review Target` section** to `AGENTS.md` containing:
   - The branch name and base
   - A short summary of what Claude claims to have done
   - The exact files Claude touched
   - The acceptance criteria from the relevant `specs/<feature>.md` (if one exists)
   - A directive: *"Codex: assume each claim above is wrong until you've reproduced it. Prioritize counter-examples over agreement."*
4. **Output the Codex invocation** for the user, e.g.:
   ```
   codex review --branch <branch> --base <base>
   ```
   (or whatever the user's local Codex CLI expects — ask if unsure).
5. **Tell the user** how to feed Codex's findings back: either as PR review comments or as a `REVIEW.md` in the branch. Either way, Claude must triage, not just accept.

## Rules
- Do **not** soften the language in `AGENTS.md`. Adversarial framing is the whole point.
- Never auto-apply Codex's suggestions. They are hypotheses to triage.
- The loop ends when the user says it does — not when the two agents agree.
