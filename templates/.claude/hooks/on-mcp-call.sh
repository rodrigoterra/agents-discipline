#!/usr/bin/env bash
# .claude/hooks/on-mcp-call.sh
#
# Fires on every MCP tool invocation. Use it to log, gate, or redact.
# Wire it in .claude/settings.json under hooks.PreToolUse with a matcher
# like "mcp__*" so it only runs for MCP tools.
#
# Claude Code passes the tool event as JSON on stdin. The minimum useful
# behavior is to log enough to audit later — without leaking secrets.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LOG_DIR="$ROOT/.claude/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/mcp.log"

# Read the event payload (Claude Code sends JSON on stdin).
PAYLOAD="$(cat || true)"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Best-effort redaction of common secret-looking values before logging.
REDACTED="$(printf '%s' "$PAYLOAD" \
  | sed -E 's/(sk-[A-Za-z0-9_-]{16,})/sk-REDACTED/g' \
  | sed -E 's/(ghp_[A-Za-z0-9]{16,})/ghp_REDACTED/g' \
  | sed -E 's/(Bearer [A-Za-z0-9._-]{8,})/Bearer REDACTED/g')"

printf '[%s] %s\n' "$TS" "$REDACTED" >> "$LOG"

# Gate examples (uncomment to enforce):
#
# Block any MCP tool that names a forbidden repo:
#   if printf '%s' "$PAYLOAD" | grep -q '"repo":"forbidden/repo"'; then
#     echo "blocked: forbidden repo" >&2
#     exit 2   # non-zero = deny the tool call
#   fi
#
# Require confirmation for write-shaped MCP tools:
#   if printf '%s' "$PAYLOAD" | grep -qE '"tool_name":"mcp__[^"]*__(create|update|delete|push|merge)'; then
#     echo "mcp-write-requires-review" >&2
#     exit 1
#   fi

exit 0
