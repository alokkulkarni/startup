import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { healthRoutes } from './health.js'

describe('GET /api/v1/health', () => {
  const app = Fastify()

  beforeAll(async () => {
    // Minimal mocks for health check — pg is a tagged template literal function
    const pgMock = (_strings: TemplateStringsArray, ..._values: unknown[]) =>
      Promise.resolve([{ '?column?': 1 }])
    app.decorate('pg', pgMock as any)
    app.decorate('redis', { ping: async () => 'PONG' } as any)
    await app.register(healthRoutes, { prefix: '/api/v1' })
    await app.ready()
  })

  afterAll(() => app.close())

  it('returns 200 with status ok when all services healthy', async () => {
    const resp = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    })
    expect(resp.statusCode).toBe(200)
    const body = resp.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
    expect(body.services).toBeDefined()
  })

  it('returns valid health schema', async () => {
    const resp = await app.inject({ method: 'GET', url: '/api/v1/health' })
    const body = resp.json()
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('version')
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('services')
    expect(body.services).toHaveProperty('database')
    expect(body.services).toHaveProperty('redis')
  })
})
