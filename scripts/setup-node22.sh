#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/8] Checking required tools (bash, git, curl)..."
for tool in bash git curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required tool: $tool"
    exit 1
  fi
done

echo "[2/8] Detecting Node/npm on host..."
if command -v node >/dev/null 2>&1; then
  echo "Current node: $(node -v)"
else
  echo "Node is not currently installed in PATH"
fi
if command -v npm >/dev/null 2>&1; then
  echo "Current npm:  $(npm -v)"
else
  echo "npm is not currently installed in PATH"
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "[3/8] Installing NVM to $NVM_DIR ..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
else
  echo "[3/8] NVM already installed"
fi

# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"

echo "[4/8] Pinning project Node version (.nvmrc -> 22)"
echo "22" > .nvmrc

echo "[5/8] Installing and selecting Node 22..."
nvm install 22
nvm use 22

echo "[6/8] Re-checking runtime versions..."
echo "Active node: $(node -v)"
echo "Active npm:  $(npm -v)"

echo "[7/8] Installing workspace dependencies..."
npm install

echo "[8/8] Running baseline checks..."
npm run test
npm run build

echo "Setup complete. You can now run: npm run dev"
