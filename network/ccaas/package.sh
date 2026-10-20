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
    hyperledger/fabric-tools:2.5 \
    bash /work/ccaas/package.sh "$@"
fi

if [ -d "/work/ccaas" ]; then
  CCAAS_DIR="/work/ccaas"
elif [ -d "${PWD}/network/ccaas" ]; then
  CCAAS_DIR="${PWD}/network/ccaas"
else
  CCAAS_DIR="${PWD}"
fi

CC_SEQUENCE="${1:-1}"
CC_LABEL="settlement_${CC_SEQUENCE}"

echo "=== Packaging CCAAS chaincode with label '${CC_LABEL}' ==="

# Update metadata.json label if needed
cat > "${CCAAS_DIR}/metadata.json" <<EOF
{
  "type": "ccaas",
  "label": "${CC_LABEL}"
}
EOF

ORGS=("rega" "regb" "banka1" "bankb1" "auditor")

for ORG in "${ORGS[@]}"; do
  ORG_DIR="${CCAAS_DIR}/${ORG}"
  if [ ! -f "${ORG_DIR}/connection.json" ]; then
    echo "ERROR: connection.json not found for ${ORG} in ${ORG_DIR}"
    exit 1
  fi

  TMP_DIR=$(mktemp -d)
  # Package code.tar.gz containing connection.json
  tar -czf "${TMP_DIR}/code.tar.gz" -C "${ORG_DIR}" connection.json

  # Copy metadata.json
  cp "${CCAAS_DIR}/metadata.json" "${TMP_DIR}/metadata.json"

  # Package final tar.gz
  OUTPUT_PKG="${CCAAS_DIR}/settlement-${ORG}.tar.gz"
  tar -czf "${OUTPUT_PKG}" -C "${TMP_DIR}" metadata.json code.tar.gz
  rm -rf "${TMP_DIR}"

  PKG_ID=$(peer lifecycle chaincode calculatepackageid "${OUTPUT_PKG}")
  echo "Packaged for ${ORG}: ${OUTPUT_PKG} -> PackageID: ${PKG_ID}"
done

echo "=== All 5 CCAAS packages built successfully ==="
