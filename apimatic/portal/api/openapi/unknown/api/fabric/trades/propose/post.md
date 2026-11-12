# Submit a new INR/SGD trade proposal to Fabric (/api/openapi/unknown/api/fabric/trades/propose/post)

`POST /api/fabric/trades/propose`

Requires the Fabric write feature flag and a rotated signing identity. Private trade details and salt are sent as transient proposal data; this writes to the permanent test ledger.

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
  /api/fabric/trades/propose:
    post:
      summary: Submit a new INR/SGD trade proposal to Fabric
      description: Requires the Fabric write feature flag and a rotated signing
        identity. Private trade details and salt are sent as transient proposal
        data; this writes to the permanent test ledger.
      parameters:
        - in: header
          name: X-Fabric-Write-Token
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
                - proposerMsp
                - ccyA
                - amountA
                - ccyB
                - amountB
              properties:
                proposerMsp:
                  type: string
                  enum:
                    - BankA1MSP
                    - BankB1MSP
                ccyA:
                  type: string
                  enum:
                    - INR
                    - SGD
                amountA:
                  type: string
                  description: Positive currency minor units
                ccyB:
                  type: string
                  enum:
                    - INR
                    - SGD
                amountB:
                  type: string
                  description: Positive currency minor units
                reference:
                  type: string
      responses:
        "201":
          description: Fabric transaction committed and validated
        "400":
          description: Invalid proposal or chaincode rejected it
        "503":
          description: Fabric writes are disabled or identities are not configured
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.submit_a_new_inr_sgd_trade_proposal_to_fabric(
                      "some example string",
                      ApiFabricTradesProposeRequest(
                          proposer_msp=ProposerMsp.BANK_A1_MSP,
                          ccy_a=CcyA.INR,
                          amount_a="some example string",
                          ccy_b=CcyB.INR,
                          amount_b="some example string",
                      ),
                  )
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # SubmitANewInrSgdTradeProposalToFabricErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.submitANewInrSgdTradeProposalToFabric({
                  xFabricWriteToken: "some example string",
                  body: {
                    proposerMsp: ProposerMsp.BankA1Msp,
                    ccyA: CcyA.Inr,
                    amountA: "some example string",
                    ccyB: CcyB.Inr,
                    amountB: "some example string",
                  },
                });
              } catch (err) {
                // TODO: Handle 'err' of type CorridorFlowCrossBorderTradePrototypeApiClient.SubmitANewInrSgdTradeProposalToFabricError, discriminated with 'err.payload.kind'
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