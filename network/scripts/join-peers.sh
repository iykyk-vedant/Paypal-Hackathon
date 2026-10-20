#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

# Self-contained container launcher if running on host
if [ ! -f /.dockerenv ] && ! command -v peer >/dev/null 2>&1; then
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
    bash /work/scripts/join-peers.sh "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/envVar.sh"

CHANNEL_NAME="${1:-settlement}"
MAX_RETRY=5
DELAY=3
PEER_ORGS=("rega" "regb" "banka1" "bankb1" "auditor")

echo "=== Joining all 5 peers to channel '${CHANNEL_NAME}' ==="

for ORG in "${PEER_ORGS[@]}"; do
  setGlobals "${ORG}"
  echo "--- Joining peer for org '${ORG}' (${CORE_PEER_ADDRESS}) to '${CHANNEL_NAME}' ---"
  
  rc=1
  COUNTER=1
  while [ $rc -ne 0 ] && [ $COUNTER -le $MAX_RETRY ]; do
    set +e
    peer channel join -b "${NETWORK_DIR}/channel-artifacts/${CHANNEL_NAME}.block" >/dev/null 2>&1
    res=$?
    set -e
    if [ $res -eq 0 ]; then
      rc=0
      break
    fi
    # Check if already joined
    set +e
    peer channel list 2>/dev/null | grep -q "^${CHANNEL_NAME}$"
    if [ $? -eq 0 ]; then
      rc=0
      break
    fi
    set -e
    echo "Retrying peer join for '${ORG}' (${COUNTER}/${MAX_RETRY}) in ${DELAY}s..."
    sleep $DELAY
    COUNTER=$((COUNTER + 1))
  done

  if [ $rc -ne 0 ]; then
    echo "ERROR: Peer for '${ORG}' failed to join channel '${CHANNEL_NAME}'"
    exit 1
  fi
  echo "SUCCESS: Peer for org '${ORG}' joined channel '${CHANNEL_NAME}'"
done

echo ""
echo "============================================================"
echo "=== CHANNEL HEIGHT VERIFICATION ACROSS ALL 5 PEERS ==="
echo "============================================================"
for ORG in "${PEER_ORGS[@]}"; do
  setGlobals "${ORG}"
  echo ""
  echo ">>> [${ORG}] peer (${CORE_PEER_ADDRESS}) channel getinfo:"
  peer channel getinfo -c "${CHANNEL_NAME}"
done
echo "============================================================"
echo "=== All 5 peers joined channel '${CHANNEL_NAME}' successfully ==="
echo "============================================================"
