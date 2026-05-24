# agents-discipline

A Claude Code plugin that bootstraps the "quiet files" of good project
management — `CLAUDE.md`, `AGENTS.md` (for OpenAI Codex adversarial review),
`INDEX.md`, `specs/`, `.claude/` hooks, rules, output-styles, and permission
allowlists.

## Install
Add this repo as a plugin marketplace in Claude Code, then enable the
`agents-discipline` plugin.

## Commands
- `/agents-init` — bootstrap the full structure into a repo
- `/agents-spec <feature>` — scaffold a new spec
- `/agents-review` — refresh `AGENTS.md` and brief Codex for an adversarial review
