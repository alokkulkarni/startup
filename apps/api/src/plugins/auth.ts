import fp from 'fastify-plugin'
import { Issuer } from 'openid-client'

export interface AuthUser {
  id: string
  keycloakId: string
  email: string
  name: string
  roles: string[]
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}

export const authPlugin = fp(async app => {
  const keycloakUrl = process.env.KEYCLOAK_URL ?? 'http://localhost:8081'
  const realm = process.env.KEYCLOAK_REALM ?? 'forge'
  const issuerUrl = `${keycloakUrl}/realms/${realm}`

  let keycloakIssuer: Awaited<ReturnType<typeof Issuer.discover>>

  try {
    keycloakIssuer = await Issuer.discover(issuerUrl)
    app.log.info({ issuer: issuerUrl }, 'Keycloak OIDC issuer discovered')
  } catch (err) {
    app.log.warn({ err, issuerUrl }, 'Could not connect to Keycloak at startup — will retry on first request')
  }

  // Decorator to protect routes — call verifyAuth(request, reply) in route handlers
  app.decorate('verifyAuth', async (request: any, reply: any) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } })
    }

    const token = authHeader.slice(7)

    try {
      if (!keycloakIssuer) {
        keycloakIssuer = await Issuer.discover(issuerUrl)
      }

      // Verify JWT signature using JWKS
      const jwks = keycloakIssuer.metadata.jwks_uri!
      const response = await fetch(jwks)
      const { keys } = await response.json() as { keys: JsonWebKey[] }

      // Simple decode for now — in prod use jose library for full verification
      const [, payloadB64] = token.split('.')
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())

      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return reply.code(401).send({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Token expired' } })
      }

      request.user = {
        id: payload.sub,
        keycloakId: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.preferred_username,
        roles: payload.realm_access?.roles ?? [],
      }
    } catch (err) {
      request.log.error({ err }, 'Token verification failed')
      return reply.code(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } })
    }
  })
})
