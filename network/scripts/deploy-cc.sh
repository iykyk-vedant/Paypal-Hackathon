#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${NETWORK_DIR}/.." && pwd)"

CHANNEL_NAME="${1:-settlement}"
CC_NAME="${2:-settlement-cc}"
CC_VERSION="${3:-${CC_VERSION:-1.0}}"
CC_SEQUENCE="${4:-${CC_SEQUENCE:-1}}"

echo "============================================================"
echo "=== Deploying Chaincode '${CC_NAME}' v${CC_VERSION} (seq ${CC_SEQUENCE}) on channel '${CHANNEL_NAME}' ==="
echo "============================================================"

# Step 1: Package CCAAS for all 5 orgs
echo "--- Step 1: Packaging CCAAS for all 5 orgs ---"
"${BASH}" "${NETWORK_DIR}/ccaas/package.sh" "${CC_SEQUENCE}"

# Determine host network dir for docker mount
HOST_DIR="${ROOT_DIR}"
if pwd -W >/dev/null 2>&1; then
  HOST_DIR="$(pwd -W)"
fi

# Step 2: Install chaincode on all 5 peers & capture package IDs
echo "--- Step 2: Installing chaincode on all 5 peers ---"
docker run --rm \
  -v "${HOST_DIR}/network:/work" \
  -w /work \
  --network consortium \
  hyperledger/fabric-tools:2.5 \
  bash -c '
    set -euo pipefail
    . scripts/envVar.sh
    ORGS=("rega" "regb" "banka1" "bankb1" "auditor")
    ENV_FILE="/work/ccaas/package-ids.env"
    rm -f "${ENV_FILE}"

    for ORG in "${ORGS[@]}"; do
      setGlobals "${ORG}"
      PKG_PATH="/work/ccaas/settlement-${ORG}.tar.gz"
      echo "Installing on peer0.${ORG}..."
      set +e
      peer lifecycle chaincode install "${PKG_PATH}" >/dev/null 2>&1
      set -e
      PKG_ID=$(peer lifecycle chaincode calculatepackageid "${PKG_PATH}")
      UPPER_ORG=$(echo "${ORG}" | tr "[:lower:]" "[:upper:]")
      echo "PACKAGE_ID_${UPPER_ORG}=${PKG_ID}" >> "${ENV_FILE}"
      echo "peer0.${ORG} -> ${PKG_ID}"
    done
  '

# Step 3: Build chaincode Docker image
echo "--- Step 3: Building chaincode Docker image ---"
cd "${ROOT_DIR}"
if [ -f "chaincode/Dockerfile" ]; then
  echo "Building from chaincode/Dockerfile..."
  docker build -t settlement-cc:latest chaincode
else
  echo "chaincode/Dockerfile not present; building from fabric-samples placeholder..."
  docker build -t settlement-cc:latest network/_ref/asset-transfer-basic/chaincode-external
fi

# Step 4: Start the 5 CCAAS containers
echo "--- Step 4: Starting 5 CCAAS containers ---"
cd "${ROOT_DIR}"
docker compose -f docker-compose-cc.yml --env-file network/ccaas/package-ids.env up -d --force-recreate
echo "Waiting 3 seconds for CCAAS containers to initialize..."
sleep 3

# Step 5: Approve chaincode definition for all 5 orgs
echo "--- Step 5: Approving chaincode for all 5 orgs ---"
docker run --rm \
  -v "${HOST_DIR}/network:/work" \
  -w /work \
  --network consortium \
  hyperledger/fabric-tools:2.5 \
  bash -c "
    set -euo pipefail
    . scripts/envVar.sh
    . ccaas/package-ids.env

    SIGNATURE_POLICY=\"OR('RegAMSP.peer','RegBMSP.peer','BankA1MSP.peer','BankB1MSP.peer','AuditorMSP.peer')\"
    ORGS=(\"rega\" \"regb\" \"banka1\" \"bankb1\" \"auditor\")

    for ORG in \"\${ORGS[@]}\"; do
      setGlobals \"\${ORG}\"
      UPPER_ORG=\$(echo \"\${ORG}\" | tr '[:lower:]' '[:upper:]')
      VAR_NAME=\"PACKAGE_ID_\${UPPER_ORG}\"
      PKG_ID=\${!VAR_NAME}

      echo \"Approving definition for \${CORE_PEER_LOCALMSPID} with package ID \${PKG_ID}...\"
      peer lifecycle chaincode approveformyorg \
        -o orderer.consortium.local:7050 \
        --ordererTLSHostnameOverride orderer.consortium.local \
        --tls \
        --cafile \"\${ORDERER_CA}\" \
        --channelID \"${CHANNEL_NAME}\" \
        --name \"${CC_NAME}\" \
        --version \"${CC_VERSION}\" \
        --package-id \"\${PKG_ID}\" \
        --sequence \"${CC_SEQUENCE}\" \
        --signature-policy \"\${SIGNATURE_POLICY}\" \
        --collections-config /work/collections.json
    done

    echo \"=== Checking commit readiness ===\"
    peer lifecycle chaincode checkcommitreadiness \
      --channelID \"${CHANNEL_NAME}\" \
      --name \"${CC_NAME}\" \
      --version \"${CC_VERSION}\" \
      --sequence \"${CC_SEQUENCE}\" \
      --signature-policy \"\${SIGNATURE_POLICY}\" \
      --collections-config /work/collections.json

    echo \"=== Committing chaincode definition with all 5 peers ===\"
    peer lifecycle chaincode commit \
      -o orderer.consortium.local:7050 \
      --ordererTLSHostnameOverride orderer.consortium.local \
      --tls \
      --cafile \"\${ORDERER_CA}\" \
      --channelID \"${CHANNEL_NAME}\" \
      --name \"${CC_NAME}\" \
      --version \"${CC_VERSION}\" \
      --sequence \"${CC_SEQUENCE}\" \
      --signature-policy \"\${SIGNATURE_POLICY}\" \
      --collections-config /work/collections.json \
      --peerAddresses peer0.rega.consortium.local:7051 --tlsRootCertFiles \"\${PEER0_REGA_CA}\" \
      --peerAddresses peer0.regb.consortium.local:8051 --tlsRootCertFiles \"\${PEER0_REGB_CA}\" \
      --peerAddresses peer0.banka1.consortium.local:9051 --tlsRootCertFiles \"\${PEER0_BANKA1_CA}\" \
      --peerAddresses peer0.bankb1.consortium.local:10051 --tlsRootCertFiles \"\${PEER0_BANKB1_CA}\" \
      --peerAddresses peer0.auditor.consortium.local:11051 --tlsRootCertFiles \"\${PEER0_AUDITOR_CA}\"

    echo \"=== Verifying committed definition across all 5 peers ===\"
    for ORG in \"\${ORGS[@]}\"; do
      setGlobals \"\${ORG}\"
      echo \">>> Query committed on \${CORE_PEER_LOCALMSPID}:\"
      peer lifecycle chaincode querycommitted --channelID \"${CHANNEL_NAME}\" --name \"${CC_NAME}\"
    done

    echo \"=== Invoking InitLedger once from Auditor ===\"
    setGlobals auditor
    peer chaincode invoke \
      -o orderer.consortium.local:7050 \
      --ordererTLSHostnameOverride orderer.consortium.local \
      --tls \
      --cafile \"\${ORDERER_CA}\" \
      -C \"${CHANNEL_NAME}\" \
      -n \"${CC_NAME}\" \
      --peerAddresses peer0.auditor.consortium.local:11051 --tlsRootCertFiles \"\${PEER0_AUDITOR_CA}\" \
      -c '{\"function\":\"InitLedger\",\"Args\":[]}' \
      --waitForEvent
  "

echo "============================================================"
echo "=== Chaincode '${CC_NAME}' v${CC_VERSION} successfully deployed and initialized! ==="
echo "============================================================"
