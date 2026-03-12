'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers'
import { InviteForm } from '@/components/workspace/InviteForm'
import { MembersList } from '@/components/workspace/MembersList'

export default function MembersSettingsPage() {
  const { user, loading: authLoading, authenticated } = useAuth()
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('forge:workspaceId')
    return null
  })
  const [loadingWorkspace, setLoadingWorkspace] = useState(() => {
    if (typeof window !== 'undefined') return !localStorage.getItem('forge:workspaceId')
    return true
  })

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Resolve active workspace: try localStorage first, fall back to first workspace from API
  useEffect(() => {
    if (!authenticated) return
    const stored = typeof window !== 'undefined' ? localStorage.getItem('forge:workspaceId') : null
    if (stored) {
      setWorkspaceId(stored)
      setLoadingWorkspace(false)
      return
    }
    fetch(`${apiBase}/api/v1/workspaces`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const workspaces = d.workspaces ?? []
        if (workspaces.length > 0) {
          setWorkspaceId(workspaces[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingWorkspace(false))
  }, [authenticated, apiBase])

  useEffect(() => {
    if (!authLoading && !authenticated) router.push('/login')
  }, [authLoading, authenticated, router])

  const {
    members,
    invitations,
    loading: membersLoading,
    error,
    inviteMember,
    removeMember,
    changeRole,
    revokeInvitation,
  } = useWorkspaceMembers(workspaceId)

  // Determine if current user is owner of this workspace
  const currentMember = members.find(m => m.userId === user?.id)
  const isOwner = currentMember?.role === 'owner'

  if (authLoading || loadingWorkspace) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-100">Team Members</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage who has access to this workspace
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Invite form — only visible to owners */}
        {isOwner && (
          <div className="mb-8 p-5 rounded-xl border border-gray-800 bg-gray-900/40">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Invite a team member</h2>
            <InviteForm onInvite={inviteMember} />
          </div>
        )}

        {/* Members list */}
        {membersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-14 rounded-xl bg-gray-900/40 border border-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <MembersList
            members={members}
            invitations={invitations}
            currentUserId={user?.id ?? ''}
            isOwner={isOwner}
            onChangeRole={changeRole}
            onRemoveMember={removeMember}
            onRevokeInvitation={revokeInvitation}
          />
        )}
      </div>
    </div>
  )
}
