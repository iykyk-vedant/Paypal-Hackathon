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
    bash /work/scripts/set-anchors.sh "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/envVar.sh"

CHANNEL_NAME="${1:-settlement}"
TARGET_ORG="${2:-all}"

setAnchorForOrg() {
  local ORG="$1"
  setGlobals "${ORG}"

  local HOST PORT
  case "$ORG" in
    rega|RegA|1)
      HOST="peer0.rega.consortium.local"
      PORT=7051
      ;;
    regb|RegB|2)
      HOST="peer0.regb.consortium.local"
      PORT=8051
      ;;
    banka1|BankA1|a1|A1|3)
      HOST="peer0.banka1.consortium.local"
      PORT=9051
      ;;
    bankb1|BankB1|b1|B1|4)
      HOST="peer0.bankb1.consortium.local"
      PORT=10051
      ;;
    auditor|Auditor|aud|Aud|5)
      HOST="peer0.auditor.consortium.local"
      PORT=11051
      ;;
    *)
      echo "ERROR: Unknown organization: ${ORG}"
      exit 1
      ;;
  esac

  echo "--- Checking/Setting anchor peer for ${CORE_PEER_LOCALMSPID} (${HOST}:${PORT}) on channel '${CHANNEL_NAME}' ---"

  mkdir -p "${NETWORK_DIR}/channel-artifacts"
  local CONFIG_BLOCK="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_config_block.pb"
  local CONFIG_JSON="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_config.json"
  local MODIFIED_JSON="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_modified_config.json"
  local ORIGINAL_PB="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_orig.pb"
  local MODIFIED_PB="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_mod.pb"
  local UPDATE_PB="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_update.pb"
  local UPDATE_JSON="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_update.json"
  local ENVELOPE_JSON="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_envelope.json"
  local ANCHOR_TX="${NETWORK_DIR}/channel-artifacts/${CORE_PEER_LOCALMSPID}_anchors.tx"

  # Fetch current channel config
  peer channel fetch config "${CONFIG_BLOCK}" \
    -o orderer.consortium.local:7050 \
    --ordererTLSHostnameOverride orderer.consortium.local \
    -c "${CHANNEL_NAME}" \
    --tls \
    --cafile "${ORDERER_CA}" >/dev/null 2>&1

  # Decode block and isolate config
  configtxlator proto_decode --input "${CONFIG_BLOCK}" --type common.Block --output "${CONFIG_BLOCK}.json"
  jq .data.data[0].payload.data.config "${CONFIG_BLOCK}.json" > "${CONFIG_JSON}"

  # Check if anchor peer already matches
  local EXISTING_HOST
  EXISTING_HOST=$(jq -r ".channel_group.groups.Application.groups.${CORE_PEER_LOCALMSPID}.values.AnchorPeers.value.anchor_peers[0].host // empty" "${CONFIG_JSON}")

  if [ "${EXISTING_HOST}" = "${HOST}" ]; then
    echo "Anchor peer for ${CORE_PEER_LOCALMSPID} is already configured as ${HOST}:${PORT}."
    return 0
  fi

  # Modify configuration to add AnchorPeers
  jq ".channel_group.groups.Application.groups.${CORE_PEER_LOCALMSPID}.values += {\"AnchorPeers\":{\"mod_policy\": \"Admins\",\"value\":{\"anchor_peers\": [{\"host\": \"${HOST}\",\"port\": ${PORT}}]},\"version\": \"0\"}}" \
    "${CONFIG_JSON}" > "${MODIFIED_JSON}"

  # Compute update transaction
  configtxlator proto_encode --input "${CONFIG_JSON}" --type common.Config --output "${ORIGINAL_PB}"
  configtxlator proto_encode --input "${MODIFIED_JSON}" --type common.Config --output "${MODIFIED_PB}"
  configtxlator compute_update --channel_id "${CHANNEL_NAME}" --original "${ORIGINAL_PB}" --updated "${MODIFIED_PB}" --output "${UPDATE_PB}"
  configtxlator proto_decode --input "${UPDATE_PB}" --type common.ConfigUpdate --output "${UPDATE_JSON}"

  echo "{\"payload\":{\"header\":{\"channel_header\":{\"channel_id\":\"${CHANNEL_NAME}\", \"type\":2}},\"data\":{\"config_update\":$(cat "${UPDATE_JSON}")}}}" | jq . > "${ENVELOPE_JSON}"
  configtxlator proto_encode --input "${ENVELOPE_JSON}" --type common.Envelope --output "${ANCHOR_TX}"

  # Submit channel update
  peer channel update \
    -o orderer.consortium.local:7050 \
    --ordererTLSHostnameOverride orderer.consortium.local \
    -c "${CHANNEL_NAME}" \
    -f "${ANCHOR_TX}" \
    --tls \
    --cafile "${ORDERER_CA}"

  echo "SUCCESS: Anchor peer update submitted for ${CORE_PEER_LOCALMSPID}"
}

if [ "${TARGET_ORG}" = "all" ]; then
  for ORG in "rega" "regb" "banka1" "bankb1" "auditor"; do
    setAnchorForOrg "${ORG}"
  done
else
  setAnchorForOrg "${TARGET_ORG}"
fi

echo "=== Anchor peers verified/configured for channel '${CHANNEL_NAME}' ==="
