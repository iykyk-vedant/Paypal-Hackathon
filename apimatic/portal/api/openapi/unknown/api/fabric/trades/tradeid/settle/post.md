# Settle an accepted Fabric trade (/api/openapi/unknown/api/fabric/trades/tradeid/settle/post)

`POST /api/fabric/trades/{tradeId}/settle`

Requires explicit confirmation in the request and RegAMSP plus RegBMSP peer endorsements. It does not verify PayPal capture.

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
  /api/fabric/trades/{tradeId}/settle:
    post:
      summary: Settle an accepted Fabric trade
      description: Requires explicit confirmation in the request and RegAMSP plus
        RegBMSP peer endorsements. It does not verify PayPal capture.
      parameters:
        - in: header
          name: X-Fabric-Write-Token
          required: true
          schema:
            type: string
        - in: path
          name: tradeId
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - confirmSettlement
              properties:
                confirmSettlement:
                  type: boolean
                  const: true
      responses:
        "200":
          description: Fabric transaction committed and validated
        "400":
          description: Trade is not accepted or explicit confirmation is missing
        "503":
          description: Fabric writes are disabled or identities are not configured
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.settle_an_accepted_fabric_trade(
                      "some example string",
                      "some example string",
                      ApiFabricTradesSettleRequest(),
                  )
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # SettleAnAcceptedFabricTradeErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.settleAnAcceptedFabricTrade({
                  tradeId: "some example string",
                  xFabricWriteToken: "some example string",
                  body: {},
                });
              } catch (err) {
                // TODO: Handle 'err' of type CorridorFlowCrossBorderTradePrototypeApiClient.SettleAnAcceptedFabricTradeError, discriminated with 'err.payload.kind'
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