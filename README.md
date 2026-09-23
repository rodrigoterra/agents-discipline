# agents-discipline

A Claude Code plugin that bootstraps the "quiet files" of good project
management — CLAUDE.md, AGENTS.md (for OpenAI Codex adversarial review),
INDEX.md, specs/, .claude/ hooks, rules, output-styles, and permission allowlists.

## Commands
- `/agents-init` — bootstrap the full structure into a repo
- `/agents-spec <feature>` — scaffold a new spec
- `/agents-review` — refresh AGENTS.md and brief Codex for an adversarial review
- `/agents-council` to install, check or run a Codex council (asks for the mode every time)

## Codex council
The `codex-council` skill installs Codex native subagents (lead plus `default`, `worker`,
`explorer`, `fixer`, `reviewer`, `specialist`) into `~/.codex` or a project, and runs them in
two modes: **REVIEW** (Claude built it, the council attacks) or **BUILD** (the council builds,
Claude attacks). Two Claude seats ship in `agents/`: `council-blind-reviewer` (Opus 5.5,
effort xhigh, read-only) and `council-auditor` (Fable 5.1, read-only, no CLAUDE.md). Every run
leaves an audit trail in `.council/<run-id>/`.

Check an install at any time:

```bash
python3 skills/codex-council/scripts/check_council.py            # ~/.codex (or $CODEX_HOME)
python3 skills/codex-council/scripts/check_council.py --bundled  # the shipped files
```

Design and acceptance criteria: `specs/codex-council.md`. Tests: `python3 -m unittest discover -s tests -v`.
