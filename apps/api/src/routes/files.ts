import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import * as schema from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

const MIME_MAP: Record<string, string> = {
  ts: 'application/typescript', tsx: 'application/typescript',
  js: 'application/javascript', jsx: 'application/javascript',
  css: 'text/css', scss: 'text/css',
  html: 'text/html', json: 'application/json',
  md: 'text/markdown', txt: 'text/plain',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg',
  yaml: 'application/yaml', yml: 'application/yaml',
  sh: 'application/x-sh', toml: 'application/toml',
}

const UpsertFileSchema = z.object({
  content: z.string().max(500_000),
})

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return MIME_MAP[ext] ?? 'text/plain'
}

export async function fileRoutes(app: FastifyInstance) {
  // PUT /:id/files/* — upsert a file
  app.put('/:id/files/*', {
    schema: { tags: ['files'], summary: 'Upsert a project file', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const params = request.params as { id: string; '*': string }
    const projectId = params.id
    const path = params['*']

    const parsed = UpsertFileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation error', details: parsed.error.message })
    }

    const project = await app.db.query.projects.findFirst({
      where: (p, { eq: peq, and: pand, ne }) => pand(peq(p.id, projectId), ne(p.status, 'deleted')),
    })
    if (!project) return reply.status(404).send({ error: 'Project not found' })

    const { content } = parsed.data
    const mimeType = getMimeType(path)
    const sizeBytes = Buffer.byteLength(content, 'utf8')

    await app.db.insert(schema.projectFiles)
      .values({ projectId, path, content, mimeType, sizeBytes })
      .onConflictDoUpdate({
        target: [schema.projectFiles.projectId, schema.projectFiles.path],
        set: { content, mimeType, sizeBytes, updatedAt: new Date() },
      })

    return reply.code(200).send({ path, sizeBytes, mimeType, updatedAt: new Date() })
  })

  // DELETE /:id/files/* — delete a file
  app.delete('/:id/files/*', {
    schema: { tags: ['files'], summary: 'Delete a project file', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const params = request.params as { id: string; '*': string }
    const projectId = params.id
    const path = params['*']

    const project = await app.db.query.projects.findFirst({
      where: (p, { eq: peq, and: pand, ne }) => pand(peq(p.id, projectId), ne(p.status, 'deleted')),
    })
    if (!project) return reply.status(404).send({ error: 'Project not found' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await app.db.delete(schema.projectFiles)
      .where(and(
        eq(schema.projectFiles.projectId, projectId),
        eq(schema.projectFiles.path, path),
      ))

    if (!result?.rowCount) {
      return reply.status(404).send({ error: 'File not found' })
    }

    return reply.code(204).send()
  })
}
