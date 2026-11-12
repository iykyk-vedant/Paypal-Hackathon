# Accept a Fabric trade proposal as the counterparty bank (/api/openapi/unknown/api/fabric/trades/tradeid/accept/post)

`POST /api/fabric/trades/{tradeId}/accept`

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
  /api/fabric/trades/{tradeId}/accept:
    post:
      summary: Accept a Fabric trade proposal as the counterparty bank
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
      responses:
        "200":
          description: Fabric transaction committed and validated
        "400":
          description: Trade state or transient details are invalid
        "503":
          description: Fabric writes are disabled or identities are not configured
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.accept_a_fabric_trade_proposal_as_the_counterparty_bank(
                      "some example string", "some example string"
                  )
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # AcceptAFabricTradeProposalAsTheCounterpartyBankErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.acceptAFabricTradeProposalAsTheCounterpartyBank(
                  {
                    tradeId: "some example string",
                    xFabricWriteToken: "some example string",
                  },
                );
              } catch (err) {
                // TODO: Handle 'err' of type CorridorFlowCrossBorderTradePrototypeApiClient.AcceptAFabricTradeProposalAsTheCounterpartyBankError, discriminated with 'err.payload.kind'
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