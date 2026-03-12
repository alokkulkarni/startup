import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const SyncUserSchema = z.object({
  keycloakId: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().optional(),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/sync — Called after OIDC login to sync user to DB
  app.post('/sync', {
    schema: {
      tags: ['auth'],
      summary: 'Sync user from Keycloak to DB',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return

    const { keycloakId, email, name } = request.user

    // Upsert user in DB
    const user = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.keycloakId, keycloakId),
    })

    if (!user) {
      // Create new user + default workspace
      app.log.info({ keycloakId, email }, 'Creating new user')
      // DB insert will be implemented in Sprint 1
    }

    return reply.send({
      success: true,
      data: { message: 'User synced', isNew: !user },
    })
  })

  // GET /api/v1/auth/me
  app.get('/me', {
    schema: {
      tags: ['auth'],
      summary: 'Get current user',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return

    return reply.send({
      success: true,
      data: request.user,
    })
  })
}
