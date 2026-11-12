# Get the illustrative USD funding quote for an accepted demo trade (/api/openapi/unknown/api/paypal/orders/quote/tradeid/get)

`GET /api/paypal/orders/quote/{tradeId}`

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
  /api/paypal/orders/quote/{tradeId}:
    get:
      summary: Get the illustrative USD funding quote for an accepted demo trade
      parameters:
        - in: path
          name: tradeId
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Static demo FX quote; not a live market rate
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.get_the_illustrative_usd_funding_quote_for_an_accepted_demo_trade(
                      "some example string"
                  )
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.getTheIllustrativeUsdFundingQuoteForAnAcceptedDemoTrade(
                  { tradeId: "some example string" },
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