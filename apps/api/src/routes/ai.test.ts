import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { aiRoutes } from './ai.js'
import { streamAIResponse } from '../services/ai.js'

vi.mock('../services/ai.js', () => ({
  streamAIResponse: vi.fn(),
}))
vi.mock('../services/context.js', () => ({
  buildSystemPrompt: vi.fn().mockResolvedValue('You are Forge AI, expert developer...'),
  getConversationHistory: vi.fn().mockResolvedValue([]),
}))
vi.mock('../services/diff.js', () => ({
  parseAIResponse: vi.fn().mockReturnValue({ explanation: '', diffs: [] }),
  applyDiffs: vi.fn().mockResolvedValue(undefined),
}))

const mockUser = {
  id: 'user-uuid-001',
  keycloakId: 'kc-001',
  email: 'test@forge.local',
  name: 'Test User',
}
const mockProject = {
  id: 'proj-uuid-001',
  workspaceId: 'ws-uuid-001',
  name: 'My Test App',
  status: 'active',
}
const mockMembership = {
  id: 'mem-uuid-001',
  workspaceId: 'ws-uuid-001',
  userId: 'user-uuid-001',
  role: 'owner',
}
const mockConversation = {
  id: 'conv-uuid-001',
  projectId: 'proj-uuid-001',
  createdAt: new Date(),
}
const mockMessages = [
  { id: 'msg-1', conversationId: 'conv-uuid-001', role: 'user', content: 'Hello', createdAt: new Date() },
  { id: 'msg-2', conversationId: 'conv-uuid-001', role: 'assistant', content: 'Hi!', createdAt: new Date() },
]

interface BuildAppOptions {
  workspaceMemberResult?: object | null
  redisIncrReturn?: number
}

function buildApp({ workspaceMemberResult = mockMembership, redisIncrReturn = 1 }: BuildAppOptions = {}) {
  const app = Fastify({ logger: false })

  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: '', keycloakId: 'kc-001', email: 'test@forge.local', name: 'Test', roles: ['user'] }
  })

  app.decorate('redis', {
    incr: vi.fn().mockResolvedValue(redisIncrReturn),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(86400),
  } as any)

  app.decorate('db', {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(mockUser) },
      projects: { findFirst: vi.fn().mockResolvedValue(mockProject) },
      workspaceMembers: { findFirst: vi.fn().mockResolvedValue(workspaceMemberResult) },
      aiConversations: { findFirst: vi.fn().mockResolvedValue(mockConversation) },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockConversation]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockMessages),
          }),
        }),
      }),
    }),
  } as any)

  app.decorate('storage', {} as any)

  return app
}

// ── POST /chat: streams SSE ───────────────────────────────────────────────────
describe('POST /:id/ai/chat — SSE stream', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.register(aiRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })

  afterAll(() => app.close())

  it('saves user message and streams SSE response with text and done chunks', async () => {
    vi.mocked(streamAIResponse).mockImplementationOnce(async function* () {
      yield { type: 'text' as const, text: 'Hello' }
      yield { type: 'text' as const, text: ' World' }
      yield { type: 'done' as const, usage: { inputTokens: 10, outputTokens: 20 } }
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/ai/chat',
      payload: { prompt: 'Build me a landing page' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    expect(res.body).toContain('"type":"text"')
    expect(res.body).toContain('Hello')
    expect(res.body).toContain('"type":"done"')
  })

  it('returns 400 for empty prompt', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/ai/chat',
      payload: { prompt: '' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.success).toBe(false)
  })
})

// ── POST /chat: rate limiting ─────────────────────────────────────────────────
describe('POST /:id/ai/chat — rate limiting', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ redisIncrReturn: 51 })
    await app.register(aiRoutes, { prefix: '/api/v1/projects' })
    await app.ready()
  })

  afterAll(() => app.close())

  it('returns 429 when daily limit exceeded', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/ai/chat',
      payload: { prompt: 'Do something' },
    })

    expect(res.statusCode).toBe(429)
    expect(res.headers['x-ratelimit-remaining']).toBe('0')
    const body = res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})

// ── GET /history ──────────────────────────────────────────────────────────────
describe('GET /:id/ai/history', () => {
  it('returns messages array and conversationId', async () => {
    const app = buildApp()
    await app.register(aiRoutes, { prefix: '/api/v1/projects' })
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/proj-uuid-001/ai/history',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.messages)).toBe(true)
    expect(body.conversationId).toBe('conv-uuid-001')

    await app.close()
  })

  it('returns 404 for project not owned by user', async () => {
    const app = buildApp({ workspaceMemberResult: null })
    await app.register(aiRoutes, { prefix: '/api/v1/projects' })
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/proj-uuid-001/ai/history',
    })

    expect(res.statusCode).toBe(404)
    const body = res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('PROJECT_NOT_FOUND')

    await app.close()
  })
})
