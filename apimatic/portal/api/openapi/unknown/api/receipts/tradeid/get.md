# Get a local SHA-256 receipt digest for a demo settlement (/api/openapi/unknown/api/receipts/tradeid/get)

`GET /api/receipts/{tradeId}`

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
  /api/receipts/{tradeId}:
    get:
      summary: Get a local SHA-256 receipt digest for a demo settlement
      parameters:
        - in: path
          name: tradeId
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Local demo digest; not proof of Fabric, regulator approval, or
            external payment
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.get_a_local_sha_256_receipt_digest_for_a_demo_settlement(
                      "some example string"
                  )
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.getALocalSha256ReceiptDigestForADemoSettlement(
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