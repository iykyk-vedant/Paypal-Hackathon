#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Preparing wallet directories for API member nodes ==="
WALLETS_DIR="${NETWORK_DIR}/wallets"
rm -rf "${WALLETS_DIR}"

copyIdentity() {
  local ORG_DOMAIN="$1"
  local USER_NAME="$2"
  local TARGET_DIR="$3"

  local SRC_USER_DIR="${NETWORK_DIR}/organizations/peerOrganizations/${ORG_DOMAIN}/users/${USER_NAME}"
  if [ ! -d "${SRC_USER_DIR}" ]; then
    echo "Warning: Source user directory not found: ${SRC_USER_DIR}"
    return 0
  fi

  mkdir -p "${TARGET_DIR}/signcerts" "${TARGET_DIR}/keystore"
  local CERT_FILE=$(find "${SRC_USER_DIR}/msp/signcerts" -type f -name "*.pem" | head -n 1)
  local KEY_FILE=$(find "${SRC_USER_DIR}/msp/keystore" -type f | head -n 1)

  if [ -n "${CERT_FILE}" ] && [ -n "${KEY_FILE}" ]; then
    cp "${CERT_FILE}" "${TARGET_DIR}/cert.pem"
    cp "${KEY_FILE}" "${TARGET_DIR}/key.pem"
    cp "${CERT_FILE}" "${TARGET_DIR}/signcerts/cert.pem"
    cp "${KEY_FILE}" "${TARGET_DIR}/keystore/key.pem"
    chmod 600 "${TARGET_DIR}/key.pem" "${TARGET_DIR}/keystore/key.pem" || true
  fi
}

# RegA
copyIdentity "rega.consortium.local" "User1@rega.consortium.local" "${WALLETS_DIR}/rega/rega-operator"
copyIdentity "rega.consortium.local" "User2@rega.consortium.local" "${WALLETS_DIR}/rega/rega-approver"

# RegB
copyIdentity "regb.consortium.local" "User1@regb.consortium.local" "${WALLETS_DIR}/regb/regb-operator"
copyIdentity "regb.consortium.local" "User2@regb.consortium.local" "${WALLETS_DIR}/regb/regb-approver"

# BankA1
copyIdentity "banka1.consortium.local" "User1@banka1.consortium.local" "${WALLETS_DIR}/banka1/a1-trader"
copyIdentity "banka1.consortium.local" "User2@banka1.consortium.local" "${WALLETS_DIR}/banka1/a1-approver"

# BankB1
copyIdentity "bankb1.consortium.local" "User1@bankb1.consortium.local" "${WALLETS_DIR}/bankb1/b1-trader"
copyIdentity "bankb1.consortium.local" "User2@bankb1.consortium.local" "${WALLETS_DIR}/bankb1/b1-approver"

# Auditor
copyIdentity "auditor.consortium.local" "User1@auditor.consortium.local" "${WALLETS_DIR}/auditor/aud-reader"

echo "=== Wallets prepared successfully in ${WALLETS_DIR} ==="
