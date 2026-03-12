import type { FastifyInstance } from 'fastify'
import { randomBytes } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import * as schema from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { getWorkspaceMembership, canPerform } from '../middleware/rbac.js'
import { trackEvent } from '../services/analytics.js'

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

function getInviteExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d
}

export async function collaborationRoutes(app: FastifyInstance) {
  // ── List workspace members ────────────────────────────────────────────────
  app.get<{ Params: { workspaceId: string } }>(
    '/workspaces/:workspaceId/members',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const { workspaceId } = request.params
      const membership = await getWorkspaceMembership(app.db, request.user.id, workspaceId)
      if (!membership) return reply.code(403).send({ error: 'Not a workspace member' })

      const members = await app.db
        .select({
          id: schema.workspaceMembers.id,
          userId: schema.workspaceMembers.userId,
          role: schema.workspaceMembers.role,
          joinedAt: schema.workspaceMembers.joinedAt,
          name: schema.users.name,
          email: schema.users.email,
          avatarUrl: schema.users.avatarUrl,
        })
        .from(schema.workspaceMembers)
        .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
        .where(eq(schema.workspaceMembers.workspaceId, workspaceId))

      return { members }
    }
  )

  // ── Update member role ────────────────────────────────────────────────────
  app.patch<{
    Params: { workspaceId: string; userId: string }
    Body: { role: string }
  }>(
    '/workspaces/:workspaceId/members/:userId',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const { workspaceId, userId: targetUserId } = request.params
      const { role } = request.body

      if (!['editor', 'viewer'].includes(role)) {
        return reply.code(400).send({ error: 'Role must be editor or viewer' })
      }

      const actorMembership = await getWorkspaceMembership(app.db, request.user.id, workspaceId)
      if (!actorMembership || !canPerform(actorMembership.role, 'owner')) {
        return reply.code(403).send({ error: 'Only owners can change roles' })
      }

      if (request.user.id === targetUserId) {
        return reply.code(400).send({ error: 'Cannot change your own role' })
      }

      const [updated] = await app.db
        .update(schema.workspaceMembers)
        .set({ role })
        .where(and(eq(schema.workspaceMembers.workspaceId, workspaceId), eq(schema.workspaceMembers.userId, targetUserId)))
        .returning()

      if (!updated) return reply.code(404).send({ error: 'Member not found' })
      return { member: updated }
    }
  )

  // ── Remove member ─────────────────────────────────────────────────────────
  app.delete<{ Params: { workspaceId: string; userId: string } }>(
    '/workspaces/:workspaceId/members/:userId',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const { workspaceId, userId: targetUserId } = request.params

      const actorMembership = await getWorkspaceMembership(app.db, request.user.id, workspaceId)
      if (!actorMembership || !canPerform(actorMembership.role, 'owner')) {
        return reply.code(403).send({ error: 'Only owners can remove members' })
      }

      if (request.user.id === targetUserId) {
        return reply.code(400).send({ error: 'Cannot remove yourself from workspace' })
      }

      const [deleted] = await app.db
        .delete(schema.workspaceMembers)
        .where(and(eq(schema.workspaceMembers.workspaceId, workspaceId), eq(schema.workspaceMembers.userId, targetUserId)))
        .returning()

      if (!deleted) return reply.code(404).send({ error: 'Member not found' })
      return reply.code(204).send()
    }
  )

  // ── List invitations ──────────────────────────────────────────────────────
  app.get<{ Params: { workspaceId: string } }>(
    '/workspaces/:workspaceId/invitations',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const { workspaceId } = request.params
      const membership = await getWorkspaceMembership(app.db, request.user.id, workspaceId)
      if (!membership || !canPerform(membership.role, 'editor')) {
        return reply.code(403).send({ error: 'Requires editor role or higher' })
      }

      const invitations = await app.db.query.workspaceInvitations.findMany({
        where: (i: any, { and, eq }: any) =>
          and(eq(i.workspaceId, workspaceId), eq(i.status, 'pending')),
        columns: { token: false },
      })

      return { invitations }
    }
  )

  // ── Send invitation ───────────────────────────────────────────────────────
  app.post<{
    Params: { workspaceId: string }
    Body: { email: string; role?: string }
  }>(
    '/workspaces/:workspaceId/invitations',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const { workspaceId } = request.params
      const { email, role = 'viewer' } = request.body

      if (!email || !email.includes('@')) {
        return reply.code(400).send({ error: 'Valid email required' })
      }
      if (!['editor', 'viewer'].includes(role)) {
        return reply.code(400).send({ error: 'Role must be editor or viewer' })
      }

      const actorMembership = await getWorkspaceMembership(app.db, request.user.id, workspaceId)
      if (!actorMembership || !canPerform(actorMembership.role, 'owner')) {
        return reply.code(403).send({ error: 'Only owners can invite members' })
      }

      const existingUser = await app.db.query.users.findFirst({
        where: (u: any, { eq }: any) => eq(u.email, email),
      })
      if (existingUser) {
        const existingMember = await getWorkspaceMembership(app.db, existingUser.id, workspaceId)
        if (existingMember) {
          return reply.code(409).send({ error: 'User is already a member' })
        }
      }

      // Expire any pending invite for same email+workspace
      await app.db
        .update(schema.workspaceInvitations)
        .set({ status: 'expired' })
        .where(
          and(
            eq(schema.workspaceInvitations.workspaceId, workspaceId),
            eq(schema.workspaceInvitations.email, email),
            eq(schema.workspaceInvitations.status, 'pending')
          )
        )

      const [invitation] = await app.db
        .insert(schema.workspaceInvitations)
        .values({
          workspaceId,
          invitedBy: request.user.id,
          email,
          role,
          token: generateToken(),
          status: 'pending',
          expiresAt: getInviteExpiry(),
        })
        .returning({
          id: schema.workspaceInvitations.id,
          email: schema.workspaceInvitations.email,
          role: schema.workspaceInvitations.role,
          expiresAt: schema.workspaceInvitations.expiresAt,
        })

      app.log.info({ invitationId: invitation.id, email }, 'Invitation created')

      trackEvent(app.db, {
        workspaceId,
        userId: request.user.id,
        eventType: 'member_invited',
        metadata: { inviteeEmail: email, role },
      }, app.log)

      return reply.code(201).send({ invitation })
    }
  )

  // ── Revoke invitation ─────────────────────────────────────────────────────
  app.delete<{ Params: { workspaceId: string; invitationId: string } }>(
    '/workspaces/:workspaceId/invitations/:invitationId',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const { workspaceId, invitationId } = request.params

      const actorMembership = await getWorkspaceMembership(app.db, request.user.id, workspaceId)
      if (!actorMembership || !canPerform(actorMembership.role, 'owner')) {
        return reply.code(403).send({ error: 'Only owners can revoke invitations' })
      }

      const [deleted] = await app.db
        .delete(schema.workspaceInvitations)
        .where(
          and(
            eq(schema.workspaceInvitations.id, invitationId),
            eq(schema.workspaceInvitations.workspaceId, workspaceId)
          )
        )
        .returning()

      if (!deleted) return reply.code(404).send({ error: 'Invitation not found' })
      return reply.code(204).send()
    }
  )

  // ── Accept invitation ─────────────────────────────────────────────────────
  app.post<{
    Params: { token: string }
    Body: { userId?: string }
  }>(
    '/invitations/:token/accept',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const { token } = request.params

      const invitation = await app.db.query.workspaceInvitations.findFirst({
        where: (i: any, { and, eq }: any) =>
          and(eq(i.token, token), eq(i.status, 'pending')),
      })

      if (!invitation) return reply.code(404).send({ error: 'Invitation not found or already used' })
      if (new Date() > invitation.expiresAt) {
        await app.db
          .update(schema.workspaceInvitations)
          .set({ status: 'expired' })
          .where(eq(schema.workspaceInvitations.id, invitation.id))
        return reply.code(410).send({ error: 'Invitation has expired' })
      }

      if (request.user.email !== invitation.email) {
        return reply.code(403).send({ error: 'This invitation was sent to a different email address' })
      }

      await app.db
        .insert(schema.workspaceMembers)
        .values({
          workspaceId: invitation.workspaceId,
          userId: request.user.id,
          role: invitation.role,
        })
        .onConflictDoUpdate({
          target: [schema.workspaceMembers.workspaceId, schema.workspaceMembers.userId],
          set: { role: invitation.role },
        })

      await app.db
        .update(schema.workspaceInvitations)
        .set({ status: 'accepted' })
        .where(eq(schema.workspaceInvitations.id, invitation.id))

      return { workspaceId: invitation.workspaceId, role: invitation.role }
    }
  )

  // ── Get workspace presence (REST) ─────────────────────────────────────────
  app.get<{ Params: { workspaceId: string } }>(
    '/workspaces/:workspaceId/presence',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const { workspaceId } = request.params
      const membership = await getWorkspaceMembership(app.db, request.user.id, workspaceId)
      if (!membership) return reply.code(403).send({ error: 'Not a workspace member' })

      const redis = (app as any).redis
      const onlineIds = await redis.smembers(`presence:ws:${workspaceId}`)
      const users = await Promise.all(
        onlineIds.map(async (id: string) => {
          const data = await redis.get(`presence:user:${workspaceId}:${id}`)
          return data ? JSON.parse(data) : null
        })
      )
      return { users: users.filter(Boolean) }
    }
  )
}
