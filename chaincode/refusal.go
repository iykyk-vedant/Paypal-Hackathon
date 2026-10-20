package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// recordRefusal records public REFUSAL and caller implicit REFUSALDETAIL
func recordRefusal(ctx contractapi.TransactionContextInterface, jur string, ruleVersion int, reasonCode, acctKey, tradeID string, amount int64, fn string, args []string) error {
	stub := ctx.GetStub()
	txID := stub.GetTxID()
	txTs, err := getTxTime(stub)
	if err != nil {
		return fmt.Errorf("recordRefusal: get timestamp: %w", err)
	}

	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return fmt.Errorf("recordRefusal: get caller MSP: %w", err)
	}

	acctRef := ""
	if acctKey != "" {
		acctRef = ComputeAcctRef(jur, acctKey)
	}

	refusal := Refusal{
		TxID:         txID,
		Jurisdiction: jur,
		RuleVersion:  ruleVersion,
		ReasonCode:   reasonCode,
		InvokerMSP:   callerMSP,
		AcctRef:      acctRef,
		TradeID:      tradeID,
		Ts:           txTs,
	}
	refusalBytes, err := json.Marshal(refusal)
	if err != nil {
		return fmt.Errorf("recordRefusal: marshal public refusal: %w", err)
	}
	if err := stub.PutState(RefusalKey(txID), refusalBytes); err != nil {
		return fmt.Errorf("recordRefusal: put public refusal: %w", err)
	}

	refusalDetail := RefusalDetail{
		TxID:    txID,
		Fn:      fn,
		Args:    args,
		Account: acctKey,
		Amount:  amount,
	}
	detailBytes, err := json.Marshal(refusalDetail)
	if err != nil {
		return fmt.Errorf("recordRefusal: marshal refusal detail: %w", err)
	}
	coll := ImplicitColl(callerMSP)
	if err := stub.PutPrivateData(coll, RefusalDetailKey(txID), detailBytes); err != nil {
		return fmt.Errorf("recordRefusal: put refusal detail: %w", err)
	}

	return nil
}
