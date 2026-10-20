package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-chaincode-go/pkg/statebased"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides the cross-border PvP settlement chaincode
type SmartContract struct {
	contractapi.Contract
}

func setSBE(stub shim.ChaincodeStubInterface, key string, orgs ...string) error {
	ep, err := statebased.NewStateEP(nil)
	if err != nil {
		return fmt.Errorf("setSBE: create EP: %w", err)
	}
	if err := ep.AddOrgs(statebased.RoleTypePeer, orgs...); err != nil {
		return fmt.Errorf("setSBE: add orgs: %w", err)
	}
	policy, err := ep.Policy()
	if err != nil {
		return fmt.Errorf("setSBE: export policy: %w", err)
	}
	if err := stub.SetStateValidationParameter(key, policy); err != nil {
		return fmt.Errorf("setSBE: set validation parameter: %w", err)
	}
	return nil
}

func getTxTime(stub shim.ChaincodeStubInterface) (int64, error) {
	ts, err := stub.GetTxTimestamp()
	if err != nil {
		return 0, fmt.Errorf("getTxTime: %w", err)
	}
	return ts.GetSeconds(), nil
}

// InitLedger initializes rules, supplies, reserves, and bank accounts
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) (*Result, error) {
	stub := ctx.GetStub()

	// Check idempotency: if RULES~JUR-A already exists, return OK
	existing, err := stub.GetState(RulesKey("JUR-A"))
	if err != nil {
		return nil, fmt.Errorf("InitLedger: read RULES~JUR-A: %w", err)
	}
	if len(existing) > 0 {
		return &Result{
			Status: "OK",
			TxID:   stub.GetTxID(),
		}, nil
	}

	txTs, err := getTxTime(stub)
	if err != nil {
		return nil, fmt.Errorf("InitLedger: get timestamp: %w", err)
	}

	genesisApprovers := []string{"genesis", "genesis"}

	// 1. RULES~JUR-A: {540, 1020, 330, 500_000_000_00, 10_000_000_000_00, false}
	rulesA := Rules{
		Jurisdiction: "JUR-A",
		Version:      1,
		OpStartMin:   540,
		OpEndMin:     1020,
		UtcOffsetMin: 330,
		MaxTxAmount:  50000000000,   // 500M INR in paise
		MaxDailyMint: 1000000000000, // 10B INR in paise
		Halted:       false,
		ApprovedBy:   genesisApprovers,
	}
	rulesABytes, err := json.Marshal(rulesA)
	if err != nil {
		return nil, fmt.Errorf("InitLedger: marshal rulesA: %w", err)
	}
	if err := stub.PutState(RulesKey("JUR-A"), rulesABytes); err != nil {
		return nil, fmt.Errorf("InitLedger: put RULES~JUR-A: %w", err)
	}
	if err := setSBE(stub, RulesKey("JUR-A"), "RegAMSP"); err != nil {
		return nil, fmt.Errorf("InitLedger: set SBE RULES~JUR-A: %w", err)
	}

	// 2. RULES~JUR-B: {480, 1080, 480, 10_000_000_00, 100_000_000_00, false}
	rulesB := Rules{
		Jurisdiction: "JUR-B",
		Version:      1,
		OpStartMin:   480,
		OpEndMin:     1080,
		UtcOffsetMin: 480,
		MaxTxAmount:  1000000000,  // 10M SGD in cents
		MaxDailyMint: 10000000000, // 100M SGD in cents
		Halted:       false,
		ApprovedBy:   genesisApprovers,
	}
	rulesBBytes, err := json.Marshal(rulesB)
	if err != nil {
		return nil, fmt.Errorf("InitLedger: marshal rulesB: %w", err)
	}
	if err := stub.PutState(RulesKey("JUR-B"), rulesBBytes); err != nil {
		return nil, fmt.Errorf("InitLedger: put RULES~JUR-B: %w", err)
	}
	if err := setSBE(stub, RulesKey("JUR-B"), "RegBMSP"); err != nil {
		return nil, fmt.Errorf("InitLedger: set SBE RULES~JUR-B: %w", err)
	}

	// 3. SUPPLY~INR and SUPPLY~SGD
	supplyINR := Supply{
		Ccy:         "INR",
		Total:       0,
		MintedToday: 0,
		DayStart:    txTs,
	}
	supplyINRBytes, err := json.Marshal(supplyINR)
	if err != nil {
		return nil, fmt.Errorf("InitLedger: marshal supplyINR: %w", err)
	}
	if err := stub.PutState(SupplyKey("INR"), supplyINRBytes); err != nil {
		return nil, fmt.Errorf("InitLedger: put SUPPLY~INR: %w", err)
	}

	supplySGD := Supply{
		Ccy:         "SGD",
		Total:       0,
		MintedToday: 0,
		DayStart:    txTs,
	}
	supplySGDBytes, err := json.Marshal(supplySGD)
	if err != nil {
		return nil, fmt.Errorf("InitLedger: marshal supplySGD: %w", err)
	}
	if err := stub.PutState(SupplyKey("SGD"), supplySGDBytes); err != nil {
		return nil, fmt.Errorf("InitLedger: put SUPPLY~SGD: %w", err)
	}

	// 4. RESERVE~INR and RESERVE~SGD with SBE
	reserveINR := Reserve{
		Ccy:          "INR",
		RtgsBalance:  0,
		StatementRef: "genesis",
		AsOf:         txTs,
		ApprovedBy:   genesisApprovers,
	}
	reserveINRBytes, err := json.Marshal(reserveINR)
	if err != nil {
		return nil, fmt.Errorf("InitLedger: marshal reserveINR: %w", err)
	}
	if err := stub.PutState(ReserveKey("INR"), reserveINRBytes); err != nil {
		return nil, fmt.Errorf("InitLedger: put RESERVE~INR: %w", err)
	}
	if err := setSBE(stub, ReserveKey("INR"), "RegAMSP"); err != nil {
		return nil, fmt.Errorf("InitLedger: set SBE RESERVE~INR: %w", err)
	}

	reserveSGD := Reserve{
		Ccy:          "SGD",
		RtgsBalance:  0,
		StatementRef: "genesis",
		AsOf:         txTs,
		ApprovedBy:   genesisApprovers,
	}
	reserveSGDBytes, err := json.Marshal(reserveSGD)
	if err != nil {
		return nil, fmt.Errorf("InitLedger: marshal reserveSGD: %w", err)
	}
	if err := stub.PutState(ReserveKey("SGD"), reserveSGDBytes); err != nil {
		return nil, fmt.Errorf("InitLedger: put RESERVE~SGD: %w", err)
	}
	if err := setSBE(stub, ReserveKey("SGD"), "RegBMSP"); err != nil {
		return nil, fmt.Errorf("InitLedger: set SBE RESERVE~SGD: %w", err)
	}

	// 5. Create ACCT~<ccy>~<bank> = 0 ACTIVE in all four collections
	type bankAcc struct {
		ccy  string
		bank string
	}
	accounts := []bankAcc{
		{"INR", "BankA1MSP"},
		{"INR", "BankB1MSP"},
		{"SGD", "BankA1MSP"},
		{"SGD", "BankB1MSP"},
	}
	for _, acc := range accounts {
		coll := CollName(acc.ccy, acc.bank)
		key := AccountKey(acc.ccy, acc.bank)

		// Idempotent: skip if already initialized
		existing, err := stub.GetPrivateData(coll, key)
		if err == nil && len(existing) > 0 {
			continue
		}

		acct := Account{
			Ccy:       acc.ccy,
			Bank:      acc.bank,
			Available: 0,
			Held:      0,
			Status:    "ACTIVE",
		}
		acctBytes, err := json.Marshal(acct)
		if err != nil {
			return nil, fmt.Errorf("InitLedger: marshal acct %s %s: %w", acc.ccy, acc.bank, err)
		}
		if err := stub.PutPrivateData(coll, key, acctBytes); err != nil {
			return nil, fmt.Errorf("InitLedger: put private acct %s %s: %w", coll, key, err)
		}
	}

	return &Result{
		Status: "OK",
		TxID:   stub.GetTxID(),
	}, nil
}
