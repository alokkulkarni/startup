'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'team'
  status: string
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  limits: {
    aiRequestsPerDay: number
    maxProjects: number
    maxFilesPerProject: number
  }
}

export interface UsageInfo {
  used: number
  limit: number
  tier: string
  resetAt: string
}

const DEFAULT_FREE_SUBSCRIPTION: SubscriptionInfo = {
  tier: 'free',
  status: 'active',
  periodEnd: null,
  cancelAtPeriodEnd: false,
  limits: {
    aiRequestsPerDay: 50,
    maxProjects: 3,
    maxFilesPerProject: 20,
  },
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<SubscriptionInfo>('/v1/billing/subscription')
      setSubscription(res.data ?? DEFAULT_FREE_SUBSCRIPTION)
    } catch (err) {
      setSubscription(DEFAULT_FREE_SUBSCRIPTION)
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsage = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<UsageInfo>('/v1/billing/usage')
      setUsage(res.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage')
    } finally {
      setLoading(false)
    }
  }

  const startCheckout = async (priceId: string) => {
    setLoading(true)
    setError(null)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
      const res = await api.post<{ url: string }>('/v1/billing/checkout', {
        priceId,
        successUrl: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/pricing`,
      })
      if (res.data?.url) {
        window.location.href = res.data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  const openPortal = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ url: string }>('/v1/billing/portal', {})
      if (res.data?.url) {
        window.location.href = res.data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open portal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
    fetchUsage()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    subscription,
    usage,
    loading,
    error,
    fetchSubscription,
    fetchUsage,
    startCheckout,
    openPortal,
  }
}
