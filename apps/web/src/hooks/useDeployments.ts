'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '@/lib/api'

export interface Deployment {
  id: string
  provider: 'vercel' | 'netlify' | 'cloudflare'
  status: 'pending' | 'building' | 'deployed' | 'failed'
  deployUrl: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

interface UseDeploymentsReturn {
  deployments: Deployment[]
  isDeploying: boolean
  isWarmingUp: boolean
  isLoading: boolean
  latestDeployUrl: string | null
  triggerDeploy: (provider: 'vercel' | 'netlify' | 'cloudflare') => Promise<void>
  rollback: (deploymentId: string) => Promise<void>
  refresh: () => Promise<void>
  clearHistory: () => Promise<void>
}

const POLL_INTERVAL_MS = 4000
const MAX_POLLS = 75          // 5 minutes
const WARMUP_TIMEOUT_MS = 60_000  // max warm-up: 60s
const READY_POLL_INTERVAL = 5_000 // check liveness every 5s

/** Pure helper — still used by DeployHistoryPanel per-row display */
export function isWarmingUp(deployment: Deployment): boolean {
  if (deployment.status !== 'deployed') return false
  const ageMs = Date.now() - new Date(deployment.updatedAt ?? deployment.createdAt).getTime()
  return ageMs < WARMUP_TIMEOUT_MS
}

export function useDeployments(
  projectId: string,
  _token: string | null,
): UseDeploymentsReturn {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [warmingUp, setWarmingUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current)
      if (readyPollRef.current) clearInterval(readyPollRef.current)
    }
  }, [])

  const startWarmup = useCallback((deployId: string) => {
    setWarmingUp(true)

    // Hard timeout: always clear warm-up after WARMUP_TIMEOUT_MS
    if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current)
    warmupTimerRef.current = setTimeout(() => {
      setWarmingUp(false)
    }, WARMUP_TIMEOUT_MS)

    // Poll the /ready endpoint — clear warm-up as soon as the URL is live
    if (readyPollRef.current) clearInterval(readyPollRef.current)
    readyPollRef.current = setInterval(async () => {
      try {
        const res = await api.get<{ ready: boolean }>(
          `/v1/projects/${projectId}/deployments/${deployId}/ready`,
        )
        if (res.data?.ready) {
          setWarmingUp(false)
          if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current)
          if (readyPollRef.current) clearInterval(readyPollRef.current)
        }
      } catch {
        // Ignore errors during readiness poll
      }
    }, READY_POLL_INTERVAL)
  }, [projectId])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ deployments: Deployment[] }>(
        `/v1/projects/${projectId}/deployments`,
      )
      if (res.data?.deployments) {
        setDeployments(res.data.deployments)
      }
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const triggerDeploy = useCallback(
    async (provider: 'vercel' | 'netlify' | 'cloudflare') => {
      setIsDeploying(true)
      if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current)
      if (readyPollRef.current) clearInterval(readyPollRef.current)
      setWarmingUp(false)
      try {
        await api.post<{ deploymentId: string }>(
          `/v1/projects/${projectId}/deployments`,
          { provider },
        )

        // Refresh immediately to show pending state
        const initialRes = await api.get<{ deployments: Deployment[] }>(
          `/v1/projects/${projectId}/deployments`,
        )
        if (initialRes.data?.deployments) {
          setDeployments(initialRes.data.deployments)
        }

        // Poll until deployed or failed
        let polls = 0
        let finishedDeployId: string | null = null
        while (polls < MAX_POLLS) {
          await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
          const res = await api.get<{ deployments: Deployment[] }>(
            `/v1/projects/${projectId}/deployments`,
          )
          if (res.data?.deployments) {
            setDeployments(res.data.deployments)
            const latest = res.data.deployments[0]
            if (!latest) break
            if (latest.status === 'deployed') {
              finishedDeployId = latest.id
              break
            }
            if (latest.status === 'failed') break
          }
          polls++
        }

        if (finishedDeployId) {
          startWarmup(finishedDeployId)
        }
      } finally {
        setIsDeploying(false)
      }
    },
    [projectId, startWarmup],
  )

  const rollback = useCallback(
    async (deploymentId: string) => {
      await api.post<{ deploymentId: string }>(
        `/v1/projects/${projectId}/deployments/${deploymentId}/rollback`,
        {},
      )
      await refresh()
    },
    [projectId, refresh],
  )

  const clearHistory = useCallback(async () => {
    await api.delete(`/v1/projects/${projectId}/deployments`)
    setDeployments([])
  }, [projectId])

  const latestDeployUrl =
    deployments.find(d => d.status === 'deployed')?.deployUrl ?? null

  return {
    deployments,
    isDeploying,
    isWarmingUp: warmingUp,
    isLoading,
    latestDeployUrl,
    triggerDeploy,
    rollback,
    refresh,
    clearHistory,
  }
}
