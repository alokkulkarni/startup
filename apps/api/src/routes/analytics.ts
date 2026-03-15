import type { FastifyInstance } from 'fastify'
import { eq, and, gte, sql, desc, count } from 'drizzle-orm'
import * as schema from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

// Helper: last N days start timestamp
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

// Resolve the user's default workspace from the DB (first membership by creation order)
async function getUserWorkspaceId(app: FastifyInstance, userId: string): Promise<string | null> {
  const rows = await app.db
    .select({ workspaceId: schema.workspaceMembers.workspaceId })
    .from(schema.users)
    .innerJoin(schema.workspaceMembers, eq(schema.workspaceMembers.userId, schema.users.id))
    .where(eq(schema.users.id, userId))
    .limit(1)
  return rows[0]?.workspaceId ?? null
}

export async function analyticsRoutes(app: FastifyInstance) {

  // ── POST /analytics/events — record event ─────────────────────────────────
  app.post<{
    Body: {
      eventType: string
      projectId?: string
      metadata?: Record<string, unknown>
    }
  }>(
    '/analytics/events',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { eventType, projectId, metadata } = request.body
      if (!eventType) return reply.code(400).send({ error: 'eventType required' })

      const workspaceId = await getUserWorkspaceId(app, request.user!.id)
      if (!workspaceId) return reply.code(400).send({ error: 'No workspace found' })

      await app.db.insert(schema.analyticsEvents).values({
        workspaceId,
        projectId: projectId ?? null,
        userId: request.user!.id,
        eventType,
        metadata: metadata ?? {},
      })
      return reply.code(201).send({ ok: true })
    }
  )

  // ── GET /analytics/overview — workspace 30-day summary ───────────────────
  app.get(
    '/analytics/overview',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const workspaceId = await getUserWorkspaceId(app, request.user!.id)
      if (!workspaceId) return reply.code(400).send({ error: 'No workspace found' })
      const since = daysAgo(30)

      // Event counts by type
      const eventCounts = await app.db
        .select({
          eventType: schema.analyticsEvents.eventType,
          count: count(),
        })
        .from(schema.analyticsEvents)
        .where(
          and(
            eq(schema.analyticsEvents.workspaceId, workspaceId),
            gte(schema.analyticsEvents.createdAt, since)
          )
        )
        .groupBy(schema.analyticsEvents.eventType)

      // Active projects (had any event in last 30 days)
      const activeProjectsResult = await app.db
        .select({ projectId: schema.analyticsEvents.projectId })
        .from(schema.analyticsEvents)
        .where(
          and(
            eq(schema.analyticsEvents.workspaceId, workspaceId),
            gte(schema.analyticsEvents.createdAt, since),
            sql`${schema.analyticsEvents.projectId} IS NOT NULL`
          )
        )
        .groupBy(schema.analyticsEvents.projectId)

      // Active members
      const activeMembersResult = await app.db
        .select({ userId: schema.analyticsEvents.userId })
        .from(schema.analyticsEvents)
        .where(
          and(
            eq(schema.analyticsEvents.workspaceId, workspaceId),
            gte(schema.analyticsEvents.createdAt, since),
            sql`${schema.analyticsEvents.userId} IS NOT NULL`
          )
        )
        .groupBy(schema.analyticsEvents.userId)

      const counts: Record<string, number> = {}
      for (const row of eventCounts) {
        counts[row.eventType] = Number(row.count)
      }

      return {
        period: '30d',
        aiRequests: counts['ai_request'] ?? 0,
        deployments: counts['deployment_created'] ?? 0,
        projectsCreated: counts['project_created'] ?? 0,
        templateClones: counts['template_cloned'] ?? 0,
        activeProjects: activeProjectsResult.length,
        activeMembers: activeMembersResult.length,
        totalEvents: Object.values(counts).reduce((a, b) => a + b, 0),
      }
    }
  )

  // ── GET /analytics/ai-usage — AI requests by day + model ─────────────────
  app.get(
    '/analytics/ai-usage',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const workspaceId = await getUserWorkspaceId(app, request.user!.id)
      if (!workspaceId) return reply.code(400).send({ error: 'No workspace found' })
      const since = daysAgo(30)

      const rows = await app.db
        .select({
          day: sql<string>`DATE(${schema.analyticsEvents.createdAt})`.as('day'),
          count: count(),
          metadata: schema.analyticsEvents.metadata,
        })
        .from(schema.analyticsEvents)
        .where(
          and(
            eq(schema.analyticsEvents.workspaceId, workspaceId),
            eq(schema.analyticsEvents.eventType, 'ai_request'),
            gte(schema.analyticsEvents.createdAt, since)
          )
        )
        .groupBy(
          sql`DATE(${schema.analyticsEvents.createdAt})`,
          schema.analyticsEvents.metadata
        )
        .orderBy(sql`DATE(${schema.analyticsEvents.createdAt})`)

      // Aggregate by day
      const byDay: Record<string, number> = {}
      for (const row of rows) {
        byDay[row.day] = (byDay[row.day] ?? 0) + Number(row.count)
      }

      // Fill missing days with 0
      const series: { date: string; requests: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        series.push({ date: key, requests: byDay[key] ?? 0 })
      }

      return { series }
    }
  )

  // ── GET /analytics/projects/:projectId — per-project stats ───────────────
  app.get<{ Params: { projectId: string } }>(
    '/analytics/projects/:projectId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { projectId } = request.params
      const since = daysAgo(30)

      const workspaceId = await getUserWorkspaceId(app, request.user!.id)
      if (!workspaceId) return reply.code(400).send({ error: 'No workspace found' })

      const project = await app.db.query.projects.findFirst({
        where: (p: any, { and, eq }: any) =>
          and(
            eq(p.id, projectId),
            eq(p.workspaceId, workspaceId)
          ),
      })
      if (!project) return reply.code(404).send({ error: 'Project not found' })

      const eventCounts = await app.db
        .select({
          eventType: schema.analyticsEvents.eventType,
          count: count(),
        })
        .from(schema.analyticsEvents)
        .where(
          and(
            eq(schema.analyticsEvents.projectId, projectId),
            gte(schema.analyticsEvents.createdAt, since)
          )
        )
        .groupBy(schema.analyticsEvents.eventType)

      // Daily AI usage for this project (last 30 days)
      const dailyAI = await app.db
        .select({
          day: sql<string>`DATE(${schema.analyticsEvents.createdAt})`.as('day'),
          count: count(),
        })
        .from(schema.analyticsEvents)
        .where(
          and(
            eq(schema.analyticsEvents.projectId, projectId),
            eq(schema.analyticsEvents.eventType, 'ai_request'),
            gte(schema.analyticsEvents.createdAt, since)
          )
        )
        .groupBy(sql`DATE(${schema.analyticsEvents.createdAt})`)
        .orderBy(sql`DATE(${schema.analyticsEvents.createdAt})`)

      const counts: Record<string, number> = {}
      for (const row of eventCounts) counts[row.eventType] = Number(row.count)

      const aiSeries: { date: string; requests: number }[] = []
      const byDay: Record<string, number> = {}
      for (const r of dailyAI) byDay[r.day] = Number(r.count)
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        aiSeries.push({ date: key, requests: byDay[key] ?? 0 })
      }

      return {
        projectId,
        projectName: project.name,
        period: '30d',
        aiRequests: counts['ai_request'] ?? 0,
        deployments: counts['deployment_created'] ?? 0,
        fileSaves: counts['file_saved'] ?? 0,
        snapshots: counts['snapshot_created'] ?? 0,
        aiSeries,
      }
    }
  )

  // ── GET /analytics/activity — recent event feed ───────────────────────────
  app.get<{
    Querystring: { page?: string; limit?: string }
  }>(
    '/analytics/activity',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const workspaceId = await getUserWorkspaceId(app, request.user!.id)
      if (!workspaceId) return reply.code(400).send({ error: 'No workspace found' })
      const limit = Math.min(Number(request.query.limit ?? 50), 100)
      const offset = (Number(request.query.page ?? 1) - 1) * limit

      const events = await app.db
        .select({
          id: schema.analyticsEvents.id,
          eventType: schema.analyticsEvents.eventType,
          metadata: schema.analyticsEvents.metadata,
          createdAt: schema.analyticsEvents.createdAt,
          projectId: schema.analyticsEvents.projectId,
          userId: schema.analyticsEvents.userId,
          userEmail: schema.users.email,
          projectName: schema.projects.name,
        })
        .from(schema.analyticsEvents)
        .leftJoin(schema.users, eq(schema.analyticsEvents.userId, schema.users.id))
        .leftJoin(schema.projects, eq(schema.analyticsEvents.projectId, schema.projects.id))
        .where(eq(schema.analyticsEvents.workspaceId, workspaceId))
        .orderBy(desc(schema.analyticsEvents.createdAt))
        .limit(limit)
        .offset(offset)

      return { events, page: Number(request.query.page ?? 1), limit }
    }
  )
}
