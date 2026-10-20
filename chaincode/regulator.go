package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// getInvokerID extracts unique invoker ID from transaction certificate
func getInvokerID(ctx contractapi.TransactionContextInterface) (string, error) {
	stub := ctx.GetStub()
	if stub != nil {
		id, err := cid.GetID(stub)
		if err == nil && id != "" {
			return id, nil
		}
	}
	if ci := ctx.GetClientIdentity(); ci != nil {
		id, err := ci.GetID()
		if err == nil && id != "" {
			return id, nil
		}
	}
	return "", fmt.Errorf("getInvokerID: unable to determine invoker ID")
}

// getApprover2 extracts and validates dual-authorization from transient data
func getApprover2(ctx contractapi.TransactionContextInterface, invokerID string) (string, error) {
	stub := ctx.GetStub()
	transient, err := stub.GetTransient()
	if err != nil {
		return "", fmt.Errorf("getApprover2: error getting transient data: %w", err)
	}
	rawApprover2, ok := transient["approver2"]
	if !ok || len(rawApprover2) == 0 {
		return "", fmt.Errorf("getApprover2: missing transient approver2")
	}
	approver2 := string(rawApprover2)
	if approver2 == invokerID {
		return "", fmt.Errorf("getApprover2: approver2 must differ from invoker")
	}
	return approver2, nil
}

// AttestReserve updates central bank reserve attestation with dual authorization
func (s *SmartContract) AttestReserve(ctx contractapi.TransactionContextInterface, ccy, balance, stmtRef string) (*Result, error) {
	stub := ctx.GetStub()

	expectedMSP, ok := IssuerOf[ccy]
	if !ok {
		return nil, fmt.Errorf("AttestReserve: unsupported currency %s", ccy)
	}

	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("AttestReserve: %w", err)
	}
	if callerMSP != expectedMSP {
		return nil, fmt.Errorf("AttestReserve: caller %s unauthorized to attest %s (expected %s)", callerMSP, ccy, expectedMSP)
	}

	invokerID, err := getInvokerID(ctx)
	if err != nil {
		return nil, fmt.Errorf("AttestReserve: %w", err)
	}

	approver2, err := getApprover2(ctx, invokerID)
	if err != nil {
		return nil, fmt.Errorf("AttestReserve: %w", err)
	}

	bal, err := strconv.ParseInt(balance, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("AttestReserve: invalid balance %s: %w", balance, err)
	}
	if bal < 0 {
		return nil, fmt.Errorf("AttestReserve: balance cannot be negative: %d", bal)
	}

	txTs, err := getTxTime(stub)
	if err != nil {
		return nil, fmt.Errorf("AttestReserve: %w", err)
	}

	reserve := Reserve{
		Ccy:          ccy,
		RtgsBalance:  bal,
		StatementRef: stmtRef,
		AsOf:         txTs,
		ApprovedBy:   []string{invokerID, approver2},
	}
	reserveBytes, err := json.Marshal(reserve)
	if err != nil {
		return nil, fmt.Errorf("AttestReserve: marshal error: %w", err)
	}

	key := ReserveKey(ccy)
	if err := stub.PutState(key, reserveBytes); err != nil {
		return nil, fmt.Errorf("AttestReserve: put state error: %w", err)
	}

	if err := setSBE(stub, key, expectedMSP); err != nil {
		return nil, fmt.Errorf("AttestReserve: set SBE error: %w", err)
	}

	return &Result{
		Status: "OK",
		TxID:   stub.GetTxID(),
	}, nil
}

// jurOwner returns the regulator MSP owning the jurisdiction
func jurOwner(jur string) (string, error) {
	switch jur {
	case "JUR-A":
		return "RegAMSP", nil
	case "JUR-B":
		return "RegBMSP", nil
	default:
		return "", fmt.Errorf("unknown jurisdiction: %s", jur)
	}
}

// UpdateRules modifies jurisdictional parameters with incremented version and dual authorization
func (s *SmartContract) UpdateRules(ctx contractapi.TransactionContextInterface, jur, rulesJSON string) (*Result, error) {
	stub := ctx.GetStub()

	expectedMSP, err := jurOwner(jur)
	if err != nil {
		return nil, fmt.Errorf("UpdateRules: %w", err)
	}

	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("UpdateRules: %w", err)
	}
	if callerMSP != expectedMSP {
		return nil, fmt.Errorf("UpdateRules: caller %s unauthorized for jurisdiction %s (expected %s)", callerMSP, jur, expectedMSP)
	}

	invokerID, err := getInvokerID(ctx)
	if err != nil {
		return nil, fmt.Errorf("UpdateRules: %w", err)
	}

	approver2, err := getApprover2(ctx, invokerID)
	if err != nil {
		return nil, fmt.Errorf("UpdateRules: %w", err)
	}

	rawOld, err := stub.GetState(RulesKey(jur))
	if err != nil {
		return nil, fmt.Errorf("UpdateRules: read current rules: %w", err)
	}
	if len(rawOld) == 0 {
		return nil, fmt.Errorf("UpdateRules: rules for %s not found", jur)
	}

	var oldRules Rules
	if err := json.Unmarshal(rawOld, &oldRules); err != nil {
		return nil, fmt.Errorf("UpdateRules: unmarshal current rules: %w", err)
	}

	var newRules Rules
	if err := json.Unmarshal([]byte(rulesJSON), &newRules); err != nil {
		return nil, fmt.Errorf("UpdateRules: invalid rules JSON: %w", err)
	}

	newRules.Jurisdiction = jur
	newRules.Version = oldRules.Version + 1
	newRules.ApprovedBy = []string{invokerID, approver2}

	if newRules.OpStartMin < 0 || newRules.OpEndMin > 1440 || newRules.OpStartMin >= newRules.OpEndMin {
		return nil, fmt.Errorf("UpdateRules: invalid operating hours %d-%d", newRules.OpStartMin, newRules.OpEndMin)
	}
	if newRules.MaxTxAmount <= 0 {
		return nil, fmt.Errorf("UpdateRules: maxTxAmount must be positive")
	}
	if newRules.MaxDailyMint <= 0 {
		return nil, fmt.Errorf("UpdateRules: maxDailyMint must be positive")
	}

	newRulesBytes, err := json.Marshal(newRules)
	if err != nil {
		return nil, fmt.Errorf("UpdateRules: marshal new rules: %w", err)
	}

	key := RulesKey(jur)
	if err := stub.PutState(key, newRulesBytes); err != nil {
		return nil, fmt.Errorf("UpdateRules: put state error: %w", err)
	}

	if err := setSBE(stub, key, expectedMSP); err != nil {
		return nil, fmt.Errorf("UpdateRules: set SBE error: %w", err)
	}

	return &Result{
		Status:      "OK",
		TxID:        stub.GetTxID(),
		RuleVersion: newRules.Version,
	}, nil
}

// Freeze updates account status to FROZEN or ACTIVE in currency's private collection
func (s *SmartContract) Freeze(ctx contractapi.TransactionContextInterface, ccy, bankMSP, frozen string) (*Result, error) {
	stub := ctx.GetStub()

	expectedMSP, ok := IssuerOf[ccy]
	if !ok {
		return nil, fmt.Errorf("Freeze: unsupported currency %s", ccy)
	}

	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("Freeze: %w", err)
	}
	if callerMSP != expectedMSP {
		return nil, fmt.Errorf("Freeze: caller %s unauthorized to freeze %s (expected %s)", callerMSP, ccy, expectedMSP)
	}

	if _, ok := MSPToCode[bankMSP]; !ok {
		return nil, fmt.Errorf("Freeze: unknown bank MSP %s", bankMSP)
	}

	isFrozen, err := strconv.ParseBool(frozen)
	if err != nil {
		return nil, fmt.Errorf("Freeze: invalid frozen flag %s: %w", frozen, err)
	}

	coll := CollName(ccy, bankMSP)
	key := AccountKey(ccy, bankMSP)

	rawAcct, err := stub.GetPrivateData(coll, key)
	if err != nil {
		return nil, fmt.Errorf("Freeze: error reading %s from %s: %w", key, coll, err)
	}
	if len(rawAcct) == 0 {
		return nil, fmt.Errorf("Freeze: account %s not found in %s", key, coll)
	}

	var acct Account
	if err := json.Unmarshal(rawAcct, &acct); err != nil {
		return nil, fmt.Errorf("Freeze: unmarshal account error: %w", err)
	}

	if isFrozen {
		acct.Status = "FROZEN"
	} else {
		acct.Status = "ACTIVE"
	}

	acctBytes, err := json.Marshal(acct)
	if err != nil {
		return nil, fmt.Errorf("Freeze: marshal account error: %w", err)
	}

	if err := stub.PutPrivateData(coll, key, acctBytes); err != nil {
		return nil, fmt.Errorf("Freeze: put private data error: %w", err)
	}

	return &Result{
		Status: "OK",
		TxID:   stub.GetTxID(),
	}, nil
}

// Mint issues currency into a bank's private account after regulatory reserve checks
func (s *SmartContract) Mint(ctx contractapi.TransactionContextInterface, ccy, bankMSP, amount, rtgsRef string) (*Result, error) {
	stub := ctx.GetStub()

	expectedMSP, ok := IssuerOf[ccy]
	if !ok {
		return nil, fmt.Errorf("Mint: unsupported currency %s", ccy)
	}

	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("Mint: %w", err)
	}
	if callerMSP != expectedMSP {
		return nil, fmt.Errorf("Mint: caller %s unauthorized to mint %s (expected %s)", callerMSP, ccy, expectedMSP)
	}

	if _, ok := MSPToCode[bankMSP]; !ok {
		return nil, fmt.Errorf("Mint: unknown bank MSP %s", bankMSP)
	}

	invokerID, err := getInvokerID(ctx)
	if err != nil {
		return nil, fmt.Errorf("Mint: %w", err)
	}

	approver2, err := getApprover2(ctx, invokerID)
	if err != nil {
		return nil, fmt.Errorf("Mint: %w", err)
	}

	amt, err := strconv.ParseInt(amount, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("Mint: invalid amount %s: %w", amount, err)
	}
	if amt <= 0 {
		return nil, fmt.Errorf("Mint: amount must be positive: %d", amt)
	}

	coll := CollName(ccy, bankMSP)
	issKey := IssuanceKey(ccy, rtgsRef)

	// Precondition check: Duplicate RTGS reference check -> Go error, nothing written
	existingIss, err := stub.GetPrivateData(coll, issKey)
	if err != nil {
		return nil, fmt.Errorf("Mint: check duplicate rtgsRef: %w", err)
	}
	if len(existingIss) > 0 {
		return nil, fmt.Errorf("Mint: duplicate rtgsRef %s", rtgsRef)
	}

	jur := JurOf[ccy]
	rules, err := s.GetRules(ctx, jur)
	if err != nil {
		return nil, fmt.Errorf("Mint: read rules: %w", err)
	}

	reserve, err := s.GetReserve(ctx, ccy)
	if err != nil {
		return nil, fmt.Errorf("Mint: read reserve: %w", err)
	}

	supply, err := s.GetSupply(ctx, ccy)
	if err != nil {
		return nil, fmt.Errorf("Mint: read supply: %w", err)
	}

	txTs, err := getTxTime(stub)
	if err != nil {
		return nil, fmt.Errorf("Mint: get timestamp: %w", err)
	}

	acctKey := AccountKey(ccy, bankMSP)
	argsList := []string{ccy, bankMSP, amount, rtgsRef}

	// Refusal check 1: Jurisdiction halted
	if rules.Halted {
		reasonCode := "JURISDICTION_HALTED"
		_ = recordRefusal(ctx, jur, rules.Version, reasonCode, acctKey, "", amt, "Mint", argsList)
		return &Result{
			Status:      "REFUSED",
			ReasonCode:  reasonCode,
			RuleVersion: rules.Version,
			TxID:        stub.GetTxID(),
		}, nil
	}

	// Refusal check 2: Supply headroom exceeds reserve
	if supply.Total+amt > reserve.RtgsBalance {
		reasonCode := "EXCEEDS_RESERVE"
		_ = recordRefusal(ctx, jur, rules.Version, reasonCode, acctKey, "", amt, "Mint", argsList)
		return &Result{
			Status:      "REFUSED",
			ReasonCode:  reasonCode,
			RuleVersion: rules.Version,
			TxID:        stub.GetTxID(),
		}, nil
	}

	// Calculate jurisdiction-local day start
	localSec := txTs + int64(rules.UtcOffsetMin*60)
	dayStart := txTs - ((localSec%86400 + 86400) % 86400)
	if supply.DayStart != dayStart {
		supply.MintedToday = 0
		supply.DayStart = dayStart
	}

	// Refusal check 3: Exceeds daily mint limit
	if supply.MintedToday+amt > rules.MaxDailyMint {
		reasonCode := "EXCEEDS_DAILY_MINT"
		_ = recordRefusal(ctx, jur, rules.Version, reasonCode, acctKey, "", amt, "Mint", argsList)
		return &Result{
			Status:      "REFUSED",
			ReasonCode:  reasonCode,
			RuleVersion: rules.Version,
			TxID:        stub.GetTxID(),
		}, nil
	}

	// All checks passed -> mutate state
	rawAcct, err := stub.GetPrivateData(coll, acctKey)
	if err != nil {
		return nil, fmt.Errorf("Mint: read account %s from %s: %w", acctKey, coll, err)
	}
	var acct Account
	if len(rawAcct) == 0 {
		acct = Account{
			Ccy:       ccy,
			Bank:      bankMSP,
			Available: 0,
			Held:      0,
			Status:    "ACTIVE",
		}
	} else if err := json.Unmarshal(rawAcct, &acct); err != nil {
		return nil, fmt.Errorf("Mint: unmarshal account: %w", err)
	}

	// Balance mutation
	acct.Available += amt
	acctBytes, err := json.Marshal(acct)
	if err != nil {
		return nil, fmt.Errorf("Mint: marshal account: %w", err)
	}
	if err := stub.PutPrivateData(coll, acctKey, acctBytes); err != nil {
		return nil, fmt.Errorf("Mint: put account: %w", err)
	}

	// Record Issuance
	issuance := Issuance{
		Type:       "MINT",
		Ccy:        ccy,
		Bank:       bankMSP,
		Amount:     amt,
		RtgsRef:    rtgsRef,
		ApprovedBy: []string{invokerID, approver2},
		Ts:         txTs,
	}
	issBytes, err := json.Marshal(issuance)
	if err != nil {
		return nil, fmt.Errorf("Mint: marshal issuance: %w", err)
	}
	if err := stub.PutPrivateData(coll, issKey, issBytes); err != nil {
		return nil, fmt.Errorf("Mint: put issuance: %w", err)
	}

	// Update Supply
	supply.Total += amt
	supply.MintedToday += amt
	supplyBytes, err := json.Marshal(supply)
	if err != nil {
		return nil, fmt.Errorf("Mint: marshal supply: %w", err)
	}
	if err := stub.PutState(SupplyKey(ccy), supplyBytes); err != nil {
		return nil, fmt.Errorf("Mint: put supply: %w", err)
	}

	return &Result{
		Status: "OK",
		TxID:   stub.GetTxID(),
	}, nil
}
