package main

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"

	"settlement-cc/internal/fakestub"
)

func TestQueries(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger first
	res, err := contract.InitLedger(ctx)
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// 1. GetRules
	rulesA, err := contract.GetRules(ctx, "JUR-A")
	require.NoError(t, err)
	require.Equal(t, "JUR-A", rulesA.Jurisdiction)
	require.Equal(t, 1, rulesA.Version)

	rulesB, err := contract.GetRules(ctx, "JUR-B")
	require.NoError(t, err)
	require.Equal(t, "JUR-B", rulesB.Jurisdiction)
	require.Equal(t, 1, rulesB.Version)

	_, err = contract.GetRules(ctx, "JUR-UNKNOWN")
	require.Error(t, err)

	// 2. GetReserve
	resA, err := contract.GetReserve(ctx, "INR")
	require.NoError(t, err)
	require.Equal(t, "INR", resA.Ccy)
	require.Equal(t, int64(0), resA.RtgsBalance)

	// 3. GetSupply
	supA, err := contract.GetSupply(ctx, "INR")
	require.NoError(t, err)
	require.Equal(t, "INR", supA.Ccy)
	require.Equal(t, int64(0), supA.Total)

	// 4. GetAccount (caller RegAMSP is issuer of INR -> authorized)
	fake.CallerMSP = "RegAMSP"
	acctA1, err := contract.GetAccount(ctx, "INR", "BankA1MSP")
	require.NoError(t, err)
	require.Equal(t, "INR", acctA1.Ccy)
	require.Equal(t, "BankA1MSP", acctA1.Bank)
	require.Equal(t, int64(0), acctA1.Available)

	// Caller BankB1MSP trying to read BankA1MSP's INR -> unauthorized
	fake.CallerMSP = "BankB1MSP"
	_, err = contract.GetAccount(ctx, "INR", "BankA1MSP")
	require.Error(t, err)
	require.Contains(t, err.Error(), "unauthorized")

	// Caller BankA1MSP reading own account -> authorized
	fake.CallerMSP = "BankA1MSP"
	acctSelf, err := contract.GetAccount(ctx, "INR", "BankA1MSP")
	require.NoError(t, err)
	require.Equal(t, "BankA1MSP", acctSelf.Bank)

	// 5. GetTrade and ListTrades
	tradeID := "T-TEST-001"
	trade := Trade{
		TradeID:    tradeID,
		Status:     "PROPOSED",
		Proposer:   "BankA1MSP",
		Cparty:     "BankB1MSP",
		CcyA:       "INR",
		CcyB:       "SGD",
		AcceptBy:   1700000300,
		CutoffAt:   1700000600,
		DetailHash: "aabbccdd",
		CreatedAt:  1700000000,
	}
	tb, _ := json.Marshal(trade)
	fake.PutState(TradeKey(tradeID), tb)

	legA := TradeLeg{TradeID: tradeID, Leg: "A", Ccy: "INR", Payer: "BankA1MSP", Payee: "BankB1MSP", HoldStatus: "HELD"}
	la, _ := json.Marshal(legA)
	fake.PutState(TradeLegKey(tradeID, "A"), la)

	settle := TradeSettle{TradeID: tradeID, Status: "PENDING"}
	st, _ := json.Marshal(settle)
	fake.PutState(TradeSettleKey(tradeID), st)

	view, err := contract.GetTrade(ctx, tradeID)
	require.NoError(t, err)
	require.Equal(t, tradeID, view.Trade.TradeID)
	require.Equal(t, "PROPOSED", view.Trade.Status)
	require.NotNil(t, view.LegA)
	require.Equal(t, "HELD", view.LegA.HoldStatus)
	require.NotNil(t, view.Settle)
	require.Equal(t, "PENDING", view.Settle.Status)

	trades, err := contract.ListTrades(ctx)
	require.NoError(t, err)
	require.Len(t, trades, 1)
	require.Equal(t, tradeID, trades[0].Trade.TradeID)

	// 6. ListRefusals
	ref := Refusal{
		TxID:         "tx-ref-1",
		Jurisdiction: "JUR-A",
		RuleVersion:  1,
		ReasonCode:   "INSUFFICIENT_AVAILABLE",
		InvokerMSP:   "BankA1MSP",
		AcctRef:      "hmac-ref-1",
		Ts:           1700000000,
	}
	rb, _ := json.Marshal(ref)
	fake.PutState(RefusalKey("tx-ref-1"), rb)

	refusals, err := contract.ListRefusals(ctx)
	require.NoError(t, err)
	require.Len(t, refusals, 1)
	require.Equal(t, "INSUFFICIENT_AVAILABLE", refusals[0].ReasonCode)

	// 7. GetTradeHistory
	hist, err := contract.GetTradeHistory(ctx, tradeID)
	require.NoError(t, err)
	require.NotEmpty(t, hist)
}
