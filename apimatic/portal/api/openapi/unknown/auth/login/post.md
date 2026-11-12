# Sign in to a configured demo role (/api/openapi/unknown/auth/login/post)

`POST /auth/login`

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
  /auth/login:
    post:
      summary: Sign in to a configured demo role
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - operator
                - password
              properties:
                operator:
                  type: string
                password:
                  type: string
                  format: password
      responses:
        "200":
          description: Bearer token and role profile
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.sign_in_to_a_configured_demo_role(
                      AuthLoginRequest(
                          operator="some example string",
                          password="some example password",
                      ),
                  )
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.signInToAConfiguredDemoRole({
                  body: {
                    operator: "some example string",
                    password: "some example password",
                  },
                });
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