#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

HOST_DIR="${ROOT_DIR:-${PWD}}"
if pwd -W >/dev/null 2>&1; then
  HOST_DIR="$(pwd -W)"
fi

CURRENT_SEQ=$(docker run --rm \
  -v "${HOST_DIR}/network:/work" \
  -w /work \
  --network consortium \
  hyperledger/fabric-tools:2.5 \
  bash -c '
    . scripts/envVar.sh
    setGlobals rega
    peer lifecycle chaincode querycommitted --channelID settlement --name settlement-cc 2>/dev/null | grep -o "Sequence: [0-9]*" | awk "{print \$2}" || echo "1"
  ' 2>/dev/null | tr -d '\r' | tail -n 1 || echo "1")

if [ -z "$CURRENT_SEQ" ] || ! [[ "$CURRENT_SEQ" =~ ^[0-9]+$ ]]; then
  CURRENT_SEQ=1
fi

BUMPED_SEQ=$((CURRENT_SEQ + 1))
TARGET_SEQ="${CC_SEQUENCE:-${BUMPED_SEQ}}"

echo "============================================================"
echo "=== Redeploying chaincode: bumping sequence from ${CURRENT_SEQ} to ${TARGET_SEQ} ==="
echo "============================================================"

CC_SEQUENCE="${TARGET_SEQ}" "${BASH}" "${SCRIPT_DIR}/deploy-cc.sh" settlement settlement-cc 1.0 "${TARGET_SEQ}"

echo "=== Sequence ${TARGET_SEQ} redeployed and InitLedger invoked as auditor (endorsed by auditor only) ==="
