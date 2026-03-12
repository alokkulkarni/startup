import fp from 'fastify-plugin'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JWTPayload } from 'jose'

export interface AuthUser {
  id: string          // DB UUID (populated after sync)
  keycloakId: string  // Keycloak sub claim
  email: string
  name: string
  roles: string[]
}

declare module 'fastify' {
  interface FastifyInstance {
    verifyAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    user?: AuthUser
  }
}

export const authPlugin = fp(async app => {
  const keycloakUrl = process.env.KEYCLOAK_URL ?? 'http://localhost:8081'
  const realm        = process.env.KEYCLOAK_REALM ?? 'forge'
  const jwksUri      = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`

  // Cache the JWKS remotely — jose handles key rotation automatically
  const JWKS = createRemoteJWKSet(new URL(jwksUri), {
    cacheMaxAge: 10 * 60 * 1000, // 10 min
  })

  app.decorate('verifyAuth', async (request: any, reply: any) => {
    const authHeader = request.headers.authorization as string | undefined
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing Bearer token' },
      })
    }

    const token = authHeader.slice(7)

    let payload: JWTPayload
    try {
      const result = await jwtVerify(token, JWKS, {
        issuer: `${keycloakUrl}/realms/${realm}`,
      })
      payload = result.payload
    } catch (err: any) {
      request.log.warn({ err: err.message }, 'JWT verification failed')
      const code = err.code === 'ERR_JWT_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      return reply.code(401).send({
        success: false,
        error: { code, message: err.message },
      })
    }

    const realmAccess = payload['realm_access'] as { roles?: string[] } | undefined

    request.user = {
      id: '',  // populated after DB lookup in routes that need it
      keycloakId: payload.sub!,
      email: (payload['email'] as string) ?? '',
      name: (payload['name'] as string) ?? (payload['preferred_username'] as string) ?? '',
      roles: realmAccess?.roles ?? [],
    }
  })

  app.log.info({ jwksUri }, 'Keycloak JWKS auth plugin ready')
})
