#!/usr/bin/env bash
# .claude/hooks/pre-push.sh
#
# Deterministic pre-push guardrail. Runs typecheck + tests before every push.
# Fails loud, refuses the push if anything is red.
#
# Wire this into Claude Code via .claude/settings.json hooks, or symlink it
# to .git/hooks/pre-push.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# Detect package manager
if   [ -f pnpm-lock.yaml ]; then PM="pnpm"
elif [ -f yarn.lock ];      then PM="yarn"
elif [ -f package-lock.json ]; then PM="npm"
else PM=""
fi

run() {
  echo "→ $*"
  eval "$@"
}

if [ -n "$PM" ]; then
  # Run only scripts that exist
  if node -e "process.exit(require('./package.json').scripts?.typecheck?0:1)" 2>/dev/null; then
    run "$PM run typecheck"
  fi
  if node -e "process.exit(require('./package.json').scripts?.lint?0:1)" 2>/dev/null; then
    run "$PM run lint"
  fi
  if node -e "process.exit(require('./package.json').scripts?.test?0:1)" 2>/dev/null; then
    run "$PM test -- --run 2>/dev/null || $PM test"
  fi
else
  echo "pre-push: no JS package manager detected, skipping JS checks." >&2
fi

# Add language-specific checks below as needed.
# Python: ruff check . && pytest -q
# Rust:   cargo check && cargo test
# Go:     go vet ./... && go test ./...

echo "pre-push: OK"
