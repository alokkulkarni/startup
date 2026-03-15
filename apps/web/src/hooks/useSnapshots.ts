'use client'
import { useState, useCallback } from 'react'
import { api } from '@/lib/api'

export interface Snapshot {
  id: string
  triggeredBy: 'ai' | 'manual' | 'restore'
  description: string | null
  label: string | null
  createdAt: string
}

interface UseSnapshotsReturn {
  snapshots: Snapshot[]
  isLoading: boolean
  fetchSnapshots: () => Promise<void>
  createSnapshot: (label?: string) => Promise<void>
  restoreSnapshot: (snapshotId: string) => Promise<void>
  undoLast: () => Promise<boolean>
  clearHistory: () => Promise<void>
}

export function useSnapshots(
  projectId: string,
  _token: string | null,
  onRestored?: () => void,
): UseSnapshotsReturn {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ snapshots: Snapshot[] }>(`/v1/projects/${projectId}/snapshots`)
      if (res.data?.snapshots) {
        setSnapshots(res.data.snapshots)
      }
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const createSnapshot = useCallback(
    async (label?: string) => {
      await api.post(`/v1/projects/${projectId}/snapshots`, { label })
      await fetchSnapshots()
    },
    [projectId, fetchSnapshots],
  )

  const restoreSnapshot = useCallback(
    async (snapshotId: string) => {
      await api.post(`/v1/projects/${projectId}/snapshots/${snapshotId}/restore`, {})
      await fetchSnapshots()
      await onRestored?.()
    },
    [projectId, fetchSnapshots, onRestored],
  )

  const undoLast = useCallback(async (): Promise<boolean> => {
    let list = snapshots
    if (list.length === 0) {
      const res = await api.get<{ snapshots: Snapshot[] }>(`/v1/projects/${projectId}/snapshots`)
      list = res.data?.snapshots ?? []
    }
    if (list.length === 0) return false
    await restoreSnapshot(list[0].id)
    return true
  }, [snapshots, projectId, restoreSnapshot])

  const clearHistory = useCallback(async () => {
    await api.delete(`/v1/projects/${projectId}/snapshots`)
    setSnapshots([])
  }, [projectId])

  return { snapshots, isLoading, fetchSnapshots, createSnapshot, restoreSnapshot, undoLast, clearHistory }
}
