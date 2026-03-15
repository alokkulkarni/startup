import type { PlanTier } from './auth'

export interface Subscription {
  id: string
  workspaceId: string
  plan: PlanTier
  status: SubscriptionStatus
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
}

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'

export interface PlanLimits {
  plan: PlanTier
  aiMessagesPerDay: number
  projectsMax: number
  teamMembersMax: number
  deploymentsPerMonth: number
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { plan: 'free', aiMessagesPerDay: 50, projectsMax: 3, teamMembersMax: 1, deploymentsPerMonth: 10 },
  pro: { plan: 'pro', aiMessagesPerDay: 500, projectsMax: 20, teamMembersMax: 1, deploymentsPerMonth: 100 },
  team: { plan: 'team', aiMessagesPerDay: 2000, projectsMax: 100, teamMembersMax: 10, deploymentsPerMonth: 500 },
  enterprise: { plan: 'enterprise', aiMessagesPerDay: -1, projectsMax: -1, teamMembersMax: -1, deploymentsPerMonth: -1 },
}

// Re-export PlanTier from auth
export type { PlanTier } from './auth'
