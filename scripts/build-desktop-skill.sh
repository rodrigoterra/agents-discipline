#!/usr/bin/env bash
# Build the Claude Desktop / claude.ai zip for the agents-discipline skill.
#
# Output: dist/agents-discipline-skill.zip
#
# The zip contains a single top-level folder `agents-discipline/` with
# `SKILL.md` (the Desktop-flavored source from desktop/SKILL.md) at its root
# and the shared `templates/` tree bundled alongside it — the structure the
# claude.ai uploader expects.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

SRC_SKILL="desktop/SKILL.md"
SRC_TEMPLATES="templates"
NAME="agents-discipline"
STAGE="dist/build/$NAME"
OUT="dist/$NAME-skill.zip"

if [ ! -f "$SRC_SKILL" ]; then
  echo "missing $SRC_SKILL" >&2; exit 1
fi
if [ ! -d "$SRC_TEMPLATES" ]; then
  echo "missing $SRC_TEMPLATES/" >&2; exit 1
fi

rm -rf dist/build "$OUT"
mkdir -p "$STAGE"

cp "$SRC_SKILL" "$STAGE/SKILL.md"
# -a preserves the +x bits on .claude/hooks/*.sh
cp -a "$SRC_TEMPLATES" "$STAGE/templates"

# -X drops extra OS fields for a tidier archive
( cd dist/build && zip -r -X "../$NAME-skill.zip" "$NAME" >/dev/null )

rm -rf dist/build

echo "built $OUT"
unzip -l "$OUT" | tail -n +4 | head -n -2
