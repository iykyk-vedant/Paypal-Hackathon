# Marks the sample counterparty leg held in the demo workflow (/api/openapi/unknown/trades/id/accept/post)

`POST /trades/{id}/accept`

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
  /trades/{id}/accept:
    post:
      summary: Marks the sample counterparty leg held in the demo workflow
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Accepted trade
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  client.marks_the_sample_counterparty_leg_held_in_the_demo_workflow(
                      "some example string"
                  )
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.marksTheSampleCounterpartyLegHeldInTheDemoWorkflow(
                  { id: "some example string" },
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