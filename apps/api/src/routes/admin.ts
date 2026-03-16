import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users, workspaceMembers, subscriptions, workspaces } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { PLAN_LIMITS } from '../services/stripe.js'

const VALID_TIERS = Object.keys(PLAN_LIMITS) as Array<keyof typeof PLAN_LIMITS>

/**
 * Admin-only guard: checks if the authenticated user's email is in the
 * ADMIN_EMAILS environment variable (comma-separated list).
 */
function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

const planOverrideSchema = z.object({
  email: z.string().email('Valid email required'),
  tier: z.enum(['free', 'pro', 'team', 'enterprise']),
})

export async function adminRoutes(app: FastifyInstance) {
  // ── POST /admin/plan-override — set a user's plan tier directly ────────────
  app.post<{ Body: { email: string; tier: string } }>(
    '/admin/plan-override',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return

      if (!isAdmin(request.user!.email)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        })
      }

      const parsed = planOverrideSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
        })
      }

      const { email, tier } = parsed.data

      // Find the target user
      const targetUser = await app.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, email),
      })
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: `No user found with email: ${email}` },
        })
      }

      // Update user-level plan
      await app.db
        .update(users)
        .set({ plan: tier, updatedAt: new Date() })
        .where(eq(users.id, targetUser.id))

      // Find the user's workspace(s) and update subscription for each
      const memberships = await app.db.query.workspaceMembers.findMany({
        where: (m, { eq }) => eq(m.userId, targetUser.id),
      })

      let updatedWorkspaces = 0
      for (const membership of memberships) {
        // Update workspace plan
        await app.db
          .update(workspaces)
          .set({ plan: tier, updatedAt: new Date() })
          .where(eq(workspaces.id, membership.workspaceId))

        // Upsert subscription record with the override tier
        await (app.db as any)
          .insert(subscriptions)
          .values({
            workspaceId: membership.workspaceId,
            plan: tier,
            planTier: tier,
            status: 'active',
          })
          .onConflictDoUpdate({
            target: subscriptions.workspaceId,
            set: {
              plan: tier,
              planTier: tier,
              status: 'active',
            },
          })
        updatedWorkspaces++
      }

      const limits = PLAN_LIMITS[tier as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free

      app.log.info({
        msg: '[Admin] Plan override applied',
        adminEmail: request.user!.email,
        targetEmail: email,
        tier,
        workspacesUpdated: updatedWorkspaces,
      })

      return reply.code(200).send({
        success: true,
        data: {
          email,
          tier,
          limits: {
            aiRequestsPerDay: limits.aiRequestsPerDay === -1 ? 'unlimited' : limits.aiRequestsPerDay,
            maxProjects: limits.maxProjects === -1 ? 'unlimited' : limits.maxProjects,
            maxFilesPerProject: limits.maxFilesPerProject === -1 ? 'unlimited' : limits.maxFilesPerProject,
          },
          workspacesUpdated: updatedWorkspaces,
        },
      })
    },
  )

  // ── GET /admin/plan-overrides — list all users and their current tiers ──────
  app.get(
    '/admin/plan-overrides',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return

      if (!isAdmin(request.user!.email)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        })
      }

      // Fetch all users with non-free plans (overridden users)
      const overriddenUsers = await app.db.query.users.findMany({
        where: (u, { ne }) => ne(u.plan, 'free'),
        columns: { id: true, email: true, name: true, plan: true, createdAt: true },
      })

      return reply.code(200).send({
        success: true,
        data: overriddenUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          tier: u.plan,
          limits: PLAN_LIMITS[(u.plan as keyof typeof PLAN_LIMITS)] ?? PLAN_LIMITS.free,
          createdAt: u.createdAt,
        })),
      })
    },
  )

  // ── DELETE /admin/plan-override/:email — reset a user back to free tier ────
  app.delete<{ Params: { email: string } }>(
    '/admin/plan-override/:email',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return

      if (!isAdmin(request.user!.email)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        })
      }

      const email = decodeURIComponent(request.params.email)

      const targetUser = await app.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, email),
      })
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: `No user found with email: ${email}` },
        })
      }

      // Reset user plan to free
      await app.db
        .update(users)
        .set({ plan: 'free', updatedAt: new Date() })
        .where(eq(users.id, targetUser.id))

      // Reset all workspace subscriptions to free
      const memberships = await app.db.query.workspaceMembers.findMany({
        where: (m, { eq }) => eq(m.userId, targetUser.id),
      })

      for (const membership of memberships) {
        await app.db
          .update(workspaces)
          .set({ plan: 'free', updatedAt: new Date() })
          .where(eq(workspaces.id, membership.workspaceId))

        await app.db
          .update(subscriptions)
          .set({ plan: 'free', planTier: 'free' })
          .where(eq(subscriptions.workspaceId, membership.workspaceId))
      }

      app.log.info({
        msg: '[Admin] Plan override removed',
        adminEmail: request.user!.email,
        targetEmail: email,
      })

      return reply.code(200).send({
        success: true,
        data: { email, tier: 'free', message: 'Plan reset to free tier' },
      })
    },
  )

  // ── GET /admin/tiers — list all available tiers and their limits ────────────
  app.get(
    '/admin/tiers',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return

      if (!isAdmin(request.user!.email)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        })
      }

      return reply.code(200).send({
        success: true,
        data: Object.entries(PLAN_LIMITS).map(([tier, limits]) => ({
          tier,
          limits: {
            aiRequestsPerDay: limits.aiRequestsPerDay === -1 ? 'unlimited' : limits.aiRequestsPerDay,
            maxProjects: limits.maxProjects === -1 ? 'unlimited' : limits.maxProjects,
            maxFilesPerProject: limits.maxFilesPerProject === -1 ? 'unlimited' : limits.maxFilesPerProject,
          },
        })),
      })
    },
  )
}
