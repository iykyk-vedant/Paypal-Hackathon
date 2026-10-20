package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// getCallerMSP extracts invoker MSP ID safely
func getCallerMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	if ctx == nil {
		return "", fmt.Errorf("getCallerMSP: nil context")
	}
	stub := ctx.GetStub()
	if stub != nil {
		msp, err := cid.GetMSPID(stub)
		if err != nil {
			return "", fmt.Errorf("cid.GetMSPID failed: %w", err)
		}
		if msp != "" {
			return msp, nil
		}
	}
	return "", fmt.Errorf("getCallerMSP: unable to determine caller MSP")
}

// GetAccount queries private account state for a bank in a currency
func (s *SmartContract) GetAccount(ctx contractapi.TransactionContextInterface, ccy, bankMSP string) (*Account, error) {
	stub := ctx.GetStub()
	coll := CollName(ccy, bankMSP)
	if coll == "" {
		return nil, fmt.Errorf("GetAccount: invalid collection for currency %s and bank %s", ccy, bankMSP)
	}

	callerMSP, err := getCallerMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("GetAccount: caller identification failed: %w", err)
	}
	// Only bank itself, issuing regulator, or auditor can access
	if callerMSP != bankMSP && callerMSP != IssuerOf[ccy] && callerMSP != "AuditorMSP" {
		return nil, fmt.Errorf("GetAccount: caller %s unauthorized for collection %s", callerMSP, coll)
	}

	key := AccountKey(ccy, bankMSP)
	val, err := stub.GetPrivateData(coll, key)
	if err != nil {
		return nil, fmt.Errorf("GetAccount: error reading %s from %s: %w", key, coll, err)
	}
	if len(val) == 0 {
		return nil, fmt.Errorf("GetAccount: account not found: %s in %s", key, coll)
	}

	var acct Account
	if err := json.Unmarshal(val, &acct); err != nil {
		return nil, fmt.Errorf("GetAccount: unmarshal error: %w", err)
	}
	return &acct, nil
}

// GetTrade retrieves public composite trade details
func (s *SmartContract) GetTrade(ctx contractapi.TransactionContextInterface, tradeID string) (*TradeView, error) {
	stub := ctx.GetStub()

	tradeKey := TradeKey(tradeID)
	rawTrade, err := stub.GetState(tradeKey)
	if err != nil {
		return nil, fmt.Errorf("GetTrade: read error: %w", err)
	}
	if len(rawTrade) == 0 {
		return nil, fmt.Errorf("GetTrade: trade not found: %s", tradeID)
	}

	var trade Trade
	if err := json.Unmarshal(rawTrade, &trade); err != nil {
		return nil, fmt.Errorf("GetTrade: unmarshal trade: %w", err)
	}

	view := &TradeView{Trade: &trade}

	// Read Leg A
	rawLegA, err := stub.GetState(TradeLegKey(tradeID, "A"))
	if err == nil && len(rawLegA) > 0 {
		var legA TradeLeg
		if err := json.Unmarshal(rawLegA, &legA); err == nil {
			view.LegA = &legA
		}
	}

	// Read Leg B
	rawLegB, err := stub.GetState(TradeLegKey(tradeID, "B"))
	if err == nil && len(rawLegB) > 0 {
		var legB TradeLeg
		if err := json.Unmarshal(rawLegB, &legB); err == nil {
			view.LegB = &legB
		}
	}

	// Read Settle
	rawSettle, err := stub.GetState(TradeSettleKey(tradeID))
	if err == nil && len(rawSettle) > 0 {
		var settle TradeSettle
		if err := json.Unmarshal(rawSettle, &settle); err == nil {
			view.Settle = &settle
		}
	}

	return view, nil
}

// ListTrades queries all trades with composite legs and settle states
func (s *SmartContract) ListTrades(ctx contractapi.TransactionContextInterface) ([]*TradeView, error) {
	stub := ctx.GetStub()
	it, err := stub.GetStateByRange("TRADE~", "TRADE~\uffff")
	if err != nil {
		return nil, fmt.Errorf("ListTrades: range query failed: %w", err)
	}
	defer it.Close()

	var trades []*TradeView
	for it.HasNext() {
		kv, err := it.Next()
		if err != nil {
			return nil, fmt.Errorf("ListTrades: iterator error: %w", err)
		}
		// Match TRADE~<id> but not other prefixes
		if !strings.HasPrefix(kv.Key, "TRADE~") {
			continue
		}
		parts := strings.Split(kv.Key, "~")
		if len(parts) != 2 {
			continue
		}
		tradeID := parts[1]

		var trade Trade
		if err := json.Unmarshal(kv.Value, &trade); err != nil {
			continue
		}

		view := &TradeView{Trade: &trade}

		// Read Leg A
		rawLegA, err := stub.GetState(TradeLegKey(tradeID, "A"))
		if err == nil && len(rawLegA) > 0 {
			var legA TradeLeg
			if err := json.Unmarshal(rawLegA, &legA); err == nil {
				view.LegA = &legA
			}
		}

		// Read Leg B
		rawLegB, err := stub.GetState(TradeLegKey(tradeID, "B"))
		if err == nil && len(rawLegB) > 0 {
			var legB TradeLeg
			if err := json.Unmarshal(rawLegB, &legB); err == nil {
				view.LegB = &legB
			}
		}

		// Read Settle
		rawSettle, err := stub.GetState(TradeSettleKey(tradeID))
		if err == nil && len(rawSettle) > 0 {
			var settle TradeSettle
			if err := json.Unmarshal(rawSettle, &settle); err == nil {
				view.Settle = &settle
			}
		}

		trades = append(trades, view)
	}

	return trades, nil
}

// GetRules retrieves jurisdictional operating rules
func (s *SmartContract) GetRules(ctx contractapi.TransactionContextInterface, jur string) (*Rules, error) {
	stub := ctx.GetStub()
	raw, err := stub.GetState(RulesKey(jur))
	if err != nil {
		return nil, fmt.Errorf("GetRules: read error: %w", err)
	}
	if len(raw) == 0 {
		return nil, fmt.Errorf("GetRules: rules not found for jurisdiction %s", jur)
	}

	var rules Rules
	if err := json.Unmarshal(raw, &rules); err != nil {
		return nil, fmt.Errorf("GetRules: unmarshal error: %w", err)
	}
	return &rules, nil
}

// GetReserve retrieves RTGS reserve attestation for a currency
func (s *SmartContract) GetReserve(ctx contractapi.TransactionContextInterface, ccy string) (*Reserve, error) {
	stub := ctx.GetStub()
	raw, err := stub.GetState(ReserveKey(ccy))
	if err != nil {
		return nil, fmt.Errorf("GetReserve: read error: %w", err)
	}
	if len(raw) == 0 {
		return nil, fmt.Errorf("GetReserve: reserve not found for currency %s", ccy)
	}

	var res Reserve
	if err := json.Unmarshal(raw, &res); err != nil {
		return nil, fmt.Errorf("GetReserve: unmarshal error: %w", err)
	}
	return &res, nil
}

// GetSupply retrieves total supply and daily minted totals for a currency
func (s *SmartContract) GetSupply(ctx contractapi.TransactionContextInterface, ccy string) (*Supply, error) {
	stub := ctx.GetStub()
	raw, err := stub.GetState(SupplyKey(ccy))
	if err != nil {
		return nil, fmt.Errorf("GetSupply: read error: %w", err)
	}
	if len(raw) == 0 {
		return nil, fmt.Errorf("GetSupply: supply not found for currency %s", ccy)
	}

	var sup Supply
	if err := json.Unmarshal(raw, &sup); err != nil {
		return nil, fmt.Errorf("GetSupply: unmarshal error: %w", err)
	}
	return &sup, nil
}

// ListRefusals retrieves all recorded rule violations from public ledger
func (s *SmartContract) ListRefusals(ctx contractapi.TransactionContextInterface) ([]*Refusal, error) {
	stub := ctx.GetStub()
	it, err := stub.GetStateByRange("REFUSAL~", "REFUSAL~\uffff")
	if err != nil {
		return nil, fmt.Errorf("ListRefusals: range query failed: %w", err)
	}
	defer it.Close()

	var refusals []*Refusal
	for it.HasNext() {
		kv, err := it.Next()
		if err != nil {
			return nil, fmt.Errorf("ListRefusals: iterator error: %w", err)
		}
		var ref Refusal
		if err := json.Unmarshal(kv.Value, &ref); err != nil {
			continue
		}
		refusals = append(refusals, &ref)
	}

	return refusals, nil
}

// GetTradeHistory retrieves audit trail history for trade and associated records
func (s *SmartContract) GetTradeHistory(ctx contractapi.TransactionContextInterface, tradeID string) ([]*TradeHistoryRecord, error) {
	stub := ctx.GetStub()
	keys := []string{
		TradeKey(tradeID),
		TradeSettleKey(tradeID),
		TradeLegKey(tradeID, "A"),
		TradeLegKey(tradeID, "B"),
	}

	var history []*TradeHistoryRecord
	for _, key := range keys {
		it, err := stub.GetHistoryForKey(key)
		if err != nil {
			continue
		}
		for it.HasNext() {
			mod, err := it.Next()
			if err != nil {
				break
			}
			ts := int64(0)
			if mod.Timestamp != nil {
				ts = mod.Timestamp.GetSeconds()
			}
			history = append(history, &TradeHistoryRecord{
				TxID:      mod.TxId,
				Timestamp: ts,
				Key:       key,
				Value:     string(mod.Value),
				IsDelete:  mod.IsDelete,
			})
		}
		it.Close()
	}

	return history, nil
}
