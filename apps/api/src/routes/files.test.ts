import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { fileRoutes } from './files.js'

function buildApp() {
  const app = Fastify({ logger: false })
  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com', workspaceId: 'ws-1' }
  })
  app.decorate('db', {
    query: {
      projects: { findFirst: vi.fn().mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' }) },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([{
          path: 'src/App.tsx',
          sizeBytes: 100,
          mimeType: 'application/typescript',
          updatedAt: new Date(),
        }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    }),
  } as any)
  app.decorate('pg', vi.fn().mockResolvedValue([]))
  app.decorate('redis', { incr: vi.fn(), expire: vi.fn(), ttl: vi.fn(), del: vi.fn() } as any)
  app.decorate('s3', {} as any)
  app.register(fileRoutes, { prefix: '/api/v1/projects' })
  return app.ready().then(() => app)
}

function buildAppProjectNotFound() {
  const app = Fastify({ logger: false })
  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com', workspaceId: 'ws-1' }
  })
  app.decorate('db', {
    query: {
      projects: { findFirst: vi.fn().mockResolvedValue(undefined) },
    },
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 0 }),
    }),
  } as any)
  app.decorate('pg', vi.fn().mockResolvedValue([]))
  app.decorate('redis', { incr: vi.fn(), expire: vi.fn(), ttl: vi.fn(), del: vi.fn() } as any)
  app.decorate('s3', {} as any)
  app.register(fileRoutes, { prefix: '/api/v1/projects' })
  return app.ready().then(() => app)
}

describe('PUT /api/v1/projects/:id/files/src/App.tsx', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => { app = await buildApp() })
  afterAll(() => app.close())

  it('returns 200 with path, sizeBytes, mimeType on valid content', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/projects/proj-1/files/src/App.tsx',
      payload: { content: 'export default function App() { return null }' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('path', 'src/App.tsx')
    expect(body).toHaveProperty('sizeBytes')
    expect(body).toHaveProperty('mimeType')
  })

  it('returns 400 when content exceeds 500_000 chars', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/projects/proj-1/files/src/App.tsx',
      payload: { content: 'x'.repeat(500_001) },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('DELETE /api/v1/projects/:id/files/src/App.tsx', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => { app = await buildApp() })
  afterAll(() => app.close())

  it('returns 204 on successful delete', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/proj-1/files/src/App.tsx',
    })
    expect(res.statusCode).toBe(204)
  })
})

describe('DELETE /api/v1/projects/:id/files/nonexistent.ts — project not found', () => {
  let app: Awaited<ReturnType<typeof buildAppProjectNotFound>>

  beforeAll(async () => { app = await buildAppProjectNotFound() })
  afterAll(() => app.close())

  it('returns 404 when project is not found', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/proj-999/files/nonexistent.ts',
    })
    expect(res.statusCode).toBe(404)
  })
})
