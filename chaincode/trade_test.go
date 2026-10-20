package main

import (
	"encoding/json"
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"

	"settlement-cc/internal/fakestub"
)

func TestProposeTrade(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	// Set timestamp to 10:00 local JUR-A (offset 330 -> UTC 270 min = 16200 sec)
	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Attest reserve and mint funds for BankA1MSP
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-001")
	require.NoError(t, err)

	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "50000000", "RTGS-MINT-01")
	require.NoError(t, err)

	// 1. Valid ProposeTrade
	detailSalt := "0123456789abcdef0123456789abcdef"
	holdSalt := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	tradeID := "T-01"
	amtA := int64(10000000)
	amtB := int64(200000)
	acceptBy := txTs + 100
	cutoffAt := txTs + 200

	detail := TradeDetail{
		TradeID:   tradeID,
		CcyA:      "INR",
		AmountA:   amtA,
		CcyB:      "SGD",
		AmountB:   amtB,
		Proposer:  "BankA1MSP",
		Cparty:    "BankB1MSP",
		FxRate:    "0.02",
		Reference: "REF-001",
		Salt:      detailSalt,
	}
	detailBytes, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSalt)
	fake.Transient["detail"] = detailBytes

	res, err := contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)
	require.Equal(t, tradeID, res.TradeID)

	// Verify Account balance: Available 50M -> 40M, Held 0 -> 10M
	acctRaw, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(acctRaw, &acct))
	require.Equal(t, int64(40000000), acct.Available)
	require.Equal(t, int64(10000000), acct.Held)

	// Verify Hold in coll_INR_A1
	holdRaw, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), HoldKey("INR", tradeID))
	require.NoError(t, err)
	var hold Hold
	require.NoError(t, json.Unmarshal(holdRaw, &hold))
	require.Equal(t, "HELD", hold.Status)
	require.Equal(t, amtA, hold.Amount)
	require.Equal(t, holdSalt, hold.Salt)

	// Verify TradeDetail in implicit collection
	detRaw, err := fake.GetPrivateData(ImplicitColl("BankA1MSP"), TradeDetailKey(tradeID))
	require.NoError(t, err)
	require.NotEmpty(t, detRaw)

	// Verify Trade in public state
	tradeRaw, err := fake.GetState(TradeKey(tradeID))
	require.NoError(t, err)
	var trade Trade
	require.NoError(t, json.Unmarshal(tradeRaw, &trade))
	require.Equal(t, "PROPOSED", trade.Status)
	require.NotEmpty(t, trade.DetailHash)

	// Verify Legs
	legARaw, err := fake.GetState(TradeLegKey(tradeID, "A"))
	require.NoError(t, err)
	var legA TradeLeg
	require.NoError(t, json.Unmarshal(legARaw, &legA))
	require.Equal(t, "HELD", legA.HoldStatus)
	require.NotEmpty(t, legA.HoldHash)

	legBRaw, err := fake.GetState(TradeLegKey(tradeID, "B"))
	require.NoError(t, err)
	var legB TradeLeg
	require.NoError(t, json.Unmarshal(legBRaw, &legB))
	require.Equal(t, "NONE", legB.HoldStatus)

	// Verify Settle & SBE
	settleRaw, err := fake.GetState(TradeSettleKey(tradeID))
	require.NoError(t, err)
	var settle TradeSettle
	require.NoError(t, json.Unmarshal(settleRaw, &settle))
	require.Equal(t, "PENDING", settle.Status)

	sbe, err := fake.GetStateValidationParameter(TradeSettleKey(tradeID))
	require.NoError(t, err)
	require.NotEmpty(t, sbe)

	// 2. Precondition: Duplicate trade -> error
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", "86416300", "86416400")
	require.Error(t, err)
	require.Contains(t, err.Error(), "already exists")

	// 3. Precondition: acceptBy <= txTs -> error
	_, err = contract.ProposeTrade(ctx, "T-02", "INR", "10000000", "SGD", "200000", "BankB1MSP", "86416100", "86416400")
	require.Error(t, err)

	// 4. Refusal: Insufficient available balance -> REFUSED
	tradeID2 := "T-03"
	detail2 := TradeDetail{
		TradeID:  tradeID2,
		CcyA:     "INR",
		AmountA:  45000000, // Available is only 40M
		CcyB:     "SGD",
		AmountB:  amtB,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     detailSalt,
	}
	detail2Bytes, _ := json.Marshal(detail2)
	fake.Transient["detail"] = detail2Bytes

	resRefused, err := contract.ProposeTrade(ctx, tradeID2, "INR", "45000000", "SGD", "200000", "BankB1MSP", "86416300", "86416400")
	require.NoError(t, err)
	require.Equal(t, "REFUSED", resRefused.Status)
	require.Equal(t, "INSUFFICIENT_AVAILABLE", resRefused.ReasonCode)

	// Verify account balance was NOT touched on refusal
	acctRaw3, _ := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	var acct3 Account
	_ = json.Unmarshal(acctRaw3, &acct3)
	require.Equal(t, int64(40000000), acct3.Available)
	require.Equal(t, int64(10000000), acct3.Held)
}

func TestAcceptTrade(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	// Set timestamp to 10:00 local JUR-A and 12:30 local JUR-B (both within operating hours)
	// UTC 04:30 = 270 min = 16200 sec. In JUR-A (+5:30): 10:00 (600 min). In JUR-B (+8:00): 12:30 (750 min).
	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Setup funds for BankA1 in INR and BankB1 in SGD
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

	// Propose trade
	detailSalt := "0123456789abcdef0123456789abcdef"
	holdSaltA := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	holdSaltB := "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	tradeID := "T-ACCEPT-1"
	amtA := int64(10000000)
	amtB := int64(200000)
	acceptBy := txTs + 100
	cutoffAt := txTs + 200

	detail := TradeDetail{
		TradeID:   tradeID,
		CcyA:      "INR",
		AmountA:   amtA,
		CcyB:      "SGD",
		AmountB:   amtB,
		Proposer:  "BankA1MSP",
		Cparty:    "BankB1MSP",
		FxRate:    "0.02",
		Reference: "REF-001",
		Salt:      detailSalt,
	}
	detailBytes, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSaltA)
	fake.Transient["detail"] = detailBytes

	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	// 1. Valid AcceptTrade by BankB1MSP
	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(holdSaltB)
	fake.Transient["detail"] = detailBytes

	res, err := contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Verify Trade Status is ACCEPTED
	tradeRaw, err := fake.GetState(TradeKey(tradeID))
	require.NoError(t, err)
	var trade Trade
	require.NoError(t, json.Unmarshal(tradeRaw, &trade))
	require.Equal(t, "ACCEPTED", trade.Status)

	// Verify Leg B Status is HELD with valid hash
	legBRaw, err := fake.GetState(TradeLegKey(tradeID, "B"))
	require.NoError(t, err)
	var legB TradeLeg
	require.NoError(t, json.Unmarshal(legBRaw, &legB))
	require.Equal(t, "HELD", legB.HoldStatus)
	require.NotEmpty(t, legB.HoldHash)

	// Verify BankB1MSP Account balance: Available 10M -> 9.8M, Held 0 -> 200K
	acctRaw, err := fake.GetPrivateData(CollName("SGD", "BankB1MSP"), AccountKey("SGD", "BankB1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(acctRaw, &acct))
	require.Equal(t, int64(9800000), acct.Available)
	require.Equal(t, int64(200000), acct.Held)

	// Verify Hold in coll_SGD_B1
	holdRaw, err := fake.GetPrivateData(CollName("SGD", "BankB1MSP"), HoldKey("SGD", tradeID))
	require.NoError(t, err)
	var hold Hold
	require.NoError(t, json.Unmarshal(holdRaw, &hold))
	require.Equal(t, "HELD", hold.Status)
	require.Equal(t, amtB, hold.Amount)
	require.Equal(t, holdSaltB, hold.Salt)

	// 2. Precondition: Wrong caller on proposed trade
	tradeID2 := "T-ACCEPT-2"
	detail2 := detail
	detail2.TradeID = tradeID2
	detail2Bytes, _ := json.Marshal(detail2)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSaltA)
	fake.Transient["detail"] = detail2Bytes
	_, err = contract.ProposeTrade(ctx, tradeID2, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankA1MSP" // BankA1 trying to accept
	_, err = contract.AcceptTrade(ctx, tradeID2)
	require.Error(t, err)
	require.Contains(t, err.Error(), "not trade counterparty")
}

func TestSettle(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Setup funds
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

	// Propose and Accept trade
	detailSalt := "0123456789abcdef0123456789abcdef"
	holdSaltA := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	holdSaltB := "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	tradeID := "T-SETTLE-1"
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
		Salt:     detailSalt,
	}
	detailBytes, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSaltA)
	fake.Transient["detail"] = detailBytes
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(holdSaltB)
	fake.Transient["detail"] = detailBytes
	_, err = contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)

	// Clear written collections tracking before Settle to test Hard Rule 11 (zero private writes)
	fake.WrittenCollections = nil
	fake.PrivateWriteLog = nil

	// 1. Valid Settle
	res, err := contract.Settle(ctx, tradeID)
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Verify TRADESETTLE~T is SETTLED
	rawSettle, err := fake.GetState(TradeSettleKey(tradeID))
	require.NoError(t, err)
	var settle TradeSettle
	require.NoError(t, json.Unmarshal(rawSettle, &settle))
	require.Equal(t, "SETTLED", settle.Status)
	require.Equal(t, txTs, settle.SettledAt)

	// Verify TRADE~T is SETTLED
	rawTrade, err := fake.GetState(TradeKey(tradeID))
	require.NoError(t, err)
	var trade Trade
	require.NoError(t, json.Unmarshal(rawTrade, &trade))
	require.Equal(t, "SETTLED", trade.Status)

	// Verify zero private writes occurred
	require.Empty(t, fake.WrittenCollections)
	require.Empty(t, fake.PrivateWriteLog)

	// 2. Precondition: Cutoff passed -> error
	tradeID2 := "T-SETTLE-2"
	detail2 := detail
	detail2.TradeID = tradeID2
	detail2Bytes, _ := json.Marshal(detail2)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSaltA)
	fake.Transient["detail"] = detail2Bytes
	_, err = contract.ProposeTrade(ctx, tradeID2, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(holdSaltB)
	fake.Transient["detail"] = detail2Bytes
	_, err = contract.AcceptTrade(ctx, tradeID2)
	require.NoError(t, err)

	// Advance time past CutoffAt
	fake.SetTxTimestamp(cutoffAt + 1)
	_, err = contract.Settle(ctx, tradeID2)
	require.Error(t, err)
	require.Contains(t, err.Error(), "CUTOFF_PASSED")
}

func TestCancelExpire(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Setup funds
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

	detailSalt := "0123456789abcdef0123456789abcdef"
	holdSaltA := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	holdSaltB := "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	amtA := int64(10000000)
	amtB := int64(200000)
	acceptBy := txTs + 100
	cutoffAt := txTs + 200

	// 1. Test CancelTrade
	tradeID1 := "T-CANCEL-1"
	detail1 := TradeDetail{
		TradeID:  tradeID1,
		CcyA:     "INR",
		AmountA:  amtA,
		CcyB:     "SGD",
		AmountB:  amtB,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     detailSalt,
	}
	d1Bytes, _ := json.Marshal(detail1)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSaltA)
	fake.Transient["detail"] = d1Bytes
	_, err = contract.ProposeTrade(ctx, tradeID1, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	// Non-proposer cannot cancel
	fake.CallerMSP = "BankB1MSP"
	_, err = contract.CancelTrade(ctx, tradeID1)
	require.Error(t, err)
	require.Contains(t, err.Error(), "not trade proposer")

	// Proposer cancels
	fake.CallerMSP = "BankA1MSP"
	resCancel, err := contract.CancelTrade(ctx, tradeID1)
	require.NoError(t, err)
	require.Equal(t, "OK", resCancel.Status)

	tradeRaw, _ := fake.GetState(TradeKey(tradeID1))
	var trade1 Trade
	_ = json.Unmarshal(tradeRaw, &trade1)
	require.Equal(t, "CANCELLED", trade1.Status)

	// Cannot cancel already cancelled
	_, err = contract.CancelTrade(ctx, tradeID1)
	require.Error(t, err)

	// 2. Test ExpireTrade on PROPOSED trade when acceptBy passes
	tradeID2 := "T-EXPIRE-PROPOSED"
	detail2 := detail1
	detail2.TradeID = tradeID2
	d2Bytes, _ := json.Marshal(detail2)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSaltA)
	fake.Transient["detail"] = d2Bytes
	_, err = contract.ProposeTrade(ctx, tradeID2, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	// Cannot expire before window
	_, err = contract.ExpireTrade(ctx, tradeID2)
	require.Error(t, err)
	require.Contains(t, err.Error(), "NOT_EXPIRABLE")

	// Advance time >= acceptBy
	fake.SetTxTimestamp(acceptBy + 1)
	resExp1, err := contract.ExpireTrade(ctx, tradeID2)
	require.NoError(t, err)
	require.Equal(t, "OK", resExp1.Status)

	tradeRaw2, _ := fake.GetState(TradeKey(tradeID2))
	var trade2 Trade
	_ = json.Unmarshal(tradeRaw2, &trade2)
	require.Equal(t, "EXPIRED", trade2.Status)

	// 3. Test ExpireTrade on ACCEPTED trade when cutoff passes
	fake.SetTxTimestamp(txTs)
	tradeID3 := "T-EXPIRE-ACCEPTED"
	detail3 := detail1
	detail3.TradeID = tradeID3
	d3Bytes, _ := json.Marshal(detail3)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSaltA)
	fake.Transient["detail"] = d3Bytes
	_, err = contract.ProposeTrade(ctx, tradeID3, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(holdSaltB)
	fake.Transient["detail"] = d3Bytes
	_, err = contract.AcceptTrade(ctx, tradeID3)
	require.NoError(t, err)

	// Cannot expire before cutoff
	_, err = contract.ExpireTrade(ctx, tradeID3)
	require.Error(t, err)
	require.Contains(t, err.Error(), "NOT_EXPIRABLE")

	// Advance time >= cutoffAt
	fake.SetTxTimestamp(cutoffAt + 1)
	resExp2, err := contract.ExpireTrade(ctx, tradeID3)
	require.NoError(t, err)
	require.Equal(t, "OK", resExp2.Status)

	tradeRaw3, _ := fake.GetState(TradeKey(tradeID3))
	var trade3 Trade
	_ = json.Unmarshal(tradeRaw3, &trade3)
	require.Equal(t, "EXPIRED", trade3.Status)
}

func TestDetailSaltIndependentOfHoldSalt(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Setup funds for BankA1 and BankB1
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

	tradeID := "T-INDEP-SALT"
	detailSalt := "0123456789abcdef0123456789abcdef"
	holdSaltA := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	holdSaltB := "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	amtA := int64(10000000)
	amtB := int64(200000)
	acceptBy := txTs + 100
	cutoffAt := txTs + 200

	detail := TradeDetail{
		TradeID:   tradeID,
		CcyA:      "INR",
		AmountA:   amtA,
		CcyB:      "SGD",
		AmountB:   amtB,
		Proposer:  "BankA1MSP",
		Cparty:    "BankB1MSP",
		FxRate:    "0.02",
		Reference: "REF-INDEP",
		Salt:      detailSalt,
	}
	detailBytes, err := json.Marshal(detail)
	require.NoError(t, err)

	// ProposeTrade with detail.Salt="0123456789abcdef0123456789abcdef" and transient salt="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(holdSaltA)
	fake.Transient["detail"] = detailBytes

	resProp, err := contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)
	require.Equal(t, "OK", resProp.Status)

	// Verify hold A stores holdSaltA
	holdARaw, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), HoldKey("INR", tradeID))
	require.NoError(t, err)
	var holdA Hold
	require.NoError(t, json.Unmarshal(holdARaw, &holdA))
	require.Equal(t, holdSaltA, holdA.Salt)

	// AcceptTrade by the counterparty with the same detail bytes and transient salt="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(holdSaltB)
	fake.Transient["detail"] = detailBytes

	resAcc, err := contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)
	require.Equal(t, "OK", resAcc.Status)

	// Verify hold B stores holdSaltB
	holdBRaw, err := fake.GetPrivateData(CollName("SGD", "BankB1MSP"), HoldKey("SGD", tradeID))
	require.NoError(t, err)
	var holdB Hold
	require.NoError(t, json.Unmarshal(holdBRaw, &holdB))
	require.Equal(t, holdSaltB, holdB.Salt)
}
