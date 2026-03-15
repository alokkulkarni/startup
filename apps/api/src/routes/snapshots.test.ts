import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { snapshotRoutes } from './snapshots.js'

vi.mock('../workers/snapshotCleanup.js', () => ({
  SNAPSHOT_CLEANUP_QUEUE: 'snapshot-cleanup',
  createSnapshotCleanupQueue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('../services/snapshot.js', () => ({
  createSnapshot: vi.fn().mockResolvedValue('snap-uuid-001'),
  restoreSnapshot: vi.fn().mockResolvedValue(undefined),
  pruneSnapshots: vi.fn().mockResolvedValue(undefined),
}))

const mockUser = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com', name: 'Test' }
const mockProject = { id: 'proj-1', workspaceId: 'ws-1', name: 'Test Project', status: 'active' }
const mockMember = { workspaceId: 'ws-1', userId: 'user-1', role: 'owner' }

function makeSelectChain(result: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.from = vi.fn().mockReturnValue(chain)
  chain.where = vi.fn().mockReturnValue(chain)
  chain.orderBy = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockResolvedValue(result)
  return chain
}

function buildApp(snapshotsResult: unknown[] = []) {
  const app = Fastify({ logger: false })
  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com', workspaceId: 'ws-1' }
  })
  app.decorate('db', {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(mockUser) },
      projects: { findFirst: vi.fn().mockResolvedValue(mockProject) },
      workspaceMembers: { findFirst: vi.fn().mockResolvedValue(mockMember) },
    },
    select: vi.fn().mockReturnValue(makeSelectChain(snapshotsResult)),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'snap-uuid-001' }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    transaction: vi.fn().mockImplementation(async (fn: (tx: any) => Promise<void>) => {
      await fn({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'snap-before' }]),
          }),
        }),
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      })
    }),
  } as any)
  app.decorate('redis', {} as any)
  return app
}

function buildNotFoundApp() {
  const app = Fastify({ logger: false })
  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com', workspaceId: 'ws-1' }
  })
  app.decorate('db', {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(mockUser) },
      projects: { findFirst: vi.fn().mockResolvedValue(undefined) },
      workspaceMembers: { findFirst: vi.fn().mockResolvedValue(undefined) },
    },
    select: vi.fn().mockReturnValue(makeSelectChain([])),
  } as any)
  app.decorate('redis', {} as any)
  return app
}

describe('GET /api/v1/projects/:id/snapshots — empty list', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp([])
    await app.register(snapshotRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 200 with empty snapshots array for new project', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/proj-1/snapshots',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.snapshots)).toBe(true)
    expect(body.data.snapshots).toHaveLength(0)
  })
})

describe('POST /api/v1/projects/:id/snapshots — manual snapshot', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(snapshotRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('creates a manual snapshot and returns 201 with id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-1/snapshots',
      payload: { label: 'Before refactor', description: 'Saving state before big refactor' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('snap-uuid-001')
  })
})

describe('POST /api/v1/projects/:id/snapshots/:snapshotId/restore', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(snapshotRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('restores a snapshot and returns 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-1/snapshots/snap-uuid-001/restore',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
  })
})

describe('GET /api/v1/projects/:id/snapshots — project not found', () => {
  let app: ReturnType<typeof buildNotFoundApp>
  beforeAll(async () => {
    app = buildNotFoundApp()
    await app.register(snapshotRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 404 for unknown project', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/unknown-proj/snapshots',
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().success).toBe(false)
  })
})

describe('POST /api/v1/projects/:id/snapshots — validation', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(snapshotRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 400 when label exceeds 100 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-1/snapshots',
      payload: { label: 'x'.repeat(101) },
    })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
