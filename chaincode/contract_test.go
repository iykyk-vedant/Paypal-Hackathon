package main

import (
	"encoding/json"
	"testing"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/stretchr/testify/require"

	"settlement-cc/internal/fakestub"
)

type mockContext struct {
	contractapi.TransactionContextInterface
	stub shim.ChaincodeStubInterface
}

func (m *mockContext) GetStub() shim.ChaincodeStubInterface {
	return m.stub
}

func TestInitLedger(t *testing.T) {
	fake := fakestub.NewFakeStub()
	mockStub := &fakestub.MockChaincodeStub{FakeStub: fake}
	ctx := &mockContext{stub: mockStub}

	contract := &SmartContract{}

	// 1. Initial InitLedger invocation (as AuditorMSP to initialize all four collections)
	fake.CallerMSP = "AuditorMSP"
	res, err := contract.InitLedger(ctx)
	require.NoError(t, err)
	require.Equal(t, "OK", res.Status)
	require.Equal(t, fake.GetTxID(), res.TxID)

	// Verify RULES~JUR-A
	rawRulesA, err := fake.GetState(RulesKey("JUR-A"))
	require.NoError(t, err)
	require.NotEmpty(t, rawRulesA)
	var rulesA Rules
	require.NoError(t, json.Unmarshal(rawRulesA, &rulesA))
	require.Equal(t, "JUR-A", rulesA.Jurisdiction)
	require.Equal(t, 1, rulesA.Version)
	require.Equal(t, 540, rulesA.OpStartMin)
	require.Equal(t, 1020, rulesA.OpEndMin)
	require.Equal(t, 330, rulesA.UtcOffsetMin)
	require.Equal(t, int64(50000000000), rulesA.MaxTxAmount)
	require.Equal(t, int64(1000000000000), rulesA.MaxDailyMint)
	require.False(t, rulesA.Halted)
	require.Equal(t, []string{"genesis", "genesis"}, rulesA.ApprovedBy)

	// Verify SBE on RULES~JUR-A
	sbeA, err := fake.GetStateValidationParameter(RulesKey("JUR-A"))
	require.NoError(t, err)
	require.NotEmpty(t, sbeA)

	// Verify RULES~JUR-B
	rawRulesB, err := fake.GetState(RulesKey("JUR-B"))
	require.NoError(t, err)
	require.NotEmpty(t, rawRulesB)
	var rulesB Rules
	require.NoError(t, json.Unmarshal(rawRulesB, &rulesB))
	require.Equal(t, "JUR-B", rulesB.Jurisdiction)
	require.Equal(t, 1, rulesB.Version)
	require.Equal(t, 480, rulesB.OpStartMin)
	require.Equal(t, 1080, rulesB.OpEndMin)
	require.Equal(t, 480, rulesB.UtcOffsetMin)
	require.Equal(t, int64(1000000000), rulesB.MaxTxAmount)
	require.Equal(t, int64(10000000000), rulesB.MaxDailyMint)

	// Verify SBE on RULES~JUR-B
	sbeB, err := fake.GetStateValidationParameter(RulesKey("JUR-B"))
	require.NoError(t, err)
	require.NotEmpty(t, sbeB)

	// Verify SUPPLY
	rawSupplyINR, err := fake.GetState(SupplyKey("INR"))
	require.NoError(t, err)
	var supplyINR Supply
	require.NoError(t, json.Unmarshal(rawSupplyINR, &supplyINR))
	require.Equal(t, "INR", supplyINR.Ccy)
	require.Equal(t, int64(0), supplyINR.Total)

	rawSupplySGD, err := fake.GetState(SupplyKey("SGD"))
	require.NoError(t, err)
	var supplySGD Supply
	require.NoError(t, json.Unmarshal(rawSupplySGD, &supplySGD))
	require.Equal(t, "SGD", supplySGD.Ccy)
	require.Equal(t, int64(0), supplySGD.Total)

	// Verify RESERVE & SBE
	rawReserveINR, err := fake.GetState(ReserveKey("INR"))
	require.NoError(t, err)
	var reserveINR Reserve
	require.NoError(t, json.Unmarshal(rawReserveINR, &reserveINR))
	require.Equal(t, "INR", reserveINR.Ccy)
	require.Equal(t, int64(0), reserveINR.RtgsBalance)
	sbeResINR, err := fake.GetStateValidationParameter(ReserveKey("INR"))
	require.NoError(t, err)
	require.NotEmpty(t, sbeResINR)

	rawReserveSGD, err := fake.GetState(ReserveKey("SGD"))
	require.NoError(t, err)
	var reserveSGD Reserve
	require.NoError(t, json.Unmarshal(rawReserveSGD, &reserveSGD))
	require.Equal(t, "SGD", reserveSGD.Ccy)
	require.Equal(t, int64(0), reserveSGD.RtgsBalance)
	sbeResSGD, err := fake.GetStateValidationParameter(ReserveKey("SGD"))
	require.NoError(t, err)
	require.NotEmpty(t, sbeResSGD)

	// Verify Accounts in private collections
	for _, acc := range []struct {
		ccy  string
		bank string
	}{
		{"INR", "BankA1MSP"},
		{"INR", "BankB1MSP"},
		{"SGD", "BankA1MSP"},
		{"SGD", "BankB1MSP"},
	} {
		coll := CollName(acc.ccy, acc.bank)
		key := AccountKey(acc.ccy, acc.bank)
		rawAcct, err := fake.GetPrivateData(coll, key)
		require.NoError(t, err)
		require.NotEmpty(t, rawAcct)
		var acct Account
		require.NoError(t, json.Unmarshal(rawAcct, &acct))
		require.Equal(t, acc.ccy, acct.Ccy)
		require.Equal(t, acc.bank, acct.Bank)
		require.Equal(t, int64(0), acct.Available)
		require.Equal(t, int64(0), acct.Held)
		require.Equal(t, "ACTIVE", acct.Status)
	}

	// 2. Idempotency check: calling InitLedger again should succeed and not overwrite
	res2, err := contract.InitLedger(ctx)
	require.NoError(t, err)
	require.Equal(t, "OK", res2.Status)
}
