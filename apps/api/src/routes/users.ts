import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

export async function userRoutes(app: FastifyInstance) {
  // GET /api/v1/users/me
  app.get('/me', {
    schema: {
      tags: ['users'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const user = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.keycloakId, request.user!.keycloakId),
    })

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found — call /auth/sync first' },
      })
    }

    // Populate id on request.user for downstream use
    request.user.id = user.id

    return reply.send({ success: true, data: user })
  })

  // PATCH /api/v1/users/me
  app.patch('/me', {
    schema: {
      tags: ['users'],
      summary: 'Update current user profile',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const result = UpdateProfileSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error.message },
      })
    }

    const { name } = result.data

    const [updated] = await app.db
      .update(users)
      .set({
        ...(name && { name }),
        updatedAt: new Date(),
      })
      .where(eq(users.keycloakId, request.user.keycloakId))
      .returning()

    if (!updated) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }

    return reply.send({ success: true, data: updated })
  })

  // DELETE /api/v1/users/me — soft delete
  app.delete('/me', {
    schema: {
      tags: ['users'],
      summary: 'Soft-delete current user account',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const [deactivated] = await app.db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.keycloakId, request.user.keycloakId))
      .returning({ id: users.id, email: users.email })

    if (!deactivated) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }

    // Schedule hard-delete job via BullMQ (30 days)
    await app.redis.set(
      `cleanup:user:${deactivated.id}`,
      JSON.stringify({ userId: deactivated.id, email: deactivated.email }),
      'EX',
      30 * 24 * 3600, // 30 days TTL
    )

    return reply.send({
      success: true,
      data: { message: 'Account deactivated. Data will be deleted in 30 days.' },
    })
  })
}
