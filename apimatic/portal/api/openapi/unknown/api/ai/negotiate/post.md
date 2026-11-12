# Calculate indicative demo quote with optional Gemini explanation (/api/openapi/unknown/api/ai/negotiate/post)

`POST /api/ai/negotiate`

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
  /api/ai/negotiate:
    post:
      summary: Calculate indicative demo quote with optional Gemini explanation
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                buyerOrg:
                  type: string
                sellerOrg:
                  type: string
                currencyFrom:
                  type: string
                currencyTo:
                  type: string
                amountFrom:
                  type: number
      responses:
        "200":
          description: Indicative demo trade proposal (static FX benchmark and volume
            heuristic)
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.calculate_indicative_demo_quote_with_optional_gemini_explanation()
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.calculateIndicativeDemoQuoteWithOptionalGeminiExplanation();
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