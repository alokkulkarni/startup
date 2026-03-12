import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import Fastify from 'fastify'
import { analyticsRoutes } from './analytics.js'

vi.mock('../services/analytics.js', () => ({ trackEvent: vi.fn() }))

function makeChain(result: unknown[] = []): any {
  const p: any = Promise.resolve(result)
  for (const m of ['from', 'where', 'groupBy', 'orderBy', 'leftJoin', 'limit', 'offset', 'innerJoin']) {
    p[m] = vi.fn().mockReturnValue(p)
  }
  return p
}

function buildApp() {
  const app = Fastify({ logger: false })
  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-1', keycloakId: 'kc-1', email: 't@t.com', workspaceId: 'ws-1' }
  })
  app.addHook('preHandler', async (req: any) => {
    if (!req.user) req.user = { id: 'user-1', keycloakId: 'kc-1', email: 't@t.com', workspaceId: 'ws-1' }
  })
  const mockDb: any = {
    query: {
      projects: {
        findFirst: vi.fn().mockResolvedValue({ id: 'proj-1', name: 'Test Project', workspaceId: 'ws-1' }),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: 'evt-1' }]),
    }),
    select: vi.fn().mockImplementation(() => makeChain([])),
  }
  app.decorate('db', mockDb)
  app.register(analyticsRoutes, { prefix: '/api/v1' })
  return { app, mockDb }
}

function buildNoAuthApp() {
  const app = Fastify({ logger: false })
  app.decorate('verifyAuth', async () => {
    const err: any = new Error('Unauthorized')
    err.statusCode = 401
    throw err
  })
  app.decorate('db', {} as any)
  app.register(analyticsRoutes, { prefix: '/api/v1' })
  return app
}

// ── POST /api/v1/analytics/events ────────────────────────────────────────────

describe('POST /api/v1/analytics/events', () => {
  let app: ReturnType<typeof buildApp>['app']
  let mockDb: ReturnType<typeof buildApp>['mockDb']

  beforeAll(async () => {
    ;({ app, mockDb } = buildApp())
    await app.ready()
  })
  afterAll(() => app.close())
  beforeEach(() => {
    mockDb.insert.mockClear()
  })

  it('returns 201 with ok: true on valid request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      payload: { eventType: 'ai_request' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ ok: true })
  })

  it('returns 400 when eventType is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'eventType required' })
  })

  it('returns 400 when eventType is empty string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      payload: { eventType: '' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'eventType required' })
  })

  it('inserts event with workspaceId from request.user', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      payload: { eventType: 'project_created' },
    })
    const valuesCall = mockDb.insert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', userId: 'user-1' })
    )
  })

  it('accepts optional projectId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      payload: { eventType: 'deployment_created', projectId: 'proj-42' },
    })
    expect(res.statusCode).toBe(201)
    const valuesCall = mockDb.insert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-42' })
    )
  })

  it('accepts optional metadata', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      payload: { eventType: 'file_saved', metadata: { path: 'src/index.ts' } },
    })
    expect(res.statusCode).toBe(201)
    const valuesCall = mockDb.insert.mock.results[0].value.values
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { path: 'src/index.ts' } })
    )
  })
})

// ── GET /api/v1/analytics/overview ───────────────────────────────────────────

describe('GET /api/v1/analytics/overview', () => {
  let app: ReturnType<typeof buildApp>['app']
  let mockDb: ReturnType<typeof buildApp>['mockDb']

  beforeAll(async () => {
    ;({ app, mockDb } = buildApp())
    await app.ready()
  })
  afterAll(() => app.close())
  beforeEach(() => {
    mockDb.select.mockReset().mockImplementation(() => makeChain([]))
  })

  it('returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    expect(res.statusCode).toBe(200)
  })

  it('response has correct shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    const body = res.json()
    expect(body).toHaveProperty('period', '30d')
    expect(body).toHaveProperty('aiRequests')
    expect(body).toHaveProperty('deployments')
    expect(body).toHaveProperty('projectsCreated')
    expect(body).toHaveProperty('templateClones')
    expect(body).toHaveProperty('activeProjects')
    expect(body).toHaveProperty('activeMembers')
    expect(body).toHaveProperty('totalEvents')
  })

  it('returns zeros when no events', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    const body = res.json()
    expect(body.aiRequests).toBe(0)
    expect(body.deployments).toBe(0)
    expect(body.totalEvents).toBe(0)
    expect(body.activeProjects).toBe(0)
    expect(body.activeMembers).toBe(0)
  })

  it('maps ai_request count correctly', async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([{ eventType: 'ai_request', count: '7' }]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([]))
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    expect(res.json().aiRequests).toBe(7)
  })

  it('counts active projects from groupBy results', async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([{ projectId: 'p1' }, { projectId: 'p2' }, { projectId: 'p3' }]))
      .mockReturnValueOnce(makeChain([]))
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    expect(res.json().activeProjects).toBe(3)
  })

  it('counts active members from groupBy results', async () => {
    mockDb.select
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([{ userId: 'u1' }, { userId: 'u2' }]))
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    expect(res.json().activeMembers).toBe(2)
  })

  it('totalEvents sums all event type counts', async () => {
    mockDb.select
      .mockReturnValueOnce(
        makeChain([
          { eventType: 'ai_request', count: '5' },
          { eventType: 'deployment_created', count: '3' },
        ])
      )
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([]))
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    expect(res.json().totalEvents).toBe(8)
  })
})

// ── GET /api/v1/analytics/ai-usage ───────────────────────────────────────────

describe('GET /api/v1/analytics/ai-usage', () => {
  let app: ReturnType<typeof buildApp>['app']
  let mockDb: ReturnType<typeof buildApp>['mockDb']

  beforeAll(async () => {
    ;({ app, mockDb } = buildApp())
    await app.ready()
  })
  afterAll(() => app.close())
  beforeEach(() => {
    mockDb.select.mockReset().mockImplementation(() => makeChain([]))
  })

  it('returns 200 with series property', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/ai-usage' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('series')
  })

  it('series has exactly 30 elements', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/ai-usage' })
    expect(res.json().series).toHaveLength(30)
  })

  it('all requests are zero when no data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/ai-usage' })
    const allZero = res.json().series.every((s: any) => s.requests === 0)
    expect(allZero).toBe(true)
  })

  it('series items have date and requests fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/ai-usage' })
    const first = res.json().series[0]
    expect(first).toHaveProperty('date')
    expect(first).toHaveProperty('requests')
    expect(typeof first.date).toBe('string')
    expect(typeof first.requests).toBe('number')
  })

  it('populates requests from db rows for matching dates', async () => {
    const today = new Date().toISOString().split('T')[0]
    mockDb.select.mockReturnValueOnce(
      makeChain([{ day: today, count: '9', metadata: {} }])
    )
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/ai-usage' })
    const todayEntry = res.json().series.find((s: any) => s.date === today)
    expect(todayEntry?.requests).toBe(9)
  })

  it('series dates are in ascending order', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/ai-usage' })
    const series = res.json().series
    const dates = series.map((s: any) => s.date)
    expect(dates).toEqual([...dates].sort())
  })
})

// ── GET /api/v1/analytics/projects/:projectId ─────────────────────────────────

describe('GET /api/v1/analytics/projects/:projectId', () => {
  let app: ReturnType<typeof buildApp>['app']
  let mockDb: ReturnType<typeof buildApp>['mockDb']

  beforeAll(async () => {
    ;({ app, mockDb } = buildApp())
    await app.ready()
  })
  afterAll(() => app.close())
  beforeEach(() => {
    mockDb.select.mockReset().mockImplementation(() => makeChain([]))
    mockDb.query.projects.findFirst.mockResolvedValue({
      id: 'proj-1',
      name: 'Test Project',
      workspaceId: 'ws-1',
    })
  })

  it('returns 200 with correct shape', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/proj-1',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('projectId', 'proj-1')
    expect(body).toHaveProperty('projectName')
    expect(body).toHaveProperty('period', '30d')
    expect(body).toHaveProperty('aiRequests')
    expect(body).toHaveProperty('deployments')
    expect(body).toHaveProperty('fileSaves')
    expect(body).toHaveProperty('snapshots')
    expect(body).toHaveProperty('aiSeries')
  })

  it('returns projectName from project record', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/proj-1',
    })
    expect(res.json().projectName).toBe('Test Project')
  })

  it('aiSeries has exactly 30 elements', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/proj-1',
    })
    expect(res.json().aiSeries).toHaveLength(30)
  })

  it('returns 404 when project not found', async () => {
    mockDb.query.projects.findFirst.mockResolvedValue(null)
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/unknown-id',
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: 'Project not found' })
  })

  it('returns 404 for project in different workspace', async () => {
    // Simulates the WHERE clause: eq(p.workspaceId, request.user.workspaceId) returning null
    mockDb.query.projects.findFirst.mockResolvedValue(null)
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/other-ws-proj',
    })
    expect(res.statusCode).toBe(404)
  })

  it('maps event counts to response fields', async () => {
    mockDb.select
      .mockReturnValueOnce(
        makeChain([
          { eventType: 'ai_request', count: '4' },
          { eventType: 'deployment_created', count: '2' },
          { eventType: 'file_saved', count: '10' },
          { eventType: 'snapshot_created', count: '1' },
        ])
      )
      .mockReturnValueOnce(makeChain([]))
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/proj-1',
    })
    const body = res.json()
    expect(body.aiRequests).toBe(4)
    expect(body.deployments).toBe(2)
    expect(body.fileSaves).toBe(10)
    expect(body.snapshots).toBe(1)
  })

  it('aiSeries items have date and requests fields', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/proj-1',
    })
    const first = res.json().aiSeries[0]
    expect(first).toHaveProperty('date')
    expect(first).toHaveProperty('requests')
  })

  it('returns zeros for missing event types', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/proj-1',
    })
    const body = res.json()
    expect(body.aiRequests).toBe(0)
    expect(body.deployments).toBe(0)
    expect(body.fileSaves).toBe(0)
    expect(body.snapshots).toBe(0)
  })
})

// ── GET /api/v1/analytics/activity ───────────────────────────────────────────

describe('GET /api/v1/analytics/activity', () => {
  let app: ReturnType<typeof buildApp>['app']
  let mockDb: ReturnType<typeof buildApp>['mockDb']

  const mockEvent = {
    id: 'evt-1',
    eventType: 'ai_request',
    metadata: {},
    createdAt: new Date().toISOString(),
    projectId: 'proj-1',
    userId: 'user-1',
    userEmail: 't@t.com',
    projectName: 'Test Project',
  }

  beforeAll(async () => {
    ;({ app, mockDb } = buildApp())
    await app.ready()
  })
  afterAll(() => app.close())
  beforeEach(() => {
    mockDb.select.mockReset().mockImplementation(() => makeChain([mockEvent]))
  })

  it('returns 200 with events array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/activity' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('events')
    expect(Array.isArray(res.json().events)).toBe(true)
  })

  it('default page is 1', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/activity' })
    expect(res.json().page).toBe(1)
  })

  it('default limit is 50', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/activity' })
    expect(res.json().limit).toBe(50)
  })

  it('returns page number in response', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/activity?page=3',
    })
    expect(res.json().page).toBe(3)
  })

  it('accepts custom limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/activity?limit=10',
    })
    expect(res.json().limit).toBe(10)
  })

  it('caps limit at 100', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/activity?limit=200',
    })
    expect(res.json().limit).toBe(100)
  })

  it('returns events with joined user and project data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/activity' })
    const events = res.json().events
    expect(events.length).toBeGreaterThan(0)
    expect(events[0]).toHaveProperty('userEmail')
    expect(events[0]).toHaveProperty('projectName')
  })
})

// ── 401 Without Auth ──────────────────────────────────────────────────────────

describe('401 without auth', () => {
  let app: ReturnType<typeof buildNoAuthApp>

  beforeAll(async () => {
    app = buildNoAuthApp()
    await app.ready()
  })
  afterAll(() => app.close())

  it('POST /analytics/events returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      payload: { eventType: 'ai_request' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /analytics/overview returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/overview' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /analytics/ai-usage returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/ai-usage' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /analytics/projects/:id returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/projects/proj-1',
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /analytics/activity returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/activity' })
    expect(res.statusCode).toBe(401)
  })
})
