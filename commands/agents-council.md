---
description: Install, check or run a Codex council (REVIEW or BUILD mode) with a blind Claude reviewer and a process auditor.
argument-hint: "[install | check | review | build] [spec or feature]"
---

Run the **codex-council** skill for the current repository.

1. Load the `codex-council` skill and follow it from Step 0 (survey).
2. Treat `$ARGUMENTS` only as a hint: pre-select the matching option, but still ask the user
   which mode they want now, exactly as the skill's Step 1 requires.
3. Never run Codex, write to `~/.codex`, or edit `AGENTS.md` without showing the change and
   getting a yes.

Reference the `agents-discipline` skill for the wider spec-first and adversarial-review rules.
