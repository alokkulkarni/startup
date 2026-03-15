import type { FastifyInstance } from 'fastify'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import * as schema from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { createSnapshot, restoreSnapshot } from '../services/snapshot.js'
import { createSnapshotCleanupQueue } from '../workers/snapshotCleanup.js'

const createSnapshotBody = z.object({
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
})

export async function snapshotRoutes(app: FastifyInstance) {
  async function assertAccess(projectId: string, userId: string) {
    const project = await app.db.query.projects.findFirst({
      where: (p, { and, eq, ne }) => and(eq(p.id, projectId), ne(p.status, 'deleted')),
    })
    if (!project) return null
    const member = await app.db.query.workspaceMembers.findFirst({
      where: (m, { and, eq }) => and(eq(m.workspaceId, project.workspaceId), eq(m.userId, userId)),
    })
    return member ? project : null
  }

  // GET /:id/snapshots — list snapshots (newest first, last 100)
  app.get<{ Params: { id: string } }>('/:id/snapshots', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return
    const user = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, request.user!.id),
    })
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
    const project = await assertAccess(request.params.id, user.id)
    if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

    const snapshots = await app.db
      .select({
        id: schema.projectSnapshots.id,
        triggeredBy: schema.projectSnapshots.triggeredBy,
        description: schema.projectSnapshots.description,
        label: schema.projectSnapshots.label,
        createdAt: schema.projectSnapshots.createdAt,
      })
      .from(schema.projectSnapshots)
      .where(eq(schema.projectSnapshots.projectId, request.params.id))
      .orderBy(desc(schema.projectSnapshots.createdAt))
      .limit(100)

    return reply.send({ success: true, data: { snapshots } })
  })

  // POST /:id/snapshots — manual checkpoint
  app.post<{ Params: { id: string }; Body: { label?: string; description?: string } }>(
    '/:id/snapshots',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = await app.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, request.user!.id),
      })
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
      const project = await assertAccess(request.params.id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      const parsed = createSnapshotBody.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR' } })

      const snapshotId = await createSnapshot(
        request.params.id, app.db, 'manual',
        parsed.data.description, parsed.data.label,
      )

      const cleanupQueue = createSnapshotCleanupQueue(process.env.REDIS_URL ?? 'redis://localhost:6379')
      await cleanupQueue.add('prune', { projectId: request.params.id })

      return reply.code(201).send({ success: true, data: { id: snapshotId } })
    },
  )

  // DELETE /:id/snapshots — clear all snapshot history for a project
  app.delete<{ Params: { id: string } }>('/:id/snapshots', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return
    const user = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, request.user!.id),
    })
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
    const project = await assertAccess(request.params.id, user.id)
    if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

    await app.db.delete(schema.projectSnapshots)
      .where(eq(schema.projectSnapshots.projectId, request.params.id))

    return reply.code(204).send()
  })

  // POST /:id/snapshots/:snapshotId/restore
  app.post<{ Params: { id: string; snapshotId: string } }>(
    '/:id/snapshots/:snapshotId/restore',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = await app.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, request.user!.id),
      })
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
      const project = await assertAccess(request.params.id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      await restoreSnapshot(request.params.id, request.params.snapshotId, app.db)
      return reply.send({ success: true })
    },
  )
}
