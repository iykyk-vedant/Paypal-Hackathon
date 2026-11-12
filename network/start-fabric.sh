#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [ ! -d network/organizations ] || [ ! -f network/ccaas/package-ids.env ]; then
  echo "Local Fabric is not initialized. Follow the first-time setup in README.md."
  exit 1
fi
docker info >/dev/null
docker compose up -d
docker compose --env-file network/ccaas/package-ids.env -f docker-compose-cc.yml up -d
node network/scripts/configure-local.mjs
echo "Local Fabric containers started. Restart the API to load the local profile."
