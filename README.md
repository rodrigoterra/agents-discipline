# agents-discipline

A Claude Code **plugin marketplace** with two plugins. Add the marketplace once, then install
whichever plugins you want — installs persist across sessions (no `--plugin-dir` needed) and work
the same on Claude Code **CLI and Desktop**.

```
/plugin marketplace add rodrigoterra/agents-discipline
```

## Plugins

### `agents-discipline`
Bootstraps the "quiet files" of good project management — CLAUDE.md, AGENTS.md (for OpenAI Codex
adversarial review), INDEX.md, specs/, .claude/ hooks, rules, output-styles, and permission
allowlists.

```
/plugin install agents-discipline@agents-discipline
```

Commands:
- `/agents-init` — bootstrap the full structure into a repo
- `/agents-spec <feature>` — scaffold a new spec
- `/agents-review` — refresh AGENTS.md and brief Codex for an adversarial review

### `screenshot-annotator`
Annotate a screenshot in a local browser canvas — shapes, arrows, numbered markers, redaction
boxes, and per-mark text notes — then hand the flattened image plus a compact JSON sidecar back
into Claude's context. **Requires Node.js on your PATH** (`node --version`).

```
/plugin install screenshot-annotator@agents-discipline
```

Then: `/screenshot-annotator:annotate path/to/screenshot.png` (or just ask Claude to "annotate
this screenshot"). See [`screenshot-annotator/README.md`](./screenshot-annotator/README.md) for
details.
