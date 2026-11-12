# Commit one Fabric settlement-leg debit or payee credit (/api/openapi/unknown/api/fabric/trades/tradeid/legs/leg/operation/post)

`POST /api/fabric/trades/{tradeId}/legs/{leg}/{operation}`

Requires explicit settlement confirmation, a settled trade, and the signing identity for the payer or payee bank. Each call commits a separate ledger transaction.

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
  /api/fabric/trades/{tradeId}/legs/{leg}/{operation}:
    post:
      summary: Commit one Fabric settlement-leg debit or payee credit
      description: Requires explicit settlement confirmation, a settled trade, and the
        signing identity for the payer or payee bank. Each call commits a
        separate ledger transaction.
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
        - in: path
          name: leg
          required: true
          schema:
            type: string
            enum:
              - A
              - B
        - in: path
          name: operation
          required: true
          schema:
            type: string
            enum:
              - debit
              - credit
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
          description: Trade state, settlement confirmation, or chaincode validation failed
        "503":
          description: Fabric writes are disabled or identities are not configured
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.commit_one_fabric_settlement_leg_debit_or_payee_credit(
                      "some example string",
                      Leg.A,
                      Operation.DEBIT,
                      "some example string",
                      ApiFabricTradesLegsOperationRequest(),
                  )
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # CommitOneFabricSettlementLegDebitOrPayeeCreditErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.commitOneFabricSettlementLegDebitOrPayeeCredit(
                  {
                    tradeId: "some example string",
                    leg: Leg.A,
                    operation: Operation.Debit,
                    xFabricWriteToken: "some example string",
                    body: {},
                  },
                );
              } catch (err) {
                // TODO: Handle 'err' of type CorridorFlowCrossBorderTradePrototypeApiClient.CommitOneFabricSettlementLegDebitOrPayeeCreditError, discriminated with 'err.payload.kind'
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