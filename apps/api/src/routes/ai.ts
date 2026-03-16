import type { FastifyInstance } from 'fastify'
import { desc, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { aiConversations, aiMessages } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { streamAIResponse } from '../services/ai.js'
import { buildSystemPrompt, buildPlanSystemPrompt, getConversationHistory } from '../services/context.js'
import { parseAIResponse, applyDiffs, applyDiffsNoSnapshot, extractNewlyCompletedFiles, writeSingleFile } from '../services/diff.js'
import { createSnapshot } from '../services/snapshot.js'
import { getUserPlanLimit } from '../services/stripe.js'
import { trackEvent } from '../services/analytics.js'
import { canPerform } from '../middleware/rbac.js'

const RATE_LIMIT_TTL_SECONDS = 86400 // 24 hours

const chatBodySchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(4000, 'Prompt too long'),
  mode: z.enum(['agent', 'plan']).optional().default('agent'),
})

async function getDbUser(app: FastifyInstance, userId: string) {
  return app.db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
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
  if (!member) return null
  return { project, member }
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
      const { prompt, mode } = parseResult.data
      const projectId = request.params.id

      // Get DB user by ID
      const user = await getDbUser(app, request.user!.id)
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Call /auth/sync first' },
        })
      }

      // Rate limit: check per-plan daily limit
      // Bypass list: comma-separated emails in RATE_LIMIT_BYPASS_EMAILS env var skip enforcement.
      const bypassEmails = (process.env.RATE_LIMIT_BYPASS_EMAILS ?? '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      const isRateLimitBypassed = bypassEmails.includes((user.email ?? '').toLowerCase())

      if (!isRateLimitBypassed) {
        const rateLimitKey = `ratelimit:ai:${user.id}`
        const [currentCount, planLimit] = await Promise.all([
          app.redis.incr(rateLimitKey),
          getUserPlanLimit(app.db, user.id),
        ])
        if (currentCount === 1) {
          await app.redis.expire(rateLimitKey, RATE_LIMIT_TTL_SECONDS)
        }
        if (currentCount > planLimit) {
          return reply
            .code(429)
            .header('X-RateLimit-Remaining', '0')
            .send({
              success: false,
              error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Daily AI limit reached. Upgrade to Pro for unlimited.' },
            })
        }
      }

      // Assert project belongs to user's workspace
      const access = await assertProjectAccess(app, projectId, user.id)
      if (!access) {
        return reply.code(404).send({
          success: false,
          error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied' },
        })
      }
      if (!canPerform(access.member.role, 'editor')) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Viewer role cannot send AI prompts' },
        })
      }
      const project = access.project

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

      // Build context — plan mode uses a planning-only system prompt (no code output)
      const messages = [...history, { role: 'user' as const, content: prompt }]
      const systemPrompt = mode === 'plan'
        ? await buildPlanSystemPrompt(projectId, app.db, {
            name: project.name,
            framework: project.framework,
            description: project.description,
          })
        : await buildSystemPrompt(projectId, app.db, {
            name: project.name,
            framework: project.framework,
            description: project.description,
          })

      // Log the full prompt for debugging (first 2000 chars of system prompt + user prompt)
      app.log.info({
        msg: '[AI] Request details',
        projectId,
        userId: user.id,
        userPrompt: prompt,
        systemPromptLength: systemPrompt.length,
        systemPromptPreview: systemPrompt.slice(0, 2000),
        conversationLength: history.length,
      })

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
      // Track files written incrementally during streaming
      const writtenDuringStream = new Set<string>()
      let snapshotTaken = false

      // ── Text-token batching ─────────────────────────────────────────────────
      // The LLM streams one token at a time (~1–5 chars each). Sending a
      // separate SSE event per token means 2,000–5,000 events for a typical
      // response. Each event triggers a React setState + re-render on the
      // client, which blocks the browser main thread and causes "Page
      // Unresponsive". Batching flushes accumulated text every 80 ms (or when
      // the buffer hits 150 chars), reducing client renders to ~15–25 total.
      let textBuffer = ''
      let textFlushTimer: ReturnType<typeof setTimeout> | null = null

      const flushTextBuffer = () => {
        if (textFlushTimer) { clearTimeout(textFlushTimer); textFlushTimer = null }
        if (textBuffer) {
          write({ type: 'text', text: textBuffer })
          textBuffer = ''
        }
      }

      try {
        for await (const chunk of streamAIResponse(messages, systemPrompt)) {
          if (chunk.type === 'text' && chunk.text) {
            fullContent += chunk.text

            // Batch tokens: flush immediately if buffer is large, otherwise
            // let the timer coalesce small tokens into one SSE event.
            textBuffer += chunk.text
            if (textBuffer.length >= 150) {
              flushTextBuffer()
            } else if (!textFlushTimer) {
              textFlushTimer = setTimeout(flushTextBuffer, 80)
            }

            // In plan mode, no file writes — just stream the plan text.
            // Only scan for completed file blocks when the NEW chunk contains </file>
            // to avoid O(N²) regex scans on every token of a growing fullContent string.
            if (mode !== 'plan' && chunk.text.includes('</file>')) {
              // Incrementally write any newly-completed <file> blocks to DB
              const newFiles = extractNewlyCompletedFiles(fullContent, writtenDuringStream)
              if (newFiles.length > 0) {
                // Take snapshot once, before the first write
                if (!snapshotTaken) {
                  snapshotTaken = true
                  await createSnapshot(project.id, app.db, 'ai', prompt)
                }
                for (const fileDiff of newFiles) {
                  writtenDuringStream.add(fileDiff.path)
                  try {
                    await writeSingleFile(project.id, fileDiff, app.db)
                    // Flush buffered text before file event so client sees text first
                    flushTextBuffer()
                    write({ type: 'file_written', path: fileDiff.path })
                  } catch (err) {
                    app.log.warn({ msg: '[AI] Incremental file write failed', path: fileDiff.path, err })
                  }
                }
              }
            }
          } else if (chunk.type === 'done') {
            // Flush any remaining buffered text before processing done
            flushTextBuffer()

            // Save assistant message (plan text or code response)
            await app.db.insert(aiMessages).values({
              conversationId: conversation!.id,
              role: 'assistant',
              content: fullContent,
              tokensUsed: (chunk.usage?.inputTokens ?? 0) + (chunk.usage?.outputTokens ?? 0),
            })

            if (mode === 'plan') {
              // Plan mode: no file diffs — just signal done with a plan marker
              write({ type: 'done', isPlan: true })
              res.end()
              trackEvent(app.db, {
                workspaceId: project.workspaceId,
                projectId: projectId ?? null,
                userId: user.id,
                eventType: 'ai_request',
                metadata: { mode: 'plan', tokens: (chunk.usage?.inputTokens ?? 0) + (chunk.usage?.outputTokens ?? 0) },
              }, app.log)
              return
            }

            // Agent mode: apply any remaining file diffs
            const { diffs } = parseAIResponse(fullContent)
            const remainingDiffs = diffs.filter(d => !writtenDuringStream.has(d.path))

            // Log response analysis
            app.log.info({
              msg: '[AI] Response complete',
              mode,
              responseLength: fullContent.length,
              hasForgeChanges: fullContent.includes('<forge_changes>'),
              filesStreamed: writtenDuringStream.size,
              filesRemaining: remainingDiffs.length,
              tokens: (chunk.usage?.inputTokens ?? 0) + (chunk.usage?.outputTokens ?? 0),
            })

            let allChangedPaths: string[] = [...writtenDuringStream]

            if (remainingDiffs.length > 0) {
              // applyDiffs takes its own snapshot; skip if we already took one
              const extra = snapshotTaken
                ? await applyDiffsNoSnapshot(project.id, remainingDiffs, app.db)
                : await applyDiffs(project.id, remainingDiffs, app.db, prompt)
              allChangedPaths = [...new Set([...allChangedPaths, ...extra])]
            }

            if (allChangedPaths.length > 0) {
              write({ type: 'files_changed', paths: allChangedPaths })
            }

            write({ type: 'done' })
            res.end()
            trackEvent(app.db, {
              workspaceId: project.workspaceId,
              projectId: projectId ?? null,
              userId: user.id,
              eventType: 'ai_request',
              metadata: { tokens: (chunk.usage?.inputTokens ?? 0) + (chunk.usage?.outputTokens ?? 0) },
            }, app.log)
            return
          } else if (chunk.type === 'error') {
            flushTextBuffer()
            write({ type: 'error', error: chunk.error })
            res.end()
            return
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI stream error'
        try {
          flushTextBuffer()
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

      const user = await getDbUser(app, request.user!.id)
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Call /auth/sync first' },
        })
      }

      const access = await assertProjectAccess(app, projectId, user.id)
      if (!access) {
        return reply.code(404).send({
          success: false,
          error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied' },
        })
      }
      // viewer+ can read history (all workspace members qualify)
      const project = access.project

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
