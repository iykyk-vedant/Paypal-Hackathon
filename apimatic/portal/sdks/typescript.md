# TypeScript SDK (/sdks/typescript)

[Download SDK](/__downloads/sdk/typescript.zip)

## Intro [#intro]

The CorridorFlow - Cross-Border Trade Prototype API SDK provides access to the CorridorFlow - Cross-Border Trade Prototype API REST APIs.

Hackathon prototype API for the CorridorFlow web demo, combining a PostgreSQL-backed demo trade workflow, deterministic corridor rules, optional Gemini explanations, and PayPal Developer Platform (Orders v2, Payouts v1) Sandbox or simulation. Password-protected demo roles use expiring bearer sessions stored in PostgreSQL when configured. This prototype access layer is not a production identity system.

## Installation [#installation]

The SDK compiles to `dist/` before it can be referenced — run its `build` script once in the SDK folder, then add it to your project by path:

```bash
npm install <path-to-sdk>
```

## Quick Start [#quick-start]

Create one client and reuse it. Configure its behaviour through `ClientOptions`.

```ts
import {
  CorridorFlowCrossBorderTradePrototypeApiClient,
  ServerEnvironment,
} from "corridor-flow-cross-border-trade-prototype-api";

const client = new CorridorFlowCrossBorderTradePrototypeApiClient({
  serverEnvironment: ServerEnvironment.Production,
  bearerAuth: "YOUR_BEARER_TOKEN",
});
```

Nothing in `ClientOptions` is required — `new CorridorFlowCrossBorderTradePrototypeApiClient()` compiles — and each option left out falls back to its default. `serverEnvironment` is spelled out above so the environment a call reaches is visible where the client is built rather than inherited silently.

### From CommonJS [#from-commonjs]

The package ships both dialects from a single entry, so `require` works with full types. In a TypeScript CommonJS file use the `import ... = require(...)` form — a plain destructuring `require` runs fine but gives you `any`.

```ts
import sdk = require("corridor-flow-cross-border-trade-prototype-api");

const client = new sdk.CorridorFlowCrossBorderTradePrototypeApiClient({
  serverEnvironment: sdk.ServerEnvironment.Production,
  bearerAuth: "YOUR_BEARER_TOKEN",
});
```