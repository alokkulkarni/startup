import type { FastifyInstance } from 'fastify'
import type Stripe from 'stripe'
import { z } from 'zod'
import { subscriptions } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import {
  getStripeClient,
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  processWebhookEvent,
  PLAN_LIMITS,
} from '../services/stripe.js'

const checkoutBodySchema = z.object({
  priceId: z.string().min(1, 'priceId is required'),
  successUrl: z.string().min(1, 'successUrl is required'),
  cancelUrl: z.string().min(1, 'cancelUrl is required'),
})

const portalBodySchema = z.object({
  returnUrl: z.string().optional(),
})

async function getDbUser(app: FastifyInstance, keycloakId: string) {
  return app.db.query.users.findFirst({
    where: (u, { eq }) => eq(u.keycloakId, keycloakId),
  })
}

export async function billingRoutes(app: FastifyInstance) {
  // POST /billing/checkout — Create Stripe checkout session
  app.post<{ Body: { priceId: string; successUrl: string; cancelUrl: string } }>(
    '/billing/checkout',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return

      const parsed = checkoutBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({
          error: parsed.error.errors[0].message,
        })
      }
      const { priceId, successUrl, cancelUrl } = parsed.data
      const workspaceId = (request.user as any).workspaceId as string
      const userId = request.user!.id
      const email = request.user!.email

      const stripe = getStripeClient()
      const customerId = await getOrCreateCustomer(stripe, userId, email)

      // Upsert subscription with the Stripe customer ID
      await (app.db as any)
        .insert(subscriptions)
        .values({ workspaceId, stripeCustomerId: customerId, plan: 'free', status: 'active' })
        .onConflictDoUpdate({
          target: subscriptions.workspaceId,
          set: { stripeCustomerId: customerId },
        })

      const session = await createCheckoutSession(stripe, {
        customerId,
        priceId,
        userId,
        workspaceId,
        successUrl,
        cancelUrl,
      })

      return reply.code(200).send({ url: session.url })
    },
  )

  // POST /billing/portal — Create Stripe billing portal session
  app.post<{ Body: { returnUrl?: string } }>(
    '/billing/portal',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return

      const workspaceId = (request.user as any).workspaceId as string
      const returnUrl = (request.body as any)?.returnUrl ?? (process.env.APP_URL ?? 'http://localhost')

      const sub = await app.db.query.subscriptions.findFirst({
        where: (s, { eq }) => eq(s.workspaceId, workspaceId),
      })

      if (!sub?.stripeCustomerId) {
        return reply.code(400).send({
          error: 'No Stripe customer found. Start a subscription first.',
        })
      }

      const stripe = getStripeClient()
      const session = await createPortalSession(stripe, sub.stripeCustomerId, returnUrl)

      return reply.code(200).send({ url: session.url })
    },
  )

  // POST /billing/webhook — Stripe webhook (no auth, raw body)
  app.post('/billing/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature']
    if (!sig) {
      return reply.code(400).send({ error: 'Missing Stripe-Signature header' })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    let event: Stripe.Event

    if (webhookSecret) {
      const stripe = getStripeClient()
      const rawBody = (request as any).rawBody ?? JSON.stringify(request.body)
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret)
      } catch {
        return reply.code(400).send({ error: 'Invalid webhook signature' })
      }
    } else {
      // Dev/test: skip signature verification
      event = request.body as Stripe.Event
    }

    await processWebhookEvent(app.db, event)
    return reply.code(200).send({ received: true })
  })

  // GET /billing/subscription — Current subscription info
  app.get('/billing/subscription', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return

    const workspaceId = (request.user as any).workspaceId as string

    const sub = await app.db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, workspaceId),
    })

    const tier = ((sub?.planTier ?? sub?.plan ?? 'free') as string) as keyof typeof PLAN_LIMITS
    const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.free
    const periodEnd = sub?.periodEnd?.toISOString() ?? sub?.currentPeriodEnd?.toISOString() ?? null

    return reply.code(200).send({
      tier,
      status: sub?.status ?? 'active',
      periodEnd,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      limits,
    })
  })

  // GET /billing/usage — Current AI usage today
  app.get('/billing/usage', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return

    const dbUser = await getDbUser(app, request.user!.keycloakId)
    if (!dbUser) {
      return reply.code(404).send({ error: 'User not found. Call /auth/sync first.' })
    }

    const rateLimitKey = `ratelimit:ai:${dbUser.id}`
    const [usedStr, ttl] = await Promise.all([
      app.redis.get(rateLimitKey),
      app.redis.ttl(rateLimitKey),
    ])
    const used = usedStr ? parseInt(usedStr, 10) : 0

    const workspaceId = (request.user as any).workspaceId as string
    const sub = await app.db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, workspaceId),
    })

    const tier = ((sub?.planTier ?? sub?.plan ?? 'free') as string) as keyof typeof PLAN_LIMITS
    const limit = (PLAN_LIMITS[tier] ?? PLAN_LIMITS.free).aiRequestsPerDay

    const resetAt =
      typeof ttl === 'number' && ttl > 0
        ? new Date(Date.now() + ttl * 1000).toISOString()
        : new Date(Date.now() + 86400 * 1000).toISOString()

    return reply.code(200).send({ used, limit, tier, resetAt })
  })
}
