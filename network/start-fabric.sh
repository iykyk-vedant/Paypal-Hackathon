#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DIR}"

echo "[PayFabric] Starting Hyperledger Fabric 2.5 consortium network..."
docker compose up -d

if [ -f "network/ccaas/package-ids.env" ] && [ -f "docker-compose-cc.yml" ]; then
    echo "[PayFabric] Starting Chaincode-as-a-Service (CCAAS) containers..."
    docker compose --env-file network/ccaas/package-ids.env -f docker-compose-cc.yml up -d
fi

echo "[PayFabric] Fabric network & chaincode are UP and healthy."
