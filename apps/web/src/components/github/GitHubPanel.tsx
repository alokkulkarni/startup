'use client'
import { useState, useEffect } from 'react'
import { useGitHub } from '@/hooks/useGitHub'
import { SyncStatusBadge } from './SyncStatusBadge'
import { PushModal } from './PushModal'
import { PullModal } from './PullModal'
import { CreatePRModal } from './CreatePRModal'

interface GitHubPanelProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export function GitHubPanel({ projectId, isOpen, onClose }: GitHubPanelProps) {
  const {
    connection,
    syncStatus,
    loading,
    connect,
    disconnect,
    refetchSyncStatus,
  } = useGitHub(projectId)

  const [pushOpen, setPushOpen] = useState(false)
  const [pullOpen, setPullOpen] = useState(false)
  const [prOpen, setPrOpen] = useState(false)
  const { pull } = useGitHub(projectId)

  useEffect(() => {
    if (isOpen && connection) {
      refetchSyncStatus()
    }
  }, [isOpen, connection, refetchSyncStatus])

  if (!isOpen) return null

  const repoUrl = syncStatus?.repoUrl ?? null
  const hasRepo = syncStatus && syncStatus.status !== 'not_connected' && syncStatus.status !== 'no_repo'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-gray-900 border-l border-gray-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 text-white">
            <GitHubIcon />
            <h2 className="text-sm font-semibold">GitHub</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close GitHub panel"
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Connection section */}
          <section>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Connection</p>
            {connection ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                  {connection.githubAvatarUrl && (
                    <img
                      src={connection.githubAvatarUrl}
                      alt={connection.githubLogin}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{connection.githubLogin}</p>
                    {connection.githubName && (
                      <p className="text-xs text-gray-500 truncate">{connection.githubName}</p>
                    )}
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                </div>
                <button
                  onClick={disconnect}
                  disabled={loading}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Disconnect GitHub
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg text-gray-300 hover:text-white transition-all w-full justify-center"
              >
                <GitHubIcon />
                Connect GitHub
              </button>
            )}
          </section>

          {connection && (
            <>
              {/* Repo section */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Repository</p>
                {hasRepo && repoUrl ? (
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{repoUrl.split('/').slice(-2).join('/')}</p>
                    </div>
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0 ml-2"
                    >
                      View ↗
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">No repo linked</p>
                    <button
                      onClick={() => setPushOpen(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 transition-colors"
                    >
                      + Link repo
                    </button>
                  </div>
                )}
              </section>

              {/* Sync status */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sync Status</p>
                <SyncStatusBadge syncStatus={syncStatus} onRefresh={refetchSyncStatus} />
              </section>

              {/* Actions */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Actions</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setPushOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
                  >
                    <span>↑</span> Push
                  </button>
                  <button
                    onClick={() => setPullOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
                  >
                    <span>↓</span> Pull
                  </button>
                  <button
                    onClick={() => setPrOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
                  >
                    <span>⇄</span> Create PR
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <PushModal isOpen={pushOpen} onClose={() => setPushOpen(false)} projectId={projectId} />
      <PullModal
        isOpen={pullOpen}
        onClose={() => setPullOpen(false)}
        onConfirm={pull}
      />
      <CreatePRModal
        isOpen={prOpen}
        onClose={() => setPrOpen(false)}
        projectId={projectId}
      />
    </>
  )
}
