# Dispatch Zapier Outbound Automation Webhook (/api/openapi/unknown/api/zapier/trigger/post)

`POST /api/zapier/trigger`

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
  /api/zapier/trigger:
    post:
      summary: Dispatch Zapier Outbound Automation Webhook
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                eventType:
                  type: string
                payload:
                  type: object
      responses:
        "200":
          description: Zapier delivery status
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.dispatch_zapier_outbound_automation_webhook()
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.dispatchZapierOutboundAutomationWebhook();
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