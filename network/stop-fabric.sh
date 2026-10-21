#!/usr/bin/env bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${DIR}"

echo "[PayFabric] Stopping Chaincode containers..."
if [ -f "docker-compose-cc.yml" ]; then
    docker compose -f docker-compose-cc.yml stop || true
fi

echo "[PayFabric] Stopping Hyperledger Fabric 2.5 consortium network..."
docker compose stop || true

echo "[PayFabric] Fabric network stopped."
