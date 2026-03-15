'use client'
import { useState } from 'react'
import { RoleBadge } from './RoleBadge'
import type { WorkspaceMember, WorkspaceInvitation } from '@/hooks/useWorkspaceMembers'

const CHANGEABLE_ROLES = ['editor', 'viewer'] as const

interface Props {
  members: WorkspaceMember[]
  invitations: WorkspaceInvitation[]
  currentUserId: string
  isOwner: boolean
  onChangeRole: (userId: string, role: string) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
  onRevokeInvitation: (invId: string) => Promise<void>
}

export function MembersList({
  members,
  invitations,
  currentUserId,
  isOwner,
  onChangeRole,
  onRemoveMember,
  onRevokeInvitation,
}: Props) {
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  async function handleChangeRole(userId: string, role: string) {
    setPendingAction(`role-${userId}`)
    try {
      await onChangeRole(userId, role)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRemove(userId: string) {
    setPendingAction(`remove-${userId}`)
    try {
      await onRemoveMember(userId)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRevoke(invId: string) {
    setPendingAction(`revoke-${invId}`)
    try {
      await onRevokeInvitation(invId)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Members */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Members ({members.length})
        </h3>
        <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
          {members.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">No members yet.</p>
          ) : (
            members.map(member => (
              <div key={member.userId} className="flex items-center gap-3 px-4 py-3 bg-gray-900/40">
                <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {member.name || member.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>

                {isOwner && member.role !== 'owner' ? (
                  <select
                    aria-label={`Change role for ${member.email}`}
                    value={member.role}
                    disabled={pendingAction === `role-${member.userId}`}
                    onChange={e => handleChangeRole(member.userId, e.target.value)}
                    className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {CHANGEABLE_ROLES.map(r => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <RoleBadge role={member.role} />
                )}

                {isOwner && member.userId !== currentUserId && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(member.userId)}
                    disabled={pendingAction === `remove-${member.userId}`}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-red-900/20"
                  >
                    {pendingAction === `remove-${member.userId}` ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {(isOwner || invitations.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Pending Invitations ({invitations.length})
          </h3>
          {invitations.length === 0 ? (
            <p className="text-sm text-gray-500 px-1">No pending invitations.</p>
          ) : (
            <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3 bg-gray-900/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      Invited as{' '}
                      <span className="text-gray-400 capitalize">{inv.role}</span>
                      {inv.expiresAt && (
                        <> · Expires {new Date(inv.expiresAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/40 text-yellow-400">
                    Pending
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      disabled={pendingAction === `revoke-${inv.id}`}
                      className="text-xs text-gray-400 hover:text-red-400 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-red-900/20"
                    >
                      {pendingAction === `revoke-${inv.id}` ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
