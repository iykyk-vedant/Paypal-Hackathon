#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

# Self-contained container launcher if running on host
if [ ! -f /.dockerenv ] && ! command -v cryptogen >/dev/null 2>&1; then
  HOST_DIR="${PWD}"
  if pwd -W >/dev/null 2>&1; then
    HOST_DIR="$(pwd -W)"
  fi
  if [ -d "${HOST_DIR}/network" ]; then
    HOST_NET_DIR="${HOST_DIR}/network"
  else
    HOST_NET_DIR="${HOST_DIR}"
  fi
  exec docker run --rm \
    -v "${HOST_NET_DIR}:/work" \
    -w /work \
    hyperledger/fabric-tools:2.5 \
    bash /work/scripts/generate-crypto.sh "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/envVar.sh"

echo "=== Generating crypto material for 5 peer orgs + 1 orderer org ==="
rm -rf "${NETWORK_DIR}/organizations"

cryptogen generate \
  --config="${NETWORK_DIR}/crypto-config.yaml" \
  --output="${NETWORK_DIR}/organizations"

echo "=== Crypto material generated successfully in ${NETWORK_DIR}/organizations ==="
