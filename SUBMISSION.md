# PayBridge AI — PayPal Sandbox + AI-Assisted Trade Demo

## Elevator pitch

PayBridge AI is a cross-border trade workflow prototype. It uses deterministic corridor rules to produce an indicative quote, Gemini to explain sample risk results when configured, and PayPal Sandbox to demonstrate an approved USD payment. The app records the result in a local demo ledger so a reviewer can follow the payment workflow end to end.

## The problem

Cross-border business payments can involve multiple approvals, currencies, and operational checks. This prototype explores how an AI assistant and a familiar payment approval flow can make a trade proposal easier to inspect before a user proceeds.

## What the demo does

1. Sources an item through the Channel3 connector or curated fallback and turns its quote into a reviewable trade proposal using illustrative static FX.
2. Runs deterministic prototype corridor and sample-blocklist checks before proposal creation. Gemini can explain the result but does not make or authorize the decision.
3. Indexes trade, risk, payment, and linked Fabric workflow events in Elasticsearch when configured; emits lifecycle notifications through a configured Zapier Catch webhook.
4. Creates a PayPal Sandbox order, lets the payer approve it in the PayPal UI, and verifies the captured USD amount against the quote.
5. Requires a separate operator-confirmed Fabric test settlement and four separate chaincode value-leg commits before marking the linked local workflow settled.

## What this prototype does not claim

Fabric Gateway is configured for this deployment, but funded test accounts and valid chaincode rules are still prerequisites for a successful linked trade. The regular proposal and acceptance records remain in memory; an accepted trade can be linked to a live Fabric proposal. Fabric settlement and each value-leg transfer are separate permanent test-ledger writes, not atomic with PayPal capture; partial failures require reconciliation. The block explorer and auditor still use sample fixtures, and live block decoding is not implemented. The app does not obtain real central-bank approval, use live FX rates, or perform official sanctions screening. PayPal Sandbox results are not real payments. Kernel storefront audit output is a deterministic scenario, not live DOM evidence. Simulation and fallback modes are labeled.

## Tools

- PayPal Developer Platform Sandbox: Orders v2 checkout and capture, when configured; capture is followed by separately confirmed Fabric test settlement.
- Channel3: optional product discovery and quote prefill; supplier-bank mapping remains a demo assumption.
- Google Gemini: optional explanation of deterministic prototype risk results.
- Elasticsearch: optional search and workflow event indexing.
- Zapier Catch: optional webhook notifications. The app expects `ZAPIER_WEBHOOK_URL`; `ZAPIER_MCP_SERVER_URL` is not used as a Catch webhook.
- Kernel: optional browser-session creation; no live merchant DOM audit is implemented.
- React, TypeScript, Vite, Node.js, and Express.
- AG Grid for the settlement and activity tables.
- Elasticsearch is optional; local in-memory search is used when it is not configured.
- Go chaincode (`chaincode/`), Fabric deployment artifacts, and network scripts are included; they are separate from the ordinary in-memory trade workflow unless the optional Fabric Gateway panel is explicitly enabled.

## Run the project

See [`README.md`](./README.md) for setup and environment configuration. Without provider credentials, the app runs in clearly labeled simulation mode. To demonstrate PayPal approval, configure matching Sandbox credentials on the server and the Sandbox client ID in the browser environment.

## Repository

Source code and setup instructions are provided in this repository. The project is released under the MIT License.
