import fp from 'fastify-plugin'
import { SignJWT, jwtVerify } from 'jose'
import type { FastifyRequest, FastifyReply } from 'fastify'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? 'forge-dev-secret-change-in-production')
const ISSUER = 'forge'
const AUDIENCE = 'forge-app'
const EXPIRY = '30d'

export interface AuthUser {
  id: string
  email: string
  name: string
  plan: string
  roles: string[]
}

declare module 'fastify' {
  interface FastifyInstance {
    verifyAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    signToken: (payload: AuthUser) => Promise<string>
  }
  interface FastifyRequest {
    user?: AuthUser
  }
}

export const authPlugin = fp(async app => {
  app.decorate('signToken', async (payload: AuthUser): Promise<string> => {
    return new SignJWT({ id: payload.id, email: payload.email, name: payload.name, plan: payload.plan, roles: payload.roles })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(EXPIRY)
      .sign(secret())
  })

  app.decorate('verifyAuth', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    let token: string | undefined
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else {
      token = (request.cookies as any)?.forge_token
    }

    if (!token) {
      return reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } })
    }

    try {
      const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE })
      request.user = {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        plan: (payload.plan as string) ?? 'free',
        roles: (payload.roles as string[]) ?? [],
      }
    } catch (err: any) {
      const code = err.code === 'ERR_JWT_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      return reply.code(401).send({ success: false, error: { code, message: err.message } })
    }
  })

  app.log.info('JWT auth plugin ready')
})
