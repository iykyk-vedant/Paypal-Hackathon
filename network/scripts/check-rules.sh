#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${NETWORK_DIR}/.." && pwd)"

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
    ORGS=("rega" "regb" "banka1" "bankb1" "auditor")
    for ORG in "${ORGS[@]}"; do
      setGlobals "${ORG}"
      echo "=== Querying GetRules JUR-A on ${CORE_PEER_LOCALMSPID} (${CORE_PEER_ADDRESS}) ==="
      peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetRules\",\"Args\":[\"JUR-A\"]}"
      echo ""
    done
  '
