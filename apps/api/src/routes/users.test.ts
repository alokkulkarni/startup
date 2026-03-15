import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { userRoutes } from './users.js'

const mockUser = {
  id: 'test-uuid-001',
  keycloakId: 'kc-sub-001',
  email: 'test@forge.local',
  name: 'Test User',
  avatarUrl: null,
  plan: 'free',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function buildApp() {
  const app = Fastify()

  app.decorate('verifyAuth', async (req: any) => {
    req.user = {
      id: '',
      keycloakId: 'kc-sub-001',
      email: 'test@forge.local',
      name: 'Test User',
      roles: ['user'],
    }
  })

  app.decorate('db', {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(mockUser),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    }),
  } as any)

  app.decorate('redis', { set: vi.fn().mockResolvedValue('OK') } as any)

  return app
}

describe('GET /api/v1/users/me', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.register(userRoutes, { prefix: '/api/v1/users' })
    await app.ready()
  })

  afterAll(() => app.close())

  it('returns the current user', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users/me' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.email).toBe('test@forge.local')
  })
})

describe('PATCH /api/v1/users/me', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.register(userRoutes, { prefix: '/api/v1/users' })
    await app.ready()
  })

  afterAll(() => app.close())

  it('updates user name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      payload: { name: 'Updated Name' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
  })

  it('rejects empty name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      payload: { name: '' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('DELETE /api/v1/users/me', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.register(userRoutes, { prefix: '/api/v1/users' })
    await app.ready()
  })

  afterAll(() => app.close())

  it('soft-deletes the user and schedules cleanup', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/users/me' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.message).toContain('deactivated')
  })
})
