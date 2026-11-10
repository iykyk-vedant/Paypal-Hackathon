# PayBridge AI — 2-Minute Demo Script

### 0:00–0:20 — Set expectations

**Show:** Dashboard and the visible demo-mode notice.

**Say:** “PayBridge AI is a hackathon prototype for cross-border trade workflows. It uses sample corridor rules, optional Gemini explanations, and PayPal Sandbox. Trade state stays in this app’s in-memory demo ledger; the web app is not connected to a Fabric Gateway.”

### 0:20–0:50 — Indicative proposal and risk explanation

**Show:** Generate a proposal on **New Trade** (or **AI Multi-Agent Swarm**), then run **Sample Risk Check** and view the **Agent decision trace**.

**Say:** “The quote uses a static benchmark and an illustrative volume rule, so it is not a market quote or hedge. The risk checks use prototype rules and a small sample blocklist, not official sanctions sources. When Gemini is configured, it explains those results without making the decision.”

### 0:50–1:35 — PayPal Sandbox flow

**Show:** Open an accepted trade (e.g., `T-1048`) and click **Open Settlement Checkout** (or **Settle PayPal**), review the USD funding quote and its static demo FX disclosure, approve the PayPal Sandbox order, and show the capture result.

**Say:** “The server converts the trade amount to a USD Sandbox funding quote and checks the captured amount against that quote. After capture, PayBridge records the event in its local demo ledger. That does not move both currency legs atomically or write to Fabric.”

If credentials are absent, show **Run simulated demo capture** and say: “This run uses simulation instead of PayPal.”

### 1:35–2:00 — Audit trail and close

**Show:** **PayPal Ledger**, the **Local Demo Receipt** SHA-256 digest on **Trade Detail**, and the **Demo Fixtures** badge on **Fabric Block Explorer**.

**Say:** “The tables make the workflow and its evidence easy to inspect. Fabric is included as a separate Go chaincode proof of concept; these screens show fixtures rather than a live network. PayBridge AI demonstrates how an AI-assisted review and an explicit payment approval can fit into a trade workflow.”
