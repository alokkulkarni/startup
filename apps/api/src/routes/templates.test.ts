import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { templateRoutes } from './templates.js'

const mockTemplates = [
  {
    id: 'tmpl-1',
    name: 'React Counter',
    slug: 'react-counter',
    description: 'Simple counter app built with react hooks',
    category: 'starter',
    framework: 'react',
    filesJson: [{ path: 'src/App.jsx', content: 'export default function App() { return <div>Counter</div> }' }],
    thumbnailUrl: null,
    useCount: 42,
    avgRating: '4.50',
    ratingCount: 10,
    isOfficial: true,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-2',
    name: 'React Todo App',
    slug: 'react-todo-app',
    description: 'Todo list with localStorage persistence',
    category: 'starter',
    framework: 'react',
    filesJson: [{ path: 'src/App.jsx', content: 'export default function App() { return <div>Todo</div> }' }],
    thumbnailUrl: null,
    useCount: 120,
    avgRating: '4.80',
    ratingCount: 25,
    isOfficial: true,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const mockUser = {
  id: 'user-1',
  keycloakId: 'kc-1',
  email: 'test@test.com',
  name: 'Test User',
  onboardingCompleted: false,
  onboardingStep: 0,
}

function buildApp(overrides?: {
  templatesFindFirst?: ReturnType<typeof vi.fn>
  templatesFindMany?: ReturnType<typeof vi.fn>
  workspaceFindFirst?: ReturnType<typeof vi.fn>
  ratingsFindMany?: ReturnType<typeof vi.fn>
  insertReturning?: ReturnType<typeof vi.fn>
}) {
  const app = Fastify({ logger: false })

  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com' }
  })

  const insertReturningMock =
    overrides?.insertReturning ??
    vi.fn().mockResolvedValue([{ id: 'proj-new', name: 'React Counter' }])

  app.decorate('db', {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(mockUser),
      },
      templates: {
        findFirst: overrides?.templatesFindFirst ?? vi.fn().mockResolvedValue(mockTemplates[0]),
        findMany: overrides?.templatesFindMany ?? vi.fn().mockResolvedValue(mockTemplates),
      },
      templateRatings: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany:
          overrides?.ratingsFindMany ??
          vi.fn().mockResolvedValue([
            { id: 'rating-1', rating: 4, templateId: 'tmpl-1', userId: 'user-1', createdAt: new Date() },
          ]),
      },
      workspaceMembers: {
        findFirst:
          overrides?.workspaceFindFirst ??
          vi.fn().mockResolvedValue({ workspaceId: 'ws-1', userId: 'user-1', role: 'owner' }),
      },
      projectFiles: { findMany: vi.fn().mockResolvedValue([]) },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: insertReturningMock,
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as any)

  app.register(templateRoutes, { prefix: '/api/v1' })
  return app
}

// ── GET /api/v1/templates ─────────────────────────────────────────────────────
describe('GET /api/v1/templates', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  it('returns list of public templates', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.templates)).toBe(true)
    expect(body.data.templates.length).toBeGreaterThan(0)
  })

  it('includes pagination metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates' })
    const body = res.json()
    expect(body.data).toHaveProperty('total')
    expect(body.data).toHaveProperty('page')
    expect(body.data).toHaveProperty('perPage')
  })

  it('filters by category', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates?category=starter' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.templates)).toBe(true)
  })

  it('filters by search query', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates?search=react' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
  })

  it('sorts by popular (use_count desc)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates?sort=popular' })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })

  it('sorts by newest (createdAt desc)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates?sort=newest' })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })

  it('sorts by top_rated (avgRating desc)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates?sort=top_rated' })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })

  it('paginates with page and perPage', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates?page=2&perPage=5' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.page).toBe(2)
    expect(body.data.perPage).toBe(5)
  })
})

// ── GET /api/v1/templates/:slug ───────────────────────────────────────────────
describe('GET /api/v1/templates/:slug', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  it('returns template with filesJson', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates/react-counter' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.slug).toBe('react-counter')
    expect(Array.isArray(body.data.filesJson)).toBe(true)
  })

  it('returns 404 for unknown slug', async () => {
    const notFound = buildApp({
      templatesFindFirst: vi.fn().mockResolvedValue(null),
    })
    await notFound.ready()
    const res = await notFound.inject({ method: 'GET', url: '/api/v1/templates/does-not-exist' })
    expect(res.statusCode).toBe(404)
    expect(res.json().success).toBe(false)
    await notFound.close()
  })
})

// ── POST /api/v1/templates/:id/clone ─────────────────────────────────────────
describe('POST /api/v1/templates/:id/clone', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  it('creates project and returns projectId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/tmpl-1/clone',
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('projectId')
    expect(body.data).toHaveProperty('projectName')
  })

  it('uses template name as project name by default', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/tmpl-1/clone',
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.projectName).toBe('React Counter')
  })

  it('uses custom projectName when provided', async () => {
    const customReturning = vi.fn().mockResolvedValue([{ id: 'proj-custom', name: 'My Custom Project' }])
    const customApp = buildApp({ insertReturning: customReturning })
    await customApp.ready()

    const res = await customApp.inject({
      method: 'POST',
      url: '/api/v1/templates/tmpl-1/clone',
      payload: { projectName: 'My Custom Project' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.projectName).toBe('My Custom Project')
    await customApp.close()
  })

  it('returns 404 for unknown template', async () => {
    const notFound = buildApp({
      templatesFindFirst: vi.fn().mockResolvedValue(null),
    })
    await notFound.ready()
    const res = await notFound.inject({
      method: 'POST',
      url: '/api/v1/templates/unknown-id/clone',
      payload: {},
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().success).toBe(false)
    await notFound.close()
  })

  it('returns 400 when user has no workspace', async () => {
    const noWorkspace = buildApp({
      workspaceFindFirst: vi.fn().mockResolvedValue(null),
    })
    await noWorkspace.ready()
    const res = await noWorkspace.inject({
      method: 'POST',
      url: '/api/v1/templates/tmpl-1/clone',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NO_WORKSPACE')
    await noWorkspace.close()
  })
})

// ── POST /api/v1/templates/:id/rate ──────────────────────────────────────────
describe('POST /api/v1/templates/:id/rate', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  it('stores rating and returns avgRating and ratingCount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/tmpl-1/rate',
      payload: { rating: 4 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('avgRating')
    expect(body.data).toHaveProperty('ratingCount')
  })

  it('returns calculated avg rating', async () => {
    const twoRatings = buildApp({
      ratingsFindMany: vi.fn().mockResolvedValue([
        { id: 'r1', rating: 4, templateId: 'tmpl-1', userId: 'user-1', createdAt: new Date() },
        { id: 'r2', rating: 5, templateId: 'tmpl-1', userId: 'user-2', createdAt: new Date() },
      ]),
    })
    await twoRatings.ready()

    const res = await twoRatings.inject({
      method: 'POST',
      url: '/api/v1/templates/tmpl-1/rate',
      payload: { rating: 5 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.ratingCount).toBe(2)
    expect(body.data.avgRating).toBe('4.50')
    await twoRatings.close()
  })

  it('returns 400 for rating below 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/tmpl-1/rate',
      payload: { rating: 0 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().success).toBe(false)
  })

  it('returns 400 for rating above 5', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/tmpl-1/rate',
      payload: { rating: 6 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().success).toBe(false)
  })

  it('returns 404 for unknown template', async () => {
    const notFound = buildApp({
      templatesFindFirst: vi.fn().mockResolvedValue(null),
    })
    await notFound.ready()
    const res = await notFound.inject({
      method: 'POST',
      url: '/api/v1/templates/unknown-id/rate',
      payload: { rating: 4 },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().success).toBe(false)
    await notFound.close()
  })
})

// ── POST /api/v1/templates/suggest ───────────────────────────────────────────
describe('POST /api/v1/templates/suggest', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  it('returns matching templates for description', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/suggest',
      payload: { description: 'react counter hooks simple' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
  })

  it('returns top 3 templates max', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/suggest',
      payload: { description: 'react counter hooks simple' },
    })
    const body = res.json()
    expect(body.data.length).toBeLessThanOrEqual(3)
  })

  it('returns empty array for no matches', async () => {
    const noMatch = buildApp({
      templatesFindMany: vi.fn().mockResolvedValue(mockTemplates),
    })
    await noMatch.ready()

    const res = await noMatch.inject({
      method: 'POST',
      url: '/api/v1/templates/suggest',
      payload: { description: 'angular postgresql kubernetes microservices' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(0)
    await noMatch.close()
  })

  it('returns only name, slug, description, category, framework', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/suggest',
      payload: { description: 'react starter' },
    })
    const body = res.json()
    if (body.data.length > 0) {
      const keys = Object.keys(body.data[0])
      expect(keys).toContain('name')
      expect(keys).toContain('slug')
      expect(keys).toContain('description')
      expect(keys).toContain('category')
      expect(keys).toContain('framework')
    }
  })

  it('returns 400 for missing description', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates/suggest',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().success).toBe(false)
  })
})

// ── GET /api/v1/users/me/onboarding ──────────────────────────────────────────
describe('GET /api/v1/users/me/onboarding', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  it('returns onboarding state', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users/me/onboarding' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('completed')
    expect(body.data).toHaveProperty('step')
  })

  it('returns completed false and step 0 by default', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users/me/onboarding' })
    const body = res.json()
    expect(body.data.completed).toBe(false)
    expect(body.data.step).toBe(0)
  })

  it('returns updated state when user has progressed', async () => {
    const advancedApp = buildApp()
    const advancedUserMock = {
      ...mockUser,
      onboardingCompleted: false,
      onboardingStep: 3,
    }
    ;(advancedApp.db.query.users.findFirst as any).mockResolvedValue(advancedUserMock)
    await advancedApp.ready()

    const res = await advancedApp.inject({ method: 'GET', url: '/api/v1/users/me/onboarding' })
    const body = res.json()
    expect(body.data.step).toBe(3)
    await advancedApp.close()
  })
})

// ── POST /api/v1/users/me/onboarding ─────────────────────────────────────────
describe('POST /api/v1/users/me/onboarding', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  it('updates onboarding step', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding',
      payload: { step: 2 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('step')
  })

  it('updates completed flag to true', async () => {
    const completedApp = buildApp()
    const completedUser = { ...mockUser, onboardingCompleted: true, onboardingStep: 5 }
    ;(completedApp.db.query.users.findFirst as any).mockResolvedValue(completedUser)
    await completedApp.ready()

    const res = await completedApp.inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding',
      payload: { completed: true },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.completed).toBe(true)
    await completedApp.close()
  })

  it('updates both completed and step together', async () => {
    const bothApp = buildApp()
    const bothUser = { ...mockUser, onboardingCompleted: true, onboardingStep: 4 }
    ;(bothApp.db.query.users.findFirst as any).mockResolvedValue(bothUser)
    await bothApp.ready()

    const res = await bothApp.inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding',
      payload: { completed: true, step: 4 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    await bothApp.close()
  })

  it('returns 400 when neither completed nor step is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().success).toBe(false)
  })
})
