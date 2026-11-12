# Check Fabric Gateway query connectivity (/api/openapi/unknown/api/fabric/status/get)

`GET /api/fabric/status`

Reports a live read-only chaincode query probe when Gateway mode is enabled; TCP reachability alone is not treated as a Fabric connection.

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
  /api/fabric/status:
    get:
      summary: Check Fabric Gateway query connectivity
      description: Reports a live read-only chaincode query probe when Gateway mode is
        enabled; TCP reachability alone is not treated as a Fabric connection.
      responses:
        "200":
          description: Gateway status and demo or live ledger source
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.check_fabric_gateway_query_connectivity()
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.checkFabricGatewayQueryConnectivity();
              } catch (err) {
                // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
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