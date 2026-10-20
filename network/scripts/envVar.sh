#!/usr/bin/env bash
set -euo pipefail

# Determine network directory path
if [ -d "/work/peercfg" ]; then
  NETWORK_DIR="/work"
elif [ -d "${PWD}/network/peercfg" ]; then
  NETWORK_DIR="${PWD}/network"
else
  NETWORK_DIR="${PWD}"
fi

export NETWORK_DIR
export FABRIC_CFG_PATH="${NETWORK_DIR}/peercfg"
export CORE_PEER_TLS_ENABLED=true

# TLS CA paths
export ORDERER_CA="${NETWORK_DIR}/organizations/ordererOrganizations/consortium.local/tlsca/tlsca.consortium.local-cert.pem"
export PEER0_REGA_CA="${NETWORK_DIR}/organizations/peerOrganizations/rega.consortium.local/tlsca/tlsca.rega.consortium.local-cert.pem"
export PEER0_REGB_CA="${NETWORK_DIR}/organizations/peerOrganizations/regb.consortium.local/tlsca/tlsca.regb.consortium.local-cert.pem"
export PEER0_BANKA1_CA="${NETWORK_DIR}/organizations/peerOrganizations/banka1.consortium.local/tlsca/tlsca.banka1.consortium.local-cert.pem"
export PEER0_BANKB1_CA="${NETWORK_DIR}/organizations/peerOrganizations/bankb1.consortium.local/tlsca/tlsca.bankb1.consortium.local-cert.pem"
export PEER0_AUDITOR_CA="${NETWORK_DIR}/organizations/peerOrganizations/auditor.consortium.local/tlsca/tlsca.auditor.consortium.local-cert.pem"

# Orderer admin TLS certs for channel participation
export ORDERER_ADMIN_TLS_SIGN_CERT="${NETWORK_DIR}/organizations/ordererOrganizations/consortium.local/orderers/orderer.consortium.local/tls/server.crt"
export ORDERER_ADMIN_TLS_PRIVATE_KEY="${NETWORK_DIR}/organizations/ordererOrganizations/consortium.local/orderers/orderer.consortium.local/tls/server.key"

# Set environment variables for specific peer org
setGlobals() {
  local ORG="${1:-rega}"
  case "$ORG" in
    rega|RegA|1)
      export CORE_PEER_LOCALMSPID="RegAMSP"
      export CORE_PEER_TLS_ROOTCERT_FILE="${PEER0_REGA_CA}"
      export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/organizations/peerOrganizations/rega.consortium.local/users/Admin@rega.consortium.local/msp"
      export CORE_PEER_ADDRESS="peer0.rega.consortium.local:7051"
      ;;
    regb|RegB|2)
      export CORE_PEER_LOCALMSPID="RegBMSP"
      export CORE_PEER_TLS_ROOTCERT_FILE="${PEER0_REGB_CA}"
      export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/organizations/peerOrganizations/regb.consortium.local/users/Admin@regb.consortium.local/msp"
      export CORE_PEER_ADDRESS="peer0.regb.consortium.local:8051"
      ;;
    banka1|BankA1|a1|A1|3)
      export CORE_PEER_LOCALMSPID="BankA1MSP"
      export CORE_PEER_TLS_ROOTCERT_FILE="${PEER0_BANKA1_CA}"
      export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/organizations/peerOrganizations/banka1.consortium.local/users/Admin@banka1.consortium.local/msp"
      export CORE_PEER_ADDRESS="peer0.banka1.consortium.local:9051"
      ;;
    bankb1|BankB1|b1|B1|4)
      export CORE_PEER_LOCALMSPID="BankB1MSP"
      export CORE_PEER_TLS_ROOTCERT_FILE="${PEER0_BANKB1_CA}"
      export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/organizations/peerOrganizations/bankb1.consortium.local/users/Admin@bankb1.consortium.local/msp"
      export CORE_PEER_ADDRESS="peer0.bankb1.consortium.local:10051"
      ;;
    auditor|Auditor|aud|Aud|5)
      export CORE_PEER_LOCALMSPID="AuditorMSP"
      export CORE_PEER_TLS_ROOTCERT_FILE="${PEER0_AUDITOR_CA}"
      export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/organizations/peerOrganizations/auditor.consortium.local/users/Admin@auditor.consortium.local/msp"
      export CORE_PEER_ADDRESS="peer0.auditor.consortium.local:11051"
      ;;
    *)
      echo "ERROR: Unknown organization: ${ORG}"
      exit 1
      ;;
  esac
}

verifyResult() {
  if [ "$1" -ne 0 ]; then
    echo "ERROR: $2"
    exit 1
  fi
}
