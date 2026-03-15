import type { FastifyInstance } from 'fastify'
import { workspaceMembers } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

export async function workspaceRoutes(app: FastifyInstance) {
  // GET /api/v1/workspaces — list workspaces for current user
  app.get('/', {
    schema: {
      tags: ['workspaces'],
      summary: 'List workspaces for current user',
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

    const memberships = await app.db.query.workspaceMembers.findMany({
      where: (m, { eq }) => eq(m.userId, user.id),
      with: { workspace: true },
    })

    return reply.send({
      success: true,
      data: memberships.map(m => ({ ...m.workspace, role: m.role })),
    })
  })

  // GET /api/v1/workspaces/:id
  app.get('/:id', {
    schema: {
      tags: ['workspaces'],
      summary: 'Get workspace by ID',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const { id } = request.params as { id: string }

    const user = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, request.user!.id),
    })
    if (!user) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }

    // Verify membership
    const membership = await app.db.query.workspaceMembers.findFirst({
      where: (m, { and, eq }) => and(eq(m.workspaceId, id), eq(m.userId, user.id)),
      with: { workspace: true },
    })

    if (!membership) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      })
    }

    return reply.send({
      success: true,
      data: { ...membership.workspace, role: membership.role },
    })
  })
}
