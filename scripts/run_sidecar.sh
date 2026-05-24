#!/usr/bin/env bash
# Boot the FastAPI sidecar with auto-reload.
# Assumes a venv at ./venv with requirements-sidecar.txt installed.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -d venv ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
fi

exec uvicorn src.space.api:app \
  --host "${SIDECAR_HOST:-127.0.0.1}" \
  --port "${SIDECAR_PORT:-8765}" \
  --reload \
  --reload-dir src/space
