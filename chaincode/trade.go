package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ProposeTrade creates a new bilateral trade proposal and places payer hold
func (s *SmartContract) ProposeTrade(ctx contractapi.TransactionContextInterface, tradeID, ccyA, amountA, ccyB, amountB, cpartyMSP, acceptBy, cutoffAt string) (*Result, error) {
	stub := ctx.GetStub()

	// Precondition: TRADE~T must not exist
	rawExistingTrade, err := stub.GetState(TradeKey(tradeID))
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: read trade: %w", err)
	}
	if len(rawExistingTrade) > 0 {
		return nil, fmt.Errorf("ProposeTrade: trade %s already exists", tradeID)
	}

	txTs, err := getTxTime(stub)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: get timestamp: %w", err)
	}

	// Parse timestamps
	acceptByTs, err := strconv.ParseInt(acceptBy, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: invalid acceptBy %s: %w", acceptBy, err)
	}
	cutoffAtTs, err := strconv.ParseInt(cutoffAt, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: invalid cutoffAt %s: %w", cutoffAt, err)
	}

	// Precondition: acceptBy < cutoffAt, both > txTs
	if acceptByTs <= txTs {
		return nil, fmt.Errorf("ProposeTrade: acceptBy (%d) must be greater than txTs (%d)", acceptByTs, txTs)
	}
	if cutoffAtTs <= acceptByTs {
		return nil, fmt.Errorf("ProposeTrade: cutoffAt (%d) must be greater than acceptBy (%d)", cutoffAtTs, acceptByTs)
	}

	// Parse amounts
	amtA, err := strconv.ParseInt(amountA, 10, 64)
	if err != nil || amtA <= 0 {
		return nil, fmt.Errorf("ProposeTrade: invalid amountA %s", amountA)
	}
	amtB, err := strconv.ParseInt(amountB, 10, 64)
	if err != nil || amtB <= 0 {
		return nil, fmt.Errorf("ProposeTrade: invalid amountB %s", amountB)
	}

	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: %w", err)
	}
	if _, ok := MSPToCode[callerMSP]; !ok {
		return nil, fmt.Errorf("ProposeTrade: invalid caller bank MSP %s", callerMSP)
	}
	if _, ok := MSPToCode[cpartyMSP]; !ok {
		return nil, fmt.Errorf("ProposeTrade: invalid cparty bank MSP %s", cpartyMSP)
	}

	// Transient checks: salt and detail
	transient, err := stub.GetTransient()
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: get transient: %w", err)
	}
	rawSalt, ok := transient["salt"]
	if !ok || len(rawSalt) != 32 {
		return nil, fmt.Errorf("ProposeTrade: transient salt must be 32 hex chars")
	}
	salt := string(rawSalt)

	rawDetail, ok := transient["detail"]
	if !ok || len(rawDetail) == 0 {
		return nil, fmt.Errorf("ProposeTrade: missing transient detail")
	}

	var detail TradeDetail
	if err := json.Unmarshal(rawDetail, &detail); err != nil {
		return nil, fmt.Errorf("ProposeTrade: unmarshal transient detail: %w", err)
	}

	// Verify detail fields match parameters
	if detail.Proposer != callerMSP {
		return nil, fmt.Errorf("ProposeTrade: caller %s does not match detail proposer %s", callerMSP, detail.Proposer)
	}
	if detail.TradeID != tradeID || detail.CcyA != ccyA || detail.AmountA != amtA ||
		detail.CcyB != ccyB || detail.AmountB != amtB || detail.Cparty != cpartyMSP || detail.Proposer != callerMSP {
		return nil, fmt.Errorf("ProposeTrade: arguments do not match detail fields")
	}

	// Canonical detailHash
	detailBytes, err := json.Marshal(detail)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: marshal detail: %w", err)
	}
	dHash := sha256.Sum256(detailBytes)
	detailHash := hex.EncodeToString(dHash[:])

	// Evaluate business rules for Leg A
	jurA := JurOf[ccyA]
	ruleCheck, err := s.checkBusinessRules(ctx, ccyA, callerMSP, amtA)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: checkBusinessRules: %w", err)
	}

	// Refusal path: commits REFUSAL and REFUSALDETAIL, touches no balances
	if ruleCheck.Refused {
		acctKey := AccountKey(ccyA, callerMSP)
		argsList := []string{tradeID, ccyA, amountA, ccyB, amountB, cpartyMSP, acceptBy, cutoffAt}
		_ = recordRefusal(ctx, jurA, ruleCheck.RuleVersion, ruleCheck.ReasonCode, acctKey, tradeID, amtA, "ProposeTrade", argsList)
		return &Result{
			Status:      "REFUSED",
			ReasonCode:  ruleCheck.ReasonCode,
			RuleVersion: ruleCheck.RuleVersion,
			TxID:        stub.GetTxID(),
			TradeID:     tradeID,
		}, nil
	}

	// 1. Write Hold to coll_<ccyA>_<caller>
	collA := CollName(ccyA, callerMSP)
	holdA := Hold{
		Ccy:         ccyA,
		Ref:         tradeID,
		Payer:       callerMSP,
		Payee:       cpartyMSP,
		Amount:      amtA,
		ExpiresAt:   cutoffAtTs,
		RuleVersion: ruleCheck.RuleVersion,
		Status:      "HELD",
		Salt:        salt,
	}
	holdABytes, err := json.Marshal(holdA)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: marshal hold: %w", err)
	}
	if err := stub.PutPrivateData(collA, HoldKey(ccyA, tradeID), holdABytes); err != nil {
		return nil, fmt.Errorf("ProposeTrade: put hold: %w", err)
	}

	// Compute HoldHash of written bytes
	hA := sha256.Sum256(holdABytes)
	holdAHash := hex.EncodeToString(hA[:])

	// 2. Balance move: Available -= amountA; Held += amountA
	acct := ruleCheck.Account
	acct.Available -= amtA
	acct.Held += amtA
	acctBytes, err := json.Marshal(acct)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: marshal account: %w", err)
	}
	if err := stub.PutPrivateData(collA, AccountKey(ccyA, callerMSP), acctBytes); err != nil {
		return nil, fmt.Errorf("ProposeTrade: put account: %w", err)
	}

	// 3. Write TRADEDETAIL~T to caller's implicit collection
	if err := stub.PutPrivateData(ImplicitColl(callerMSP), TradeDetailKey(tradeID), detailBytes); err != nil {
		return nil, fmt.Errorf("ProposeTrade: put trade detail: %w", err)
	}

	// 4. Write public TRADE~T in PROPOSED status
	trade := Trade{
		TradeID:    tradeID,
		Status:     "PROPOSED",
		Proposer:   callerMSP,
		Cparty:     cpartyMSP,
		CcyA:       ccyA,
		CcyB:       ccyB,
		AcceptBy:   acceptByTs,
		CutoffAt:   cutoffAtTs,
		DetailHash: detailHash,
		CreatedAt:  txTs,
	}
	tradeBytes, err := json.Marshal(trade)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: marshal trade: %w", err)
	}
	if err := stub.PutState(TradeKey(tradeID), tradeBytes); err != nil {
		return nil, fmt.Errorf("ProposeTrade: put trade: %w", err)
	}

	// 5. Write TRADELEG~T~A HELD with HoldHash
	legA := TradeLeg{
		TradeID:      tradeID,
		Leg:          "A",
		Ccy:          ccyA,
		Payer:        callerMSP,
		Payee:        cpartyMSP,
		HoldColl:     collA,
		HoldHash:     holdAHash,
		HoldStatus:   "HELD",
		CreditStatus: "NONE",
		RuleVersion:  ruleCheck.RuleVersion,
	}
	legABytes, err := json.Marshal(legA)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: marshal legA: %w", err)
	}
	if err := stub.PutState(TradeLegKey(tradeID, "A"), legABytes); err != nil {
		return nil, fmt.Errorf("ProposeTrade: put legA: %w", err)
	}

	// 6. Write TRADELEG~T~B NONE (holdColl reserved for cparty)
	collB := CollName(ccyB, cpartyMSP)
	legB := TradeLeg{
		TradeID:      tradeID,
		Leg:          "B",
		Ccy:          ccyB,
		Payer:        cpartyMSP,
		Payee:        callerMSP,
		HoldColl:     collB,
		HoldHash:     "",
		HoldStatus:   "NONE",
		CreditStatus: "NONE",
		RuleVersion:  0,
	}
	legBBytes, err := json.Marshal(legB)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: marshal legB: %w", err)
	}
	if err := stub.PutState(TradeLegKey(tradeID, "B"), legBBytes); err != nil {
		return nil, fmt.Errorf("ProposeTrade: put legB: %w", err)
	}

	// 7. Write TRADESETTLE~T PENDING with SBE AND(RegAMSP, RegBMSP)
	settleKey := TradeSettleKey(tradeID)
	settle := TradeSettle{
		TradeID:   tradeID,
		Status:    "PENDING",
		SettledAt: 0,
	}
	settleBytes, err := json.Marshal(settle)
	if err != nil {
		return nil, fmt.Errorf("ProposeTrade: marshal settle: %w", err)
	}
	if err := stub.PutState(settleKey, settleBytes); err != nil {
		return nil, fmt.Errorf("ProposeTrade: put settle: %w", err)
	}

	// Set SBE requiring dual regulator endorsement
	if err := setSBE(stub, settleKey, "RegAMSP", "RegBMSP"); err != nil {
		return nil, fmt.Errorf("ProposeTrade: set SBE on settle key: %w", err)
	}

	return &Result{
		Status:  "OK",
		TxID:    stub.GetTxID(),
		TradeID: tradeID,
	}, nil
}

// AcceptTrade binds the counterparty leg to the proposal and transitions status to ACCEPTED
func (s *SmartContract) AcceptTrade(ctx contractapi.TransactionContextInterface, tradeID string) (*Result, error) {
	stub := ctx.GetStub()

	// 1. Read existing trade
	rawTrade, err := stub.GetState(TradeKey(tradeID))
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: read trade: %w", err)
	}
	if len(rawTrade) == 0 {
		return nil, fmt.Errorf("AcceptTrade: trade %s not found", tradeID)
	}

	var trade Trade
	if err := json.Unmarshal(rawTrade, &trade); err != nil {
		return nil, fmt.Errorf("AcceptTrade: unmarshal trade: %w", err)
	}

	// Precondition: status must be PROPOSED
	if trade.Status != "PROPOSED" {
		return nil, fmt.Errorf("AcceptTrade: trade %s status is %s (expected PROPOSED)", tradeID, trade.Status)
	}

	// Precondition: caller must be designated counterparty
	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: %w", err)
	}
	if callerMSP != trade.Cparty {
		return nil, fmt.Errorf("AcceptTrade: caller %s is not trade counterparty %s", callerMSP, trade.Cparty)
	}

	// Precondition: txTs < AcceptBy
	txTs, err := getTxTime(stub)
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: get timestamp: %w", err)
	}
	if txTs >= trade.AcceptBy {
		return nil, fmt.Errorf("AcceptTrade: ACCEPT_WINDOW_CLOSED (txTs %d >= acceptBy %d)", txTs, trade.AcceptBy)
	}

	// Transient data: salt and detail
	transient, err := stub.GetTransient()
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: get transient: %w", err)
	}
	rawSalt, ok := transient["salt"]
	if !ok || len(rawSalt) != 32 {
		return nil, fmt.Errorf("AcceptTrade: transient salt must be 32 hex chars")
	}
	salt := string(rawSalt)

	rawDetail, ok := transient["detail"]
	if !ok || len(rawDetail) == 0 {
		return nil, fmt.Errorf("AcceptTrade: missing transient detail")
	}

	var detail TradeDetail
	if err := json.Unmarshal(rawDetail, &detail); err != nil {
		return nil, fmt.Errorf("AcceptTrade: unmarshal transient detail: %w", err)
	}

	// Verify detailHash equals trade.DetailHash
	detailBytes, err := json.Marshal(detail)
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: marshal detail: %w", err)
	}
	dHash := sha256.Sum256(detailBytes)
	computedDetailHash := hex.EncodeToString(dHash[:])
	if computedDetailHash != trade.DetailHash {
		return nil, fmt.Errorf("AcceptTrade: DETAIL_MISMATCH")
	}

	// Verify Leg A hold hash from private data
	rawLegA, err := stub.GetState(TradeLegKey(tradeID, "A"))
	if err != nil || len(rawLegA) == 0 {
		return nil, fmt.Errorf("AcceptTrade: leg A not found")
	}
	var legA TradeLeg
	if err := json.Unmarshal(rawLegA, &legA); err != nil {
		return nil, fmt.Errorf("AcceptTrade: unmarshal legA: %w", err)
	}

	holdAHashBytes, err := stub.GetPrivateDataHash(legA.HoldColl, HoldKey(trade.CcyA, tradeID))
	if err != nil || len(holdAHashBytes) == 0 {
		return nil, fmt.Errorf("AcceptTrade: HOLD_HASH_MISMATCH (hold not found)")
	}
	computedHoldAHash := hex.EncodeToString(holdAHashBytes)
	if computedHoldAHash != legA.HoldHash {
		return nil, fmt.Errorf("AcceptTrade: HOLD_HASH_MISMATCH")
	}

	// Evaluate business rules for Leg B
	jurB := JurOf[trade.CcyB]
	ruleCheck, err := s.checkBusinessRules(ctx, trade.CcyB, callerMSP, detail.AmountB)
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: checkBusinessRules: %w", err)
	}

	// Refusal path: commits REFUSAL and REFUSALDETAIL, touches no balances
	if ruleCheck.Refused {
		acctKey := AccountKey(trade.CcyB, callerMSP)
		argsList := []string{tradeID}
		_ = recordRefusal(ctx, jurB, ruleCheck.RuleVersion, ruleCheck.ReasonCode, acctKey, tradeID, detail.AmountB, "AcceptTrade", argsList)
		return &Result{
			Status:      "REFUSED",
			ReasonCode:  ruleCheck.ReasonCode,
			RuleVersion: ruleCheck.RuleVersion,
			TxID:        stub.GetTxID(),
			TradeID:     tradeID,
		}, nil
	}

	// 1. Write Hold to coll_<ccyB>_<caller>
	collB := CollName(trade.CcyB, callerMSP)
	holdB := Hold{
		Ccy:         trade.CcyB,
		Ref:         tradeID,
		Payer:       callerMSP,
		Payee:       trade.Proposer,
		Amount:      detail.AmountB,
		ExpiresAt:   trade.CutoffAt,
		RuleVersion: ruleCheck.RuleVersion,
		Status:      "HELD",
		Salt:        salt,
	}
	holdBBytes, err := json.Marshal(holdB)
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: marshal holdB: %w", err)
	}
	if err := stub.PutPrivateData(collB, HoldKey(trade.CcyB, tradeID), holdBBytes); err != nil {
		return nil, fmt.Errorf("AcceptTrade: put holdB: %w", err)
	}

	// Compute HoldHash of written bytes
	hB := sha256.Sum256(holdBBytes)
	holdBHash := hex.EncodeToString(hB[:])

	// 2. Balance move: Available -= amountB; Held += amountB
	acct := ruleCheck.Account
	acct.Available -= detail.AmountB
	acct.Held += detail.AmountB
	acctBytes, err := json.Marshal(acct)
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: marshal account: %w", err)
	}
	if err := stub.PutPrivateData(collB, AccountKey(trade.CcyB, callerMSP), acctBytes); err != nil {
		return nil, fmt.Errorf("AcceptTrade: put account: %w", err)
	}

	// 3. Write TRADEDETAIL~T to counterparty's implicit collection
	if err := stub.PutPrivateData(ImplicitColl(callerMSP), TradeDetailKey(tradeID), detailBytes); err != nil {
		return nil, fmt.Errorf("AcceptTrade: put trade detail: %w", err)
	}

	// 4. Update TRADELEG~T~B to HELD
	rawLegB, err := stub.GetState(TradeLegKey(tradeID, "B"))
	if err != nil || len(rawLegB) == 0 {
		return nil, fmt.Errorf("AcceptTrade: leg B not found")
	}
	var legB TradeLeg
	if err := json.Unmarshal(rawLegB, &legB); err != nil {
		return nil, fmt.Errorf("AcceptTrade: unmarshal legB: %w", err)
	}
	legB.HoldHash = holdBHash
	legB.HoldStatus = "HELD"
	legB.RuleVersion = ruleCheck.RuleVersion
	legBBytes, err := json.Marshal(legB)
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: marshal legB: %w", err)
	}
	if err := stub.PutState(TradeLegKey(tradeID, "B"), legBBytes); err != nil {
		return nil, fmt.Errorf("AcceptTrade: put legB: %w", err)
	}

	// 5. Update public TRADE~T to ACCEPTED
	trade.Status = "ACCEPTED"
	tradeBytes, err := json.Marshal(trade)
	if err != nil {
		return nil, fmt.Errorf("AcceptTrade: marshal trade: %w", err)
	}
	if err := stub.PutState(TradeKey(tradeID), tradeBytes); err != nil {
		return nil, fmt.Errorf("AcceptTrade: put trade: %w", err)
	}

	return &Result{
		Status:  "OK",
		TxID:    stub.GetTxID(),
		TradeID: tradeID,
	}, nil
}

// Settle transitions trade to SETTLED status after verifying both bilateral holds
func (s *SmartContract) Settle(ctx contractapi.TransactionContextInterface, tradeID string) (*Result, error) {
	stub := ctx.GetStub()

	// 1. Read existing trade
	rawTrade, err := stub.GetState(TradeKey(tradeID))
	if err != nil {
		return nil, fmt.Errorf("Settle: read trade: %w", err)
	}
	if len(rawTrade) == 0 {
		return nil, fmt.Errorf("Settle: trade %s not found", tradeID)
	}

	var trade Trade
	if err := json.Unmarshal(rawTrade, &trade); err != nil {
		return nil, fmt.Errorf("Settle: unmarshal trade: %w", err)
	}

	// Precondition: status must be ACCEPTED
	if trade.Status != "ACCEPTED" {
		return nil, fmt.Errorf("Settle: trade %s status is %s (expected ACCEPTED)", tradeID, trade.Status)
	}

	// Precondition: txTs < CutoffAt
	txTs, err := getTxTime(stub)
	if err != nil {
		return nil, fmt.Errorf("Settle: get timestamp: %w", err)
	}
	if txTs >= trade.CutoffAt {
		return nil, fmt.Errorf("Settle: CUTOFF_PASSED (txTs %d >= cutoffAt %d)", txTs, trade.CutoffAt)
	}

	// Read and verify Leg A
	rawLegA, err := stub.GetState(TradeLegKey(tradeID, "A"))
	if err != nil || len(rawLegA) == 0 {
		return nil, fmt.Errorf("Settle: leg A not found")
	}
	var legA TradeLeg
	if err := json.Unmarshal(rawLegA, &legA); err != nil {
		return nil, fmt.Errorf("Settle: unmarshal legA: %w", err)
	}
	if legA.HoldStatus != "HELD" {
		return nil, fmt.Errorf("Settle: leg A holdStatus is %s (expected HELD)", legA.HoldStatus)
	}
	holdAHashBytes, err := stub.GetPrivateDataHash(legA.HoldColl, HoldKey(trade.CcyA, tradeID))
	if err != nil || len(holdAHashBytes) == 0 {
		return nil, fmt.Errorf("Settle: leg A private hold not found")
	}
	if hex.EncodeToString(holdAHashBytes) != legA.HoldHash {
		return nil, fmt.Errorf("Settle: leg A HOLD_HASH_MISMATCH")
	}

	// Read and verify Leg B
	rawLegB, err := stub.GetState(TradeLegKey(tradeID, "B"))
	if err != nil || len(rawLegB) == 0 {
		return nil, fmt.Errorf("Settle: leg B not found")
	}
	var legB TradeLeg
	if err := json.Unmarshal(rawLegB, &legB); err != nil {
		return nil, fmt.Errorf("Settle: unmarshal legB: %w", err)
	}
	if legB.HoldStatus != "HELD" {
		return nil, fmt.Errorf("Settle: leg B holdStatus is %s (expected HELD)", legB.HoldStatus)
	}
	holdBHashBytes, err := stub.GetPrivateDataHash(legB.HoldColl, HoldKey(trade.CcyB, tradeID))
	if err != nil || len(holdBHashBytes) == 0 {
		return nil, fmt.Errorf("Settle: leg B private hold not found")
	}
	if hex.EncodeToString(holdBHashBytes) != legB.HoldHash {
		return nil, fmt.Errorf("Settle: leg B HOLD_HASH_MISMATCH")
	}

	// Read existing TRADESETTLE~T
	rawSettle, err := stub.GetState(TradeSettleKey(tradeID))
	if err != nil || len(rawSettle) == 0 {
		return nil, fmt.Errorf("Settle: settle record not found")
	}
	var settle TradeSettle
	if err := json.Unmarshal(rawSettle, &settle); err != nil {
		return nil, fmt.Errorf("Settle: unmarshal settle: %w", err)
	}

	// Update TRADESETTLE~T to SETTLED
	settle.Status = "SETTLED"
	settle.SettledAt = txTs
	settleBytes, err := json.Marshal(settle)
	if err != nil {
		return nil, fmt.Errorf("Settle: marshal settle: %w", err)
	}
	if err := stub.PutState(TradeSettleKey(tradeID), settleBytes); err != nil {
		return nil, fmt.Errorf("Settle: put settle: %w", err)
	}

	// Update TRADE~T to SETTLED
	trade.Status = "SETTLED"
	tradeBytes, err := json.Marshal(trade)
	if err != nil {
		return nil, fmt.Errorf("Settle: marshal trade: %w", err)
	}
	if err := stub.PutState(TradeKey(tradeID), tradeBytes); err != nil {
		return nil, fmt.Errorf("Settle: put trade: %w", err)
	}

	return &Result{
		Status:  "OK",
		TxID:    stub.GetTxID(),
		TradeID: tradeID,
	}, nil
}

// CancelTrade allows the proposer to cancel a pending proposal
func (s *SmartContract) CancelTrade(ctx contractapi.TransactionContextInterface, tradeID string) (*Result, error) {
	stub := ctx.GetStub()

	rawTrade, err := stub.GetState(TradeKey(tradeID))
	if err != nil {
		return nil, fmt.Errorf("CancelTrade: read trade: %w", err)
	}
	if len(rawTrade) == 0 {
		return nil, fmt.Errorf("CancelTrade: trade %s not found", tradeID)
	}

	var trade Trade
	if err := json.Unmarshal(rawTrade, &trade); err != nil {
		return nil, fmt.Errorf("CancelTrade: unmarshal trade: %w", err)
	}

	// Precondition: status must be PROPOSED
	if trade.Status != "PROPOSED" {
		return nil, fmt.Errorf("CancelTrade: trade %s status is %s (expected PROPOSED)", tradeID, trade.Status)
	}

	// Precondition: caller must be trade proposer
	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("CancelTrade: %w", err)
	}
	if callerMSP != trade.Proposer {
		return nil, fmt.Errorf("CancelTrade: caller %s is not trade proposer %s", callerMSP, trade.Proposer)
	}

	trade.Status = "CANCELLED"
	tradeBytes, err := json.Marshal(trade)
	if err != nil {
		return nil, fmt.Errorf("CancelTrade: marshal trade: %w", err)
	}
	if err := stub.PutState(TradeKey(tradeID), tradeBytes); err != nil {
		return nil, fmt.Errorf("CancelTrade: put trade: %w", err)
	}

	return &Result{
		Status:  "OK",
		TxID:    stub.GetTxID(),
		TradeID: tradeID,
	}, nil
}

// ExpireTrade marks expired trades when acceptance or cutoff window has passed
func (s *SmartContract) ExpireTrade(ctx contractapi.TransactionContextInterface, tradeID string) (*Result, error) {
	stub := ctx.GetStub()

	rawTrade, err := stub.GetState(TradeKey(tradeID))
	if err != nil {
		return nil, fmt.Errorf("ExpireTrade: read trade: %w", err)
	}
	if len(rawTrade) == 0 {
		return nil, fmt.Errorf("ExpireTrade: trade %s not found", tradeID)
	}

	var trade Trade
	if err := json.Unmarshal(rawTrade, &trade); err != nil {
		return nil, fmt.Errorf("ExpireTrade: unmarshal trade: %w", err)
	}

	txTs, err := getTxTime(stub)
	if err != nil {
		return nil, fmt.Errorf("ExpireTrade: get timestamp: %w", err)
	}

	if trade.Status == "PROPOSED" && txTs >= trade.AcceptBy {
		trade.Status = "EXPIRED"
	} else if trade.Status == "ACCEPTED" && txTs >= trade.CutoffAt {
		trade.Status = "EXPIRED"
	} else {
		return nil, fmt.Errorf("ExpireTrade: NOT_EXPIRABLE (status=%s, txTs=%d, acceptBy=%d, cutoffAt=%d)", trade.Status, txTs, trade.AcceptBy, trade.CutoffAt)
	}

	tradeBytes, err := json.Marshal(trade)
	if err != nil {
		return nil, fmt.Errorf("ExpireTrade: marshal trade: %w", err)
	}
	if err := stub.PutState(TradeKey(tradeID), tradeBytes); err != nil {
		return nil, fmt.Errorf("ExpireTrade: put trade: %w", err)
	}

	return &Result{
		Status:  "OK",
		TxID:    stub.GetTxID(),
		TradeID: tradeID,
	}, nil
}
