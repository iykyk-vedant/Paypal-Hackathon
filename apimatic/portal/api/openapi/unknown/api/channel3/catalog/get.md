# Search Channel3 B2B Product Catalog (/api/openapi/unknown/api/channel3/catalog/get)

`GET /api/channel3/catalog`

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
  /api/channel3/catalog:
    get:
      summary: Search Channel3 B2B Product Catalog
      parameters:
        - in: query
          name: q
          schema:
            type: string
      responses:
        "200":
          description: Catalog search results
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.search_channel3_b2_b_product_catalog()
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.searchChannel3B2BProductCatalog();
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