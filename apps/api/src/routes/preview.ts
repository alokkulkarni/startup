import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import * as previewManager from '../services/previewManager.js'

async function assertProjectAccess(app: FastifyInstance, projectId: string, userId: string) {
  const project = await app.db.query.projects.findFirst({
    where: (p, { and, eq, ne }) => and(eq(p.id, projectId), ne(p.status, 'deleted')),
  })
  if (!project) return null
  const member = await app.db.query.workspaceMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.workspaceId, project.workspaceId), eq(m.userId, userId)),
  })
  return member ? project : null
}

export async function previewRoutes(app: FastifyInstance) {
  // ── POST /:id/preview/start ───────────────────────────────────────────────
  // Starts (or restarts) a Docker preview container for the project.
  // Returns the host port the browser should connect to.
  app.post<{ Params: { id: string } }>(
    '/:id/preview/start',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = (request as any).user
      const { id } = request.params

      const project = await assertProjectAccess(app, id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      try {
        const previewUrl = await previewManager.start(id, user.id, app.db)
        return reply.send({ success: true, data: { port: null, previewUrl } })
      } catch (err) {
        const msg = (err as Error).message
        app.log.error({ err }, '[preview] Failed to start preview container')
        return reply.code(500).send({ success: false, error: { code: 'PREVIEW_START_FAILED', message: msg } })
      }
    },
  )

  // ── DELETE /:id/preview/stop ──────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>(
    '/:id/preview/stop',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = (request as any).user
      const { id } = request.params

      const project = await assertProjectAccess(app, id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      await previewManager.stop(id)
      return reply.send({ success: true })
    },
  )

  // ── GET /:id/preview/status ───────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/:id/preview/status',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = (request as any).user
      const { id } = request.params

      const project = await assertProjectAccess(app, id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      const instance = previewManager.getInstance(id)
      if (!instance) return reply.send({ success: true, data: { status: 'stopped', port: null, previewUrl: null } })

      return reply.send({
        success: true,
        data: {
          status: instance.status,
          port: null,
          previewUrl: instance.previewUrl,
          error: instance.error ?? null,
        },
      })
    },
  )

  // ── GET /:id/preview/logs — SSE log stream ────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/:id/preview/logs',
    (request, reply) => {
      reply.hijack()

      const { id } = request.params

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',   // disable nginx/traefik buffering
      })
      reply.raw.flushHeaders?.()

      const send = (log: string) => {
        try {
          reply.raw.write(`data: ${JSON.stringify({ log })}\n\n`)
        } catch {}
      }

      // Replay existing logs first
      const instance = previewManager.getInstance(id)
      if (instance) {
        for (const log of instance.logs) send(log)
      }

      // Subscribe to new logs
      const unsubscribe = previewManager.subscribeToLogs(id, send)

      request.raw.on('close', () => {
        unsubscribe()
      })
    },
  )

  // ── POST /:id/preview/sync ────────────────────────────────────────────────
  // Called after AI generates updated files — re-uploads all project files
  // to the running container so Vite detects changes and recompiles.
  app.post<{ Params: { id: string } }>(
    '/:id/preview/sync',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return
      const user = (request as any).user
      const { id } = request.params

      const project = await assertProjectAccess(app, id, user.id)
      if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } })

      const instance = previewManager.getInstance(id)
      if (!instance) return reply.send({ success: true, data: { synced: false, reason: 'not_running' } })

      try {
        await previewManager.syncFiles(id, app.db)
        return reply.send({ success: true, data: { synced: true } })
      } catch (err) {
        app.log.error({ err }, '[preview] Sync failed')
        return reply.code(500).send({ success: false, error: { code: 'SYNC_FAILED', message: (err as Error).message } })
      }
    },
  )
}
