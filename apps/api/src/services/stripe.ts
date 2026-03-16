import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/postgres-js'
import type * as schema from '../db/schema.js'
import { subscriptions } from '../db/schema.js'

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

export const PLAN_LIMITS = {
  free:       { aiRequestsPerDay: 20,   maxProjects: 3,   maxFilesPerProject: 20   },
  pro:        { aiRequestsPerDay: 300,  maxProjects: 50,  maxFilesPerProject: 200  },
  team:       { aiRequestsPerDay: 1500, maxProjects: 999, maxFilesPerProject: 999  },
  enterprise: { aiRequestsPerDay: -1,   maxProjects: -1,  maxFilesPerProject: -1   },
}

export const STRIPE_PRICE_IDS = {
  pro_monthly:  process.env.STRIPE_PRO_MONTHLY_PRICE_ID  || 'price_pro_monthly',
  pro_yearly:   process.env.STRIPE_PRO_YEARLY_PRICE_ID   || 'price_pro_yearly',
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly',
  team_yearly:  process.env.STRIPE_TEAM_YEARLY_PRICE_ID  || 'price_team_yearly',
}

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

export async function getOrCreateCustomer(
  stripe: Stripe,
  userId: string,
  email: string,
): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data.length > 0) return existing.data[0].id
  const customer = await stripe.customers.create({ email, metadata: { userId } })
  return customer.id
}

export async function createCheckoutSession(
  stripe: Stripe,
  opts: {
    customerId: string
    priceId: string
    userId: string
    workspaceId: string
    successUrl: string
    cancelUrl: string
  },
): Promise<{ url: string }> {
  const session = await stripe.checkout.sessions.create({
    customer: opts.customerId,
    payment_method_types: ['card'],
    line_items: [{ price: opts.priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { userId: opts.userId, workspaceId: opts.workspaceId },
  })
  if (!session.url) throw new Error('No checkout URL returned from Stripe')
  return { url: session.url }
}

export async function createPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return { url: session.url }
}

export async function getUserPlanLimit(db: DrizzleDB, userId: string): Promise<number> {
  try {
    const member = await db.query.workspaceMembers.findFirst({
      where: (m, { eq }) => eq(m.userId, userId),
    })
    if (!member) return PLAN_LIMITS.free.aiRequestsPerDay

    const sub = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.workspaceId, member.workspaceId),
    })
    if (!sub) return PLAN_LIMITS.free.aiRequestsPerDay

    const tier = (sub.planTier ?? sub.plan ?? 'free') as keyof typeof PLAN_LIMITS
    return (PLAN_LIMITS[tier] ?? PLAN_LIMITS.free).aiRequestsPerDay
  } catch {
    return PLAN_LIMITS.free.aiRequestsPerDay
  }
}

function getPlanTierFromPriceId(priceId: string): string {
  const { pro_monthly, pro_yearly, team_monthly, team_yearly } = STRIPE_PRICE_IDS
  if ([pro_monthly, pro_yearly].includes(priceId)) return 'pro'
  if ([team_monthly, team_yearly].includes(priceId)) return 'team'
  return 'free'
}

export async function processWebhookEvent(db: DrizzleDB, event: Stripe.Event): Promise<void> {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-06-20' }) : null

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const workspaceId = session.metadata?.workspaceId
      if (!workspaceId) return

      const customerId =
        typeof session.customer === 'string' ? session.customer : (session.customer as Stripe.Customer)?.id
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription)?.id

      if (!customerId || !subscriptionId) return

      let planTier = 'pro'
      let priceId: string | undefined
      let periodStart: Date | undefined
      let periodEnd: Date | undefined

      if (stripe) {
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)
        priceId = stripeSub.items.data[0]?.price.id
        planTier = getPlanTierFromPriceId(priceId ?? '')
        periodStart = new Date(stripeSub.current_period_start * 1000)
        periodEnd = new Date(stripeSub.current_period_end * 1000)
      }

      await (db as any)
        .update(subscriptions)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          ...(priceId ? { stripePriceId: priceId } : {}),
          planTier,
          plan: planTier,
          status: 'active',
          ...(periodStart ? { periodStart } : {}),
          ...(periodEnd ? { periodEnd, currentPeriodEnd: periodEnd } : {}),
        })
        .where(eq(subscriptions.workspaceId, workspaceId))
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id
      const planTier = getPlanTierFromPriceId(priceId ?? '')

      await (db as any)
        .update(subscriptions)
        .set({
          status: sub.status,
          planTier,
          plan: planTier,
          stripePriceId: priceId,
          periodStart: new Date(sub.current_period_start * 1000),
          periodEnd: new Date(sub.current_period_end * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id))
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await (db as any)
        .update(subscriptions)
        .set({ status: 'canceled', planTier: 'free', plan: 'free', cancelAtPeriodEnd: false })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id))
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as Stripe.Subscription)?.id
      if (subId) {
        await (db as any)
          .update(subscriptions)
          .set({ status: 'past_due' })
          .where(eq(subscriptions.stripeSubscriptionId, subId))
      }
      break
    }
  }
}
