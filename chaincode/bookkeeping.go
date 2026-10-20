package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// amountForLeg sources leg amount from caller's implicit TradeDetail or payer's Hold
func (s *SmartContract) amountForLeg(ctx contractapi.TransactionContextInterface, trade *Trade, leg string) (int64, error) {
	stub := ctx.GetStub()

	// 1. Try reading from caller's implicit collection first
	callerMSP, err := getCallerMSP(ctx)
	if err == nil && callerMSP != "" {
		rawDetail, err := stub.GetPrivateData(ImplicitColl(callerMSP), TradeDetailKey(trade.TradeID))
		if err == nil && len(rawDetail) > 0 {
			var detail TradeDetail
			if err := json.Unmarshal(rawDetail, &detail); err == nil {
				if leg == "A" {
					return detail.AmountA, nil
				}
				return detail.AmountB, nil
			}
		}
	}

	// 2. Fallback: Read Hold from payer's collection
	rawLeg, err := stub.GetState(TradeLegKey(trade.TradeID, leg))
	if err != nil || len(rawLeg) == 0 {
		return 0, fmt.Errorf("amountForLeg: leg %s not found on trade %s", leg, trade.TradeID)
	}
	var tradeLeg TradeLeg
	if err := json.Unmarshal(rawLeg, &tradeLeg); err != nil {
		return 0, fmt.Errorf("amountForLeg: unmarshal leg %s: %w", leg, err)
	}

	rawHold, err := stub.GetPrivateData(tradeLeg.HoldColl, HoldKey(tradeLeg.Ccy, trade.TradeID))
	if err == nil && len(rawHold) > 0 {
		var hold Hold
		if err := json.Unmarshal(rawHold, &hold); err == nil {
			return hold.Amount, nil
		}
	}

	return 0, fmt.Errorf("amountForLeg: unable to read amount for trade %s leg %s", trade.TradeID, leg)
}

// isCollMember verifies if caller MSP is a member of the collection
func isCollMember(callerMSP, coll string, ccy string, bankMSP string) bool {
	if callerMSP == bankMSP {
		return true
	}
	if callerMSP == IssuerOf[ccy] {
		return true
	}
	if callerMSP == "AuditorMSP" {
		return true
	}
	return false
}

// SettleDebit discharges the payer's held balance after public settlement
func (s *SmartContract) SettleDebit(ctx contractapi.TransactionContextInterface, tradeID, leg string) (*Result, error) {
	stub := ctx.GetStub()

	if leg != "A" && leg != "B" {
		return nil, fmt.Errorf("SettleDebit: invalid leg %s (must be A or B)", leg)
	}

	// 1. Guarded by TRADESETTLE~T.Status == SETTLED read in this tx
	rawSettle, err := stub.GetState(TradeSettleKey(tradeID))
	if err != nil {
		return nil, fmt.Errorf("SettleDebit: read settle record: %w", err)
	}
	if len(rawSettle) == 0 {
		return nil, fmt.Errorf("SettleDebit: settle record for %s not found", tradeID)
	}
	var settle TradeSettle
	if err := json.Unmarshal(rawSettle, &settle); err != nil {
		return nil, fmt.Errorf("SettleDebit: unmarshal settle: %w", err)
	}
	if settle.Status != "SETTLED" {
		return nil, fmt.Errorf("SettleDebit: trade %s not SETTLED (status is %s)", tradeID, settle.Status)
	}

	// 2. Read Leg record
	rawLeg, err := stub.GetState(TradeLegKey(tradeID, leg))
	if err != nil || len(rawLeg) == 0 {
		return nil, fmt.Errorf("SettleDebit: leg %s record not found", leg)
	}
	var tradeLeg TradeLeg
	if err := json.Unmarshal(rawLeg, &tradeLeg); err != nil {
		return nil, fmt.Errorf("SettleDebit: unmarshal leg: %w", err)
	}

	// 3. Caller membership check
	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("SettleDebit: %w", err)
	}
	if !isCollMember(callerMSP, tradeLeg.HoldColl, tradeLeg.Ccy, tradeLeg.Payer) {
		return nil, fmt.Errorf("SettleDebit: caller %s not member of %s", callerMSP, tradeLeg.HoldColl)
	}

	// 4. Read Hold from payer's collection
	holdKey := HoldKey(tradeLeg.Ccy, tradeID)
	rawHold, err := stub.GetPrivateData(tradeLeg.HoldColl, holdKey)
	if err != nil {
		return nil, fmt.Errorf("SettleDebit: read hold from %s: %w", tradeLeg.HoldColl, err)
	}
	if len(rawHold) == 0 {
		return nil, fmt.Errorf("SettleDebit: hold %s not found in %s", holdKey, tradeLeg.HoldColl)
	}
	var hold Hold
	if err := json.Unmarshal(rawHold, &hold); err != nil {
		return nil, fmt.Errorf("SettleDebit: unmarshal hold: %w", err)
	}

	// Idempotent return if already debited
	if hold.Status == "DEBITED" {
		return &Result{
			Status:  "OK",
			TxID:    stub.GetTxID(),
			TradeID: tradeID,
		}, nil
	}

	// 5. Debit held balance: acct.Held -= amount
	// Ignores acct.Status (FROZEN accounts still allow settlement debit)
	acctKey := AccountKey(tradeLeg.Ccy, tradeLeg.Payer)
	rawAcct, err := stub.GetPrivateData(tradeLeg.HoldColl, acctKey)
	if err != nil || len(rawAcct) == 0 {
		return nil, fmt.Errorf("SettleDebit: payer account %s not found in %s", acctKey, tradeLeg.HoldColl)
	}
	var acct Account
	if err := json.Unmarshal(rawAcct, &acct); err != nil {
		return nil, fmt.Errorf("SettleDebit: unmarshal payer account: %w", err)
	}

	acct.Held -= hold.Amount
	acctBytes, err := json.Marshal(acct)
	if err != nil {
		return nil, fmt.Errorf("SettleDebit: marshal account: %w", err)
	}
	if err := stub.PutPrivateData(tradeLeg.HoldColl, acctKey, acctBytes); err != nil {
		return nil, fmt.Errorf("SettleDebit: put account: %w", err)
	}

	// 6. Update Hold status to DEBITED
	hold.Status = "DEBITED"
	holdBytes, err := json.Marshal(hold)
	if err != nil {
		return nil, fmt.Errorf("SettleDebit: marshal hold: %w", err)
	}
	if err := stub.PutPrivateData(tradeLeg.HoldColl, holdKey, holdBytes); err != nil {
		return nil, fmt.Errorf("SettleDebit: put hold: %w", err)
	}

	// 7. Update public TRADELEG~T~<leg> HoldStatus to DEBITED
	tradeLeg.HoldStatus = "DEBITED"
	legBytes, err := json.Marshal(tradeLeg)
	if err != nil {
		return nil, fmt.Errorf("SettleDebit: marshal leg: %w", err)
	}
	if err := stub.PutState(TradeLegKey(tradeID, leg), legBytes); err != nil {
		return nil, fmt.Errorf("SettleDebit: put leg: %w", err)
	}

	return &Result{
		Status:  "OK",
		TxID:    stub.GetTxID(),
		TradeID: tradeID,
	}, nil
}

// CreditPayee credits the payee's available balance in the payee's collection after public settlement
func (s *SmartContract) CreditPayee(ctx contractapi.TransactionContextInterface, tradeID, leg string) (*Result, error) {
	stub := ctx.GetStub()

	if leg != "A" && leg != "B" {
		return nil, fmt.Errorf("CreditPayee: invalid leg %s (must be A or B)", leg)
	}

	// 1. Guarded by TRADESETTLE~T.Status == SETTLED read in this tx (Thesis Rule 4)
	rawSettle, err := stub.GetState(TradeSettleKey(tradeID))
	if err != nil {
		return nil, fmt.Errorf("CreditPayee: read settle record: %w", err)
	}
	if len(rawSettle) == 0 {
		return nil, fmt.Errorf("CreditPayee: settle record for %s not found", tradeID)
	}
	var settle TradeSettle
	if err := json.Unmarshal(rawSettle, &settle); err != nil {
		return nil, fmt.Errorf("CreditPayee: unmarshal settle: %w", err)
	}
	if settle.Status != "SETTLED" {
		return nil, fmt.Errorf("CreditPayee: trade %s not SETTLED (status is %s)", tradeID, settle.Status)
	}

	// 2. Read Leg record
	rawLeg, err := stub.GetState(TradeLegKey(tradeID, leg))
	if err != nil || len(rawLeg) == 0 {
		return nil, fmt.Errorf("CreditPayee: leg %s record not found", leg)
	}
	var tradeLeg TradeLeg
	if err := json.Unmarshal(rawLeg, &tradeLeg); err != nil {
		return nil, fmt.Errorf("CreditPayee: unmarshal leg: %w", err)
	}

	// Idempotent return if already credited
	if tradeLeg.CreditStatus == "CREDITED" {
		return &Result{
			Status:  "OK",
			TxID:    stub.GetTxID(),
			TradeID: tradeID,
		}, nil
	}

	// 3. Caller membership check in payee's collection
	payeeColl := CollName(tradeLeg.Ccy, tradeLeg.Payee)
	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("CreditPayee: %w", err)
	}
	if !isCollMember(callerMSP, payeeColl, tradeLeg.Ccy, tradeLeg.Payee) {
		return nil, fmt.Errorf("CreditPayee: caller %s not member of payee collection %s", callerMSP, payeeColl)
	}

	// 4. Derive amount via amountForLeg (never from an argument)
	rawTrade, err := stub.GetState(TradeKey(tradeID))
	if err != nil || len(rawTrade) == 0 {
		return nil, fmt.Errorf("CreditPayee: trade %s record not found", tradeID)
	}
	var trade Trade
	if err := json.Unmarshal(rawTrade, &trade); err != nil {
		return nil, fmt.Errorf("CreditPayee: unmarshal trade: %w", err)
	}

	amount, err := s.amountForLeg(ctx, &trade, leg)
	if err != nil {
		return nil, fmt.Errorf("CreditPayee: derive amount: %w", err)
	}

	// 5. Credit payee account: acct.Available += amount
	// Ignores acct.Status (FROZEN payee still receives credit per Hard Rule 8)
	acctKey := AccountKey(tradeLeg.Ccy, tradeLeg.Payee)
	rawAcct, err := stub.GetPrivateData(payeeColl, acctKey)
	if err != nil || len(rawAcct) == 0 {
		return nil, fmt.Errorf("CreditPayee: payee account %s not found in %s", acctKey, payeeColl)
	}
	var acct Account
	if err := json.Unmarshal(rawAcct, &acct); err != nil {
		return nil, fmt.Errorf("CreditPayee: unmarshal payee account: %w", err)
	}

	acct.Available += amount
	acctBytes, err := json.Marshal(acct)
	if err != nil {
		return nil, fmt.Errorf("CreditPayee: marshal account: %w", err)
	}
	// Writes to EXACTLY ONE private collection (payeeColl)
	if err := stub.PutPrivateData(payeeColl, acctKey, acctBytes); err != nil {
		return nil, fmt.Errorf("CreditPayee: put account: %w", err)
	}

	// 6. Update public TRADELEG~T~<leg> CreditStatus to CREDITED
	tradeLeg.CreditStatus = "CREDITED"
	legBytes, err := json.Marshal(tradeLeg)
	if err != nil {
		return nil, fmt.Errorf("CreditPayee: marshal leg: %w", err)
	}
	if err := stub.PutState(TradeLegKey(tradeID, leg), legBytes); err != nil {
		return nil, fmt.Errorf("CreditPayee: put leg: %w", err)
	}

	return &Result{
		Status:  "OK",
		TxID:    stub.GetTxID(),
		TradeID: tradeID,
	}, nil
}

// ReturnHold returns held funds to payer if trade is EXPIRED or CANCELLED
func (s *SmartContract) ReturnHold(ctx contractapi.TransactionContextInterface, tradeID, leg string) (*Result, error) {
	stub := ctx.GetStub()

	if leg != "A" && leg != "B" {
		return nil, fmt.Errorf("ReturnHold: invalid leg %s (must be A or B)", leg)
	}

	// 1. Guarded by TRADE~T.Status in {EXPIRED, CANCELLED}
	rawTrade, err := stub.GetState(TradeKey(tradeID))
	if err != nil || len(rawTrade) == 0 {
		return nil, fmt.Errorf("ReturnHold: trade %s not found", tradeID)
	}
	var trade Trade
	if err := json.Unmarshal(rawTrade, &trade); err != nil {
		return nil, fmt.Errorf("ReturnHold: unmarshal trade: %w", err)
	}
	if trade.Status != "EXPIRED" && trade.Status != "CANCELLED" {
		return nil, fmt.Errorf("ReturnHold: trade %s neither EXPIRED nor CANCELLED (status is %s)", tradeID, trade.Status)
	}

	// Hard Rule 4b: Must not be reachable when TRADESETTLE~ is SETTLED
	rawSettle, err := stub.GetState(TradeSettleKey(tradeID))
	if err == nil && len(rawSettle) > 0 {
		var settle TradeSettle
		if err := json.Unmarshal(rawSettle, &settle); err == nil && settle.Status == "SETTLED" {
			return nil, fmt.Errorf("ReturnHold: trade %s is SETTLED, cannot return hold", tradeID)
		}
	}

	// 2. Read Leg record
	rawLeg, err := stub.GetState(TradeLegKey(tradeID, leg))
	if err != nil || len(rawLeg) == 0 {
		return nil, fmt.Errorf("ReturnHold: leg %s record not found", leg)
	}
	var tradeLeg TradeLeg
	if err := json.Unmarshal(rawLeg, &tradeLeg); err != nil {
		return nil, fmt.Errorf("ReturnHold: unmarshal leg: %w", err)
	}

	if tradeLeg.HoldStatus == "NONE" {
		return nil, fmt.Errorf("ReturnHold: leg %s has no hold (HoldStatus is NONE)", leg)
	}

	// 3. Caller membership check in payer's hold collection
	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("ReturnHold: %w", err)
	}
	if !isCollMember(callerMSP, tradeLeg.HoldColl, tradeLeg.Ccy, tradeLeg.Payer) {
		return nil, fmt.Errorf("ReturnHold: caller %s not member of %s", callerMSP, tradeLeg.HoldColl)
	}

	// 4. Read Hold from payer's collection
	holdKey := HoldKey(tradeLeg.Ccy, tradeID)
	rawHold, err := stub.GetPrivateData(tradeLeg.HoldColl, holdKey)
	if err != nil {
		return nil, fmt.Errorf("ReturnHold: read hold from %s: %w", tradeLeg.HoldColl, err)
	}
	if len(rawHold) == 0 {
		return nil, fmt.Errorf("ReturnHold: hold %s not found in %s", holdKey, tradeLeg.HoldColl)
	}
	var hold Hold
	if err := json.Unmarshal(rawHold, &hold); err != nil {
		return nil, fmt.Errorf("ReturnHold: unmarshal hold: %w", err)
	}

	// Idempotent return if already returned
	if hold.Status == "RETURNED" {
		return &Result{
			Status:  "OK",
			TxID:    stub.GetTxID(),
			TradeID: tradeID,
		}, nil
	}

	// 5. Restore balance: acct.Held -= hold.Amount; acct.Available += hold.Amount
	// Ignores acct.Status (FROZEN payer still gets ReturnHold per Hard Rule 8)
	acctKey := AccountKey(tradeLeg.Ccy, tradeLeg.Payer)
	rawAcct, err := stub.GetPrivateData(tradeLeg.HoldColl, acctKey)
	if err != nil || len(rawAcct) == 0 {
		return nil, fmt.Errorf("ReturnHold: payer account %s not found in %s", acctKey, tradeLeg.HoldColl)
	}
	var acct Account
	if err := json.Unmarshal(rawAcct, &acct); err != nil {
		return nil, fmt.Errorf("ReturnHold: unmarshal payer account: %w", err)
	}

	acct.Held -= hold.Amount
	acct.Available += hold.Amount
	acctBytes, err := json.Marshal(acct)
	if err != nil {
		return nil, fmt.Errorf("ReturnHold: marshal account: %w", err)
	}
	if err := stub.PutPrivateData(tradeLeg.HoldColl, acctKey, acctBytes); err != nil {
		return nil, fmt.Errorf("ReturnHold: put account: %w", err)
	}

	// 6. Update Hold status to RETURNED
	hold.Status = "RETURNED"
	holdBytes, err := json.Marshal(hold)
	if err != nil {
		return nil, fmt.Errorf("ReturnHold: marshal hold: %w", err)
	}
	if err := stub.PutPrivateData(tradeLeg.HoldColl, holdKey, holdBytes); err != nil {
		return nil, fmt.Errorf("ReturnHold: put hold: %w", err)
	}

	// 7. Update public TRADELEG~T~<leg> HoldStatus to RETURNED
	tradeLeg.HoldStatus = "RETURNED"
	legBytes, err := json.Marshal(tradeLeg)
	if err != nil {
		return nil, fmt.Errorf("ReturnHold: marshal leg: %w", err)
	}
	if err := stub.PutState(TradeLegKey(tradeID, leg), legBytes); err != nil {
		return nil, fmt.Errorf("ReturnHold: put leg: %w", err)
	}

	return &Result{
		Status:  "OK",
		TxID:    stub.GetTxID(),
		TradeID: tradeID,
	}, nil
}
