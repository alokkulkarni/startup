import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import Fastify from 'fastify'
import { billingRoutes } from './billing.js'
import {
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  processWebhookEvent,
  PLAN_LIMITS,
} from '../services/stripe.js'

vi.mock('../services/stripe.js', () => ({
  getStripeClient: vi.fn(() => ({})),
  getOrCreateCustomer: vi.fn(async () => 'cus_test123'),
  createCheckoutSession: vi.fn(async () => ({ url: 'https://checkout.stripe.com/test' })),
  createPortalSession: vi.fn(async () => ({ url: 'https://billing.stripe.com/test' })),
  processWebhookEvent: vi.fn(async () => {}),
  getUserPlanLimit: vi.fn(async () => 50),
  PLAN_LIMITS: {
    free: { aiRequestsPerDay: 50,   maxProjects: 3,   maxFilesPerProject: 20  },
    pro:  { aiRequestsPerDay: 500,  maxProjects: 50,  maxFilesPerProject: 200 },
    team: { aiRequestsPerDay: 2000, maxProjects: 999, maxFilesPerProject: 999 },
  },
  STRIPE_PRICE_IDS: { pro_monthly: 'price_pro_monthly' },
}))

const mockUser = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com', name: 'Test' }

const mockSubFree = {
  id: 'sub-1',
  workspaceId: 'ws-1',
  plan: 'free',
  planTier: 'free',
  status: 'active',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  periodEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

const mockSubPro = {
  id: 'sub-2',
  workspaceId: 'ws-1',
  plan: 'pro',
  planTier: 'pro',
  status: 'active',
  stripeCustomerId: 'cus_test123',
  stripeSubscriptionId: 'sub_stripe_123',
  periodEnd: new Date('2025-12-31T00:00:00.000Z'),
  currentPeriodEnd: new Date('2025-12-31T00:00:00.000Z'),
  cancelAtPeriodEnd: false,
}

const mockSubTeam = {
  id: 'sub-3',
  workspaceId: 'ws-1',
  plan: 'team',
  planTier: 'team',
  status: 'active',
  stripeCustomerId: 'cus_team123',
  stripeSubscriptionId: 'sub_team_123',
  periodEnd: new Date('2025-12-31T00:00:00.000Z'),
  currentPeriodEnd: new Date('2025-12-31T00:00:00.000Z'),
  cancelAtPeriodEnd: true,
}

interface BuildAppOpts {
  subscription?: object | null
  redisUsed?: string | null
  redisTtl?: number
}

function buildApp(opts: BuildAppOpts = {}) {
  const app = Fastify({ logger: false })

  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-1', keycloakId: 'kc-1', email: 'test@test.com', workspaceId: 'ws-1' }
  })

  app.decorate('db', {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(mockUser) },
      subscriptions: {
        findFirst: vi.fn().mockResolvedValue(opts.subscription !== undefined ? opts.subscription : null),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as any)

  app.decorate('redis', {
    get: vi.fn().mockResolvedValue(opts.redisUsed ?? null),
    ttl: vi.fn().mockResolvedValue(opts.redisTtl ?? 3600),
  } as any)

  return app
}

// ── POST /billing/checkout ────────────────────────────────────────────────────
describe('POST /api/v1/billing/checkout', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with checkout URL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      payload: { priceId: 'price_pro_monthly', successUrl: 'https://app.example.com/success', cancelUrl: 'https://app.example.com/cancel' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().url).toBe('https://checkout.stripe.com/test')
  })

  it('returns 400 when priceId is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      payload: { successUrl: 'https://app.example.com/success', cancelUrl: 'https://app.example.com/cancel' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when successUrl is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      payload: { priceId: 'price_pro_monthly', cancelUrl: 'https://app.example.com/cancel' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when cancelUrl is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      payload: { priceId: 'price_pro_monthly', successUrl: 'https://app.example.com/success' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('calls getOrCreateCustomer with user email', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      payload: { priceId: 'price_pro_monthly', successUrl: 'https://app.example.com/success', cancelUrl: 'https://app.example.com/cancel' },
    })
    expect(getOrCreateCustomer).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'test@test.com',
    )
  })

  it('calls createCheckoutSession with correct priceId', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      payload: { priceId: 'price_pro_monthly', successUrl: 'https://app.example.com/success', cancelUrl: 'https://app.example.com/cancel' },
    })
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ priceId: 'price_pro_monthly', customerId: 'cus_test123' }),
    )
  })

  it('returns exact URL from createCheckoutSession mock', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      payload: { priceId: 'price_pro_monthly', successUrl: 'https://app.example.com/success', cancelUrl: 'https://app.example.com/cancel' },
    })
    expect(res.json()).toEqual({ url: 'https://checkout.stripe.com/test' })
  })
})

// ── POST /billing/portal — no subscription ────────────────────────────────────
describe('POST /api/v1/billing/portal — no subscription', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ subscription: null })
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 400 when no subscription record exists', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/billing/portal', payload: {} })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/no stripe customer/i)
  })
})

// ── POST /billing/portal — subscription without customer ────────────────────
describe('POST /api/v1/billing/portal — subscription without stripeCustomerId', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ subscription: { ...mockSubFree, stripeCustomerId: null } })
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns 400 when subscription has no stripeCustomerId', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/billing/portal', payload: {} })
    expect(res.statusCode).toBe(400)
  })
})

// ── POST /billing/portal — with customer ─────────────────────────────────────
describe('POST /api/v1/billing/portal — with customer', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ subscription: mockSubPro })
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with portal URL', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/billing/portal', payload: {} })
    expect(res.statusCode).toBe(200)
    expect(res.json().url).toBe('https://billing.stripe.com/test')
  })

  it('calls createPortalSession with correct customerId', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/billing/portal', payload: {} })
    expect(createPortalSession).toHaveBeenCalledWith(
      expect.anything(),
      'cus_test123',
      expect.any(String),
    )
  })

  it('returns exact URL from createPortalSession mock', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/billing/portal', payload: {} })
    expect(res.json()).toEqual({ url: 'https://billing.stripe.com/test' })
  })
})

// ── POST /billing/webhook ─────────────────────────────────────────────────────
describe('POST /api/v1/billing/webhook', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when Stripe-Signature header is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload: { type: 'checkout.session.completed', data: { object: {} } },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/missing stripe-signature/i)
  })

  it('returns 200 with { received: true } when signature present', async () => {
    const testEvent = { type: 'checkout.session.completed', data: { object: {} } }
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload: testEvent,
      headers: { 'Stripe-Signature': 'test_sig_value' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ received: true })
  })

  it('calls processWebhookEvent with event body', async () => {
    const testEvent = { type: 'customer.subscription.updated', data: { object: { id: 'sub_123' } } }
    await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload: testEvent,
      headers: { 'Stripe-Signature': 'test_sig_value' },
    })
    expect(processWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'customer.subscription.updated' }),
    )
  })

  it('does NOT call processWebhookEvent when signature header missing', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload: { type: 'checkout.session.completed' },
    })
    expect(processWebhookEvent).not.toHaveBeenCalled()
  })

  it('returns 200 received:true for subscription.deleted event', async () => {
    const testEvent = { type: 'customer.subscription.deleted', data: { object: { id: 'sub_123' } } }
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload: testEvent,
      headers: { 'Stripe-Signature': 'test_sig_value' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().received).toBe(true)
  })
})

// ── GET /billing/subscription — no subscription ───────────────────────────────
describe('GET /api/v1/billing/subscription — no subscription', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ subscription: null })
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns free tier defaults when no subscription exists', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.statusCode).toBe(200)
    expect(res.json().tier).toBe('free')
  })

  it('includes correct free tier limits', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.json().limits).toEqual(PLAN_LIMITS.free)
  })

  it('returns status active by default', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.json().status).toBe('active')
  })
})

// ── GET /billing/subscription — pro subscription ──────────────────────────────
describe('GET /api/v1/billing/subscription — pro subscription', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ subscription: mockSubPro })
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns pro tier', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.statusCode).toBe(200)
    expect(res.json().tier).toBe('pro')
  })

  it('returns pro limits', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.json().limits).toEqual(PLAN_LIMITS.pro)
  })

  it('returns periodEnd as ISO string', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.json().periodEnd).toBe('2025-12-31T00:00:00.000Z')
  })

  it('returns cancelAtPeriodEnd value', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.json().cancelAtPeriodEnd).toBe(false)
  })
})

// ── GET /billing/subscription — team subscription ────────────────────────────
describe('GET /api/v1/billing/subscription — team subscription', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ subscription: mockSubTeam })
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns team tier', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.json().tier).toBe('team')
  })

  it('returns team limits', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/subscription' })
    expect(res.json().limits).toEqual(PLAN_LIMITS.team)
  })
})

// ── GET /billing/usage — no usage ─────────────────────────────────────────────
describe('GET /api/v1/billing/usage — no prior usage', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ subscription: null, redisUsed: null, redisTtl: -1 })
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns used:0 when no Redis key', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/usage' })
    expect(res.statusCode).toBe(200)
    expect(res.json().used).toBe(0)
  })

  it('returns correct free tier limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/usage' })
    expect(res.json().limit).toBe(50)
  })

  it('returns resetAt as a valid ISO date string', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/usage' })
    const { resetAt } = res.json()
    expect(typeof resetAt).toBe('string')
    expect(() => new Date(resetAt)).not.toThrow()
    expect(new Date(resetAt).toISOString()).toBe(resetAt)
  })
})

// ── GET /billing/usage — with usage and pro tier ─────────────────────────────
describe('GET /api/v1/billing/usage — with usage (pro)', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp({ subscription: mockSubPro, redisUsed: '42', redisTtl: 3600 })
    await app.register(billingRoutes, { prefix: '/api/v1' })
    await app.ready()
  })
  afterAll(() => app.close())

  it('returns used count from Redis', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/usage' })
    expect(res.json().used).toBe(42)
  })

  it('returns correct pro tier limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/usage' })
    expect(res.json().limit).toBe(500)
  })

  it('returns correct tier name', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/billing/usage' })
    expect(res.json().tier).toBe('pro')
  })
})
