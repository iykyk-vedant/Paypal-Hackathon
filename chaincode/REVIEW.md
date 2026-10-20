# Self-Review Artefact: Chaincode Balance Mutations & Endorsements in `chaincode/`

This file documents every file:line in `chaincode/` that mutates a balance (`Available`/`Held`/`Total`), sets an endorsement/validation parameter, or selects endorsing organizations. Each line includes a ≤10-word justification.

| File:Line | Mutation / Parameter | 10-Word Justification |
|---|---|---|
| `chaincode/contract.go:85` | `SetStateValidationParameter(RULES~JUR-A, RegAMSP)` | SBE restricts JUR-A rule updates strictly to RegAMSP peer. |
| `chaincode/contract.go:108` | `SetStateValidationParameter(RULES~JUR-B, RegBMSP)` | SBE restricts JUR-B rule updates strictly to RegBMSP peer. |
| `chaincode/contract.go:158` | `SetStateValidationParameter(RESERVE~INR, RegAMSP)` | SBE restricts INR reserve attestations strictly to RegAMSP peer. |
| `chaincode/contract.go:174` | `SetStateValidationParameter(RESERVE~SGD, RegBMSP)` | SBE restricts SGD reserve attestations strictly to RegBMSP peer. |
| `chaincode/regulator.go:104` | `SetStateValidationParameter(RESERVE~ccy, expectedMSP)` | SBE restricts reserve attestation updates to issuing regulator peer. |
| `chaincode/regulator.go:196` | `SetStateValidationParameter(RULES~jur, expectedMSP)` | SBE restricts jurisdictional rule updates to owning regulator peer. |
| `chaincode/contract.go:193-194` | `acct.Available = 0; acct.Held = 0` | Initializes zero balance accounts for banks in member collections. |
| `chaincode/regulator.go:404,432` | `acct.Available += amt; supply.Total += amt` | Credits newly minted currency after verified reserve check. |
| `chaincode/trade.go:156-157` | `acct.Available -= amtA; acct.Held += amtA` | Locks proposer funds into held balance after rules pass. |
| `chaincode/trade.go:251` | `SetStateValidationParameter(TRADESETTLE, AND(RegAMSP, RegBMSP))` | Requires dual regulator endorsement for subsequent settle transition. |
| `chaincode/trade.go:402-403` | `acct.Available -= detail.AmountB; acct.Held += detail.AmountB` | Locks counterparty funds into held balance after rules pass. |
| `chaincode/bookkeeping.go:142` | `acct.Held -= hold.Amount` | Releases held balance on payer account after trade settled. |
| `chaincode/bookkeeping.go:258` | `acct.Available += amount` | Credits payee account using amount from recorded trade detail. |
| `chaincode/bookkeeping.go:373-374` | `acct.Held -= hold.Amount; acct.Available += hold.Amount` | Restores held funds to payer on expired or cancelled. |

## Post-freeze fixes

### Fix 1: Decouple TradeDetail Salt from Hold Salt in ProposeTrade (SPEC §3)
- **File/Line**: `chaincode/trade.go:96`
- **Issue**: `ProposeTrade` mistakenly coupled `detail.Salt != salt` in the argument matching check. Per `docs/SPEC.md` §3, `TradeDetail.Salt` is the bilateral trade agreement salt (shared between proposer and counterparty so that `detailHash` matches on both sides), whereas transient `salt` is the party's own private hold salt (fresh per party and stored in `Hold.Salt`). Coupling them caused proposal rejection whenever `detail.Salt` differed from the transient hold salt.
- **Fix**: Removed `|| detail.Salt != salt` from `ProposeTrade`'s argument-matching condition, while retaining all parameter comparisons (`TradeID`, `CcyA`, `AmountA`, `CcyB`, `AmountB`, `Cparty`) and checking `detail.Proposer == callerMSP`. Retained the 32-hex validation on transient `salt`. Verified `AcceptTrade` has no coupling between `detail.Salt` and transient `salt`. Added test `TestDetailSaltIndependentOfHoldSalt` in `trade_test.go`.

