# Read a live Fabric chaincode snapshot (/api/openapi/unknown/api/fabric/ledger/get)

`GET /api/fabric/ledger`

Requires a configured Fabric Gateway identity. Evaluates chaincode queries only and never submits a transaction. Private account queries may be denied by chaincode access rules.

```yaml
openapi: 3.2.0
servers:
  - url: https://paybridge-api-8ua8.onrender.com
    description: Hosted Demo API
  - url: http://localhost:3001
    description: Local Development API
security:
  - bearerAuth: []
paths:
  /api/fabric/ledger:
    get:
      summary: Read a live Fabric chaincode snapshot
      description: Requires a configured Fabric Gateway identity. Evaluates chaincode
        queries only and never submits a transaction. Private account queries
        may be denied by chaincode access rules.
      responses:
        "200":
          description: Results and per-query errors from read-only chaincode evaluations
        "503":
          description: Gateway disabled, unavailable, or misconfigured
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.read_a_live_fabric_chaincode_snapshot()
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # ReadALiveFabricChaincodeSnapshotErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.readALiveFabricChaincodeSnapshot();
              } catch (err) {
                // TODO: Handle 'err' of type CorridorFlowCrossBorderTradePrototypeApiClient.ReadALiveFabricChaincodeSnapshotError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: Token returned by POST /auth/login
info:
  title: CorridorFlow - Cross-Border Trade Prototype API
  version: 1.0.0
```