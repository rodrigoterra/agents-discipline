# agents-discipline

A Claude Code plugin that bootstraps the "quiet files" of good project
management — CLAUDE.md, AGENTS.md (for OpenAI Codex adversarial review),
INDEX.md, specs/, .claude/ hooks, rules, output-styles, and permission allowlists.

## Commands
- `/agents-init` — bootstrap the full structure into a repo
- `/agents-spec <feature>` — scaffold a new spec
- `/agents-review` — refresh AGENTS.md and brief Codex for an adversarial review

## Install on Claude Desktop / claude.ai
A Desktop-flavored build of the skill (relative paths, conversational
modes instead of slash commands) is checked in at
`dist/agents-discipline-skill.zip`. Enable **code execution** in Claude
settings, then upload the zip under **Capabilities → Skills**.

Regenerate the zip from source any time with:

```sh
scripts/build-desktop-skill.sh
```

The source `SKILL.md` lives at `desktop/SKILL.md` and bundles the shared
`templates/` tree at build time.
