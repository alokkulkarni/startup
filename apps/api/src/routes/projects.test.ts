import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { projectRoutes } from './projects.js'

const mockProject = {
  id: 'proj-uuid-001',
  workspaceId: 'ws-uuid-001',
  name: 'My Test App',
  framework: 'react',
  description: null,
  status: 'active',
  thumbnail: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUser = { id: 'user-uuid-001', keycloakId: 'kc-001', email: 'test@forge.local', name: 'Test' }
const mockMembership = { workspaceId: 'ws-uuid-001', userId: 'user-uuid-001', role: 'owner', workspace: { id: 'ws-uuid-001', name: 'Test WS' } }

function buildApp() {
  const app = Fastify()
  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: '', keycloakId: 'kc-001', email: 'test@forge.local', name: 'Test', roles: ['user'] }
  })
  app.decorate('db', {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(mockUser) },
      workspaceMembers: { findFirst: vi.fn().mockResolvedValue(mockMembership), findMany: vi.fn().mockResolvedValue([mockMembership]) },
      projects: { findFirst: vi.fn().mockResolvedValue(mockProject), findMany: vi.fn().mockResolvedValue([mockProject]) },
      projectFiles: { findMany: vi.fn().mockResolvedValue([]) },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockProject]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockProject, name: 'Renamed App' }]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as any)
  app.decorate('redis', {} as any)
  app.decorate('storage', {} as any)
  return app
}

describe('POST /api/v1/projects', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(projectRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('creates a project and returns 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/projects',
      payload: { name: 'My Test App', framework: 'react' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.name).toBe('My Test App')
  })

  it('rejects empty name', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/projects',
      payload: { name: '', framework: 'react' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/v1/projects', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(projectRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns project list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/projects' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().data)).toBe(true)
  })
})

describe('DELETE /api/v1/projects/:id', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(projectRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('soft-deletes a project', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/projects/proj-uuid-001' })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })
})

describe('POST /api/v1/projects/:id/duplicate', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(projectRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('duplicates a project and returns 201', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/projects/proj-uuid-001/duplicate' })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
  })
})
