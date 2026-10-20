package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"settlement-cc/internal/fakestub"
)

func TestRulesCheck(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	// 1. Verify computeLocalMinute
	// UTC 00:00 + offset 330 (+05:30) = 05:30 -> 330 mins
	require.Equal(t, 330, computeLocalMinute(86400*10, 330))
	// UTC 20:00 + offset 330 (+05:30) = next day 01:30 -> 90 mins
	require.Equal(t, 90, computeLocalMinute(86400*10+20*3600, 330))

	// Setup funds for BankA1MSP in INR:
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-001")
	require.NoError(t, err)

	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "50000000", "RTGS-MINT-1")
	require.NoError(t, err)

	utc10amLocal := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(utc10amLocal)

	// 2. Pass check
	res, err := contract.checkBusinessRules(ctx, "INR", "BankA1MSP", 20000000)
	require.NoError(t, err)
	require.False(t, res.Refused)
	require.Equal(t, 1, res.RuleVersion)

	// 3. Insufficient Available Balance refusal
	res, err = contract.checkBusinessRules(ctx, "INR", "BankA1MSP", 60000000)
	require.NoError(t, err)
	require.True(t, res.Refused)
	require.Equal(t, "INSUFFICIENT_AVAILABLE", res.ReasonCode)

	// 4. Exceeds Max Transaction Limit refusal
	_, err = contract.AttestReserve(ctx, "INR", "1000000000000", "STMT-002")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "900000000000", "RTGS-MINT-2")
	require.NoError(t, err)

	res, err = contract.checkBusinessRules(ctx, "INR", "BankA1MSP", 60000000000)
	require.NoError(t, err)
	require.True(t, res.Refused)
	require.Equal(t, "EXCEEDS_TX_LIMIT", res.ReasonCode)

	// 5. Outside Operating Hours
	utc11pmLocal := int64(86400*1000 + 63000)
	fake.SetTxTimestamp(utc11pmLocal)
	res, err = contract.checkBusinessRules(ctx, "INR", "BankA1MSP", 1000000)
	require.NoError(t, err)
	require.True(t, res.Refused)
	require.Equal(t, "OUTSIDE_OPERATING_HOURS", res.ReasonCode)

	fake.SetTxTimestamp(utc10amLocal)

	// 6. Account Frozen refusal
	_, err = contract.Freeze(ctx, "INR", "BankA1MSP", "true")
	require.NoError(t, err)
	res, err = contract.checkBusinessRules(ctx, "INR", "BankA1MSP", 1000000)
	require.NoError(t, err)
	require.True(t, res.Refused)
	require.Equal(t, "ACCOUNT_FROZEN", res.ReasonCode)

	_, err = contract.Freeze(ctx, "INR", "BankA1MSP", "false")
	require.NoError(t, err)

	// 7. Jurisdiction Halted refusal
	haltRulesPayload := `{
		"opStartMin": 540,
		"opEndMin": 1020,
		"utcOffsetMin": 330,
		"maxTxAmount": 50000000000,
		"maxDailyMint": 1000000000000,
		"halted": true
	}`
	_, err = contract.UpdateRules(ctx, "JUR-A", haltRulesPayload)
	require.NoError(t, err)
	res, err = contract.checkBusinessRules(ctx, "INR", "BankA1MSP", 1000000)
	require.NoError(t, err)
	require.True(t, res.Refused)
	require.Equal(t, "JURISDICTION_HALTED", res.ReasonCode)
	require.Equal(t, 2, res.RuleVersion)
}

// CC-20: Hard Rule 1
func TestNoFloatsInAmounts(t *testing.T) {
	files, err := os.ReadDir(".")
	require.NoError(t, err)

	floatPattern := regexp.MustCompile(`\b(float32|float64|ParseFloat)\b`)

	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".go") || strings.HasSuffix(f.Name(), "_test.go") {
			continue
		}
		content, err := os.ReadFile(f.Name())
		require.NoError(t, err)
		matches := floatPattern.FindAllString(string(content), -1)
		require.Empty(t, matches, "Found forbidden float usage in %s: %v", f.Name(), matches)
	}
}

// CC-21: Hard Rule 2
func TestTimeOnlyFromTxTimestamp(t *testing.T) {
	files, err := os.ReadDir(".")
	require.NoError(t, err)

	timeNowPattern := regexp.MustCompile(`\btime\.Now\(\)`)

	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".go") || strings.HasSuffix(f.Name(), "_test.go") {
			continue
		}
		content, err := os.ReadFile(f.Name())
		require.NoError(t, err)
		matches := timeNowPattern.FindAllString(string(content), -1)
		require.Empty(t, matches, "Found forbidden time.Now() usage in %s: %v", f.Name(), matches)
	}
}

// CC-22: Hard Rule 3
func TestRefusalCommits(t *testing.T) {
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
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-001")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "50000000", "RTGS-MINT-1")
	require.NoError(t, err)

	// Try ProposeTrade with amountA = 60M (insufficient available balance)
	salt := "0123456789abcdef0123456789abcdef"
	tradeID := "T-REFUSE-COMMIT"
	detail := TradeDetail{
		TradeID:  tradeID,
		CcyA:     "INR",
		AmountA:  60000000,
		CcyB:     "SGD",
		AmountB:  200000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     salt,
	}
	detailBytes, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(salt)
	fake.Transient["detail"] = detailBytes

	// Clear write tracker before propose
	fake.WrittenCollections = nil
	fake.PrivateWriteLog = nil

	res, err := contract.ProposeTrade(ctx, tradeID, "INR", "60000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)
	require.Equal(t, "REFUSED", res.Status)
	require.Equal(t, "INSUFFICIENT_AVAILABLE", res.ReasonCode)

	// Verify public REFUSAL key is committed
	refusalKey := RefusalKey(fake.GetTxID())
	refusalRaw, err := fake.GetState(refusalKey)
	require.NoError(t, err)
	require.NotEmpty(t, refusalRaw)

	// Verify caller implicit collection has REFUSALDETAIL committed
	implKey := RefusalDetailKey(fake.GetTxID())
	detailRaw, err := fake.GetPrivateData(ImplicitColl("BankA1MSP"), implKey)
	require.NoError(t, err)
	require.NotEmpty(t, detailRaw)

	// Verify BankA1MSP account Available is still 50M, Held is 0
	acctRaw, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(acctRaw, &acct))
	require.Equal(t, int64(50000000), acct.Available)
	require.Equal(t, int64(0), acct.Held)
}

// CC-23: Hard Rule 4
func TestTerminalSafety(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Mint funds
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

	// Propose and Accept
	saltA := "0123456789abcdef0123456789abcdef"
	saltB := "fedcba9876543210fedcba9876543210"
	tradeID := "T-SAFETY"
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
	detailBytes, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(saltA)
	fake.Transient["detail"] = detailBytes
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(saltB)
	fake.Transient["detail"] = detailBytes
	_, err = contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)

	// 4a. CreditPayee on ACCEPTED trade -> error, no write
	t.Run("TestNoCreditBeforeSettled", func(t *testing.T) {
		fake.CallerMSP = "BankB1MSP"
		_, err := contract.CreditPayee(ctx, tradeID, "A")
		require.Error(t, err)
		require.Contains(t, err.Error(), "not SETTLED")
	})

	// Now Settle the trade
	_, err = contract.Settle(ctx, tradeID)
	require.NoError(t, err)

	// 4b. ReturnHold on SETTLED trade -> error
	t.Run("TestNoReturnAfterSettled", func(t *testing.T) {
		fake.CallerMSP = "BankA1MSP"
		_, err := contract.ReturnHold(ctx, tradeID, "A")
		require.Error(t, err)
		require.Contains(t, err.Error(), "neither EXPIRED nor CANCELLED")
	})
}

func TestNoCreditBeforeSettled(t *testing.T) {
	TestTerminalSafety(t)
}

func TestNoReturnAfterSettled(t *testing.T) {
	TestTerminalSafety(t)
}

// CC-24: Hard Rule 5
func TestBalancesNonNegative(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	txTs := int64(86400*1000 + 16200)
	fake.SetTxTimestamp(txTs)

	// Attest large reserves
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000000", "STMT-INR")
	require.NoError(t, err)

	fake.CallerMSP = "RegBMSP"
	fake.Transient["approver2"] = []byte("approver-regb-sec")
	_, err = contract.AttestReserve(ctx, "SGD", "100000000000", "STMT-SGD")
	require.NoError(t, err)

	// Initial minting
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "100000000", "RTGS-FUZZ-1")
	require.NoError(t, err)

	fake.CallerMSP = "RegBMSP"
	fake.Transient["approver2"] = []byte("approver-regb-sec")
	_, err = contract.Mint(ctx, "SGD", "BankB1MSP", "100000000", "RTGS-FUZZ-2")
	require.NoError(t, err)

	checkNonNegative := func() {
		accounts := []struct {
			ccy  string
			bank string
		}{
			{"INR", "BankA1MSP"},
			{"INR", "BankB1MSP"},
			{"SGD", "BankA1MSP"},
			{"SGD", "BankB1MSP"},
		}
		for _, a := range accounts {
			raw, err := fake.GetPrivateData(CollName(a.ccy, a.bank), AccountKey(a.ccy, a.bank))
			require.NoError(t, err)
			var acct Account
			require.NoError(t, json.Unmarshal(raw, &acct))
			require.GreaterOrEqual(t, acct.Available, int64(0), "Account %s %s Available < 0", a.ccy, a.bank)
			require.GreaterOrEqual(t, acct.Held, int64(0), "Account %s %s Held < 0", a.ccy, a.bank)
		}
	}

	rnd := rand.New(rand.NewSource(42))
	for i := 0; i < 200; i++ {
		op := rnd.Intn(6)
		switch op {
		case 0: // Mint INR
			amt := rnd.Int63n(5000000) + 1
			ref := fmt.Sprintf("RTGS-FUZZ-INR-%d", i)
			fake.CallerMSP = "RegAMSP"
			fake.Transient["approver2"] = []byte("approver-sec")
			_, _ = contract.Mint(ctx, "INR", "BankA1MSP", strconv.FormatInt(amt, 10), ref)
		case 1: // Mint SGD
			amt := rnd.Int63n(5000000) + 1
			ref := fmt.Sprintf("RTGS-FUZZ-SGD-%d", i)
			fake.CallerMSP = "RegBMSP"
			fake.Transient["approver2"] = []byte("approver-sec")
			_, _ = contract.Mint(ctx, "SGD", "BankB1MSP", strconv.FormatInt(amt, 10), ref)
		case 2: // Propose trade
			tID := fmt.Sprintf("T-FUZZ-%d", i)
			amtA := rnd.Int63n(1000000) + 1000
			amtB := rnd.Int63n(50000) + 100
			detail := TradeDetail{
				TradeID:  tID,
				CcyA:     "INR",
				AmountA:  amtA,
				CcyB:     "SGD",
				AmountB:  amtB,
				Proposer: "BankA1MSP",
				Cparty:   "BankB1MSP",
				Salt:     "0123456789abcdef0123456789abcdef",
			}
			db, _ := json.Marshal(detail)
			fake.CallerMSP = "BankA1MSP"
			fake.Transient["salt"] = []byte("0123456789abcdef0123456789abcdef")
			fake.Transient["detail"] = db
			_, _ = contract.ProposeTrade(ctx, tID, "INR", strconv.FormatInt(amtA, 10), "SGD", strconv.FormatInt(amtB, 10), "BankB1MSP", strconv.FormatInt(txTs+1000, 10), strconv.FormatInt(txTs+2000, 10))
		case 3: // Freeze / unfreeze
			c := "INR"
			if rnd.Intn(2) == 1 {
				c = "SGD"
			}
			frozen := "false"
			if rnd.Intn(2) == 1 {
				frozen = "true"
			}
			fake.CallerMSP = IssuerOf[c]
			_, _ = contract.Freeze(ctx, c, "BankA1MSP", frozen)
		}
		checkNonNegative()
	}
}

// CC-25: Hard Rule 6
func TestConservation(t *testing.T) {
	contract, ctx, fake, tradeID, amtA, amtB := setupSettledTrade(t)

	// Conservation check:
	// Total minted INR = 50M.
	// Total minted SGD = 10M.
	// Right now: Settled, before SettleDebit & CreditPayee.
	// Payer A1 has Available=40M, Held=10M (Sum INR = 50M).
	// Payer B1 has Available=9.8M, Held=200k (Sum SGD = 10M).
	verifySupply := func() {
		// Read SUPPLY
		rawINR, _ := fake.GetState(SupplyKey("INR"))
		var supINR Supply
		_ = json.Unmarshal(rawINR, &supINR)

		rawSGD, _ := fake.GetState(SupplyKey("SGD"))
		var supSGD Supply
		_ = json.Unmarshal(rawSGD, &supSGD)

		// Sum INR
		var sumINR int64
		for _, b := range BankMSPs {
			raw, _ := fake.GetPrivateData(CollName("INR", b), AccountKey("INR", b))
			var acct Account
			_ = json.Unmarshal(raw, &acct)
			sumINR += acct.Available + acct.Held
		}

		// Sum SGD
		var sumSGD int64
		for _, b := range BankMSPs {
			raw, _ := fake.GetPrivateData(CollName("SGD", b), AccountKey("SGD", b))
			var acct Account
			_ = json.Unmarshal(raw, &acct)
			sumSGD += acct.Available + acct.Held
		}

		// If SettleDebit debited Held before CreditPayee credited Available, difference is in-transit
		rawLegA, _ := fake.GetState(TradeLegKey(tradeID, "A"))
		var legA TradeLeg
		_ = json.Unmarshal(rawLegA, &legA)
		if legA.HoldStatus == "DEBITED" && legA.CreditStatus != "CREDITED" {
			sumINR += amtA
		}

		rawLegB, _ := fake.GetState(TradeLegKey(tradeID, "B"))
		var legB TradeLeg
		_ = json.Unmarshal(rawLegB, &legB)
		if legB.HoldStatus == "DEBITED" && legB.CreditStatus != "CREDITED" {
			sumSGD += amtB
		}

		require.Equal(t, supINR.Total, sumINR, "INR supply mismatch")
		require.Equal(t, supSGD.Total, sumSGD, "SGD supply mismatch")
	}

	verifySupply()

	// SettleDebit A
	fake.CallerMSP = "BankA1MSP"
	_, err := contract.SettleDebit(ctx, tradeID, "A")
	require.NoError(t, err)
	verifySupply()

	// CreditPayee A
	fake.CallerMSP = "BankB1MSP"
	_, err = contract.CreditPayee(ctx, tradeID, "A")
	require.NoError(t, err)
	verifySupply()

	// SettleDebit B
	fake.CallerMSP = "BankB1MSP"
	_, err = contract.SettleDebit(ctx, tradeID, "B")
	require.NoError(t, err)
	verifySupply()

	// CreditPayee B
	fake.CallerMSP = "BankA1MSP"
	_, err = contract.CreditPayee(ctx, tradeID, "B")
	require.NoError(t, err)
	verifySupply()
}

// CC-26: Hard Rule 7
func TestSaltRequired(t *testing.T) {
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

	tradeID := "T-NO-SALT"
	detail := TradeDetail{
		TradeID:  tradeID,
		CcyA:     "INR",
		AmountA:  10000000,
		CcyB:     "SGD",
		AmountB:  200000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
	}
	detailBytes, _ := json.Marshal(detail)

	fake.CallerMSP = "BankA1MSP"
	// No salt provided
	delete(fake.Transient, "salt")
	fake.Transient["detail"] = detailBytes

	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.Error(t, err)
	require.Contains(t, err.Error(), "salt")
}

// CC-27: Hard Rule 8
func TestFreezeDoesNotBlockTerminal(t *testing.T) {
	contract, ctx, fake, tradeID, amtA, _ := setupSettledTrade(t)

	// 1. Freeze payee (BankB1 in INR)
	fake.CallerMSP = "RegAMSP"
	_, err := contract.Freeze(ctx, "INR", "BankB1MSP", "true")
	require.NoError(t, err)

	// CreditPayee still succeeds!
	fake.CallerMSP = "BankB1MSP"
	res, err := contract.CreditPayee(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	rawAcct, err := fake.GetPrivateData(CollName("INR", "BankB1MSP"), AccountKey("INR", "BankB1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(rawAcct, &acct))
	require.Equal(t, amtA, acct.Available)

	// 2. Frozen payer still gets ReturnHold
	txTs := int64(86400*1000 + 16200)
	tradeID2 := "T-FREEZE-RET"
	salt := "0123456789abcdef0123456789abcdef"
	detail := TradeDetail{
		TradeID:  tradeID2,
		CcyA:     "INR",
		AmountA:  5000000,
		CcyB:     "SGD",
		AmountB:  100000,
		Proposer: "BankA1MSP",
		Cparty:   "BankB1MSP",
		Salt:     salt,
	}
	db, _ := json.Marshal(detail)
	fake.CallerMSP = "BankA1MSP"
	fake.Transient["salt"] = []byte(salt)
	fake.Transient["detail"] = db
	_, err = contract.ProposeTrade(ctx, tradeID2, "INR", "5000000", "SGD", "100000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)

	_, err = contract.CancelTrade(ctx, tradeID2)
	require.NoError(t, err)

	// Freeze payer
	fake.CallerMSP = "RegAMSP"
	_, err = contract.Freeze(ctx, "INR", "BankA1MSP", "true")
	require.NoError(t, err)

	// ReturnHold still succeeds!
	fake.CallerMSP = "BankA1MSP"
	resRet, err := contract.ReturnHold(ctx, tradeID2, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", resRet.Status)
}

// CC-28: Hard Rule 9
func TestSettleDoesNotRevalidateRules(t *testing.T) {
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

	fake.CallerMSP = "RegBMSP"
	fake.Transient["approver2"] = []byte("approver-regb-sec")
	_, err = contract.AttestReserve(ctx, "SGD", "100000000", "STMT-SGD")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "SGD", "BankB1MSP", "10000000", "RTGS-MINT-SGD")
	require.NoError(t, err)

	tradeID := "T-HALT-SETTLE"
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
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(saltB)
	fake.Transient["detail"] = db
	_, err = contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)

	// Halt JUR-A between accept and settle!
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	haltJSON := `{
		"opStartMin": 540,
		"opEndMin": 1020,
		"utcOffsetMin": 330,
		"maxTxAmount": 50000000000,
		"maxDailyMint": 1000000000000,
		"halted": true
	}`
	_, err = contract.UpdateRules(ctx, "JUR-A", haltJSON)
	require.NoError(t, err)

	// Settle still succeeds!
	fake.CallerMSP = "BankA1MSP"
	res, err := contract.Settle(ctx, tradeID)
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)
}

// CC-29: Hard Rule 10
func TestMintRespectsReserve(t *testing.T) {
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

	// Mint 120M (beyond 100M reserve) -> REFUSED EXCEEDS_RESERVE
	res, err := contract.Mint(ctx, "INR", "BankA1MSP", "120000000", "RTGS-MINT-EXCEED")
	require.NoError(t, err)
	require.Equal(t, "REFUSED", res.Status)
	require.Equal(t, "EXCEEDS_RESERVE", res.ReasonCode)
}

// CC-30: Hard Rule 11
func TestSettleWritesOnlyPublic(t *testing.T) {
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

	fake.CallerMSP = "RegBMSP"
	fake.Transient["approver2"] = []byte("approver-regb-sec")
	_, err = contract.AttestReserve(ctx, "SGD", "100000000", "STMT-SGD")
	require.NoError(t, err)
	_, err = contract.Mint(ctx, "SGD", "BankB1MSP", "10000000", "RTGS-MINT-SGD")
	require.NoError(t, err)

	tradeID := "T-SETTLE-PUB"
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
	_, err = contract.ProposeTrade(ctx, tradeID, "INR", "10000000", "SGD", "200000", "BankB1MSP", strconv.FormatInt(txTs+100, 10), strconv.FormatInt(txTs+200, 10))
	require.NoError(t, err)

	fake.CallerMSP = "BankB1MSP"
	fake.Transient["salt"] = []byte(saltB)
	fake.Transient["detail"] = db
	_, err = contract.AcceptTrade(ctx, tradeID)
	require.NoError(t, err)

	// Clear written collections before Settle
	fake.WrittenCollections = nil
	fake.PrivateWriteLog = nil

	_, err = contract.Settle(ctx, tradeID)
	require.NoError(t, err)

	// Assert zero private writes produced
	require.Empty(t, fake.WrittenCollections, "Settle produced private writes: %v", fake.WrittenCollections)
}

// CC-31: Hard Rule 12
func TestCreditWritesOnePrivateCollection(t *testing.T) {
	contract, ctx, fake, tradeID, _, _ := setupSettledTrade(t)

	fake.WrittenCollections = nil
	fake.PrivateWriteLog = nil

	fake.CallerMSP = "BankB1MSP"
	res, err := contract.CreditPayee(ctx, tradeID, "A")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Assert written collections has length 1 and equals coll_INR_B1
	require.Equal(t, 1, len(fake.WrittenCollections), "CreditPayee must write to exactly one private collection")
	require.Equal(t, CollName("INR", "BankB1MSP"), fake.WrittenCollections[0])
}
