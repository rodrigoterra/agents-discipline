# Desktop-installable artifacts

The **Claude Code CLI** installs this repo via `/plugin marketplace add rodrigoterra/agents-discipline`.

The **Claude Desktop app** doesn't read plugin marketplaces — it installs MCP servers
from `.mcpb` bundles and skills from `.md`/`.zip` uploads. These files are built for that.

| File | Install in Claude Desktop |
|------|---------------------------|
| `screenshot-annotator.mcpb` | Settings → Extensions → install (or double-click / drag in). Provides the `annotate_screenshot` tool. Needs **Node.js ≥ 20** and a browser on the machine. |
| `annotate.zip` | Skills → add skill. **Requires `screenshot-annotator.mcpb`** — it just calls that tool. |
| `agents-discipline.zip` | Skills → add skill. (The `/agents-*` slash commands are CLI-only and are not included.) |
| `karpathy-guidelines.zip` | Skills → add skill. |

Each skill zip contains `<skill-name>/SKILL.md`.

## Rebuilding

From the repo root: `bash scripts/build-desktop.sh` (or re-run the packaging steps).
The `.mcpb` is just a zip with `manifest.json` at its root plus the self-contained
`mcp-server/dist/` server and the `webapp/` assets.
