# Elastic Observability & Financial Crime Search (/api/openapi/unknown/api/elastic/search/get)

`GET /api/elastic/search`

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
  /api/elastic/search:
    get:
      summary: Elastic Observability & Financial Crime Search
      parameters:
        - in: query
          name: q
          schema:
            type: string
      responses:
        "200":
          description: Elastic search hits and query latency
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.elastic_observability_financial_crime_search()
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.elasticObservabilityFinancialCrimeSearch();
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