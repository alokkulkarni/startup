'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

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

  const fetchAll = useCallback(async () => {
    try {
      // Use the api lib so auth cookies + base URL are handled consistently.
      // API routes return raw objects (not ApiResponse-wrapped), so we cast directly.
      const [ovRaw, usageRaw, actRaw] = await Promise.all([
        api.get<OverviewData>('/v1/analytics/overview'),
        api.get<{ series: UsageSeries[] }>('/v1/analytics/ai-usage'),
        api.get<{ events: ActivityEvent[] }>('/v1/analytics/activity?limit=20'),
      ])
      const ov = ovRaw as unknown as OverviewData
      const usage = usageRaw as unknown as { series: UsageSeries[] }
      const act = actRaw as unknown as { events: ActivityEvent[] }
      if (ov) setOverview(ov)
      if (usage?.series) setAiSeries(usage.series)
      if (act?.events) setActivity(act.events)
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return { overview, aiSeries, activity, loading, error, refresh: fetchAll }
}
