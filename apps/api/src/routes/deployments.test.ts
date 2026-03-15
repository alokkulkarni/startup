import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { deploymentRoutes } from './deployments.js'

vi.mock('../workers/deployWorker.js', () => ({
  DEPLOY_QUEUE: 'deploy',
  createDeployQueue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
  })),
  startDeployWorker: vi.fn(),
}))

vi.mock('../services/snapshot.js', () => ({
  restoreSnapshot: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/crypto.js', () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v.replace(/^enc:/, '')),
}))

const mockUser = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com', name: 'Test' }
const mockProject = { id: 'proj-1', workspaceId: 'ws-1', name: 'Test Project', status: 'active' }
const mockMember = { workspaceId: 'ws-1', userId: 'user-1', role: 'owner' }
const mockDeployment = {
  id: 'deploy-1',
  projectId: 'proj-1',
  provider: 'vercel',
  status: 'pending',
  providerId: null,
  deployUrl: null,
  errorMessage: null,
  snapshotId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
const mockEnvVar = {
  id: 'env-1',
  projectId: 'proj-1',
  key: 'MY_KEY',
  valueEnc: 'enc:secret',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function makeSelectChain(result: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.from = vi.fn().mockReturnValue(chain)
  chain.where = vi.fn().mockReturnValue(chain)
  chain.orderBy = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockResolvedValue(result)
  return chain
}

function buildApp() {
  const app = Fastify({ logger: false })
  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com' }
  })
  app.decorate('db', {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(mockUser) },
      projects: { findFirst: vi.fn().mockResolvedValue(mockProject) },
      workspaceMembers: { findFirst: vi.fn().mockResolvedValue(mockMember) },
      deployments: { findFirst: vi.fn().mockResolvedValue(mockDeployment) },
      projectEnvVars: { findFirst: vi.fn().mockResolvedValue(null) },
    },
    select: vi.fn().mockReturnValue(makeSelectChain([mockDeployment])),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockDeployment]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as any)
  app.decorate('redis', {} as any)
  return app
}

// ── Test 1: POST /:id/deployments → 202 queues deploy job ────────────────────
describe('POST /api/v1/projects/:id/deployments', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(deploymentRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 202 and queues a deploy job', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-1/deployments',
      payload: { provider: 'vercel' },
    })
    expect(res.statusCode).toBe(202)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.deployment).toBeDefined()
    expect(body.data.deployment.provider).toBe('vercel')
  })
})

// ── Test 2: GET /:id/deployments → 200 returns deployment list ───────────────
describe('GET /api/v1/projects/:id/deployments', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    // Override select chain to return a deployment list
    ;(app as any).db.select = vi.fn().mockReturnValue(makeSelectChain([mockDeployment]))
    await app.register(deploymentRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 200 with deployment list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/proj-1/deployments',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.deployments)).toBe(true)
  })
})

// ── Test 3: PUT /:id/env/MY_KEY → 200 stores encrypted env var ───────────────
describe('PUT /api/v1/projects/:id/env/:key', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    await app.register(deploymentRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 200 and stores encrypted env var', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/projects/proj-1/env/MY_KEY',
      payload: { value: 'super-secret-value' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.key).toBe('MY_KEY')
  })
})

// ── Test 4: GET /:id/env → 200 returns key names only ────────────────────────
describe('GET /api/v1/projects/:id/env', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    // Return env var rows without valueEnc
    ;(app as any).db.select = vi.fn().mockReturnValue(
      makeSelectChain([{ id: 'env-1', key: 'MY_KEY', updatedAt: new Date().toISOString() }]),
    )
    await app.register(deploymentRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 200 with key names only and no values', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/proj-1/env',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.envVars)).toBe(true)
    const envVar = body.data.envVars[0]
    expect(envVar.key).toBeDefined()
    expect(envVar.valueEnc).toBeUndefined()
    expect(envVar.value).toBeUndefined()
  })
})

// ── Test 5: DELETE /:id/env/MY_KEY → 204 removes env var ─────────────────────
describe('DELETE /api/v1/projects/:id/env/:key', () => {
  let app: ReturnType<typeof buildApp>
  beforeAll(async () => {
    app = buildApp()
    // Return an existing env var so it can be deleted
    ;(app as any).db.query.projectEnvVars.findFirst = vi.fn().mockResolvedValue(mockEnvVar)
    await app.register(deploymentRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 204 and removes the env var', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/proj-1/env/MY_KEY',
    })
    expect(res.statusCode).toBe(204)
  })
})
