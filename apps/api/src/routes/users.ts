import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { users, workspaceMembers, subscriptions } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { getStripeClient } from '../services/stripe.js'

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
      where: (u, { eq }) => eq(u.id, request.user!.id),
    })

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }

    // Omit sensitive fields before returning
    const { passwordHash: _pw, keycloakId: _kc, authProviderId: _pid, ...safeUser } = user as any

    return reply.send({ success: true, data: safeUser })
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
      .where(eq(users.id, request.user.id))
      .returning()

    if (!updated) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }

    return reply.send({ success: true, data: updated })
  })

  // DELETE /api/v1/users/me — soft delete + cancel active subscriptions
  app.delete('/me', {
    schema: {
      tags: ['users'],
      summary: 'Soft-delete current user account',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    // Cancel any active Stripe subscriptions for workspaces owned by this user
    try {
      const memberships = await app.db.query.workspaceMembers.findMany({
        where: (m, { eq }) => eq(m.userId, request.user!.id),
      })
      if (memberships.length > 0) {
        const wsIds = memberships.map(m => m.workspaceId)
        const activeSubs = await app.db
          .select()
          .from(subscriptions)
          .where(inArray(subscriptions.workspaceId, wsIds))

        const stripe = getStripeClient()
        for (const sub of activeSubs) {
          if (sub.stripeSubscriptionId && sub.planTier !== 'free') {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionId).catch(() => {
              // Log but don't block account deletion if Stripe call fails
              app.log.warn(`Failed to cancel Stripe subscription ${sub.stripeSubscriptionId} during account delete`)
            })
          }
        }
      }
    } catch (err) {
      app.log.warn({ err }, 'Subscription cancellation step failed during account delete')
      // Non-blocking — proceed with account deletion
    }

    const [deactivated] = await app.db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, request.user.id))
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

    return reply.clearCookie('forge_token', { path: '/' }).send({
      success: true,
      data: { message: 'Account deactivated. Data will be permanently deleted in 30 days.' },
    })
  })
}
