import type { FastifyInstance } from 'fastify'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import * as schema from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { restoreSnapshot } from '../services/snapshot.js'
import { createDeployQueue } from '../workers/deployWorker.js'
import { encrypt } from '../lib/crypto.js'
import { trackEvent } from '../services/analytics.js'

const triggerDeployBody = z.object({
  provider: z.enum(['vercel', 'netlify', 'cloudflare']).default('vercel'),
})

const upsertEnvVarBody = z.object({
  value: z.string().min(1),
})

export async function deploymentRoutes(app: FastifyInstance) {
  async function assertAccess(projectId: string, userId: string) {
    const project = await app.db.query.projects.findFirst({
      where: (p, { and, eq: eqFn, ne }) => and(eqFn(p.id, projectId), ne(p.status, 'deleted')),
    })
    if (!project) return null
    const member = await app.db.query.workspaceMembers.findFirst({
      where: (m, { and, eq: eqFn }) => and(eqFn(m.workspaceId, project.workspaceId), eqFn(m.userId, userId)),
    })
    return member ? project : null
  }

  // POST /:id/deployments — trigger a new deployment
  app.post<{ Params: { id: string }; Body: { provider?: string } }>(
    '/:id/deployments',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.id, request.user!.id),
      })
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
      const project = await assertAccess(request.params.id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      const parsed = triggerDeployBody.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR' } })

      const [deployment] = await app.db.insert(schema.deployments).values({
        projectId: request.params.id,
        provider: parsed.data.provider,
        status: 'pending',
      }).returning()

      const queue = createDeployQueue(process.env.REDIS_URL ?? 'redis://localhost:6379')
      await queue.add('deploy', {
        deploymentId: deployment.id,
        projectId: request.params.id,
        provider: parsed.data.provider,
      })

      trackEvent(app.db, {
        workspaceId: project.workspaceId,
        projectId: deployment.projectId,
        userId: user.id,
        eventType: 'deployment_created',
        metadata: { provider: deployment.provider, status: deployment.status },
      }, app.log)

      return reply.code(202).send({ success: true, data: { deployment } })
    },
  )

  // GET /:id/deployments — list deployments (newest first, limit 20)
  app.get<{ Params: { id: string } }>('/:id/deployments', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return
    const user = await app.db.query.users.findFirst({
      where: (u, { eq: eqFn }) => eqFn(u.id, request.user!.id),
    })
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
    const project = await assertAccess(request.params.id, user.id)
    if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

    const deploymentList = await app.db
      .select()
      .from(schema.deployments)
      .where(eq(schema.deployments.projectId, request.params.id))
      .orderBy(desc(schema.deployments.createdAt))
      .limit(20)

    return reply.send({ success: true, data: { deployments: deploymentList } })
  })

  // GET /:id/deployments/:deployId/ready — check if the deployed URL is actually live
  app.get<{ Params: { id: string; deployId: string } }>(
    '/:id/deployments/:deployId/ready',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.id, request.user!.id),
      })
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
      const project = await assertAccess(request.params.id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      const deployment = await app.db.query.deployments.findFirst({
        where: (d, { and, eq: eqFn }) =>
          and(eqFn(d.id, request.params.deployId), eqFn(d.projectId, request.params.id)),
      })
      if (!deployment || !deployment.deployUrl) {
        return reply.send({ success: true, data: { ready: false } })
      }
      if (deployment.status !== 'deployed') {
        return reply.send({ success: true, data: { ready: false } })
      }

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(deployment.deployUrl, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
        })
        clearTimeout(timeout)
        return reply.send({ success: true, data: { ready: res.ok || res.status < 500 } })
      } catch {
        return reply.send({ success: true, data: { ready: false } })
      }
    },
  )

  // POST /:id/deployments/:deployId/rollback — restore snapshot + re-deploy
  app.post<{ Params: { id: string; deployId: string } }>(
    '/:id/deployments/:deployId/rollback',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.id, request.user!.id),
      })
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
      const project = await assertAccess(request.params.id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      const originalDeployment = await app.db.query.deployments.findFirst({
        where: (d, { and, eq: eqFn }) =>
          and(eqFn(d.id, request.params.deployId), eqFn(d.projectId, request.params.id)),
      })
      if (!originalDeployment) return reply.code(404).send({ success: false, error: { code: 'DEPLOYMENT_NOT_FOUND' } })
      if (!originalDeployment.snapshotId) {
        return reply.code(422).send({ success: false, error: { code: 'NO_SNAPSHOT' } })
      }

      await restoreSnapshot(request.params.id, originalDeployment.snapshotId, app.db)

      const [newDeployment] = await app.db.insert(schema.deployments).values({
        projectId: request.params.id,
        provider: originalDeployment.provider,
        status: 'pending',
        snapshotId: originalDeployment.snapshotId,
      }).returning()

      const queue = createDeployQueue(process.env.REDIS_URL ?? 'redis://localhost:6379')
      await queue.add('deploy', {
        deploymentId: newDeployment.id,
        projectId: request.params.id,
        provider: originalDeployment.provider as 'vercel' | 'netlify' | 'cloudflare',
      })

      return reply.code(202).send({ success: true, data: { deployment: newDeployment } })
    },
  )

  // DELETE /:id/deployments — clear all deployment history for a project
  app.delete<{ Params: { id: string } }>('/:id/deployments', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return
    const user = await app.db.query.users.findFirst({
      where: (u, { eq: eqFn }) => eqFn(u.id, request.user!.id),
    })
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
    const project = await assertAccess(request.params.id, user.id)
    if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

    await app.db.delete(schema.deployments)
      .where(eq(schema.deployments.projectId, request.params.id))

    return reply.code(204).send()
  })

  // GET /:id/env — list env var keys only (no values)
  app.get<{ Params: { id: string } }>('/:id/env', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return
    const user = await app.db.query.users.findFirst({
      where: (u, { eq: eqFn }) => eqFn(u.id, request.user!.id),
    })
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
    const project = await assertAccess(request.params.id, user.id)
    if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

    const rows = await app.db
      .select({ id: schema.projectEnvVars.id, key: schema.projectEnvVars.key, updatedAt: schema.projectEnvVars.updatedAt })
      .from(schema.projectEnvVars)
      .where(eq(schema.projectEnvVars.projectId, request.params.id))
      .orderBy(schema.projectEnvVars.key)
      .limit(200)

    return reply.send({ success: true, data: { envVars: rows } })
  })

  // PUT /:id/env/:key — upsert encrypted env var
  app.put<{ Params: { id: string; key: string }; Body: { value: string } }>(
    '/:id/env/:key',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.id, request.user!.id),
      })
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
      const project = await assertAccess(request.params.id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      const parsed = upsertEnvVarBody.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR' } })

      const valueEnc = encrypt(parsed.data.value)
      const now = new Date()

      const existing = await app.db.query.projectEnvVars.findFirst({
        where: (e, { and, eq: eqFn }) =>
          and(eqFn(e.projectId, request.params.id), eqFn(e.key, request.params.key)),
      })

      if (existing) {
        await app.db.update(schema.projectEnvVars)
          .set({ valueEnc, updatedAt: now })
          .where(eq(schema.projectEnvVars.id, existing.id))
      } else {
        await app.db.insert(schema.projectEnvVars).values({
          projectId: request.params.id,
          key: request.params.key,
          valueEnc,
        })
      }

      return reply.send({ success: true, data: { key: request.params.key } })
    },
  )

  // DELETE /:id/env/:key — delete env var
  app.delete<{ Params: { id: string; key: string } }>(
    '/:id/env/:key',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.id, request.user!.id),
      })
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } })
      const project = await assertAccess(request.params.id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      const toDelete = await app.db.query.projectEnvVars.findFirst({
        where: (e, { and, eq: eqFn }) =>
          and(eqFn(e.projectId, request.params.id), eqFn(e.key, request.params.key)),
      })

      if (toDelete) {
        await app.db.delete(schema.projectEnvVars)
          .where(eq(schema.projectEnvVars.id, toDelete.id))
      }

      return reply.code(204).send()
    },
  )
}
