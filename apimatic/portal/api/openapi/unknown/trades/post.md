# Propose a new sample trade in the demo workflow (/api/openapi/unknown/trades/post)

`POST /trades`

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
  /trades:
    post:
      summary: Propose a new sample trade in the demo workflow
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                proposer:
                  type: string
                cparty:
                  type: string
                ccyA:
                  type: string
                amountA:
                  type: number
                ccyB:
                  type: string
                amountB:
                  type: number
                fxRate:
                  type: string
                reference:
                  type: string
      responses:
        "201":
          description: Proposed trade record
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.propose_a_new_sample_trade_in_the_demo_workflow(
                      TradesRequest()
                  )
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.proposeANewSampleTradeInTheDemoWorkflow({
                  body: {},
                });
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