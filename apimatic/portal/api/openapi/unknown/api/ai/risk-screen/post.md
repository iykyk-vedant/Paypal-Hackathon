# Run deterministic sample corridor & blocklist checks with optional Gemini explanation (/api/openapi/unknown/api/ai/risk-screen/post)

`POST /api/ai/risk-screen`

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
  /api/ai/risk-screen:
    post:
      summary: Run deterministic sample corridor & blocklist checks with optional
        Gemini explanation
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                tradeId:
                  type: string
                amountA:
                  type: string
                currencyA:
                  type: string
                amountB:
                  type: string
                currencyB:
                  type: string
      responses:
        "200":
          description: Risk score and pass/refuse verdict
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.run_deterministic_sample_corridor_blocklist_checks_with_optional_gemini_explanation()
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.runDeterministicSampleCorridorBlocklistChecksWithOptionalGeminiExplanation();
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