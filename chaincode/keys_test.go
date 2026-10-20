package main

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestKeys(t *testing.T) {
	require.Equal(t, "coll_INR_A1", collName("INR", "BankA1MSP"))
	require.Equal(t, "coll_INR_B1", collName("INR", "BankB1MSP"))
	require.Equal(t, "coll_SGD_A1", collName("SGD", "BankA1MSP"))
	require.Equal(t, "coll_SGD_B1", collName("SGD", "BankB1MSP"))
	require.Equal(t, "_implicit_org_RegAMSP", implicitColl("RegAMSP"))

	require.Equal(t, "ACCT~INR~A1", accountKey("INR", "A1"))
	require.Equal(t, "HOLD~INR~T-1", holdKey("INR", "T-1"))
	require.Equal(t, "ISSUANCE~INR~RTGS-1", issuanceKey("INR", "RTGS-1"))
	require.Equal(t, "TRADEDETAIL~T-1", tradeDetailKey("T-1"))
	require.Equal(t, "REFUSALDETAIL~tx-1", refusalDetailKey("tx-1"))
	require.Equal(t, "TRADE~T-1", tradeKey("T-1"))
	require.Equal(t, "TRADELEG~T-1~A", tradeLegKey("T-1", "A"))
	require.Equal(t, "TRADESETTLE~T-1", tradeSettleKey("T-1"))
	require.Equal(t, "RULES~JUR-A", rulesKey("JUR-A"))
	require.Equal(t, "RESERVE~INR", reserveKey("INR"))
	require.Equal(t, "SUPPLY~INR", supplyKey("INR"))
	require.Equal(t, "REFUSAL~tx-1", refusalKey("tx-1"))

	ref := computeAcctRef("JUR-A", "ACCT~INR~A1")
	require.NotEmpty(t, ref)
	require.Equal(t, 64, len(ref))
}
