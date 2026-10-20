package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// RuleCheckResult represents the evaluation result of jurisdictional business rules
type RuleCheckResult struct {
	Refused     bool
	ReasonCode  string
	RuleVersion int
	Account     *Account
	Rules       *Rules
}

// computeLocalMinute computes non-negative local minute of day [0, 1439]
func computeLocalMinute(txTs int64, utcOffsetMin int) int {
	sec := txTs + int64(utcOffsetMin*60)
	mod := ((sec % 86400) + 86400) % 86400
	return int(mod / 60)
}

// checkBusinessRules evaluates business rules for trade leg (Propose leg A, Accept leg B)
func (s *SmartContract) checkBusinessRules(ctx contractapi.TransactionContextInterface, ccy, payerMSP string, amount int64) (*RuleCheckResult, error) {
	stub := ctx.GetStub()
	jur, ok := JurOf[ccy]
	if !ok {
		return nil, fmt.Errorf("checkBusinessRules: unsupported currency %s", ccy)
	}

	rules, err := s.GetRules(ctx, jur)
	if err != nil {
		return nil, fmt.Errorf("checkBusinessRules: read rules: %w", err)
	}

	coll := CollName(ccy, payerMSP)
	if coll == "" {
		return nil, fmt.Errorf("checkBusinessRules: invalid collection for %s %s", ccy, payerMSP)
	}
	acctKey := AccountKey(ccy, payerMSP)

	rawAcct, err := stub.GetPrivateData(coll, acctKey)
	if err != nil {
		return nil, fmt.Errorf("checkBusinessRules: read account: %w", err)
	}
	if len(rawAcct) == 0 {
		return nil, fmt.Errorf("checkBusinessRules: account %s not found in %s", acctKey, coll)
	}

	var acct Account
	if err := json.Unmarshal(rawAcct, &acct); err != nil {
		return nil, fmt.Errorf("checkBusinessRules: unmarshal account: %w", err)
	}

	txTs, err := getTxTime(stub)
	if err != nil {
		return nil, fmt.Errorf("checkBusinessRules: get timestamp: %w", err)
	}

	// 1. Jurisdiction Halted
	if rules.Halted {
		return &RuleCheckResult{
			Refused:     true,
			ReasonCode:  "JURISDICTION_HALTED",
			RuleVersion: rules.Version,
			Account:     &acct,
			Rules:       rules,
		}, nil
	}

	// 2. Account Frozen
	if acct.Status == "FROZEN" {
		return &RuleCheckResult{
			Refused:     true,
			ReasonCode:  "ACCOUNT_FROZEN",
			RuleVersion: rules.Version,
			Account:     &acct,
			Rules:       rules,
		}, nil
	}

	// 3. Operating Hours: [OpStartMin, OpEndMin)
	localMin := computeLocalMinute(txTs, rules.UtcOffsetMin)
	if !(rules.OpStartMin <= localMin && localMin < rules.OpEndMin) {
		return &RuleCheckResult{
			Refused:     true,
			ReasonCode:  "OUTSIDE_OPERATING_HOURS",
			RuleVersion: rules.Version,
			Account:     &acct,
			Rules:       rules,
		}, nil
	}

	// 4. Exceeds Max Transaction Limit
	if amount > rules.MaxTxAmount {
		return &RuleCheckResult{
			Refused:     true,
			ReasonCode:  "EXCEEDS_TX_LIMIT",
			RuleVersion: rules.Version,
			Account:     &acct,
			Rules:       rules,
		}, nil
	}

	// 5. Insufficient Available Balance
	if acct.Available < amount {
		return &RuleCheckResult{
			Refused:     true,
			ReasonCode:  "INSUFFICIENT_AVAILABLE",
			RuleVersion: rules.Version,
			Account:     &acct,
			Rules:       rules,
		}, nil
	}

	return &RuleCheckResult{
		Refused:     false,
		RuleVersion: rules.Version,
		Account:     &acct,
		Rules:       rules,
	}, nil
}
