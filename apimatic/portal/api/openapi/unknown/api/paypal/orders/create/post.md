# Create PayPal Orders v2 Order (Sandbox or simulation) using server-calculated USD quote (/api/openapi/unknown/api/paypal/orders/create/post)

`POST /api/paypal/orders/create`

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
  /api/paypal/orders/create:
    post:
      summary: Create PayPal Orders v2 Order (Sandbox or simulation) using
        server-calculated USD quote
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                tradeId:
                  type: string
                description:
                  type: string
      responses:
        "200":
          description: PayPal Order response with server USD funding quote
        "409":
          description: Trade is not accepted or has a conflicting funding quote
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.create_pay_pal_orders_v2_order_sandbox_or_simulation_using_server_calculated_usd_quote(
                      ApiPaypalOrdersCreateRequest()
                  )
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # CreatePayPalOrdersV2OrderSandboxOrSimulationUsingServerCalculatedUsdQuoteErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.createPayPalOrdersV2OrderSandboxOrSimulationUsingServerCalculatedUsdQuote(
                  { body: {} },
                );
              } catch (err) {
                // TODO: Handle 'err' of type CorridorFlowCrossBorderTradePrototypeApiClient.CreatePayPalOrdersV2OrderSandboxOrSimulationUsingServerCalculatedUsdQuoteError, discriminated with 'err.payload.kind'
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