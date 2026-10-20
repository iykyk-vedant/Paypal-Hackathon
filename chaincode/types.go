package main

// Account represents private per-bank account state in coll_<ccy>_<bank>
// key: ACCT~<ccy>~<bankCode>
type Account struct {
	Ccy       string `json:"ccy"`
	Bank      string `json:"bank"` // MSP ID
	Available int64  `json:"available"`
	Held      int64  `json:"held"`
	Status    string `json:"status"` // ACTIVE | FROZEN
}

// Hold represents a hold placed on funds in coll_<ccy>_<bank>
// key: HOLD~<ccy>~<ref>
type Hold struct {
	Ccy         string `json:"ccy"`
	Ref         string `json:"ref"`
	Payer       string `json:"payer"` // MSP
	Payee       string `json:"payee"` // MSP
	Amount      int64  `json:"amount"`
	ExpiresAt   int64  `json:"expiresAt"`
	RuleVersion int    `json:"ruleVersion"`
	Status      string `json:"status"` // HELD | DEBITED | RETURNED
	Salt        string `json:"salt"`
}

// Issuance records a currency minting event
// key: ISSUANCE~<ccy>~<rtgsRef>
type Issuance struct {
	Type       string   `json:"type"` // MINT
	Ccy        string   `json:"ccy"`
	Bank       string   `json:"bank"`
	Amount     int64    `json:"amount"`
	RtgsRef    string   `json:"rtgsRef"`
	ApprovedBy []string `json:"approvedBy"`
	Ts         int64    `json:"ts"`
}

// TradeDetail represents bilateral trade parameters in caller implicit collection
// key: TRADEDETAIL~<T>
type TradeDetail struct {
	TradeID   string `json:"tradeId"`
	CcyA      string `json:"ccyA"`
	AmountA   int64  `json:"amountA"`
	CcyB      string `json:"ccyB"`
	AmountB   int64  `json:"amountB"`
	Proposer  string `json:"proposer"`
	Cparty    string `json:"cparty"`
	FxRate    string `json:"fxRate"`
	Reference string `json:"reference"`
	Salt      string `json:"salt"`
}

// RefusalDetail stored in caller implicit collection
// key: REFUSALDETAIL~<txId>
type RefusalDetail struct {
	TxID    string   `json:"txId"`
	Fn      string   `json:"fn"`
	Args    []string `json:"args"`
	Account string   `json:"account"`
	Amount  int64    `json:"amount"`
}

// Trade represents public trade header state
// key: TRADE~<T>
type Trade struct {
	TradeID    string `json:"tradeId"`
	Status     string `json:"status"` // PROPOSED | ACCEPTED | SETTLED | EXPIRED | CANCELLED
	Proposer   string `json:"proposer"`
	Cparty     string `json:"cparty"`
	CcyA       string `json:"ccyA"`
	CcyB       string `json:"ccyB"`
	AcceptBy   int64  `json:"acceptBy"`
	CutoffAt   int64  `json:"cutoffAt"`
	DetailHash string `json:"detailHash"`
	CreatedAt  int64  `json:"createdAt"`
}

// TradeLeg represents leg state in public ledger
// key: TRADELEG~<T>~A and TRADELEG~<T>~B
type TradeLeg struct {
	TradeID      string `json:"tradeId"`
	Leg          string `json:"leg"` // A | B
	Ccy          string `json:"ccy"`
	Payer        string `json:"payer"`
	Payee        string `json:"payee"`
	HoldColl     string `json:"holdColl"`
	HoldHash     string `json:"holdHash"`
	HoldStatus   string `json:"holdStatus"`   // NONE | HELD | DEBITED | RETURNED
	CreditStatus string `json:"creditStatus"` // NONE | CREDITED
	RuleVersion  int    `json:"ruleVersion"`
}

// TradeSettle represents trade settlement status governed by SBE
// key: TRADESETTLE~<T>
type TradeSettle struct {
	TradeID   string `json:"tradeId"`
	Status    string `json:"status"` // PENDING | SETTLED
	SettledAt int64  `json:"settledAt"`
}

// Rules represents jurisdictional operating rules
// key: RULES~<jur>
type Rules struct {
	Jurisdiction string   `json:"jurisdiction"`
	Version      int      `json:"version"`
	OpStartMin   int      `json:"opStartMin"`
	OpEndMin     int      `json:"opEndMin"`
	UtcOffsetMin int      `json:"utcOffsetMin"`
	MaxTxAmount  int64    `json:"maxTxAmount"`
	MaxDailyMint int64    `json:"maxDailyMint"`
	Halted       bool     `json:"halted"`
	ApprovedBy   []string `json:"approvedBy"`
}

// Reserve represents central bank RTGS reserve attestation
// key: RESERVE~<ccy>
type Reserve struct {
	Ccy          string   `json:"ccy"`
	RtgsBalance  int64    `json:"rtgsBalance"`
	StatementRef string   `json:"statementRef"`
	AsOf         int64    `json:"asOf"`
	ApprovedBy   []string `json:"approvedBy"`
}

// Supply represents public running token supply
// key: SUPPLY~<ccy>
type Supply struct {
	Ccy         string `json:"ccy"`
	Total       int64  `json:"total"`
	MintedToday int64  `json:"mintedToday"`
	DayStart    int64  `json:"dayStart"`
}

// Refusal represents committed public refusal records
// key: REFUSAL~<txId>
type Refusal struct {
	TxID         string `json:"txId"`
	Jurisdiction string `json:"jurisdiction"`
	RuleVersion  int    `json:"ruleVersion"`
	ReasonCode   string `json:"reasonCode"`
	InvokerMSP   string `json:"invokerMsp"`
	AcctRef      string `json:"acctRef"`
	TradeID      string `json:"tradeId"`
	Ts           int64  `json:"ts"`
}

// Result represents the standardized contract return structure
type Result struct {
	Status      string `json:"status"` // OK | REFUSED
	ReasonCode  string `json:"reasonCode,omitempty" metadata:",optional"`
	RuleVersion int    `json:"ruleVersion,omitempty" metadata:",optional"`
	TxID        string `json:"txId"`
	TradeID     string `json:"tradeId,omitempty" metadata:",optional"`
}

// TradeHistoryRecord represents an entry returned by GetTradeHistory
type TradeHistoryRecord struct {
	TxID      string `json:"txId"`
	Timestamp int64  `json:"ts"`
	Key       string `json:"key"`
	Value     string `json:"value"`
	IsDelete  bool   `json:"isDelete"`
}

// TradeView represents composite trade details returned by queries
type TradeView struct {
	Trade  *Trade       `json:"trade"`
	LegA   *TradeLeg    `json:"legA"`
	LegB   *TradeLeg    `json:"legB"`
	Settle *TradeSettle `json:"settle"`
}
