# PayBridge AI — PayPal Sandbox + AI-Assisted Trade Demo

## Elevator pitch

PayBridge AI is a cross-border trade workflow prototype. It uses deterministic corridor rules to produce an indicative quote, Gemini to explain sample risk results when configured, and PayPal Sandbox to demonstrate an approved USD payment. The app records the result in a local demo ledger so a reviewer can follow the payment workflow end to end.

## The problem

Cross-border business payments can involve multiple approvals, currencies, and operational checks. This prototype explores how an AI assistant and a familiar payment approval flow can make a trade proposal easier to inspect before a user proceeds.

## What the demo does

1. Creates an indicative proposal from static demo FX benchmarks and an illustrative volume heuristic.
2. Runs sample corridor checks and a small built-in blocklist. Gemini may explain the result; it does not make or authorize the decision.
3. Calculates a USD PayPal funding quote from the trade's source amount using the static demo benchmark.
4. Creates a PayPal Sandbox order, lets the user approve it in the PayPal UI, and verifies the captured USD amount against the quote.
5. Records the result in the prototype's in-memory ledger with a local SHA-256 digest of the demo payload (not a Fabric endorsement or external payment proof) and shows the event for review.

## What this prototype does not claim

Fabric Gateway is optional and disabled by default. When configured with rotated identities, the backend can query live chaincode state and submit proposal, acceptance, settlement, and per-leg debit/credit transactions. The block explorer and auditor still use sample fixtures, and live block decoding is not implemented. The ordinary web trade workflow remains in-memory. PayPal capture is not linked atomically to Fabric settlement, and these transactions do not verify PayPal payment. The deployed ledger must already have balances funded through authorized regulator operations. The app does not obtain real central-bank approval, use live FX rates, or perform official OFAC/FATF screening. PayPal Sandbox results are not real payments. Simulation mode is labeled in the interface.

## Tools

- PayPal Developer Platform Sandbox: Orders v2 checkout and capture, when configured.
- Google Gemini: optional explanation of deterministic prototype risk results and demo quotes.
- React, TypeScript, Vite, Node.js, and Express.
- AG Grid for the settlement and activity tables.
- Elasticsearch is optional; local in-memory search is used when it is not configured.
- Go chaincode (`chaincode/`), Fabric deployment artifacts, and network scripts are included; they are separate from the ordinary in-memory trade workflow unless the optional Fabric Gateway panel is explicitly enabled.

## Run the project

See [`README.md`](./README.md) for setup and environment configuration. Without provider credentials, the app runs in clearly labeled simulation mode. To demonstrate PayPal approval, configure matching Sandbox credentials on the server and the Sandbox client ID in the browser environment.

## Repository

Source code and setup instructions are provided in this repository. The project is released under the MIT License.
