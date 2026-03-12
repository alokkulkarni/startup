'use client'
import type { SyncStatus } from '@/hooks/useGitHub'

interface SyncStatusBadgeProps {
  syncStatus: SyncStatus | null
  onRefresh?: () => void
}

export function SyncStatusBadge({ syncStatus, onRefresh }: SyncStatusBadgeProps) {
  if (!syncStatus) return null

  const badge = getBadge(syncStatus)

  return (
    <div className="flex items-center gap-1">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
        {badge.label}
      </span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Refresh sync status"
          className="text-gray-500 hover:text-gray-300 transition-colors p-0.5 rounded"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  )
}

function getBadge(syncStatus: SyncStatus): { label: string; className: string } {
  switch (syncStatus.status) {
    case 'synced':
      return {
        label: '✓ In sync',
        className: 'bg-green-500/20 text-green-400 border border-green-500/30',
      }
    case 'ahead':
      return {
        label: `↑ ${syncStatus.aheadBy} ahead`,
        className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      }
    case 'behind':
      return {
        label: `↓ ${syncStatus.behindBy} behind`,
        className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      }
    case 'diverged':
      return {
        label: '↕ Diverged',
        className: 'bg-red-500/20 text-red-400 border border-red-500/30',
      }
    case 'not_connected':
      return {
        label: 'Not connected',
        className: 'bg-gray-700/50 text-gray-500 border border-gray-700',
      }
    case 'no_repo':
      return {
        label: 'No repo',
        className: 'bg-gray-700/50 text-gray-500 border border-gray-700',
      }
  }
}
