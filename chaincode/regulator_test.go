package main

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"

	"settlement-cc/internal/fakestub"
)

func TestAttestReserve(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	// 1. Success attestation for INR by RegAMSP
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-bob")

	res, err := contract.AttestReserve(ctx, "INR", "50000000000", "STMT-2026-10-09-001")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	rawRes, err := fake.GetState(ReserveKey("INR"))
	require.NoError(t, err)
	var reserve Reserve
	require.NoError(t, json.Unmarshal(rawRes, &reserve))
	require.Equal(t, "INR", reserve.Ccy)
	require.Equal(t, int64(50000000000), reserve.RtgsBalance)
	require.Equal(t, "STMT-2026-10-09-001", reserve.StatementRef)
	require.Len(t, reserve.ApprovedBy, 2)
	require.Equal(t, "approver-rega-bob", reserve.ApprovedBy[1])

	// SBE verified
	sbe, err := fake.GetStateValidationParameter(ReserveKey("INR"))
	require.NoError(t, err)
	require.NotEmpty(t, sbe)

	// 2. Unauthorized caller (RegBMSP trying to attest INR)
	fake.CallerMSP = "RegBMSP"
	_, err = contract.AttestReserve(ctx, "INR", "60000000000", "STMT-002")
	require.Error(t, err)
	require.Contains(t, err.Error(), "unauthorized")

	// 3. Missing transient approver2
	fake.CallerMSP = "RegAMSP"
	delete(fake.Transient, "approver2")
	_, err = contract.AttestReserve(ctx, "INR", "60000000000", "STMT-003")
	require.Error(t, err)
	require.Contains(t, err.Error(), "missing transient approver2")

	// 4. approver2 equals invoker
	invokerID, err := getInvokerID(ctx)
	require.NoError(t, err)
	fake.Transient["approver2"] = []byte(invokerID)
	_, err = contract.AttestReserve(ctx, "INR", "60000000000", "STMT-004")
	require.Error(t, err)
	require.Contains(t, err.Error(), "must differ")

	// 5. Negative balance
	fake.Transient["approver2"] = []byte("approver-rega-charlie")
	_, err = contract.AttestReserve(ctx, "INR", "-100", "STMT-005")
	require.Error(t, err)
	require.Contains(t, err.Error(), "negative")

	// 6. Unsupported currency
	_, err = contract.AttestReserve(ctx, "USD", "1000", "STMT-006")
	require.Error(t, err)
	require.Contains(t, err.Error(), "unsupported")
}

func TestUpdateRules(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	// 1. Success update by RegAMSP for JUR-A
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sarah")

	newRulesPayload := `{
		"opStartMin": 600,
		"opEndMin": 1080,
		"utcOffsetMin": 330,
		"maxTxAmount": 60000000000,
		"maxDailyMint": 2000000000000,
		"halted": false
	}`

	res, err := contract.UpdateRules(ctx, "JUR-A", newRulesPayload)
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)
	require.Equal(t, 2, res.RuleVersion)

	// Verify state in ledger
	rawRules, err := fake.GetState(RulesKey("JUR-A"))
	require.NoError(t, err)
	var r Rules
	require.NoError(t, json.Unmarshal(rawRules, &r))
	require.Equal(t, "JUR-A", r.Jurisdiction)
	require.Equal(t, 2, r.Version)
	require.Equal(t, 600, r.OpStartMin)
	require.Equal(t, 1080, r.OpEndMin)
	require.Equal(t, int64(60000000000), r.MaxTxAmount)
	require.Equal(t, int64(2000000000000), r.MaxDailyMint)
	require.Len(t, r.ApprovedBy, 2)
	require.Equal(t, "approver-rega-sarah", r.ApprovedBy[1])

	// SBE verified
	sbe, err := fake.GetStateValidationParameter(RulesKey("JUR-A"))
	require.NoError(t, err)
	require.NotEmpty(t, sbe)

	// 2. Unauthorized caller (RegBMSP trying to update JUR-A)
	fake.CallerMSP = "RegBMSP"
	_, err = contract.UpdateRules(ctx, "JUR-A", newRulesPayload)
	require.Error(t, err)
	require.Contains(t, err.Error(), "unauthorized")

	// 3. Missing transient approver2
	fake.CallerMSP = "RegAMSP"
	delete(fake.Transient, "approver2")
	_, err = contract.UpdateRules(ctx, "JUR-A", newRulesPayload)
	require.Error(t, err)
	require.Contains(t, err.Error(), "missing transient approver2")

	// 4. Invalid hours (OpStartMin >= OpEndMin)
	fake.Transient["approver2"] = []byte("approver-rega-sarah")
	badHours := `{
		"opStartMin": 1200,
		"opEndMin": 600,
		"utcOffsetMin": 330,
		"maxTxAmount": 60000000000,
		"maxDailyMint": 2000000000000,
		"halted": false
	}`
	_, err = contract.UpdateRules(ctx, "JUR-A", badHours)
	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid operating hours")
}

func TestFreeze(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	// 1. Freeze BankA1MSP INR account by RegAMSP
	fake.CallerMSP = "RegAMSP"
	res, err := contract.Freeze(ctx, "INR", "BankA1MSP", "true")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Verify status is FROZEN
	acctRaw, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(acctRaw, &acct))
	require.Equal(t, "FROZEN", acct.Status)

	// 2. Unfreeze
	res, err = contract.Freeze(ctx, "INR", "BankA1MSP", "false")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	acctRaw, err = fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(acctRaw, &acct))
	require.Equal(t, "ACTIVE", acct.Status)

	// 3. Unauthorized caller (RegBMSP trying to freeze INR)
	fake.CallerMSP = "RegBMSP"
	_, err = contract.Freeze(ctx, "INR", "BankA1MSP", "true")
	require.Error(t, err)
	require.Contains(t, err.Error(), "unauthorized")

	// 4. Invalid boolean string
	fake.CallerMSP = "RegAMSP"
	_, err = contract.Freeze(ctx, "INR", "BankA1MSP", "not-a-bool")
	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid frozen flag")

	// 5. Unknown bank
	_, err = contract.Freeze(ctx, "INR", "UnknownBankMSP", "true")
	require.Error(t, err)
	require.Contains(t, err.Error(), "unknown bank MSP")
}

func TestMint(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}
	contract := &SmartContract{}

	// Initialize ledger
	_, err := contract.InitLedger(ctx)
	require.NoError(t, err)

	// Attest reserve of 100,000,000 paise
	fake.CallerMSP = "RegAMSP"
	fake.Transient["approver2"] = []byte("approver-rega-sec")
	_, err = contract.AttestReserve(ctx, "INR", "100000000", "STMT-INIT")
	require.NoError(t, err)

	// 1. Valid Mint: 40,000,000 to BankA1MSP
	res, err := contract.Mint(ctx, "INR", "BankA1MSP", "40000000", "RTGS-001")
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)

	// Verify Account balance
	acctRaw, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	require.NoError(t, err)
	var acct Account
	require.NoError(t, json.Unmarshal(acctRaw, &acct))
	require.Equal(t, int64(40000000), acct.Available)
	require.Equal(t, int64(0), acct.Held)

	// Verify Supply
	supRaw, err := fake.GetState(SupplyKey("INR"))
	require.NoError(t, err)
	var sup Supply
	require.NoError(t, json.Unmarshal(supRaw, &sup))
	require.Equal(t, int64(40000000), sup.Total)
	require.Equal(t, int64(40000000), sup.MintedToday)

	// Verify Issuance private record
	issRaw, err := fake.GetPrivateData(CollName("INR", "BankA1MSP"), IssuanceKey("INR", "RTGS-001"))
	require.NoError(t, err)
	var iss Issuance
	require.NoError(t, json.Unmarshal(issRaw, &iss))
	require.Equal(t, "MINT", iss.Type)
	require.Equal(t, "BankA1MSP", iss.Bank)
	require.Equal(t, int64(40000000), iss.Amount)

	// 2. Duplicate RTGS ref -> Go error
	_, err = contract.Mint(ctx, "INR", "BankA1MSP", "10000000", "RTGS-001")
	require.Error(t, err)
	require.Contains(t, err.Error(), "duplicate rtgsRef")

	// 3. Exceeds reserve -> REFUSED (nil error), account balance unchanged
	fake.TxID = "tx-mint-exceed"
	resExceed, err := contract.Mint(ctx, "INR", "BankA1MSP", "70000000", "RTGS-002")
	require.NoError(t, err)
	require.Equal(t, "REFUSED", resExceed.Status)
	require.Equal(t, "EXCEEDS_RESERVE", resExceed.ReasonCode)

	// Check balance still 40,000,000
	acctRaw2, _ := fake.GetPrivateData(CollName("INR", "BankA1MSP"), AccountKey("INR", "BankA1MSP"))
	var acct2 Account
	_ = json.Unmarshal(acctRaw2, &acct2)
	require.Equal(t, int64(40000000), acct2.Available)

	// Check REFUSAL public record written
	refRaw, err := fake.GetState(RefusalKey("tx-mint-exceed"))
	require.NoError(t, err)
	require.NotEmpty(t, refRaw)
	var ref Refusal
	require.NoError(t, json.Unmarshal(refRaw, &ref))
	require.Equal(t, "EXCEEDS_RESERVE", ref.ReasonCode)

	// Check REFUSALDETAIL in caller implicit collection
	refDetRaw, err := fake.GetPrivateData(ImplicitColl("RegAMSP"), RefusalDetailKey("tx-mint-exceed"))
	require.NoError(t, err)
	require.NotEmpty(t, refDetRaw)

	// 4. Jurisdiction Halted -> REFUSED
	fake.TxID = "tx-mint-halted"
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

	resHalted, err := contract.Mint(ctx, "INR", "BankA1MSP", "1000000", "RTGS-003")
	require.NoError(t, err)
	require.Equal(t, "REFUSED", resHalted.Status)
	require.Equal(t, "JURISDICTION_HALTED", resHalted.ReasonCode)
}
