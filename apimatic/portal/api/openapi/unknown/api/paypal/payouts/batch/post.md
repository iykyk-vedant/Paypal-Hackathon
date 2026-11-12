# Retry a failed PayPal Batch Payout v1 for a settled demo trade (/api/openapi/unknown/api/paypal/payouts/batch/post)

`POST /api/paypal/payouts/batch`

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
  /api/paypal/payouts/batch:
    post:
      summary: Retry a failed PayPal Batch Payout v1 for a settled demo trade
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                tradeId:
                  type: string
      responses:
        "200":
          description: Payout batch response
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.retry_a_failed_pay_pal_batch_payout_v1_for_a_settled_demo_trade(
                      ApiPaypalPayoutsBatchRequest()
                  )
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.retryAFailedPayPalBatchPayoutV1ForASettledDemoTrade(
                  { body: {} },
                );
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