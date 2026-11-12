# Python SDK (/sdks/python)

[Download SDK](/__downloads/sdk/python.zip)

## Intro [#intro]

The CorridorFlow - Cross-Border Trade Prototype API SDK provides access to the CorridorFlow - Cross-Border Trade Prototype API REST APIs.

Hackathon prototype API for the CorridorFlow web demo, combining a PostgreSQL-backed demo trade workflow, deterministic corridor rules, optional Gemini explanations, and PayPal Developer Platform (Orders v2, Payouts v1) Sandbox or simulation. Password-protected demo roles use expiring bearer sessions stored in PostgreSQL when configured. This prototype access layer is not a production identity system.

## Installation [#installation]

Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as `../corridor-flow-cross-border-trade-prototype-api` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:

```bash
pip install <path-to-sdk>
```

```bash
uv add <path-to-sdk>
```

```bash
poetry add <path-to-sdk>
```

## Quick Start [#quick-start]

### Synchronous client [#synchronous-client]

Construct `CorridorFlowCrossBorderTradePrototypeApiClient` with keyword arguments, and call `close()` when you are done. Every argument is optional.

```python
from corridor_flow_cross_border_trade_prototype_api import CorridorFlowCrossBorderTradePrototypeApiClient

client = CorridorFlowCrossBorderTradePrototypeApiClient(bearer_auth="YOUR_BEARER_TOKEN", environment="production")

client.close()
```

Alternatively, scope it — `with CorridorFlowCrossBorderTradePrototypeApiClient(...) as client:` closes the pool on exit.

### Asynchronous client [#asynchronous-client]

`AsyncCorridorFlowCrossBorderTradePrototypeApiClient` mirrors `CorridorFlowCrossBorderTradePrototypeApiClient` with **identical method names**, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is `custom_async_http_client`.

```python
from asyncio import run

from corridor_flow_cross_border_trade_prototype_api import AsyncCorridorFlowCrossBorderTradePrototypeApiClient

async def main() -> None:
    client = AsyncCorridorFlowCrossBorderTradePrototypeApiClient(
        bearer_auth="YOUR_BEARER_TOKEN", environment="production"
    )
    await client.aclose()

run(main())
```

Alternatively, scope it — `async with AsyncCorridorFlowCrossBorderTradePrototypeApiClient(...) as client:` closes the pool on exit.