'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface GitHubConnection {
  githubLogin: string
  githubName: string | null
  githubAvatarUrl: string | null
  connectedAt: string
}

export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  private: boolean
  defaultBranch: string
  updatedAt: string
  description: string | null
}

export interface GitHubBranch {
  name: string
  sha: string
}

export interface SyncStatus {
  status: 'synced' | 'ahead' | 'behind' | 'diverged' | 'not_connected' | 'no_repo'
  aheadBy: number
  behindBy: number
  latestSha: string
  repoUrl: string | null
}

export function useGitHub(projectId?: string) {
  const [connection, setConnection] = useState<GitHubConnection | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConnection = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<GitHubConnection>('/v1/github/status')
      setConnection(res.data ?? null)
    } catch (err) {
      setConnection(null)
      if (err instanceof Error && !err.message.includes('404')) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRepos = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ repos: GitHubRepo[] }>(`/v1/github/repos?page=${page}`)
      setRepos(res.data?.repos ?? [])
      return res.data?.repos ?? []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repos')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBranches = useCallback(async (owner: string, repo: string): Promise<GitHubBranch[]> => {
    setError(null)
    try {
      const res = await api.get<{ branches: GitHubBranch[] }>(`/v1/github/repos/${owner}/${repo}/branches`)
      return res.data?.branches ?? []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch branches')
      return []
    }
  }, [])

  const fetchSyncStatus = useCallback(async () => {
    if (!projectId) return
    setError(null)
    try {
      const res = await api.get<SyncStatus>(`/v1/projects/${projectId}/github/sync-status`)
      setSyncStatus(res.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sync status')
    }
  }, [projectId])

  const connect = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'
    window.location.href = `${apiUrl}/v1/github/connect`
  }, [])

  const disconnect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await api.delete('/v1/github/disconnect')
      setConnection(null)
      setSyncStatus(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }, [])

  const pushToNewRepo = useCallback(async (
    repoName: string,
    options?: { private?: boolean; description?: string },
  ) => {
    if (!projectId) throw new Error('projectId required')
    setLoading(true)
    setError(null)
    try {
      await api.post(`/v1/projects/${projectId}/github/push`, {
        repoName,
        private: options?.private ?? false,
        description: options?.description,
      })
      await fetchSyncStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [projectId, fetchSyncStatus])

  const pushToExistingRepo = useCallback(async (
    owner: string,
    repo: string,
    branch: string,
    commitMessage?: string,
  ) => {
    if (!projectId) throw new Error('projectId required')
    setLoading(true)
    setError(null)
    try {
      await api.post(`/v1/projects/${projectId}/github/push-existing`, {
        owner,
        repo,
        branch,
        commitMessage,
      })
      await fetchSyncStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [projectId, fetchSyncStatus])

  const pull = useCallback(async () => {
    if (!projectId) throw new Error('projectId required')
    setLoading(true)
    setError(null)
    try {
      await api.post(`/v1/projects/${projectId}/github/pull`, {})
      await fetchSyncStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pull failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [projectId, fetchSyncStatus])

  const createPR = useCallback(async (
    head: string,
    base: string,
    title?: string,
    body?: string,
  ): Promise<{ url: string; number: number }> => {
    if (!projectId) throw new Error('projectId required')
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ url: string; number: number }>(
        `/v1/projects/${projectId}/github/pr`,
        { head, base, title, body },
      )
      return res.data!
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PR')
      throw err
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const importRepo = useCallback(async (
    owner: string,
    repo: string,
    branch: string,
    projectName?: string,
  ): Promise<{ projectId: string }> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ projectId: string }>('/v1/github/import', {
        owner,
        repo,
        branch,
        projectName,
      })
      return res.data!
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  useEffect(() => {
    if (projectId && connection) {
      fetchSyncStatus()
    }
  }, [projectId, connection, fetchSyncStatus])

  return {
    connection,
    repos,
    syncStatus,
    loading,
    error,
    connect,
    disconnect,
    fetchRepos,
    fetchBranches,
    pushToNewRepo,
    pushToExistingRepo,
    pull,
    createPR,
    importRepo,
    refetchSyncStatus: fetchSyncStatus,
  }
}
