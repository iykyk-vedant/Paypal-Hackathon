#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${NETWORK_DIR}/.." && pwd)"

FROM_STEP="${FROM_STEP:-0}"

# ==============================================================================
# INNER MODE: Steps 0-9 inside fabric-tools:2.5
# ==============================================================================
if [ "${1:-}" = "--inner-0-9" ]; then
  . /work/scripts/envVar.sh

  b64() {
    printf '%s' "$1" | base64 | tr -d '\r\n'
  }

  echo "============================================================"
  echo "=== FABRIC CLI ROUND-TRIP TEST SUITE (STEPS 0 - 9)       ==="
  echo "=== Starting from Step: ${FROM_STEP}                     ==="
  echo "============================================================"

  # Step 0 — rules
  if [ "${FROM_STEP}" -le 0 ]; then
    echo ""
    echo "=== Step 0 — rules (24h windows) ==="

    echo "--- [Step 0.1] Invoking UpdateRules for JUR-A as RegA ---"
    setGlobals rega
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"UpdateRules","Args":["JUR-A","{\"jurisdiction\":\"JUR-A\",\"version\":0,\"opStartMin\":0,\"opEndMin\":1440,\"utcOffsetMin\":330,\"maxTxAmount\":50000000000,\"maxDailyMint\":1000000000000,\"halted\":false,\"eligibleMsps\":[],\"approvedBy\":[]}"]}' \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent

    echo "--- [Step 0.2] Invoking UpdateRules for JUR-B as RegB ---"
    setGlobals regb
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"UpdateRules","Args":["JUR-B","{\"jurisdiction\":\"JUR-B\",\"version\":0,\"opStartMin\":0,\"opEndMin\":1440,\"utcOffsetMin\":480,\"maxTxAmount\":1000000000,\"maxDailyMint\":100000000000,\"halted\":false,\"eligibleMsps\":[],\"approvedBy\":[]}"]}' \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent

    echo "--- [Step 0.3] Verifying GetRules JUR-A ---"
    setGlobals rega
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetRules","Args":["JUR-A"]}'

    echo "--- [Step 0.4] Verifying GetRules JUR-B ---"
    setGlobals regb
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetRules","Args":["JUR-B"]}'
  fi

  # Step 1 — reserves
  if [ "${FROM_STEP}" -le 1 ]; then
    echo ""
    echo "=== Step 1 — reserves ==="

    echo "--- [Step 1.1] Invoking AttestReserve for INR as RegA ---"
    setGlobals rega
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"AttestReserve","Args":["INR","1000000000000","STMT-A-1"]}' \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent

    echo "--- [Step 1.2] Invoking AttestReserve for SGD as RegB ---"
    setGlobals regb
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"AttestReserve","Args":["SGD","100000000000","STMT-B-1"]}' \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent

    echo "--- [Step 1.3] Verifying GetReserve INR ---"
    setGlobals rega
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetReserve","Args":["INR"]}'
  fi

  # Step 2 — mint
  if [ "${FROM_STEP}" -le 2 ]; then
    echo ""
    echo "=== Step 2 — mint ==="

    echo "--- [Step 2.1] Invoking Mint INR to BankA1MSP (50000000000) as RegA ---"
    setGlobals rega
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"Mint","Args":["INR","BankA1MSP","50000000000","RTGS-A-001"]}' \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent

    echo "--- [Step 2.2] Invoking Mint INR to BankB1MSP (10000000000) as RegA ---"
    setGlobals rega
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"Mint","Args":["INR","BankB1MSP","10000000000","RTGS-A-002"]}' \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent

    echo "--- [Step 2.3] Invoking Mint SGD to BankB1MSP (50000000000) as RegB ---"
    setGlobals regb
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"Mint","Args":["SGD","BankB1MSP","50000000000","RTGS-B-001"]}' \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent

    echo "--- [Step 2.4] Invoking Mint SGD to BankA1MSP (5000000000) as RegB ---"
    setGlobals regb
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"Mint","Args":["SGD","BankA1MSP","5000000000","RTGS-B-002"]}' \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent
  fi

  # Step 3 — balances
  if [ "${FROM_STEP}" -le 3 ]; then
    echo ""
    echo "=== Step 3 — balances ==="

    echo "--- [Step 3.1] Verifying GetAccount INR BankA1MSP as banka1 ---"
    setGlobals banka1
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["INR","BankA1MSP"]}'

    echo "--- [Step 3.2] Verifying GetAccount SGD BankB1MSP as bankb1 ---"
    setGlobals bankb1
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["SGD","BankB1MSP"]}'

    echo "--- [Step 3.3] Verifying GetAccount INR BankA1MSP as bankb1 (MUST FAIL) ---"
    setGlobals bankb1
    set +e
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["INR","BankA1MSP"]}'
    FAIL_RES=$?
    set -e
    if [ $FAIL_RES -ne 0 ]; then
      echo "PASS: Query correctly failed (bankb1 not in coll_INR_A1)"
    else
      echo "ERROR: Query succeeded when it should have failed!"
      exit 1
    fi
  fi

  # Step 4 — propose
  if [ "${FROM_STEP}" -le 4 ]; then
    echo ""
    echo "=== Step 4 — propose ==="
    NOW=$(date +%s)
    ACCEPT_BY=$((NOW+600))
    CUTOFF=$((NOW+1200))
    DETAIL='{"tradeId":"T-CLI1","ccyA":"INR","amountA":10000000000,"ccyB":"SGD","amountB":160000000,"proposer":"BankA1MSP","cparty":"BankB1MSP","fxRate":"0.016","reference":"cli","salt":"0123456789abcdef0123456789abcdef"}'

    echo "--- [Step 4.1] Invoking ProposeTrade for T-CLI1 as BankA1 ---"
    setGlobals banka1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c "{\"function\":\"ProposeTrade\",\"Args\":[\"T-CLI1\",\"INR\",\"10000000000\",\"SGD\",\"160000000\",\"BankB1MSP\",\"${ACCEPT_BY}\",\"${CUTOFF}\"]}" \
      --transient "{\"detail\":\"$(b64 "${DETAIL}")\",\"salt\":\"$(b64 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)\"}" \
      --waitForEvent

    echo "--- [Step 4.2] Verifying GetAccount INR BankA1MSP as banka1 ---"
    setGlobals banka1
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["INR","BankA1MSP"]}'

    echo "--- [Step 4.3] Verifying GetTrade T-CLI1 as banka1 ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetTrade","Args":["T-CLI1"]}'
  fi

  # Step 5 — accept
  if [ "${FROM_STEP}" -le 5 ]; then
    echo ""
    echo "=== Step 5 — accept ==="
    DETAIL='{"tradeId":"T-CLI1","ccyA":"INR","amountA":10000000000,"ccyB":"SGD","amountB":160000000,"proposer":"BankA1MSP","cparty":"BankB1MSP","fxRate":"0.016","reference":"cli","salt":"0123456789abcdef0123456789abcdef"}'

    echo "--- [Step 5.1] Invoking AcceptTrade for T-CLI1 as BankB1 ---"
    setGlobals bankb1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"AcceptTrade","Args":["T-CLI1"]}' \
      --transient "{\"detail\":\"$(b64 "${DETAIL}")\",\"salt\":\"$(b64 bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)\"}" \
      --waitForEvent

    echo "--- [Step 5.2] Verifying GetTrade T-CLI1 as bankb1 ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetTrade","Args":["T-CLI1"]}'

    echo "--- [Step 5.3] Verifying GetAccount SGD BankB1MSP as bankb1 ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["SGD","BankB1MSP"]}'
  fi

  # Step 6 — settle + SBE negative check
  if [ "${FROM_STEP}" -le 6 ]; then
    echo ""
    echo "=== Step 6 — settle ==="

    echo "--- [Step 6.1] Invoking Settle for T-CLI1 as BankA1 endorsed by BOTH regulators ---"
    setGlobals banka1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses peer0.rega.consortium.local:7051 --tlsRootCertFiles "${PEER0_REGA_CA}" \
      --peerAddresses peer0.regb.consortium.local:8051 --tlsRootCertFiles "${PEER0_REGB_CA}" \
      -c '{"function":"Settle","Args":["T-CLI1"]}' \
      --waitForEvent

    echo "--- [Step 6.2] Verifying GetTrade T-CLI1 after Settle ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetTrade","Args":["T-CLI1"]}'

    echo ""
    echo "=== Step 6 Negative Check — SBE Enforcement with T-CLI3 ==="
    NOW3=$(date +%s)
    ACCEPT_BY3=$((NOW3+600))
    CUTOFF3=$((NOW3+1200))
    DETAIL3='{"tradeId":"T-CLI3","ccyA":"INR","amountA":1000000000,"ccyB":"SGD","amountB":16000000,"proposer":"BankA1MSP","cparty":"BankB1MSP","fxRate":"0.016","reference":"cli3","salt":"0123456789abcdef0123456789abcdef"}'

    echo "--- [Step 6.neg.1] Invoking ProposeTrade for T-CLI3 as BankA1 ---"
    setGlobals banka1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c "{\"function\":\"ProposeTrade\",\"Args\":[\"T-CLI3\",\"INR\",\"1000000000\",\"SGD\",\"16000000\",\"BankB1MSP\",\"${ACCEPT_BY3}\",\"${CUTOFF3}\"]}" \
      --transient "{\"detail\":\"$(b64 "${DETAIL3}")\",\"salt\":\"$(b64 33333333333333333333333333333333)\"}" \
      --waitForEvent

    echo "--- [Step 6.neg.2] Invoking AcceptTrade for T-CLI3 as BankB1 ---"
    setGlobals bankb1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"AcceptTrade","Args":["T-CLI3"]}' \
      --transient "{\"detail\":\"$(b64 "${DETAIL3}")\",\"salt\":\"$(b64 44444444444444444444444444444444)\"}" \
      --waitForEvent

    echo "--- [Step 6.neg.3] Invoking Settle for T-CLI3 with RegA ONLY (MUST FAIL ENDORSEMENT_POLICY_FAILURE) ---"
    setGlobals banka1
    set +e
    FAIL_OUT=$(peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses peer0.rega.consortium.local:7051 --tlsRootCertFiles "${PEER0_REGA_CA}" \
      -c '{"function":"Settle","Args":["T-CLI3"]}' \
      --waitForEvent 2>&1)
    FAIL_RC=$?
    set -e
    echo "${FAIL_OUT}"

    if [ $FAIL_RC -ne 0 ] || echo "${FAIL_OUT}" | grep -qi "ENDORSEMENT_POLICY_FAILURE"; then
      echo "PASS: Settle with RegA only correctly failed (status: ENDORSEMENT_POLICY_FAILURE)"
    else
      echo "ERROR: Settle should have failed endorsement policy check but succeeded!"
      exit 1
    fi

    echo "--- [Step 6.neg.4] Invoking Settle for T-CLI3 correctly endorsed by BOTH RegA and RegB ---"
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses peer0.rega.consortium.local:7051 --tlsRootCertFiles "${PEER0_REGA_CA}" \
      --peerAddresses peer0.regb.consortium.local:8051 --tlsRootCertFiles "${PEER0_REGB_CA}" \
      -c '{"function":"Settle","Args":["T-CLI3"]}' \
      --waitForEvent

    echo "--- [Step 6.neg.5] Verifying GetTrade T-CLI3 is SETTLED (not left dangling) ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetTrade","Args":["T-CLI3"]}'

    echo "--- [Step 6.neg.6] Bookkeeping on T-CLI3: releasing holds ---"
    setGlobals banka1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"SettleDebit","Args":["T-CLI3","A"]}' \
      --waitForEvent

    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"CreditPayee","Args":["T-CLI3","B"]}' \
      --waitForEvent

    setGlobals bankb1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"SettleDebit","Args":["T-CLI3","B"]}' \
      --waitForEvent

    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"CreditPayee","Args":["T-CLI3","A"]}' \
      --waitForEvent
  fi

  # Step 7 — credit by payee alone
  if [ "${FROM_STEP}" -le 7 ]; then
    echo ""
    echo "=== Step 7 — credit by payee alone ==="

    echo "--- [Step 7.1] Invoking CreditPayee T-CLI1 leg B as BankA1 ---"
    setGlobals banka1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"CreditPayee","Args":["T-CLI1","B"]}' \
      --waitForEvent

    echo "--- [Step 7.2] Verifying GetAccount SGD BankA1MSP as banka1 ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["SGD","BankA1MSP"]}'

    echo "--- [Step 7.3] Verifying GetTrade T-CLI1 after CreditPayee B ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetTrade","Args":["T-CLI1"]}'
  fi

  # Step 8 — remaining bookkeeping
  if [ "${FROM_STEP}" -le 8 ]; then
    echo ""
    echo "=== Step 8 — remaining bookkeeping ==="

    echo "--- [Step 8.1] as BankB1: SettleDebit T-CLI1 leg B ---"
    setGlobals bankb1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"SettleDebit","Args":["T-CLI1","B"]}' \
      --waitForEvent

    echo "--- [Step 8.2] Verifying GetAccount SGD BankB1MSP (held 0) ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["SGD","BankB1MSP"]}'

    echo "--- [Step 8.3] as BankB1: CreditPayee T-CLI1 leg A ---"
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"CreditPayee","Args":["T-CLI1","A"]}' \
      --waitForEvent

    echo "--- [Step 8.4] Verifying GetAccount INR BankB1MSP ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["INR","BankB1MSP"]}'

    echo "--- [Step 8.5] as BankA1: SettleDebit T-CLI1 leg A ---"
    setGlobals banka1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"SettleDebit","Args":["T-CLI1","A"]}' \
      --waitForEvent

    echo "--- [Step 8.6] Verifying GetAccount INR BankA1MSP (held 0) ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["INR","BankA1MSP"]}'

    echo "--- [Step 8.7] as BankA1: CreditPayee T-CLI1 leg B again (idempotent) ---"
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"CreditPayee","Args":["T-CLI1","B"]}' \
      --waitForEvent

    echo "--- [Step 8.8] Verifying GetAccount SGD BankA1MSP (balance unchanged) ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["SGD","BankA1MSP"]}'
  fi

  # Step 9 — expiry path (quick)
  if [ "${FROM_STEP}" -le 9 ]; then
    echo ""
    echo "=== Step 9 — expiry path ==="
    NOW2=$(date +%s)
    ACCEPT_BY2=$((NOW2+5))
    CUTOFF2=$((NOW2+600))
    DETAIL2='{"tradeId":"T-CLI2","ccyA":"INR","amountA":10000000000,"ccyB":"SGD","amountB":160000000,"proposer":"BankA1MSP","cparty":"BankB1MSP","fxRate":"0.016","reference":"cli2","salt":"0123456789abcdef0123456789abcdef"}'

    echo "--- [Step 9.1] as BankA1: ProposeTrade T-CLI2 with acceptBy=${ACCEPT_BY2} ---"
    setGlobals banka1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c "{\"function\":\"ProposeTrade\",\"Args\":[\"T-CLI2\",\"INR\",\"10000000000\",\"SGD\",\"160000000\",\"BankB1MSP\",\"${ACCEPT_BY2}\",\"${CUTOFF2}\"]}" \
      --transient "{\"detail\":\"$(b64 "${DETAIL2}")\",\"salt\":\"$(b64 22222222222222222222222222222222)\"}" \
      --waitForEvent

    echo "Sleeping 8 seconds for acceptBy window to expire..."
    sleep 8

    echo "--- [Step 9.2] as Auditor: invoke ExpireTrade T-CLI2 ---"
    setGlobals auditor
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"ExpireTrade","Args":["T-CLI2"]}' \
      --waitForEvent

    echo "--- [Step 9.3] as BankA1: invoke ReturnHold T-CLI2 leg A ---"
    setGlobals banka1
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c '{"function":"ReturnHold","Args":["T-CLI2","A"]}' \
      --waitForEvent

    echo "--- [Step 9.4] Verifying GetAccount INR BankA1MSP (held 0, available restored) ---"
    peer chaincode query -C settlement -n settlement-cc -c '{"function":"GetAccount","Args":["INR","BankA1MSP"]}'
  fi

  echo "=== Steps 0-9 completed successfully ==="
  exit 0
fi

# ==============================================================================
# HOST MODE: Orchestrates Steps 0-9 in fabric-tools, and Steps 10 & 11 natively
# ==============================================================================
HOST_DIR="${ROOT_DIR}"
if pwd -W >/dev/null 2>&1; then
  HOST_DIR="$(pwd -W)"
fi

peer_exec() {
  local CMD_CONTENT="$1"
  docker run --rm \
    -v "${HOST_DIR}/network:/work" \
    -w /work \
    --network consortium \
    hyperledger/fabric-tools:2.5 \
    bash -c "
      set -euo pipefail
      . scripts/envVar.sh
      b64() { printf '%s' \"\$1\" | base64 | tr -d '\r\n'; }
      ${CMD_CONTENT}
    "
}

# --- Steps 0-9 Execution ---
if [ "${FROM_STEP}" -le 9 ]; then
  echo ">>> Running Steps 0-9 (from step ${FROM_STEP}) in fabric-tools:2.5 container..."
  docker run --rm \
    -e FROM_STEP="${FROM_STEP}" \
    -v "${HOST_DIR}/network:/work" \
    -w /work \
    --network consortium \
    hyperledger/fabric-tools:2.5 \
    bash /work/scripts/cli-roundtrip.sh --inner-0-9
fi

# --- Step 10 — JUR-B dark after settle (NET-18, the demo thesis) ---
if [ "${FROM_STEP}" -le 10 ]; then
  echo ""
  echo "============================================================"
  echo "=== Step 10 — JUR-B dark after settle (NET-18)            ==="
  echo "============================================================"

  echo "--- [Step 10.1] Bilateral trade T-CLI4: Propose, Accept, Settle ---"
  peer_exec '
    NOW=$(date +%s)
    ACCEPT_BY=$((NOW+600))
    CUTOFF=$((NOW+1200))
    DETAIL4="{\"tradeId\":\"T-CLI4\",\"ccyA\":\"INR\",\"amountA\":10000000000,\"ccyB\":\"SGD\",\"amountB\":160000000,\"proposer\":\"BankA1MSP\",\"cparty\":\"BankB1MSP\",\"fxRate\":\"0.016\",\"reference\":\"cli4\",\"salt\":\"0123456789abcdef0123456789abcdef\"}"

    setGlobals banka1
    TRADE4_EXIST=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetTrade\",\"Args\":[\"T-CLI4\"]}" 2>/dev/null || echo "")
    if echo "${TRADE4_EXIST}" | grep -q "T-CLI4"; then
      echo "T-CLI4 already exists on ledger: ${TRADE4_EXIST}"
    else
      echo "Proposing T-CLI4 as BankA1..."
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"ProposeTrade\",\"Args\":[\"T-CLI4\",\"INR\",\"10000000000\",\"SGD\",\"160000000\",\"BankB1MSP\",\"${ACCEPT_BY}\",\"${CUTOFF}\"]}" \
        --transient "{\"detail\":\"$(b64 "${DETAIL4}")\",\"salt\":\"$(b64 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)\"}" \
        --waitForEvent

      echo "Accepting T-CLI4 as BankB1..."
      setGlobals bankb1
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"AcceptTrade\",\"Args\":[\"T-CLI4\"]}" \
        --transient "{\"detail\":\"$(b64 "${DETAIL4}")\",\"salt\":\"$(b64 bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)\"}" \
        --waitForEvent

      echo "Settling T-CLI4 with RegA AND RegB..."
      setGlobals banka1
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses peer0.rega.consortium.local:7051 --tlsRootCertFiles "${PEER0_REGA_CA}" \
        --peerAddresses peer0.regb.consortium.local:8051 --tlsRootCertFiles "${PEER0_REGB_CA}" \
        -c "{\"function\":\"Settle\",\"Args\":[\"T-CLI4\"]}" \
        --waitForEvent
    fi

    echo "Verifying T-CLI4 status is SETTLED..."
    TRADE_OUT=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetTrade\",\"Args\":[\"T-CLI4\"]}")
    echo "${TRADE_OUT}"
    echo "${TRADE_OUT}" | grep -q "\"status\":\"SETTLED\"" || { echo "ERROR: T-CLI4 not SETTLED"; exit 1; }
  '

  echo ""
  echo "--- [Step 10.2] make stop-jurb (JurB dark) ---"
  T10_START=$(date +%s)
  make stop-jurb
  RUNNING=$(docker ps --format '{{.Names}}')
  echo "Running containers after stop-jurb:"
  echo "${RUNNING}"
  if echo "${RUNNING}" | grep -E "peer0\.regb|cc\.regb|peer0\.bankb1|cc\.bankb1"; then
    echo "ERROR: regb or bankb1 containers still running after stop-jurb!"
    exit 1
  fi
  echo "PASS: JurB containers completely offline"

  echo ""
  echo "--- [Step 10.3 & 10.4] CreditPayee & SettleDebit as BankA1 while JurB is DARK ---"
  peer_exec '
    setGlobals banka1
    echo "Invoking CreditPayee T-CLI4 leg B (peerAddresses banka1 ONLY)..."
    CREDIT_OUT=$(peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c "{\"function\":\"CreditPayee\",\"Args\":[\"T-CLI4\",\"B\"]}" \
      --waitForEvent 2>&1)
    echo "${CREDIT_OUT}"
    echo "${CREDIT_OUT}" | grep -q "status (VALID)" || { echo "ERROR: CreditPayee not committed VALID"; exit 1; }
    echo "${CREDIT_OUT}" | grep -q "status:200" || { echo "ERROR: CreditPayee did not return 200"; exit 1; }

    echo "Verifying GetAccount SGD BankA1MSP..."
    ACCT_SGD=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetAccount\",\"Args\":[\"SGD\",\"BankA1MSP\"]}")
    echo "Account SGD BankA1MSP: ${ACCT_SGD}"

    echo "Verifying GetTrade T-CLI4 legB creditStatus..."
    TRADE_A1=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetTrade\",\"Args\":[\"T-CLI4\"]}")
    echo "${TRADE_A1}"
    echo "${TRADE_A1}" | grep -q "\"creditStatus\":\"CREDITED\"" || { echo "ERROR: legB creditStatus not CREDITED"; exit 1; }

    echo "Invoking SettleDebit T-CLI4 leg A (A1 own leg)..."
    DEBIT_OUT=$(peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c "{\"function\":\"SettleDebit\",\"Args\":[\"T-CLI4\",\"A\"]}" \
      --waitForEvent 2>&1)
    echo "${DEBIT_OUT}"
    echo "${DEBIT_OUT}" | grep -q "status (VALID)" || { echo "ERROR: SettleDebit not committed VALID"; exit 1; }
  '

  T10_END=$(date +%s)
  WALL_CLOCK_SECS=$((T10_END - T10_START))
  echo ">>> WALL-CLOCK DURATION: ${WALL_CLOCK_SECS} seconds elapsed between make stop-jurb and CreditPayee completion!"

  echo ""
  echo "--- [Step 10.5] make start-jurb and catch up sync ---"
  make start-jurb

  echo "Polling channel height on peer0.regb and peer0.bankb1 (up to 90s)..."
  TARGET_HEIGHT=$(docker run --rm -v "${HOST_DIR}/network:/work" -w /work --network consortium hyperledger/fabric-tools:2.5 bash -c '. scripts/envVar.sh && setGlobals banka1 && peer channel getinfo -c settlement 2>/dev/null' | grep -o '"height":[0-9]*' | cut -d: -f2 | tr -d '\r\n')
  echo "Target height from peer0.banka1: ${TARGET_HEIGHT}"

  SYNCED=false
  for i in $(seq 1 90); do
    STATUS_HEIGHTS=$(docker run --rm -v "${HOST_DIR}/network:/work" -w /work --network consortium hyperledger/fabric-tools:2.5 bash -c '
      . scripts/envVar.sh
      setGlobals regb
      HR=$(peer channel getinfo -c settlement 2>/dev/null | grep -o "\"height\":[0-9]*" | cut -d: -f2 || echo 0)
      setGlobals bankb1
      HB=$(peer channel getinfo -c settlement 2>/dev/null | grep -o "\"height\":[0-9]*" | cut -d: -f2 || echo 0)
      echo "${HR}:${HB}"
    ' 2>/dev/null | tr -d '\r\n' || echo "0:0")

    HR=$(echo "${STATUS_HEIGHTS}" | cut -d: -f1)
    HB=$(echo "${STATUS_HEIGHTS}" | cut -d: -f2)

    if [ "${HR}" = "${TARGET_HEIGHT}" ] && [ "${HB}" = "${TARGET_HEIGHT}" ]; then
      echo "PASS: peer0.regb (height ${HR}) and peer0.bankb1 (height ${HB}) fully synced with peer0.banka1 after ${i}s"
      SYNCED=true
      break
    fi
    sleep 1
  done

  if [ "${SYNCED}" != "true" ]; then
    echo "ERROR: JurB peers failed to catch up to target height ${TARGET_HEIGHT} within 90s"
    exit 1
  fi

  echo ""
  echo "--- [Step 10.6] BankB1 verifies offline credit & completes bookkeeping ---"
  peer_exec '
    setGlobals bankb1
    echo "Verifying GetTrade T-CLI4 as BankB1..."
    TRADE_B1=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetTrade\",\"Args\":[\"T-CLI4\"]}")
    echo "${TRADE_B1}"
    echo "${TRADE_B1}" | grep -q "\"status\":\"SETTLED\"" || { echo "ERROR: trade not SETTLED"; exit 1; }
    echo "${TRADE_B1}" | grep -q "\"creditStatus\":\"CREDITED\"" || { echo "ERROR: legB creditStatus not CREDITED"; exit 1; }

    echo "Invoking SettleDebit T-CLI4 leg B as BankB1..."
    DEBIT_B=$(peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c "{\"function\":\"SettleDebit\",\"Args\":[\"T-CLI4\",\"B\"]}" \
      --waitForEvent 2>&1)
    echo "${DEBIT_B}"
    echo "${DEBIT_B}" | grep -q "status (VALID)" || { echo "ERROR: SettleDebit B not VALID"; exit 1; }

    echo "Verifying GetAccount SGD BankB1MSP (held 0)..."
    ACCT_B1=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetAccount\",\"Args\":[\"SGD\",\"BankB1MSP\"]}")
    echo "${ACCT_B1}"
    echo "${ACCT_B1}" | grep -q "\"held\":0" || { echo "ERROR: BankB1 SGD held is not 0"; exit 1; }

    echo "Invoking CreditPayee T-CLI4 leg A as BankB1..."
    CREDIT_A=$(peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c "{\"function\":\"CreditPayee\",\"Args\":[\"T-CLI4\",\"A\"]}" \
      --waitForEvent 2>&1)
    echo "${CREDIT_A}"
    echo "${CREDIT_A}" | grep -q "status (VALID)" || { echo "ERROR: CreditPayee A not VALID"; exit 1; }
    echo "PASS: BankB1 successfully credited and reconciled"
  '
  echo "=== Step 10 completed successfully! ==="
fi

# --- Step 11 — committed refusal (NET-19) ---
if [ "${FROM_STEP}" -le 11 ]; then
  echo ""
  echo "============================================================"
  echo "=== Step 11 — committed refusal (NET-19)                 ==="
  echo "============================================================"

  peer_exec '
    NOW=$(date +%s)
    m=$(( ((NOW + 480*60) % 86400) / 60 ))
    opStartMin=$(((m + 120) % 1440))
    opEndMin=$(((m + 180) % 1440))
    if [ $opStartMin -ge $opEndMin ]; then
      opStartMin=$(((m + 60) % 1440))
      opEndMin=$((opStartMin + 60))
      if [ $opEndMin -gt 1440 ]; then
        opStartMin=0
        opEndMin=1
      fi
    fi

    echo "--- [Step 11.1] as RegB: UpdateRules JUR-B to [${opStartMin}, ${opEndMin}] (local minute m=${m} excluded) ---"
    setGlobals regb
    peer chaincode invoke \
      -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
      --tls --cafile "${ORDERER_CA}" \
      -C settlement -n settlement-cc \
      --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
      -c "{\"function\":\"UpdateRules\",\"Args\":[\"JUR-B\",\"{\\\"jurisdiction\\\":\\\"JUR-B\\\",\\\"version\\\":0,\\\"opStartMin\\\":${opStartMin},\\\"opEndMin\\\":${opEndMin},\\\"utcOffsetMin\\\":480,\\\"maxTxAmount\\\":1000000000,\\\"maxDailyMint\\\":100000000000,\\\"halted\\\":false,\\\"eligibleMsps\\\":[],\\\"approvedBy\\\":[]}\"]}" \
      --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
      --waitForEvent

    RULES_B_JSON=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetRules\",\"Args\":[\"JUR-B\"]}")
    echo "JUR-B Rules: ${RULES_B_JSON}"
    V=$(echo "${RULES_B_JSON}" | grep -o "\"version\":[0-9]*" | cut -d: -f2)
    echo "Recorded ruleVersion V = ${V}"

    DETAIL5="{\"tradeId\":\"T-CLI5\",\"ccyA\":\"INR\",\"amountA\":1000000000,\"ccyB\":\"SGD\",\"amountB\":16000000,\"proposer\":\"BankA1MSP\",\"cparty\":\"BankB1MSP\",\"fxRate\":\"0.016\",\"reference\":\"cli5\",\"salt\":\"0123456789abcdef0123456789abcdef\"}"

    setGlobals banka1
    TRADE5_STATUS=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetTrade\",\"Args\":[\"T-CLI5\"]}" 2>/dev/null || echo "")
    if echo "${TRADE5_STATUS}" | grep -q "SETTLED"; then
      echo "T-CLI5 is already SETTLED on ledger from a prior run."
      echo "Verifying refusal record in ListRefusals..."
      setGlobals auditor
      REFUSALS_JSON=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"ListRefusals\",\"Args\":[]}")
      echo "Refusals list: ${REFUSALS_JSON}"
      echo "${REFUSALS_JSON}" | grep -q "T-CLI5" || { echo "ERROR: ListRefusals missing T-CLI5"; exit 1; }
      echo "${REFUSALS_JSON}" | grep -q "OUTSIDE_OPERATING_HOURS" || { echo "ERROR: ListRefusals missing OUTSIDE_OPERATING_HOURS"; exit 1; }
      echo "${REFUSALS_JSON}" | grep -q "BankB1MSP" || { echo "ERROR: ListRefusals invokerMsp mismatch"; exit 1; }
      echo "${REFUSALS_JSON}" | grep -q "acctRef" || { echo "ERROR: ListRefusals acctRef missing"; exit 1; }
      echo "PASS: Refusal record confirmed on ledger via ListRefusals"

      echo "Verifying JUR-B operating hours restored to 0-1440..."
      setGlobals regb
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"UpdateRules\",\"Args\":[\"JUR-B\",\"{\\\"jurisdiction\\\":\\\"JUR-B\\\",\\\"version\\\":0,\\\"opStartMin\\\":0,\\\"opEndMin\\\":1440,\\\"utcOffsetMin\\\":480,\\\"maxTxAmount\\\":1000000000,\\\"maxDailyMint\\\":100000000000,\\\"halted\\\":false,\\\"eligibleMsps\\\":[],\\\"approvedBy\\\":[]}\"]}" \
        --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
        --waitForEvent
      echo "PASS: JUR-B operating rules active 0-1440"
    else
      echo "--- [Step 11.2] as BankA1: ProposeTrade T-CLI5 ---"
      setGlobals banka1
      NOW5=$(date +%s)
      ACCEPT_BY5=$((NOW5+600))
      CUTOFF5=$((NOW5+1200))
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"ProposeTrade\",\"Args\":[\"T-CLI5\",\"INR\",\"1000000000\",\"SGD\",\"16000000\",\"BankB1MSP\",\"${ACCEPT_BY5}\",\"${CUTOFF5}\"]}" \
        --transient "{\"detail\":\"$(b64 "${DETAIL5}")\",\"salt\":\"$(b64 55555555555555555555555555555555)\"}" \
        --waitForEvent

      echo "--- [Step 11.3] as BankB1: AcceptTrade T-CLI5 (MUST REFUSE and commit VALID) ---"
      setGlobals bankb1
      ACCEPT_RES=$(peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"AcceptTrade\",\"Args\":[\"T-CLI5\"]}" \
        --transient "{\"detail\":\"$(b64 "${DETAIL5}")\",\"salt\":\"$(b64 66666666666666666666666666666666)\"}" \
        --waitForEvent 2>&1)
      echo "${ACCEPT_RES}"

      echo "${ACCEPT_RES}" | grep -q "status (VALID)" || { echo "ERROR: Transaction was not committed with status (VALID)"; exit 1; }
      echo "${ACCEPT_RES}" | grep -q "REFUSED" || { echo "ERROR: Status is not REFUSED"; exit 1; }
      echo "${ACCEPT_RES}" | grep -q "OUTSIDE_OPERATING_HOURS" || { echo "ERROR: Reason code is not OUTSIDE_OPERATING_HOURS"; exit 1; }
      echo "${ACCEPT_RES}" | grep -q "ruleVersion.*${V}" || { echo "ERROR: Rule version does not match V=${V}"; exit 1; }
      echo "PASS: Refusal committed as VALID transaction on ledger with status:REFUSED and reasonCode:OUTSIDE_OPERATING_HOURS"

      echo "--- [Step 11.4] as Auditor: ListRefusals & as BankB1: verify balances & trade status ---"
      setGlobals auditor
      REFUSALS_JSON=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"ListRefusals\",\"Args\":[]}")
      echo "Refusals list: ${REFUSALS_JSON}"
      echo "${REFUSALS_JSON}" | grep -q "T-CLI5" || { echo "ERROR: ListRefusals missing T-CLI5"; exit 1; }
      echo "${REFUSALS_JSON}" | grep -q "OUTSIDE_OPERATING_HOURS" || { echo "ERROR: ListRefusals missing OUTSIDE_OPERATING_HOURS"; exit 1; }
      echo "${REFUSALS_JSON}" | grep -q "ruleVersion.*${V}" || { echo "ERROR: ListRefusals ruleVersion mismatch"; exit 1; }
      echo "${REFUSALS_JSON}" | grep -q "BankB1MSP" || { echo "ERROR: ListRefusals invokerMsp mismatch"; exit 1; }
      echo "${REFUSALS_JSON}" | grep -q "acctRef" || { echo "ERROR: ListRefusals acctRef missing"; exit 1; }
      if echo "${REFUSALS_JSON}" | grep -q "\"acctRef\":\"\""; then
        echo "ERROR: ListRefusals acctRef is empty"
        exit 1
      fi
      echo "PASS: Refusal record verified on public ledger via ListRefusals"

      setGlobals bankb1
      ACCT_B1_AFTER=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetAccount\",\"Args\":[\"SGD\",\"BankB1MSP\"]}")
      echo "Account SGD BankB1MSP: ${ACCT_B1_AFTER}"
      TRADE_5_AFTER=$(peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetTrade\",\"Args\":[\"T-CLI5\"]}")
      echo "Trade T-CLI5: ${TRADE_5_AFTER}"
      echo "${TRADE_5_AFTER}" | grep -q "PROPOSED" || { echo "ERROR: Trade status changed after refusal, expected PROPOSED"; exit 1; }
      echo "PASS: BankB1 balances untouched; Trade T-CLI5 remains PROPOSED"

      echo "--- [Step 11.5] as RegB: UpdateRules back to 0-1440 & as BankB1: AcceptTrade T-CLI5 ---"
      setGlobals regb
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"UpdateRules\",\"Args\":[\"JUR-B\",\"{\\\"jurisdiction\\\":\\\"JUR-B\\\",\\\"version\\\":0,\\\"opStartMin\\\":0,\\\"opEndMin\\\":1440,\\\"utcOffsetMin\\\":480,\\\"maxTxAmount\\\":1000000000,\\\"maxDailyMint\\\":100000000000,\\\"halted\\\":false,\\\"eligibleMsps\\\":[],\\\"approvedBy\\\":[]}\"]}" \
        --transient "{\"approver2\":\"$(b64 approver-2)\"}" \
        --waitForEvent

      setGlobals bankb1
      ACCEPT_OK=$(peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"AcceptTrade\",\"Args\":[\"T-CLI5\"]}" \
        --transient "{\"detail\":\"$(b64 "${DETAIL5}")\",\"salt\":\"$(b64 77777777777777777777777777777777)\"}" \
        --waitForEvent 2>&1)
      echo "${ACCEPT_OK}"
      echo "${ACCEPT_OK}" | grep -q "status (VALID)" || { echo "ERROR: AcceptTrade T-CLI5 not VALID"; exit 1; }
      echo "${ACCEPT_OK}" | grep -q "status:200" || echo "${ACCEPT_OK}" | grep -q "OK" || { echo "ERROR: AcceptTrade T-CLI5 did not return OK"; exit 1; }
      echo "PASS: AcceptTrade T-CLI5 succeeded after operating hours restored"

      echo "--- [Step 11.5.1] Settle T-CLI5 with both regulators ---"
      setGlobals banka1
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses peer0.rega.consortium.local:7051 --tlsRootCertFiles "${PEER0_REGA_CA}" \
        --peerAddresses peer0.regb.consortium.local:8051 --tlsRootCertFiles "${PEER0_REGB_CA}" \
        -c "{\"function\":\"Settle\",\"Args\":[\"T-CLI5\"]}" \
        --waitForEvent

      peer chaincode query -C settlement -n settlement-cc -c "{\"function\":\"GetTrade\",\"Args\":[\"T-CLI5\"]}"

      echo "--- [Step 11.5.2] Bookkeeping for T-CLI5 ---"
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"SettleDebit\",\"Args\":[\"T-CLI5\",\"A\"]}" \
        --waitForEvent
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"CreditPayee\",\"Args\":[\"T-CLI5\",\"B\"]}" \
        --waitForEvent

      setGlobals bankb1
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"SettleDebit\",\"Args\":[\"T-CLI5\",\"B\"]}" \
        --waitForEvent
      peer chaincode invoke \
        -o orderer.consortium.local:7050 --ordererTLSHostnameOverride orderer.consortium.local \
        --tls --cafile "${ORDERER_CA}" \
        -C settlement -n settlement-cc \
        --peerAddresses "${CORE_PEER_ADDRESS}" --tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}" \
        -c "{\"function\":\"CreditPayee\",\"Args\":[\"T-CLI5\",\"A\"]}" \
        --waitForEvent
    fi
  '
  echo "=== Step 11 completed successfully! ==="
fi

echo ""
echo "============================================================"
echo "=== ALL CLI ROUND-TRIP TESTS COMPLETED SUCCESSFULLY!     ==="
echo "============================================================"
