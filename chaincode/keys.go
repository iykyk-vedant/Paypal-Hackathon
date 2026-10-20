package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// MSPToCode maps organization MSP ID to short code
var MSPToCode = map[string]string{
	"RegAMSP":    "RegA",
	"RegBMSP":    "RegB",
	"BankA1MSP":  "A1",
	"BankB1MSP":  "B1",
	"AuditorMSP": "Aud",
}

// IssuerOf maps currency to issuing regulator MSP
var IssuerOf = map[string]string{
	"INR": "RegAMSP",
	"SGD": "RegBMSP",
}

// JurOf maps currency to jurisdiction
var JurOf = map[string]string{
	"INR": "JUR-A",
	"SGD": "JUR-B",
}

// BankMSPs slice maintains deterministic order
var BankMSPs = []string{"BankA1MSP", "BankB1MSP"}

// CollName returns private data collection name for currency and bank
func CollName(ccy, bankMSP string) string {
	code, ok := MSPToCode[bankMSP]
	if !ok {
		return ""
	}
	return "coll_" + ccy + "_" + code
}

func collName(ccy, bankMSP string) string {
	return CollName(ccy, bankMSP)
}

// ImplicitColl returns the implicit private data collection name for an org
func ImplicitColl(msp string) string {
	return "_implicit_org_" + msp
}

func implicitColl(msp string) string {
	return ImplicitColl(msp)
}

// Key formatting functions using plain string "~" separator (per AGENTS.md rule 5)
func AccountKey(ccy, bankMSP string) string {
	code := bankMSP
	if c, ok := MSPToCode[bankMSP]; ok {
		code = c
	}
	return fmt.Sprintf("ACCT~%s~%s", ccy, code)
}

func accountKey(ccy, bankCode string) string {
	return AccountKey(ccy, bankCode)
}

func HoldKey(ccy, ref string) string {
	return fmt.Sprintf("HOLD~%s~%s", ccy, ref)
}

func holdKey(ccy, ref string) string {
	return HoldKey(ccy, ref)
}

func IssuanceKey(ccy, rtgsRef string) string {
	return fmt.Sprintf("ISSUANCE~%s~%s", ccy, rtgsRef)
}

func issuanceKey(ccy, rtgsRef string) string {
	return IssuanceKey(ccy, rtgsRef)
}

func TradeDetailKey(tradeID string) string {
	return fmt.Sprintf("TRADEDETAIL~%s", tradeID)
}

func tradeDetailKey(tradeID string) string {
	return TradeDetailKey(tradeID)
}

func RefusalDetailKey(txID string) string {
	return fmt.Sprintf("REFUSALDETAIL~%s", txID)
}

func refusalDetailKey(txID string) string {
	return RefusalDetailKey(txID)
}

func TradeKey(tradeID string) string {
	return fmt.Sprintf("TRADE~%s", tradeID)
}

func tradeKey(tradeID string) string {
	return TradeKey(tradeID)
}

func TradeLegKey(tradeID, leg string) string {
	return fmt.Sprintf("TRADELEG~%s~%s", tradeID, leg)
}

func tradeLegKey(tradeID, leg string) string {
	return TradeLegKey(tradeID, leg)
}

func TradeSettleKey(tradeID string) string {
	return fmt.Sprintf("TRADESETTLE~%s", tradeID)
}

func tradeSettleKey(tradeID string) string {
	return TradeSettleKey(tradeID)
}

func RulesKey(jur string) string {
	return fmt.Sprintf("RULES~%s", jur)
}

func rulesKey(jur string) string {
	return RulesKey(jur)
}

func ReserveKey(ccy string) string {
	return fmt.Sprintf("RESERVE~%s", ccy)
}

func reserveKey(ccy string) string {
	return ReserveKey(ccy)
}

func SupplyKey(ccy string) string {
	return fmt.Sprintf("SUPPLY~%s", ccy)
}

func supplyKey(ccy string) string {
	return SupplyKey(ccy)
}

func RefusalKey(txID string) string {
	return fmt.Sprintf("REFUSAL~%s", txID)
}

func refusalKey(txID string) string {
	return RefusalKey(txID)
}

// demoHmacKeys per SPEC §2 Decision
var demoHmacKeys = map[string]string{
	"JUR-A": "demo-key-JUR-A",
	"JUR-B": "demo-key-JUR-B",
}

// ComputeAcctRef computes hex HMAC-SHA256 for anonymized refusal logging
func ComputeAcctRef(jur, acctKey string) string {
	key, ok := demoHmacKeys[jur]
	if !ok {
		key = "demo-key-default"
	}
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(acctKey))
	return hex.EncodeToString(h.Sum(nil))
}

func computeAcctRef(jur, acctKey string) string {
	return ComputeAcctRef(jur, acctKey)
}
