'use client'

import { useEffect, useCallback, useState } from 'react'
import type { WCStatus, LogEntry, WCError } from '@/hooks/useWebContainer'
import { ViewportToggle, VIEWPORT_WIDTHS } from './ViewportToggle'
import type { Viewport } from './ViewportToggle'
import { ConsolePanel } from './ConsolePanel'
import { ErrorOverlay } from './ErrorOverlay'

interface PreviewPanelProps {
  status: WCStatus
  previewUrl: string | null
  progress: number
  logs: LogEntry[]
  error: WCError | null
  viewport: Viewport
  onViewportChange: (v: Viewport) => void
  onRefresh: () => void
  onFixWithAI: (errorMessage: string) => void
  onClearLogs: () => void
  showConsole: boolean
  onToggleConsole: () => void
}

const STATUS_MESSAGES: Partial<Record<WCStatus, string>> = {
  booting: 'Booting…',
  installing: 'Installing packages…',
  starting: 'Starting dev server…',
}

export function PreviewPanel({
  status,
  previewUrl,
  progress,
  logs,
  error,
  viewport,
  onViewportChange,
  onRefresh,
  onFixWithAI,
  onClearLogs,
  showConsole,
  onToggleConsole,
}: PreviewPanelProps) {
  // Track dismissed error to allow hiding overlay without mutating WC state
  const [dismissedMsg, setDismissedMsg] = useState<string | null>(null)

  // Reset dismissed state when a new/different error arrives
  useEffect(() => {
    if (error?.message !== dismissedMsg) setDismissedMsg(null)
  }, [error?.message]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+Shift+R keyboard shortcut
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        onRefresh()
      }
    },
    [onRefresh],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const isLoading = status !== 'ready' && status !== 'idle' && status !== 'error'
  const maxWidth = VIEWPORT_WIDTHS[viewport]
  const visibleError = error && error.message !== dismissedMsg ? error : null

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-b border-gray-800 bg-gray-900">
        <ViewportToggle current={viewport} onChange={onViewportChange} />
        <div className="flex-1" />

        {/* Refresh */}
        <button
          onClick={onRefresh}
          title="Restart preview (Ctrl+Shift+R)"
          aria-label="Refresh preview"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-base leading-none"
        >
          ↺
        </button>

        {/* Open in new tab */}
        <button
          onClick={() => previewUrl && window.open(previewUrl, '_blank')}
          disabled={!previewUrl}
          title="Open in new tab"
          aria-label="Open in new tab"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm leading-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↗
        </button>

        {/* Console toggle */}
        <button
          onClick={onToggleConsole}
          title="Toggle console"
          aria-label="Toggle console"
          className={`p-1.5 rounded-lg text-sm transition-colors leading-none ${
            showConsole
              ? 'text-indigo-400 bg-indigo-900/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          ≡
        </button>
      </div>

      {/* Progress bar */}
      {isLoading && (
        <div className="h-0.5 bg-gray-800 shrink-0">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Idle placeholder */}
        {status === 'idle' && (
          <div className="flex items-center justify-center h-full bg-gray-900 text-gray-600 text-sm">
            <p>Preview not started</p>
          </div>
        )}

        {/* iframe — rendered when ready */}
        {status === 'ready' && previewUrl && (
          <div className="w-full h-full flex justify-center overflow-auto bg-gray-200">
            <iframe
              src={previewUrl}
              title="Preview"
              className="h-full border-0 bg-white shadow-xl"
              style={{ width: `${maxWidth}px`, maxWidth: '100%' }}
            />
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">{STATUS_MESSAGES[status] ?? status}</p>
          </div>
        )}

        {/* Error overlay */}
        <ErrorOverlay
          error={visibleError}
          onFixWithAI={onFixWithAI}
          onDismiss={() => setDismissedMsg(error?.message ?? null)}
        />
      </div>

      {/* Console panel (collapsible) */}
      {showConsole && (
        <div className="shrink-0 h-[200px] overflow-hidden border-t border-gray-800">
          <ConsolePanel logs={logs} onClear={onClearLogs} />
        </div>
      )}
    </div>
  )
}
