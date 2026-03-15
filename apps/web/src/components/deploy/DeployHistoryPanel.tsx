'use client'
import { useState, useEffect } from 'react'
import { useDeployments, isWarmingUp } from '@/hooks/useDeployments'
import type { Deployment } from '@/hooks/useDeployments'

interface DeployHistoryPanelProps {
  projectId: string
  token: string | null
  isOpen: boolean
  onClose: () => void
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffMins < 1) return 'just now'
  if (diffHours < 1) return `${diffMins}m ago`
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`

  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month} ${day}, ${hours}:${minutes}`
}

function statusBadge(status: Deployment['status']): string {
  switch (status) {
    case 'building': return '🟡'
    case 'deployed': return '🟢'
    case 'failed': return '🔴'
    case 'pending': return '⚪'
  }
}

function providerLabel(provider: Deployment['provider']): string {
  if (provider === 'cloudflare') return 'Cloudflare Pages'
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function DeployHistoryPanel({
  projectId,
  token,
  isOpen,
  onClose,
}: DeployHistoryPanelProps) {
  const { deployments, isDeploying, isLoading, triggerDeploy, rollback, refresh } =
    useDeployments(projectId, token)
  const [deployMenuOpen, setDeployMenuOpen] = useState(false)
  // tick forces a re-render every 5s so isWarmingUp() is rechecked per row
  const [, setTick] = useState(0)

  useEffect(() => {
    if (isOpen) refresh()
  }, [isOpen, refresh])

  // Re-render every 5s so warming-up rows update when warm-up expires
  useEffect(() => {
    if (!isOpen) return
    const hasWarmingDeployment = deployments.some(d => isWarmingUp(d))
    if (!hasWarmingDeployment) return
    const id = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(id)
  }, [isOpen, deployments])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-gray-900 border-l border-gray-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Deploy History</h2>
          <button
            onClick={onClose}
            aria-label="Close deploy history"
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Quick Deploy */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-700">
          {isDeploying ? (
            <button
              disabled
              className="w-full text-xs px-3 py-2 bg-indigo-600 rounded-lg text-white font-medium flex items-center justify-center gap-1.5 opacity-75"
            >
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              Deploying…
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDeployMenuOpen(v => !v)}
                className="w-full text-xs px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all"
              >
                Deploy ▾
              </button>
              {deployMenuOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  {(['vercel', 'netlify', 'cloudflare'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => { triggerDeploy(p); setDeployMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {providerLabel(p)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deployments list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : deployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <p className="text-sm text-gray-400">No deployments yet.</p>
              <p className="text-xs text-gray-500 mt-1">Click Deploy to get started.</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {deployments.map((deployment, index) => (
                <li
                  key={deployment.id}
                  className="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{statusBadge(deployment.status)}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-300">
                          {providerLabel(deployment.provider)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimestamp(deployment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {deployment.status === 'deployed' && deployment.deployUrl && (
                        isWarmingUp(deployment) ? (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <span className="w-2 h-2 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                            Warming up…
                          </span>
                        ) : (
                          <a
                            href={deployment.deployUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            Live ↗
                          </a>
                        )
                      )}
                      {deployment.status === 'deployed' && index > 0 && (
                        <button
                          onClick={() => rollback(deployment.id)}
                          className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-colors"
                        >
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>
                  {deployment.status === 'failed' && deployment.errorMessage && (
                    <p className="mt-1.5 text-xs text-red-400 break-words leading-relaxed">
                      {deployment.errorMessage}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
