'use client'
import { useState, useEffect } from 'react'
import { useSnapshots } from '@/hooks/useSnapshots'
import type { Snapshot } from '@/hooks/useSnapshots'

interface VersionHistoryPanelProps {
  projectId: string
  token: string | null
  isOpen: boolean
  onClose: () => void
  onRestored: () => void
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

function getIcon(triggeredBy: Snapshot['triggeredBy'], label: string | null): string {
  if (triggeredBy === 'restore') return '🔄'
  if (triggeredBy === 'manual' || label) return '⭐'
  return '🤖'
}

export function VersionHistoryPanel({
  projectId,
  token,
  isOpen,
  onClose,
  onRestored,
}: VersionHistoryPanelProps) {
  const { snapshots, isLoading, fetchSnapshots, createSnapshot, restoreSnapshot } = useSnapshots(
    projectId,
    token,
    onRestored,
  )
  const [labelInput, setLabelInput] = useState('')
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots()
    }
  }, [isOpen, fetchSnapshots])

  const handleSaveCheckpoint = async () => {
    if (!showLabelInput) {
      setShowLabelInput(true)
      return
    }
    setSaving(true)
    try {
      await createSnapshot(labelInput || undefined)
      setLabelInput('')
      setShowLabelInput(false)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-gray-900 border-l border-gray-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Version History</h2>
          <button
            onClick={onClose}
            aria-label="Close version history"
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Save Checkpoint */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-700">
          {showLabelInput ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                placeholder="Label (optional)"
                autoFocus
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveCheckpoint()
                  if (e.key === 'Escape') {
                    setShowLabelInput(false)
                    setLabelInput('')
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCheckpoint}
                  disabled={saving}
                  className="flex-1 text-xs px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setShowLabelInput(false)
                    setLabelInput('')
                  }}
                  className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSaveCheckpoint}
              className="w-full text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-all"
            >
              + Save Checkpoint
            </button>
          )}
        </div>

        {/* Snapshots list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <p className="text-sm text-gray-400">No snapshots yet.</p>
              <p className="text-xs text-gray-500 mt-1">AI changes will appear here.</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {snapshots.map(snapshot => (
                <li
                  key={snapshot.id}
                  className="relative flex items-start gap-3 px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  onMouseEnter={() => setHoveredId(snapshot.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <span className="text-base mt-0.5 shrink-0">
                    {getIcon(snapshot.triggeredBy, snapshot.label)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{formatTimestamp(snapshot.createdAt)}</p>
                    {(snapshot.label || snapshot.description) && (
                      <p className="text-xs text-gray-300 truncate mt-0.5">
                        {(snapshot.label || snapshot.description || '').slice(0, 60)}
                      </p>
                    )}
                  </div>
                  {hoveredId === snapshot.id && (
                    <button
                      onClick={() => restoreSnapshot(snapshot.id)}
                      className="shrink-0 text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
                    >
                      Restore
                    </button>
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
