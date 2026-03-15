import type { FastifyInstance } from 'fastify'
import { eq, and, or, desc, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  templates,
  templateRatings,
  users,
  workspaceMembers,
  projects,
  projectFiles,
} from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { trackEvent } from '../services/analytics.js'

type TemplateRow = typeof templates.$inferSelect

function scoreTemplate(template: TemplateRow, description: string): number {
  const words = description.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const haystack = `${template.name} ${template.description} ${template.category} ${template.framework}`.toLowerCase()
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0)
}

const RateSchema = z.object({
  rating: z.number().int().min(1).max(5),
})

const CloneSchema = z.object({
  projectName: z.string().min(1).max(100).optional(),
  workspaceId: z.string().uuid().optional(),
})

const SuggestSchema = z.object({
  description: z.string().min(1),
})

const OnboardingUpdateSchema = z.object({
  completed: z.boolean().optional(),
  step: z.number().int().min(0).optional(),
})

export async function templateRoutes(app: FastifyInstance) {
  // ── GET /templates ────────────────────────────────────────────────────────────
  app.get('/templates', {
    schema: { tags: ['templates'], summary: 'List public templates' },
  }, async (request, reply) => {
    const query = request.query as Record<string, string>
    const category = query.category
    const search = query.search
    const sort = query.sort ?? 'newest'
    const page = Math.max(1, parseInt(query.page ?? '1') || 1)
    const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20') || 20))
    const offset = (page - 1) * perPage

    const searchCond = search
      ? or(ilike(templates.name, `%${search}%`), ilike(templates.description, `%${search}%`))
      : undefined

    const whereClause = and(
      eq(templates.isPublic, true),
      category ? eq(templates.category, category) : undefined,
      searchCond,
    )

    const orderByArr =
      sort === 'popular'
        ? [desc(templates.useCount)]
        : sort === 'top_rated'
        ? [desc(templates.avgRating)]
        : [desc(templates.createdAt)]

    const [countRows, rows] = await Promise.all([
      app.db.query.templates.findMany({ where: whereClause }),
      app.db.query.templates.findMany({
        where: whereClause,
        orderBy: orderByArr,
        limit: perPage,
        offset,
      }),
    ])

    return reply.send({
      success: true,
      data: {
        templates: rows,
        total: countRows.length,
        page,
        perPage,
      },
    })
  })

  // ── GET /templates/:slug ──────────────────────────────────────────────────────
  app.get('/templates/:slug', {
    schema: { tags: ['templates'], summary: 'Get template by slug' },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const template = await app.db.query.templates.findFirst({
      where: (t, { eq }) => eq(t.slug, slug),
    })

    if (!template) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' },
      })
    }

    return reply.send({ success: true, data: template })
  })

  // ── POST /templates/suggest ───────────────────────────────────────────────────
  app.post('/templates/suggest', {
    schema: { tags: ['templates'], summary: 'Suggest templates by description' },
  }, async (request, reply) => {
    const result = SuggestSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error.message },
      })
    }

    const { description } = result.data

    const allTemplates = await app.db.query.templates.findMany({
      where: eq(templates.isPublic, true),
    })

    const scored = allTemplates
      .map(t => ({ template: t, score: scoreTemplate(t, description) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ template }) => ({
        name: template.name,
        slug: template.slug,
        description: template.description,
        category: template.category,
        framework: template.framework,
      }))

    return reply.send({ success: true, data: scored })
  })

  // ── POST /templates/:id/clone ─────────────────────────────────────────────────
  app.post('/templates/:id/clone', {
    schema: { tags: ['templates'], summary: 'Clone template into a new project', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const { id } = request.params as { id: string }

    const bodyResult = CloneSchema.safeParse(request.body ?? {})
    if (!bodyResult.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: bodyResult.error.message },
      })
    }

    const template = await app.db.query.templates.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    })

    if (!template) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' },
      })
    }

    const user = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, request.user!.id),
    })

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }

    const membership = await (async () => {
      if (bodyResult.data.workspaceId) {
        const m = await app.db.query.workspaceMembers.findFirst({
          where: (wm, { and, eq }) => and(eq(wm.workspaceId, bodyResult.data.workspaceId!), eq(wm.userId, user.id)),
        })
        if (!m) return null
        return m
      }
      return app.db.query.workspaceMembers.findFirst({
        where: (wm, { eq }) => eq(wm.userId, user.id),
      })
    })()

    if (!membership) {
      return reply.code(400).send({
        success: false,
        error: { code: 'NO_WORKSPACE', message: 'Create a workspace before cloning a template' },
      })
    }

    const projectName = bodyResult.data.projectName ?? template.name

    const [project] = await app.db
      .insert(projects)
      .values({
        workspaceId: membership.workspaceId,
        name: projectName,
        framework: template.framework,
        description: template.description ?? undefined,
      })
      .returning()

    const files = (template.filesJson as Array<{ path: string; content: string }>) ?? []

    if (files.length > 0) {
      await app.db
        .insert(projectFiles)
        .values(
          files.map(f => ({
            projectId: project.id,
            path: f.path,
            content: f.content,
            mimeType: f.path.endsWith('.json') ? 'application/json' : 'text/plain',
            sizeBytes: f.content.length,
          })),
        )
        .onConflictDoNothing()
    }

    await app.db
      .update(templates)
      .set({ useCount: sql`${templates.useCount} + 1`, updatedAt: new Date() })
      .where(eq(templates.id, id))

    trackEvent(app.db, {
      workspaceId: membership.workspaceId,
      projectId: project.id,
      userId: user.id,
      eventType: 'template_cloned',
      metadata: { templateId: id, templateName: template.name },
    }, app.log)

    return reply.send({
      success: true,
      data: { projectId: project.id, projectName: project.name },
    })
  })

  // ── POST /templates/:id/rate ──────────────────────────────────────────────────
  app.post('/templates/:id/rate', {
    schema: { tags: ['templates'], summary: 'Rate a template', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const { id } = request.params as { id: string }

    const bodyResult = RateSchema.safeParse(request.body)
    if (!bodyResult.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: bodyResult.error.message },
      })
    }

    const { rating } = bodyResult.data

    const template = await app.db.query.templates.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    })

    if (!template) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' },
      })
    }

    const user = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, request.user!.id),
    })

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }

    await app.db
      .insert(templateRatings)
      .values({ templateId: id, userId: user.id, rating })
      .onConflictDoUpdate({
        target: [templateRatings.templateId, templateRatings.userId],
        set: { rating },
      })

    const allRatings = await app.db.query.templateRatings.findMany({
      where: (r, { eq }) => eq(r.templateId, id),
    })

    const ratingCount = allRatings.length
    const avgRating =
      ratingCount > 0
        ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(2)
        : '0.00'

    await app.db
      .update(templates)
      .set({ avgRating, ratingCount, updatedAt: new Date() })
      .where(eq(templates.id, id))

    return reply.send({ success: true, data: { avgRating, ratingCount } })
  })

  // ── GET /users/me/onboarding ──────────────────────────────────────────────────
  app.get('/users/me/onboarding', {
    schema: { tags: ['users'], summary: 'Get onboarding state', security: [{ bearerAuth: [] }] },
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

    return reply.send({
      success: true,
      data: {
        completed: user.onboardingCompleted,
        step: user.onboardingStep,
      },
    })
  })

  // ── POST /users/me/onboarding ─────────────────────────────────────────────────
  app.post('/users/me/onboarding', {
    schema: { tags: ['users'], summary: 'Update onboarding state', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const bodyResult = OnboardingUpdateSchema.safeParse(request.body ?? {})
    if (!bodyResult.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: bodyResult.error.message },
      })
    }

    const { completed, step } = bodyResult.data

    if (completed === undefined && step === undefined) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one of completed or step must be provided' },
      })
    }

    await app.db
      .update(users)
      .set({
        ...(completed !== undefined && { onboardingCompleted: completed }),
        ...(step !== undefined && { onboardingStep: step }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, request.user!.id))

    // Fetch updated user
    const updated = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, request.user!.id),
    })

    return reply.send({
      success: true,
      data: {
        completed: updated?.onboardingCompleted ?? (completed ?? false),
        step: updated?.onboardingStep ?? (step ?? 0),
      },
    })
  })
}
