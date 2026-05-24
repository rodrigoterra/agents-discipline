#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop/Engine and retry."
  exit 1
fi

if [ ! -f .env ]; then
  echo "No .env found. Creating from .env.example"
  cp .env.example .env
  echo "IMPORTANT: edit .env and set OPENAI_API_KEY before using script generation/TTS routes."
fi

echo "Building and starting containerized dev stack..."
docker compose up --build
