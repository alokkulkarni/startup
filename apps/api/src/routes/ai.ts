import type { FastifyInstance } from 'fastify'
import { desc, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { aiConversations, aiMessages } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { streamAIResponse } from '../services/ai.js'
import { buildSystemPrompt, getConversationHistory } from '../services/context.js'
import { parseAIResponse, applyDiffs } from '../services/diff.js'

const FREE_TIER_DAILY_LIMIT = 50
const RATE_LIMIT_TTL_SECONDS = 86400 // 24 hours

const chatBodySchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(4000, 'Prompt too long'),
})

async function getDbUser(app: FastifyInstance, keycloakId: string) {
  return app.db.query.users.findFirst({
    where: (u, { eq }) => eq(u.keycloakId, keycloakId),
  })
}

async function assertProjectAccess(app: FastifyInstance, projectId: string, userId: string) {
  const project = await app.db.query.projects.findFirst({
    where: (p, { and, eq, ne }) => and(eq(p.id, projectId), ne(p.status, 'deleted')),
  })
  if (!project) return null

  const member = await app.db.query.workspaceMembers.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.workspaceId, project.workspaceId), eq(m.userId, userId)),
  })
  return member ? project : null
}

export async function aiRoutes(app: FastifyInstance) {
  // POST /:id/ai/chat — SSE streaming chat
  app.post<{ Params: { id: string }; Body: { prompt: string } }>(
    '/:id/ai/chat',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return

      const parseResult = chatBodySchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message },
        })
      }
      const { prompt } = parseResult.data
      const projectId = request.params.id

      // Get DB user by keycloak ID
      const user = await getDbUser(app, request.user!.keycloakId)
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Call /auth/sync first' },
        })
      }

      // Rate limit: 50 AI requests per user per day
      const rateLimitKey = `ratelimit:ai:${user.id}`
      const currentCount = await app.redis.incr(rateLimitKey)
      if (currentCount === 1) {
        await app.redis.expire(rateLimitKey, RATE_LIMIT_TTL_SECONDS)
      }
      if (currentCount > FREE_TIER_DAILY_LIMIT) {
        return reply
          .code(429)
          .header('X-RateLimit-Remaining', '0')
          .send({
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Daily AI limit reached. Upgrade to Pro for unlimited.' },
          })
      }

      // Assert project belongs to user's workspace
      const project = await assertProjectAccess(app, projectId, user.id)
      if (!project) {
        return reply.code(404).send({
          success: false,
          error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied' },
        })
      }

      // Get or create conversation
      let conversation = await app.db.query.aiConversations.findFirst({
        where: (c, { eq }) => eq(c.projectId, projectId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      })
      if (!conversation) {
        const [newConv] = await app.db
          .insert(aiConversations)
          .values({ projectId: project.id })
          .returning()
        conversation = newConv
      }

      // Get previous history (before saving current message)
      const history = await getConversationHistory(projectId, app.db, 20)

      // Save user message
      await app.db.insert(aiMessages).values({
        conversationId: conversation.id,
        role: 'user',
        content: prompt,
      })

      // Build context
      const messages = [...history, { role: 'user' as const, content: prompt }]
      const systemPrompt = await buildSystemPrompt(projectId, app.db)

      // Hijack and stream via SSE
      reply.hijack()
      const res = reply.raw
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      const write = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

      let fullContent = ''

      try {
        for await (const chunk of streamAIResponse(messages, systemPrompt)) {
          if (chunk.type === 'text' && chunk.text) {
            fullContent += chunk.text
            write({ type: 'text', text: chunk.text })
          } else if (chunk.type === 'done') {
            // Save assistant message
            await app.db.insert(aiMessages).values({
              conversationId: conversation!.id,
              role: 'assistant',
              content: fullContent,
              tokensUsed: (chunk.usage?.inputTokens ?? 0) + (chunk.usage?.outputTokens ?? 0),
            })

            // Parse and apply any file diffs
            const { diffs } = parseAIResponse(fullContent)
            if (diffs.length > 0) {
              await applyDiffs(project.id, diffs, app.db, prompt)
            }

            write({ type: 'done' })
            res.end()
            return
          } else if (chunk.type === 'error') {
            write({ type: 'error', error: chunk.error })
            res.end()
            return
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI stream error'
        try {
          write({ type: 'error', error: message })
          res.end()
        } catch { /* ignore */ }
        return
      }

      res.end()
    },
  )

  // GET /:id/ai/history — conversation history
  app.get<{ Params: { id: string } }>(
    '/:id/ai/history',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return

      const projectId = request.params.id

      const user = await getDbUser(app, request.user!.keycloakId)
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Call /auth/sync first' },
        })
      }

      const project = await assertProjectAccess(app, projectId, user.id)
      if (!project) {
        return reply.code(404).send({
          success: false,
          error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied' },
        })
      }

      const conversation = await app.db.query.aiConversations.findFirst({
        where: (c, { eq }) => eq(c.projectId, projectId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      })

      if (!conversation) {
        return reply.code(200).send({ messages: [], conversationId: null })
      }

      const messages = await app.db
        .select({
          id: aiMessages.id,
          conversationId: aiMessages.conversationId,
          role: aiMessages.role,
          content: aiMessages.content,
          createdAt: aiMessages.createdAt,
        })
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversation.id))
        .orderBy(asc(aiMessages.createdAt))
        .limit(50)

      return reply.code(200).send({
        messages,
        conversationId: conversation.id,
      })
    },
  )
}
