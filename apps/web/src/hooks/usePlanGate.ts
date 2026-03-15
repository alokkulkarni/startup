'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useSubscription } from './useSubscription'

interface PlanLimits {
  maxProjects: number
  aiRequestsPerDay: number
  maxFilesPerProject: number
}

const TIER_LIMITS: Record<string, PlanLimits> = {
  free:       { maxProjects: 3,   aiRequestsPerDay: 20,   maxFilesPerProject: 20  },
  pro:        { maxProjects: 50,  aiRequestsPerDay: 300,  maxFilesPerProject: 200 },
  team:       { maxProjects: 999, aiRequestsPerDay: 1500, maxFilesPerProject: 999 },
  enterprise: { maxProjects: 999, aiRequestsPerDay: 9999, maxFilesPerProject: 999 },
}

export interface PlanGate {
  /** true = user can create another project */
  canCreateProject: boolean
  projectsUsed: number
  projectsLimit: number
  /** true = user has AI messages remaining today */
  canSendAI: boolean
  aiUsed: number
  aiLimit: number
  /** current subscription tier */
  tier: string
  /** navigate to /pricing */
  upgrade: () => void
  /** refresh gate state */
  refresh: () => void
}

export function usePlanGate(): PlanGate {
  const router = useRouter()
  const { subscription, usage, fetchSubscription, fetchUsage } = useSubscription()
  const [projectsUsed, setProjectsUsed] = useState(0)

  const fetchProjectCount = useCallback(async () => {
    try {
      const list = await api.get<unknown[]>('/v1/projects')
      setProjectsUsed(list.data?.length ?? 0)
    } catch {
      setProjectsUsed(0)
    }
  }, [])

  useEffect(() => {
    fetchProjectCount()
    fetchUsage()
  }, [fetchProjectCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const tier = subscription?.tier ?? 'free'
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free

  const aiUsed  = usage?.used  ?? 0
  const aiLimit = usage?.limit ?? limits.aiRequestsPerDay

  return {
    canCreateProject: projectsUsed < limits.maxProjects,
    projectsUsed,
    projectsLimit: limits.maxProjects,
    canSendAI: aiUsed < aiLimit,
    aiUsed,
    aiLimit,
    tier,
    upgrade: () => router.push('/pricing'),
    refresh: () => { fetchSubscription(); fetchUsage(); fetchProjectCount() },
  }
}
