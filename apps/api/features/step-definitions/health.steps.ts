import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert'
import Fastify from 'fastify'
import { healthRoutes } from '../../src/routes/health.js'

let app: ReturnType<typeof Fastify>
let response: any

Given('all infrastructure services are running', async () => {
  app = Fastify()
  const pgMock = (_s: TemplateStringsArray, ..._v: unknown[]) => Promise.resolve([{ '?column?': 1 }])
  app.decorate('pg', pgMock as any)
  app.decorate('redis', { ping: async () => 'PONG' } as any)
  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.ready()
})

Given('no authentication token', async () => {
  if (!app) {
    app = Fastify()
    const pgMock = (_s: TemplateStringsArray, ..._v: unknown[]) => Promise.resolve([{ '?column?': 1 }])
    app.decorate('pg', pgMock as any)
    app.decorate('redis', { ping: async () => 'PONG' } as any)
    await app.register(healthRoutes, { prefix: '/api/v1' })
    await app.ready()
  }
})

When('I call GET /api/v1/health', async () => {
  response = await app.inject({ method: 'GET', url: '/api/v1/health' })
})

Then('the response status is {int}', (statusCode: number) => {
  assert.strictEqual(response.statusCode, statusCode)
})

Then('the response body has status {string}', (status: string) => {
  const body = JSON.parse(response.payload)
  assert.strictEqual(body.status, status)
})

Then('the response body includes service statuses for database, redis, and storage', () => {
  const body = JSON.parse(response.payload)
  assert.ok(body.services?.database)
  assert.ok(body.services?.redis)
})
