# PayBridge AI

PayBridge AI is a hackathon prototype for AI-assisted cross-border trade workflows. It combines indicative trade pricing and sample risk checks with an optional PayPal Sandbox checkout, then records the result in a local in-memory demo ledger.

## What works in the running app

- Generate an indicative proposal using static benchmark FX values and an illustrative volume rule.
- Run demo corridor checks and a small built-in sample blocklist. When configured, Gemini explains the deterministic result; it does not make the compliance decision.
- Create and approve a PayPal Sandbox order when matching server and browser sandbox credentials are configured. The server calculates a USD funding amount from a static demo FX benchmark and verifies the captured amount against the quote.
- Run an explicitly labeled simulation when PayPal credentials are absent.
- Search locally indexed demo events or send them to the configured Elasticsearch endpoint.
- Inspect seeded Fabric block fixtures and local SHA-256 demo receipt digests (not Fabric endorsements or external payment proofs). An optional, explicitly enabled Gateway mode can query live chaincode state read-only.

## Prototype boundaries

By default the web app is **not connected to a Hyperledger Fabric Gateway**. Its trade state and settlement records are in memory and reset when the backend restarts. The Fabric block explorer and fixture auditor do not read a live block stream or verify live endorsements. Optional Gateway mode reads chaincode query results only; it does not submit transactions or turn the in-memory trade workflow into Fabric settlement. A PayPal capture does not atomically settle both currency legs on Fabric. FX values and risk rules are illustrative and are not live quotes, official sanctions screening, regulatory clearance, or financial advice. PayPal Payouts are Sandbox-only when configured and may fail based on the Sandbox account setup.

The Go chaincode (`chaincode/`) and Fabric network (`network/`) artifacts describe a separate proof of concept; they are not invoked as transactions by the web app. Do not use this project for real funds or production compliance decisions.

The demo API does not authenticate users or protect operator roles; the `X-Operator` header only selects a demo view. Keep it on a trusted local/hackathon environment and do not expose it as a production financial service.

## Run locally

Requirements: Node.js 20+, npm. Docker and Go are only needed for the separate Fabric proof of concept.

```powershell
npm run setup
npm run dev
```

Open `http://localhost:5173`. The API runs on port `3001`.

The demo works in simulation without provider credentials. To use services, copy `.env.example` to `.env` (or `server/.env`) and set only the credentials you need. Keep secrets on the server; never add them to `client/.env` or commit them. For the PayPal browser checkout, copy `client/.env.example` to `client/.env` and put the **Sandbox client ID only** there (`VITE_PAYPAL_CLIENT_ID`); keep `PAYPAL_CLIENT_SECRET` in the root `.env` or `server/.env`. Restart the backend and Vite after changing environment files. The server loads root `.env` first and uses `server/.env` only for values not already set.

To enable live Fabric query snapshots, set `FABRIC_GATEWAY_ENABLED=true` and configure the peer endpoint, TLS server name, MSP ID, channel, chaincode, peer CA, and a rotated Fabric identity through secret files or the supported base64 environment variables. The peer TLS server name must match a DNS name in its certificate. Do not reuse credentials previously committed or exposed. The live snapshot route makes queries only; Fabric blocks and the auditor view remain labeled sample fixtures.

## Separate Fabric proof of concept

The generated identities under `network/organizations/` are intentionally ignored by Git. On a fresh checkout, generate local test identities with the repository's Fabric setup scripts before launching the network. Never publish generated private keys or reuse them outside a local test network.

## Build

```powershell
npm run build
```

## Project identity

The application name is PayBridge AI. It is an independent prototype and is not affiliated with or endorsed by PayPal, any central bank, or any financial regulator.
