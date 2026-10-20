package main

import (
	"encoding/json"
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"

	"settlement-cc/internal/fakestub"
)

// CC-32: Matrix Row 1
func TestRow1_NeverAccepted(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Mint 50M INR to A1
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-INR")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "50000000", "RTGS-MINT-INR")
	require.NoError(t, err)

	tradeID := "T-ROW1"
	acceptBy := txTs + 100
	cutoffAt := txTs + 200
	amtA := int64(10000000)
	saltA := "0123456789abcdef0123456789abcdef"

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
	db, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(saltA)
	fake.Transient["detail"] = db
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", strconv.FormatInt(amtA, 10), "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	// Verify balance after propose: Avail 40M, Held 10M
	rawAcct, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(rawAcct, &acct))
	require.Equal(t, int64(40000000), acct.Available)
	require.Equal(t, amtA, acct.Held)

	// Advance time past acceptBy
	fake.SetTxTimestamp(acceptBy + 10)
	_, err = contract.ExpireTrade(ctx, tradeID)
	require.NoError(t, err)

	// Trade status is EXPIRED
	rawTrade, err := fake.GetState(TradeKey(tradeID))
	require.NoError(t, err)
	var tr Trade
	require.NoError(t, json.Unmarshal(rawTrade, &tr))
	require.Equal(t, "EXPIRED", tr.Status)

	// Return hold
	fake.CallerMSP = "BankA1MSP"
	resRet, err := contract.ReturnHold(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", resRet.Status)

	// A1 balance fully restored: Avail 50M, Held 0
	rawAcctRestored, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acctRestored Account
	require.NoError(t, json.Unmarshal(rawAcctRestored, &acctRestored))
	require.Equal(t, int64(50000000), acctRestored.Available)
	require.Equal(t, int64(0), acctRestored.Held)
}

// CC-33: Matrix Row 2
func TestRow2_BothHeldNoSettle(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Mint 50M INR to A1, 10M SGD to B1
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

	tradeID := "T-ROW2"
	acceptBy := txTs + 100
	cutoffAt := txTs + 200
	amtA := int64(10000000)
	amtB := int64(200000)
	saltA := "0123456789abcdef0123456789abcdef"
	saltB := "fedcba9876543210fedcba9876543210"

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
	db, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(saltA)
	fake.Transient["detail"] = db
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", strconv.FormatInt(amtA, 10), "SGD", strconv.FormatInt(amtB, 10), "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(saltB)
	fake.Transient["detail"] = db
	_, err = contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)

	// Advance time past cutoffAt without settling
	fake.SetTxTimestamp(cutoffAt + 10)
	_, err = contract.ExpireTrade(ctx, tradeID)
	require.NoError(t, err)

	// Return hold leg A for A1
	fake.CallerMSP = "BankA1MSP"
	resA, err := contract.ReturnHold(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", resA.Status)

	// Return hold leg B for B1
	fake.CallerMSP = "BankB1MSP"
	resB, err := contract.ReturnHold(ctx, tradeID, "B")
	require.NoError(t, err)
	require.Equal(t, "OK", resB.Status)

	// Verify both accounts fully restored
	rawA, _ := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	var acctA Account
	_ = json.Unmarshal(rawA, &acctA)
	require.Equal(t, int64(50000000), acctA.Available)
	require.Equal(t, int64(0), acctA.Held)

	rawB, _ := fake.GetPrivateData(CollName("SGD", "BankB1MSP"), AccountKey("SGD", "BankB1MSP"))
	var acctB Account
	_ = json.Unmarshal(rawB, &acctB)
	require.Equal(t, int64(10000000), acctB.Available)
	require.Equal(t, int64(0), acctB.Held)
}

// CC-34: Matrix Row 3
func TestRow3_SettledThenCreditByPayeeOnly(t *testing.T) {
	contract, ctx, fake, tradeID, _, amtB := setupSettledTrade(t)

	// Clear write tracker
	fake.WrittenCollections = nil
	fake.PrivateWriteLog = nil

	// Leg B payee is BankA1MSP (currency SGD)
	fake.CallerMSP = "BankA1MSP"
	res, err := contract.CreditPayee(ctx, tradeID, "B")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Verify BankA1MSP SGD available += amtB
	rawA, err := fake.GetPrivateData(CollName("SGD", "BankA1MSP"), AccountKey("SGD", "BankA1MSP"))
	require.NoError(t, err)
	var acctA Account
	require.NoError(t, json.Unmarshal(rawA, &acctA))
	require.Equal(t, amtB, acctA.Available)

	// Verify written collections is strictly coll_SGD_A1 only
	require.Equal(t, []string{CollName("SGD", "BankA1MSP")}, fake.WrittenCollections)
}

// CC-35: Matrix Row 5
func TestRow5_FreezeAfterSettle(t *testing.T) {
	contract, ctx, fake, tradeID, _, amtB := setupSettledTrade(t)

	// Freeze payee (BankA1 in SGD) after trade is settled
	fake.CallerMSP = "RegBMSP"
	_, err := contract.Freeze(ctx, "SGD", "BankA1MSP", "true")
	require.NoError(t, err)

	// CreditPayee for Leg B still succeeds!
	fake.CallerMSP = "BankA1MSP"
	res, err := contract.CreditPayee(ctx, tradeID, "B")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	rawA, err := fake.GetPrivateData(CollName("SGD", "BankA1MSP"), AccountKey("SGD", "BankA1MSP"))
	require.NoError(t, err)
	var acctA Account
	require.NoError(t, json.Unmarshal(rawA, &acctA))
	require.Equal(t, amtB, acctA.Available)
	require.Equal(t, "FROZEN", acctA.Status)
}

// CC-36: Matrix Row 6
func TestRow6_InsufficientSecondHold(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Mint 100M INR to A1
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "200000000", "STMT-INR")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "100000000", "RTGS-MINT-INR")
	require.NoError(t, err)

	// T1 uses 60M of 100M -> succeeds
	tradeID1 := "T1"
	salt1 := "0123456789abcdef0123456789abcdef"
	detail1 := TradeDetail{
		TradeID:  tradeID1,
		CcyA:     "INR",
		AmountA:  60000000,
		CcyB:     "SGD",
		AmountB:  1000000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     salt1,
	}
	db1, _ := json.Marshal(detail1)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(salt1)
	fake.Transient["detail"] = db1
	res1, err := contract.ProposeTrade(ctx, tradeID1, "INR", "60000000", "SGD", "1000000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)
	require.Equal(t, "OK", res1.Status)

	// T2 tries to use 60M (only 40M available) -> REFUSED INSUFFICIENT_AVAILABLE
	tradeID2 := "T2"
	salt2 := "fedcba9876543210fedcba9876543210"
	detail2 := TradeDetail{
		TradeID:  tradeID2,
		CcyA:     "INR",
		AmountA:  60000000,
		CcyB:     "SGD",
		AmountB:  1000000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     salt2,
	}
	db2, _ := json.Marshal(detail2)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(salt2)
	fake.Transient["detail"] = db2
	res2, err := contract.ProposeTrade(ctx, tradeID2, "INR", "60000000", "SGD", "1000000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)
	require.Equal(t, "REFUSED", res2.Status)
	require.Equal(t, "INSUFFICIENT_AVAILABLE", res2.ReasonCode)
}

// CC-37: Matrix Row 7
func TestRow7_DuplicateRtgsRef(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-INR")
	require.NoError(t, err)

	ref := "RTGS-DUP-REF"
	res, err := contract.Mint(ctx, "INR", "BankA1MSP", "10000000", ref)
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Second mint with same RTGS ref returns Go error (tx aborted)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "10000000", ref)
	require.Error(t, err)
	require.Contains(t, err.Error(), "duplicate rtgsRef")
}

// CC-38: Matrix Row 8
func TestRow8_MintBeyondReserve(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-INR")
	require.NoError(t, err)

	// First mint: 60M (within 100M reserve) -> OK
	res1, err := contract.Mint(ctx, "INR", "BankA1MSP", "60000000", "RTGS-1")
	require.NoError(t, err)
	require.Equal(t, "OK", res1.Status)

	// Second mint: 60M (total 120M > 100M reserve) -> REFUSED EXCEEDS_RESERVE
	res2, err := contract.Mint(ctx, "INR", "BankA1MSP", "60000000", "RTGS-2")
	require.NoError(t, err)
	require.Equal(t, "REFUSED", res2.Status)
	require.Equal(t, "EXCEEDS_RESERVE", res2.ReasonCode)
}

// CC-39: Matrix Window
func TestAcceptAfterWindow(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-INR")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "50000000", "RTGS-MINT-INR")
	require.NoError(t, err)

	tradeID := "T-WINDOW"
	acceptBy := txTs + 100
	cutoffAt := txTs + 200
	detail := TradeDetail{
		TradeID:  tradeID,
		CcyA:     "INR",
		AmountA:  10000000,
		CcyB:     "SGD",
		AmountB:  200000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     "0123456789abcdef0123456789abcdef",
	}
	db, _ := json.Marshal(detail)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte("0123456789abcdef0123456789abcdef")
	fake.Transient["detail"] = db
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	// Advance time past acceptBy
	fake.SetTxTimestamp(acceptBy + 1)
	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte("fedcba9876543210fedcba9876543210")
	fake.Transient["detail"] = db

	_, err = contract.AcceptTrade(ctx, tradeID)
	require.Error(t, err)
	require.Contains(t, err.Error(), "ACCEPT_WINDOW_CLOSED")
}

// CC-40: Matrix Detail
func TestAcceptDetailMismatch(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-INR")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "50000000", "RTGS-MINT-INR")
	require.NoError(t, err)

	tradeID := "T-MISMATCH"
	detail := TradeDetail{
		TradeID:  tradeID,
		CcyA:     "INR",
		AmountA:  10000000,
		CcyB:     "SGD",
		AmountB:  200000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     "0123456789abcdef0123456789abcdef",
	}
	db, _ := json.Marshal(detail)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte("0123456789abcdef0123456789abcdef")
	fake.Transient["detail"] = db
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)

	// Counterparty passes mismatched detail (AmountB = 300000 instead of 200000)
	detailMismatch := detail
	detailMismatch.AmountB = 300000
	dbMismatch, _ := json.Marshal(detailMismatch)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte("fedcba9876543210fedcba9876543210")
	fake.Transient["detail"] = dbMismatch

	_, err = contract.AcceptTrade(ctx, tradeID)
	require.Error(t, err)
	require.Contains(t, err.Error(), "DETAIL_MISMATCH")
}

// CC-41: Matrix Idempotency
func TestIdempotentCredit(t *testing.T) {
	contract, ctx, fake, tradeID, amtA, _ := setupSettledTrade(t)

	fake.CallerMSP = "BankB1MSP"
	res1, err := contract.CreditPayee(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", res1.Status)

	rawAcct, err := fake.GetPrivateData(CollName("INR", "BankB1MSP"), AccountKey("INR", "BankB1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(rawAcct, &acct))
	require.Equal(t, amtA, acct.Available)

	// Second credit returns OK without increasing balance
	res2, err := contract.CreditPayee(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", res2.Status)

	rawAcct2, err := fake.GetPrivateData(CollName("INR", "BankB1MSP"), AccountKey("INR", "BankB1MSP"))
	require.NoError(t, err)
	var acct2 Account
	require.NoError(t, json.Unmarshal(rawAcct2, &acct2))
	require.Equal(t, amtA, acct2.Available)
}

// CC-42: Matrix Operating Hours
func TestRefusalOutsideHours(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	// Set txTs so JUR-B local time is 23:04 (outside operating hours 08:00 to 18:00)
	// 23:04 = 1384 mins. UTC = 1384 - 480 = 904 mins = 54240 seconds.
	// But note: JUR-A also needs to be in operating hours at propose time!
	// Propose at 10:00 local JUR-A (16200 sec UTC)
	proposeTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(proposeTs)

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

	tradeID := "T-OUTSIDE-HOURS"
	acceptBy := proposeTs + 86400
	cutoffAt := proposeTs + 172800
	saltA := "0123456789abcdef0123456789abcdef"
	saltB := "fedcba9876543210fedcba9876543210"

	detail := TradeDetail{
		TradeID:  tradeID,
		CcyA:     "INR",
		AmountA:  10000000,
		CcyB:     "SGD",
		AmountB:  200000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     saltA,
	}
	db, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(saltA)
	fake.Transient["detail"] = db
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(acceptBy, 10), strconv.FormatInt(cutoffAt, 10))
	require.NoError(t, err)

	// Set txTs to 23:04 local in JUR-B (UTC 54240 sec)
	nightTs := int64(86400*1000 + 54240)
	fake.SetTxTimestamp(nightTs)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(saltB)
	fake.Transient["detail"] = db

	res, err := contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)
	require.Equal(t, "REFUSED", res.Status)
	require.Equal(t, "OUTSIDE_OPERATING_HOURS", res.ReasonCode)
	require.Equal(t, 1, res.RuleVersion)
}
