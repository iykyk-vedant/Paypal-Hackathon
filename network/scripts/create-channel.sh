#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

# Self-contained container launcher if running on host
if [ ! -f /.dockerenv ] && ! command -v configtxgen >/dev/null 2>&1; then
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
    --network consortium \
    hyperledger/fabric-tools:2.5 \
    bash /work/scripts/create-channel.sh "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/envVar.sh"

CHANNEL_NAME="${1:-settlement}"
MAX_RETRY=5
DELAY=3

echo "=== Creating channel artifacts for channel '${CHANNEL_NAME}' ==="
mkdir -p "${NETWORK_DIR}/channel-artifacts"

# Generate genesis block with configtxgen
configtxgen \
  -profile SettlementChannel \
  -outputBlock "${NETWORK_DIR}/channel-artifacts/${CHANNEL_NAME}.block" \
  -channelID "${CHANNEL_NAME}" \
  -configPath "${NETWORK_DIR}"

echo "=== Genesis block generated at ${NETWORK_DIR}/channel-artifacts/${CHANNEL_NAME}.block ==="

echo "=== Joining orderer to channel '${CHANNEL_NAME}' via osnadmin ==="
rc=1
COUNTER=1
while [ $rc -ne 0 ] && [ $COUNTER -le $MAX_RETRY ]; do
  set +e
  osnadmin channel join \
    --channelID "${CHANNEL_NAME}" \
    --config-block "${NETWORK_DIR}/channel-artifacts/${CHANNEL_NAME}.block" \
    -o orderer.consortium.local:7053 \
    --ca-file "${ORDERER_CA}" \
    --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
    --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}"
  res=$?
  set -e
  if [ $res -eq 0 ]; then
    rc=0
    break
  fi
  echo "Retrying orderer channel join (${COUNTER}/${MAX_RETRY}) in ${DELAY}s..."
  sleep $DELAY
  COUNTER=$((COUNTER + 1))
done

if [ $rc -ne 0 ]; then
  # Check if already joined
  set +e
  LIST_OUTPUT=$(osnadmin channel list \
    -o orderer.consortium.local:7053 \
    --ca-file "${ORDERER_CA}" \
    --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
    --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}")
  set -e
  echo "${LIST_OUTPUT}" | grep -q "${CHANNEL_NAME}" || {
    echo "ERROR: Orderer failed to join channel '${CHANNEL_NAME}'"
    exit 1
  }
fi

echo "=== Orderer channel list verification ==="
osnadmin channel list \
  -o orderer.consortium.local:7053 \
  --ca-file "${ORDERER_CA}" \
  --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
  --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}"

echo "=== Channel '${CHANNEL_NAME}' successfully created and orderer joined ==="
