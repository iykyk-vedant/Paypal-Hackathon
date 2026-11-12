# Capture PayPal Order, verify USD amount against quote, and update demo ledger (/api/openapi/unknown/api/paypal/orders/id/capture/post)

`POST /api/paypal/orders/{id}/capture`

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
  /api/paypal/orders/{id}/capture:
    post:
      summary: Capture PayPal Order, verify USD amount against quote, and update demo
        ledger
      parameters:
        - in: path
          name: id
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
                - tradeId
              properties:
                tradeId:
                  type: string
      responses:
        "200":
          description: Capture and local demo settlement details
        "409":
          description: Capture status, amount, or order link does not match the quote
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.capture_pay_pal_order_verify_usd_amount_against_quote_and_update_demo_ledger(
                      "some example string",
                      ApiPaypalOrdersCaptureRequest(
                          trade_id="some example string"
                      ),
                  )
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # CapturePayPalOrderVerifyUsdAmountAgainstQuoteAndUpdateDemoLedgerErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.capturePayPalOrderVerifyUsdAmountAgainstQuoteAndUpdateDemoLedger(
                  {
                    id: "some example string",
                    body: { tradeId: "some example string" },
                  },
                );
              } catch (err) {
                // TODO: Handle 'err' of type CorridorFlowCrossBorderTradePrototypeApiClient.CapturePayPalOrderVerifyUsdAmountAgainstQuoteAndUpdateDemoLedgerError, discriminated with 'err.payload.kind'
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