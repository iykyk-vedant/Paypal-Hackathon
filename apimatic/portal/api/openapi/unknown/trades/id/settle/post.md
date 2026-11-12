# Deprecated direct settle endpoint (returns 409; capture via /api/paypal/orders/{id}/capture) (/api/openapi/unknown/trades/id/settle/post)

`POST /trades/{id}/settle`

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
  /trades/{id}/settle:
    post:
      summary: Deprecated direct settle endpoint (returns 409; capture via
        /api/paypal/orders/{id}/capture)
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        "409":
          description: Settlement requires capturing a linked PayPal order
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.deprecated_direct_settle_endpoint_returns_409_capture_via_api_paypal_orders_id_capture(
                      "some example string"
                  )
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # DeprecatedDirectSettleEndpointReturns409CaptureViaApiPaypalOrdersIdCaptureErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.deprecatedDirectSettleEndpointReturns409CaptureViaApiPaypalOrdersIdCapture(
                  { id: "some example string" },
                );
              } catch (err) {
                // TODO: Handle 'err' of type CorridorFlowCrossBorderTradePrototypeApiClient.DeprecatedDirectSettleEndpointReturns409CaptureViaApiPaypalOrdersIdCaptureError, discriminated with 'err.payload.kind'
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