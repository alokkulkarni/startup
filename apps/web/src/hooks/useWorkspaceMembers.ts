'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface WorkspaceMember {
  userId: string
  email: string
  name: string
  role: string
  joinedAt: string
}

export interface WorkspaceInvitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
}

export function useWorkspaceMembers(workspaceId: string | null) {
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        api.get<{ members: WorkspaceMember[] }>(`/v1/workspaces/${workspaceId}/members`),
        api.get<{ invitations: WorkspaceInvitation[] }>(`/v1/workspaces/${workspaceId}/invitations`),
      ])
      setMembers(membersRes.data?.members ?? [])
      setInvitations(invitationsRes.data?.invitations ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const inviteMember = async (email: string, role: string): Promise<void> => {
    if (!workspaceId) return
    await api.post(`/v1/workspaces/${workspaceId}/invitations`, { email, role })
    await refresh()
  }

  const removeMember = async (userId: string): Promise<void> => {
    if (!workspaceId) return
    await api.delete(`/v1/workspaces/${workspaceId}/members/${userId}`)
    setMembers(prev => prev.filter(m => m.userId !== userId))
  }

  const changeRole = async (userId: string, role: string): Promise<void> => {
    if (!workspaceId) return
    await api.patch(`/v1/workspaces/${workspaceId}/members/${userId}`, { role })
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m))
  }

  const revokeInvitation = async (invId: string): Promise<void> => {
    if (!workspaceId) return
    await api.delete(`/v1/workspaces/${workspaceId}/invitations/${invId}`)
    setInvitations(prev => prev.filter(i => i.id !== invId))
  }

  return {
    members,
    invitations,
    loading,
    error,
    inviteMember,
    removeMember,
    changeRole,
    revokeInvitation,
    refresh,
  }
}
