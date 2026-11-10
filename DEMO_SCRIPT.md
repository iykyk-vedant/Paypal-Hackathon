# PayBridge AI — 2-Minute Demo Script

### 0:00–0:20 — Set expectations

**Show:** Dashboard and the visible demo-mode notice.

**Say:** “PayBridge AI is a hackathon prototype for cross-border trade. It connects supplier quote prefill, prototype risk review, PayPal Sandbox funding, and explicitly confirmed Hyperledger Fabric test-ledger steps. The systems remain separate and non-atomic.”

### 0:20–0:55 — Channel3 sourcing, proposal, and risk explanation

**Show:** Search the Channel3 catalog, request a quote, use **Prefill Demo Trade Proposal**, review its currency pair and static FX disclosure, submit it, then accept it as the counterparty.

**Say:** “The Channel3 quote prefills the proposal. Its supplier-to-bank mapping and FX benchmark are demo assumptions. The API runs deterministic corridor and sample-blocklist checks before creating the proposal; Gemini can explain the result but does not decide it.”

### 0:55–1:25 — PayPal Sandbox funding

**Show:** Open the accepted trade, choose **Capture PayPal Funding**, review the USD funding quote, approve the Sandbox order, and show the capture result.

**Say:** “The server checks the captured amount against the funding quote. Capture records funding only. It does not settle the Fabric ledger or automatically trigger a payout.”

### 1:25–2:00 — Explicit Fabric confirmation and audit trail

**Show (only when funded test accounts and rules allow):** In **Fabric Block Explorer**, link the accepted demo trade, submit and accept the matching Fabric proposal, capture PayPal first if not already captured, then explicitly confirm Fabric settlement. Show that each of the four value-leg transactions commits separately and the linked trade is marked settled only after all four succeed. Finish with the Elastic event search and Zapier event history.

**Say:** “PayPal and Fabric are separate systems. Fabric settlement requires an operator confirmation and regulator endorsement, then four distinct test-ledger value-leg transactions. This is not atomic, and a partial sequence needs reconciliation. The explorer table still uses fixtures; live block decoding is not implemented.”

If test balances or operating rules are not ready, show the Fabric **read-only ledger snapshot** and say the live ledger is connected but currently cannot settle this sample. If PayPal credentials are absent, show **Run simulated demo capture** and say: “This run uses simulation instead of PayPal.”
