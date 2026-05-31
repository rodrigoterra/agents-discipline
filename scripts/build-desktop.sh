#!/usr/bin/env bash
# Build the Claude Desktop-installable artifacts into dist-desktop/:
#   - screenshot-annotator.mcpb  (MCP server bundle: manifest.json + dist + webapp)
#   - <skill>.zip                (each containing <skill>/SKILL.md)
#
# Prereq: the screenshot-annotator bundles must be built first
#   (cd screenshot-annotator && npm install && npm run build).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist-desktop"
rm -f "$OUT"/*.mcpb "$OUT"/*.zip
mkdir -p "$OUT"

# 1) MCP bundle — manifest.json at zip root, plus self-contained server + webapp.
( cd "$ROOT/screenshot-annotator" && zip -r -q "$OUT/screenshot-annotator.mcpb" \
    manifest.json package.json mcp-server/dist webapp/dist webapp/index.html webapp/styles.css )

# 2) Skill zips — <name>/SKILL.md
build_skill_zip () {
  local name="$1" src="$2" stage
  stage="$(mktemp -d)"
  mkdir -p "$stage/$name"
  cp "$src" "$stage/$name/SKILL.md"
  ( cd "$stage" && zip -r -q "$OUT/$name.zip" "$name" )
  rm -rf "$stage"
}
build_skill_zip "agents-discipline"   "$ROOT/skills/agents-discipline/SKILL.md"
build_skill_zip "karpathy-guidelines" "$ROOT/karpathy-guidelines/skills/karpathy-guidelines/SKILL.md"
build_skill_zip "annotate"            "$ROOT/screenshot-annotator/skills/annotate/SKILL.md"

echo "Built into $OUT:"
ls -1 "$OUT"
