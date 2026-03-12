'use client'
import { useState, useCallback } from 'react'
import { api } from '@/lib/api'

export interface Deployment {
  id: string
  provider: 'vercel' | 'netlify' | 'cloudflare'
  status: 'pending' | 'building' | 'deployed' | 'failed'
  deployUrl: string | null
  errorMessage: string | null
  createdAt: string
}

interface UseDeploymentsReturn {
  deployments: Deployment[]
  isDeploying: boolean
  isLoading: boolean
  latestDeployUrl: string | null
  triggerDeploy: (provider: 'vercel' | 'netlify' | 'cloudflare') => Promise<void>
  rollback: (deploymentId: string) => Promise<void>
  refresh: () => Promise<void>
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 10

export function useDeployments(
  projectId: string,
  _token: string | null,
): UseDeploymentsReturn {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

        // Poll until deployed or failed (max 10 polls, every 3s)
        let polls = 0
        while (polls < MAX_POLLS) {
          await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
          const res = await api.get<{ deployments: Deployment[] }>(
            `/v1/projects/${projectId}/deployments`,
          )
          if (res.data?.deployments) {
            setDeployments(res.data.deployments)
            const latest = res.data.deployments[0]
            if (!latest || latest.status === 'deployed' || latest.status === 'failed') break
          }
          polls++
        }
      } finally {
        setIsDeploying(false)
      }
    },
    [projectId],
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

  const latestDeployUrl =
    deployments.find(d => d.status === 'deployed')?.deployUrl ?? null

  return { deployments, isDeploying, isLoading, latestDeployUrl, triggerDeploy, rollback, refresh }
}
