package main

import (
	"encoding/json"
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"

	"settlement-cc/internal/fakestub"
)

func setupSettledTrade(t *testing.T) (*SmartContract, *mockContext, *fakestub.FakeStub, string, int64, int64) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Mint 50M INR for BankA1MSP
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-INR")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "50000000", "RTGS-MINT-INR")
	require.NoError(t, err)

	// Mint 10M SGD for BankB1MSP
	fake.CallerMSP = "RegBMSP"
	fake.Transient["approver2"] = []byte("approver-regb-sec")
	_, err = contract.AttestReserve(ctx, "SGD", "100000000", "STMT-SGD")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "SGD", "BankB1MSP", "10000000", "RTGS-MINT-SGD")
	require.NoError(t, err)

	// Propose & Accept trade
	saltA := "0123456789abcdef0123456789abcdef"
	saltB := "fedcba9876543210fedcba9876543210"
	tradeID := "T-BOOK-1"
	amtA := int64(10000000)
	amtB := int64(200000)
	acceptBy := txTs + 100
	cutoffAt := txTs + 200

	detail := TradeDetail{
		TradeID:  tradeID,
		CcyA:     "INR",
		AmountA:  amtA,
		CcyB:     "SGD",
		AmountB:  amtB,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     saltA,
	}
	detailBytes, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(saltA)
	fake.Transient["detail"] = detailBytes
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(saltB)
	fake.Transient["detail"] = detailBytes
	_, err = contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)

	_, err = contract.Settle(ctx, tradeID)
	require.NoError(t, err)

	return contract, ctx, fake, tradeID, amtA, amtB
}

func TestSettleDebit(t *testing.T) {
	contract, ctx, fake, tradeID, amtA, amtB := setupSettledTrade(t)

	// 1. Unsettled trade test
	fake.CallerMSP = "BankA1MSP"
	_, err := contract.SettleDebit(ctx, "NON-EXISTENT", "A")
	require.Error(t, err)
	require.Contains(t, err.Error(), "settle record")

	// 2. Leg A SettleDebit by payer (BankA1MSP)
	// Before: A1 INR Available: 40M, Held: 10M
	fake.CallerMSP = "BankA1MSP"
	res, err := contract.SettleDebit(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Verify Account: Held decreased to 0, Available remains 40M
	rawAcct, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acctA Account
	require.NoError(t, json.Unmarshal(rawAcct, &acctA))
	require.Equal(t, int64(40000000), acctA.Available)
	require.Equal(t, int64(0), acctA.Held)

	// Verify Hold in coll_INR_A1 is DEBITED
	rawHoldA, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), HoldKey("INR", tradeID))
	require.NoError(t, err)
	var holdA Hold
	require.NoError(t, json.Unmarshal(rawHoldA, &holdA))
	require.Equal(t, "DEBITED", holdA.Status)

	// Verify TradeLeg A public status is DEBITED
	rawLegA, err := fake.GetState(TradeLegKey(tradeID, "A"))
	require.NoError(t, err)
	var legA TradeLeg
	require.NoError(t, json.Unmarshal(rawLegA, &legA))
	require.Equal(t, "DEBITED", legA.HoldStatus)

	// 3. Idempotency test: calling SettleDebit again returns OK without error or double debit
	res2, err := contract.SettleDebit(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", res2.Status)

	// 4. Leg B SettleDebit by payer (BankB1MSP)
	// Before: B1 SGD Available: 9.8M, Held: 200k
	fake.CallerMSP = "BankB1MSP"
	resB, err := contract.SettleDebit(ctx, tradeID, "B")
	require.NoError(t, err)
	require.Equal(t, "OK", resB.Status)

	rawAcctB, err := fake.GetPrivateData(CollName("SGD", "BankB1MSP"), AccountKey("SGD", "BankB1MSP"))
	require.NoError(t, err)
	var acctB Account
	require.NoError(t, json.Unmarshal(rawAcctB, &acctB))
	require.Equal(t, int64(9800000), acctB.Available)
	require.Equal(t, int64(0), acctB.Held)

	_ = amtA
	_ = amtB
}

func TestCreditPayee(t *testing.T) {
	contract, ctx, fake, tradeID, amtA, amtB := setupSettledTrade(t)

	// 1. Guard check: CreditPayee on unsettled trade fails (Hard Rule 4a)
	// Create an unsettled trade
	txTs := int64(86400*1000 + 16200)
	saltA := "11111111111111111111111111111111"
	tradeIDUnsettled := "T-UNSETTLED"
	detail := TradeDetail{
		TradeID:  tradeIDUnsettled,
		CcyA:     "INR",
		AmountA:  1000000,
		CcyB:     "SGD",
		AmountB:  20000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     saltA,
	}
	detailBytes, _ := json.Marshal(detail)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(saltA)
	fake.Transient["detail"] = detailBytes
	_, err := contract.ProposeTrade(ctx, tradeIDUnsettled, "INR", "1000000", "SGD", "20000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte("22222222222222222222222222222222")
	fake.Transient["detail"] = detailBytes
	_, err = contract.AcceptTrade(ctx, tradeIDUnsettled)
	require.NoError(t, err)

	// Now try to CreditPayee before Settle
	fake.CallerMSP = "BankB1MSP"
	_, err = contract.CreditPayee(ctx, tradeIDUnsettled, "A")
	require.Error(t, err)
	require.Contains(t, err.Error(), "not SETTLED")

	// 2. Valid CreditPayee on settled trade:
	// Leg A payee is BankB1MSP (currency INR).
	// Clear written collections log
	fake.WrittenCollections = nil
	fake.PrivateWriteLog = nil

	fake.CallerMSP = "BankB1MSP"
	resA, err := contract.CreditPayee(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", resA.Status)

	// Hard Rule 12: CreditPayee writes to EXACTLY ONE named private collection
	require.Equal(t, 1, len(fake.WrittenCollections))
	require.Equal(t, CollName("INR", "BankB1MSP"), fake.WrittenCollections[0])

	// Verify payee account in coll_INR_B1 has Available credited by amtA (10M INR)
	rawAcctB_INR, err := fake.GetPrivateData(CollName("INR", "BankB1MSP"), AccountKey("INR", "BankB1MSP"))
	require.NoError(t, err)
	var acctB_INR Account
	require.NoError(t, json.Unmarshal(rawAcctB_INR, &acctB_INR))
	require.Equal(t, amtA, acctB_INR.Available)

	// Verify public TradeLeg A CreditStatus is CREDITED
	rawLegA, err := fake.GetState(TradeLegKey(tradeID, "A"))
	require.NoError(t, err)
	var legA TradeLeg
	require.NoError(t, json.Unmarshal(rawLegA, &legA))
	require.Equal(t, "CREDITED", legA.CreditStatus)

	// 3. Idempotency test: calling CreditPayee again returns OK without changing balance
	resA2, err := contract.CreditPayee(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", resA2.Status)
	rawAcctB_INR2, err := fake.GetPrivateData(CollName("INR", "BankB1MSP"), AccountKey("INR", "BankB1MSP"))
	require.NoError(t, err)
	var acctB_INR2 Account
	require.NoError(t, json.Unmarshal(rawAcctB_INR2, &acctB_INR2))
	require.Equal(t, amtA, acctB_INR2.Available) // unchanged!

	// 4. CreditPayee on Leg B:
	// Leg B payee is BankA1MSP (currency SGD).
	fake.CallerMSP = "BankA1MSP"
	resB, err := contract.CreditPayee(ctx, tradeID, "B")
	require.NoError(t, err)
	require.Equal(t, "OK", resB.Status)

	rawAcctA_SGD, err := fake.GetPrivateData(CollName("SGD", "BankA1MSP"), AccountKey("SGD", "BankA1MSP"))
	require.NoError(t, err)
	var acctA_SGD Account
	require.NoError(t, json.Unmarshal(rawAcctA_SGD, &acctA_SGD))
	require.Equal(t, amtB, acctA_SGD.Available)
}

func TestReturnHold(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Mint funds for BankA1MSP (INR) and BankB1MSP (SGD)
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-INR")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "50000000", "RTGS-MINT-INR")
	require.NoError(t, err)

	fake.CallerMSP = "RegBMSP"
	fake.Transient["approver2"] = []byte("approver-regb-sec")
	_, err = contract.AttestReserve(ctx, "SGD", "100000000", "STMT-SGD")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "SGD", "BankB1MSP", "10000000", "RTGS-MINT-SGD")
	require.NoError(t, err)

	// 1. Test ReturnHold on CANCELLED trade
	tradeID := "T-CANCEL-RET"
	saltA := "0123456789abcdef0123456789abcdef"
	amtA := int64(10000000)
	detail := TradeDetail{
		TradeID:  tradeID,
		CcyA:     "INR",
		AmountA:  amtA,
		CcyB:     "SGD",
		AmountB:  200000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     saltA,
	}
	detailBytes, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(saltA)
	fake.Transient["detail"] = detailBytes
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)

	// Available is now 40M, Held is 10M
	_, err = contract.CancelTrade(ctx, tradeID)
	require.NoError(t, err)

	// ReturnHold as BankA1MSP
	res, err := contract.ReturnHold(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Verify funds restored: Available 40M + 10M = 50M, Held = 0
	rawAcct, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(rawAcct, &acct))
	require.Equal(t, int64(50000000), acct.Available)
	require.Equal(t, int64(0), acct.Held)

	// Idempotent ReturnHold
	res2, err := contract.ReturnHold(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", res2.Status)

	// 2. Test ReturnHold on EXPIRED trade (both legs held, expired at cutoff)
	tradeID2 := "T-EXPIRE-RET"
	detail2 := detail
	detail2.TradeID = tradeID2
	detail2Bytes, _ := json.Marshal(detail2)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(saltA)
	fake.Transient["detail"] = detail2Bytes
	_, err = contract.ProposeTrade(ctx, tradeID2, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte("fedcba9876543210fedcba9876543210")
	fake.Transient["detail"] = detail2Bytes
	_, err = contract.AcceptTrade(ctx, tradeID2)
	require.NoError(t, err)

	// Advance time past cutoff and expire
	fake.SetTxTimestamp(txTs + 205)
	_, err = contract.ExpireTrade(ctx, tradeID2)
	require.NoError(t, err)

	// ReturnHold on Leg A restores A1
	fake.CallerMSP = "BankA1MSP"
	_, err = contract.ReturnHold(ctx, tradeID2, "A")
	require.NoError(t, err)

	rawAcctA, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acctA Account
	require.NoError(t, json.Unmarshal(rawAcctA, &acctA))
	require.Equal(t, int64(50000000), acctA.Available)
	require.Equal(t, int64(0), acctA.Held)

	// ReturnHold on Leg B restores B1
	fake.CallerMSP = "BankB1MSP"
	_, err = contract.ReturnHold(ctx, tradeID2, "B")
	require.NoError(t, err)

	rawAcctB, err := fake.GetPrivateData(CollName("SGD", "BankB1MSP"), AccountKey("SGD", "BankB1MSP"))
	require.NoError(t, err)
	var acctB Account
	require.NoError(t, json.Unmarshal(rawAcctB, &acctB))
	require.Equal(t, int64(10000000), acctB.Available)
	require.Equal(t, int64(0), acctB.Held)

	// 3. Hard Rule 4b: ReturnHold on SETTLED trade returns error
	contractSettle, ctxSettle, fakeSettle, settledID, _, _ := setupSettledTrade(t)
	fakeSettle.CallerMSP = "BankA1MSP"
	_, err = contractSettle.ReturnHold(ctxSettle, settledID, "A")
	require.Error(t, err)
	require.Contains(t, err.Error(), "neither EXPIRED nor CANCELLED")
}
