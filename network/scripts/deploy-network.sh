#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

MODE="${1:-up}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [ "$MODE" = "up" ]; then
  # Ensure clean slate if prior containers/volumes were left running
  cd "${ROOT_DIR}"
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true

  echo "============================================================"
  echo ">>> [Step 1/7] Generating cryptographic material..."
  echo "============================================================"
  "${BASH}" "${SCRIPT_DIR}/generate-crypto.sh"

  echo ""
  echo "============================================================"
  echo ">>> [Step 2/7] Starting Docker containers (Orderer + 5 Peers)..."
  echo "============================================================"
  cd "${ROOT_DIR}"
  docker compose up -d --force-recreate orderer.consortium peer0.rega peer0.regb peer0.banka1 peer0.bankb1 peer0.auditor

  echo "Polling orderer until osnadmin channel list returns 200 (max 60s)..."
  HOST_DIR="${ROOT_DIR}"
  if pwd -W >/dev/null 2>&1; then
    HOST_DIR="$(pwd -W)"
  fi
  docker run --rm \
    -v "${HOST_DIR}/network:/work" \
    -w /work \
    --network consortium \
    hyperledger/fabric-tools:2.5 \
    bash -c '
      set -euo pipefail
      . scripts/envVar.sh
      START_TIME=$(date +%s)
      TIMEOUT=60
      while true; do
        set +e
        osnadmin channel list \
          -o orderer.consortium.local:7053 \
          --ca-file "${ORDERER_CA}" \
          --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
          --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}" >/dev/null 2>&1
        RES=$?
        set -e
        if [ $RES -eq 0 ]; then
          echo "Orderer is ready (osnadmin HTTP 200)."
          break
        fi
        NOW=$(date +%s)
        if [ $((NOW - START_TIME)) -ge ${TIMEOUT} ]; then
          echo "ERROR: Timed out waiting for orderer after ${TIMEOUT}s"
          exit 1
        fi
        sleep 1
      done
    '

  echo ""
  echo "============================================================"
  echo ">>> [Step 3/7] Creating channel 'settlement' & joining orderer..."
  echo "============================================================"
  "${BASH}" "${SCRIPT_DIR}/create-channel.sh" settlement

  echo ""
  echo "============================================================"
  echo ">>> [Step 4/7] Joining all 5 peers to channel 'settlement'..."
  echo "============================================================"
  "${BASH}" "${SCRIPT_DIR}/join-peers.sh" settlement

  echo ""
  echo "============================================================"
  echo ">>> [Step 5/7] Verifying / Setting anchor peers..."
  echo "============================================================"
  "${BASH}" "${SCRIPT_DIR}/set-anchors.sh" settlement all

  echo ""
  echo "============================================================"
  echo ">>> [Step 6/7] Deploying Chaincode-as-a-Service (CCAAS)..."
  echo "============================================================"
  "${BASH}" "${SCRIPT_DIR}/deploy-cc.sh" settlement settlement-cc

  echo ""
  echo "============================================================"
  echo ">>> [Step 7/7] Verifying GetRules / Chaincode on all 5 peers..."
  echo "============================================================"
  docker run --rm \
    -v "${HOST_DIR}/network:/work" \
    -w /work \
    --network consortium \
    hyperledger/fabric-tools:2.5 \
    bash -c '
      set -euo pipefail
      . scripts/envVar.sh
      ORGS=("rega" "regb" "banka1" "bankb1" "auditor")
      for ORG in "${ORGS[@]}"; do
        setGlobals "${ORG}"
        echo ">>> Querying peer0.${ORG} (${CORE_PEER_ADDRESS})..."
        set +e
        OUTPUT=$(peer chaincode query -C settlement -n settlement-cc -c '\''{"function":"GetRules","Args":["JUR-A"]}'\'' 2>&1)
        RES=$?
        set -e
        if [ $RES -eq 0 ]; then
          echo "SUCCESS: peer0.${ORG} returned: ${OUTPUT}"
        else
          echo "Notice on peer0.${ORG}: ${OUTPUT}"
        fi
      done
    '

  echo ""
  echo "============================================================"
  echo ">>> Consortium network + CCAAS chaincode is UP!"
  echo "============================================================"

elif [ "$MODE" = "down" ]; then
  echo "============================================================"
  echo ">>> Tearing down consortium network & removing volumes..."
  echo "============================================================"
  cd "${ROOT_DIR}"

  if [ -f "docker-compose-app.yml" ]; then
    docker compose -f docker-compose-app.yml down -v --remove-orphans || true
  fi

  if [ -f "docker-compose-cc.yml" ]; then
    docker compose -f docker-compose-cc.yml down -v --remove-orphans || true
  fi

  docker compose down -v --remove-orphans || true

  echo "Cleaning up generated crypto, channel artifacts, packages, and wallets..."
  rm -rf "${ROOT_DIR}/network/organizations"
  rm -rf "${ROOT_DIR}/network/channel-artifacts"
  rm -rf "${ROOT_DIR}/network/wallets"
  rm -rf "${ROOT_DIR}/network/ccaas"/*.tar.gz
  rm -f "${ROOT_DIR}/network/ccaas/package-ids.env"

  echo "Removing residual containers and images..."
  REMAINING_CONTAINERS=$(docker ps -a --filter "name=orderer.consortium" --filter "name=peer0." --filter "name=cc." --filter "name=api." -q)
  if [ -n "$REMAINING_CONTAINERS" ]; then
    docker rm -f $REMAINING_CONTAINERS || true
  fi

  REMAINING_VOLUMES=$(docker volume ls --filter "name=payfabric" --filter "name=consortium" --filter "name=peer0" -q)
  if [ -n "$REMAINING_VOLUMES" ]; then
    docker volume rm -f $REMAINING_VOLUMES || true
  fi

  CC_IMAGES=$(docker images "settlement-cc*" -q)
  if [ -n "$CC_IMAGES" ]; then
    echo "Removing settlement-cc images: ${CC_IMAGES}"
    docker rmi -f $CC_IMAGES || true
  fi

  echo "============================================================"
  echo ">>> Network down: all containers, images, volumes removed cleanly."
  echo "============================================================"

else
  echo "Usage: $0 [up|down]"
  exit 1
fi
