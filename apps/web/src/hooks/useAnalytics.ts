'use client'
import { useState, useEffect, useCallback } from 'react'

interface OverviewData {
  aiRequests: number
  deployments: number
  projectsCreated: number
  templateClones: number
  activeProjects: number
  activeMembers: number
  totalEvents: number
}

interface UsageSeries {
  date: string
  requests: number
}

interface ActivityEvent {
  id: string
  eventType: string
  metadata: Record<string, unknown>
  createdAt: string
  projectId: string | null
  userId: string | null
  userEmail: string | null
  projectName: string | null
}

export function useAnalytics() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [aiSeries, setAiSeries] = useState<UsageSeries[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchAll = useCallback(async () => {
    try {
      const [ovRes, usageRes, actRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/analytics/overview`, { credentials: 'include' }),
        fetch(`${apiBase}/api/v1/analytics/ai-usage`, { credentials: 'include' }),
        fetch(`${apiBase}/api/v1/analytics/activity?limit=20`, { credentials: 'include' }),
      ])
      if (ovRes.ok) setOverview(await ovRes.json())
      if (usageRes.ok) { const d = await usageRes.json(); setAiSeries(d.series ?? []) }
      if (actRes.ok) { const d = await actRes.json(); setActivity(d.events ?? []) }
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return { overview, aiSeries, activity, loading, error, refresh: fetchAll }
}
