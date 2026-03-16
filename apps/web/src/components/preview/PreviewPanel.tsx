'use client'

import { useEffect, useCallback, useState } from 'react'
import type { WCStatus, LogEntry, WCError } from '@/hooks/useWebContainer'
import { ViewportToggle, VIEWPORT_WIDTHS } from './ViewportToggle'
import type { Viewport } from './ViewportToggle'
import { ConsolePanel } from './ConsolePanel'
import { ErrorOverlay } from './ErrorOverlay'
import { ApiExplorerPanel } from './ApiExplorerPanel'

interface PreviewPanelProps {
  status: WCStatus
  previewUrl: string | null
  progress: number
  logs: LogEntry[]
  error: WCError | null
  viewport: Viewport
  onViewportChange: (v: Viewport) => void
  onRefresh: () => void
  onStop: () => void
  onFixWithAI: (errorMessage: string) => void
  onClearLogs: () => void
  showConsole: boolean
  onToggleConsole: () => void
  framework?: string | null
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
  onStop,
  onFixWithAI,
  onClearLogs,
  showConsole,
  onToggleConsole,
  framework,
}: PreviewPanelProps) {
  const isApiProject = framework === 'node'
  // Track whether the user has dismissed the current error session.
  // Only reset when the preview restarts (status goes idle) — NOT on every new error message,
  // because repeated proxy errors have slightly different messages each time.
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (status === 'idle' || status === 'stopped') setIsDismissed(false)
  }, [status])

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

  const isLoading = status !== 'ready' && status !== 'idle' && status !== 'stopped' && status !== 'error'
  const maxWidth = VIEWPORT_WIDTHS[viewport]
  const visibleError = error && !isDismissed ? error : null

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Header — flex-nowrap so controls never push off-screen */}
      <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-b border-gray-800 bg-gray-900 min-w-0 overflow-hidden">
        {/* Viewport toggle — allowed to shrink/hide when panel is narrow */}
        <div className="shrink-1 min-w-0 overflow-hidden">
          {!isApiProject && <ViewportToggle current={viewport} onChange={onViewportChange} />}
          {isApiProject && (
            <span className="text-xs font-medium text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50">
              API Explorer
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0" />
        {/* Controls — shrink-0 so they're always visible */}
        <div className="shrink-0 flex items-center gap-1">

        {/* Stop */}
        <button
          onClick={onStop}
          disabled={status === 'idle' || status === 'stopped'}
          title="Stop preview"
          aria-label="Stop preview"
          className="p-1.5 rounded-lg transition-colors text-base leading-none disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-red-400 hover:bg-gray-800"
        >
          ⏹
        </button>

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
        </div>{/* end controls */}
      </div>{/* end header */}

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
        {/* Idle / stopped placeholder */}
        {(status === 'idle' || status === 'stopped') && (
          <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-600 text-sm gap-2">
            <p>{status === 'stopped' ? 'Preview stopped' : 'Preview not started'}</p>
            {status === 'stopped' && (
              <button
                onClick={onRefresh}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Restart preview
              </button>
            )}
          </div>
        )}

        {/* API Explorer — rendered when ready and project is a node/API project */}
        {status === 'ready' && previewUrl && isApiProject && (
          <ApiExplorerPanel baseUrl={previewUrl} />
        )}

        {/* iframe — rendered when ready for UI frameworks */}
        {status === 'ready' && previewUrl && !isApiProject && (
          <div className="w-full h-full flex justify-center overflow-auto bg-gray-200">
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Preview"
              className="h-full border-0 bg-white shadow-xl"
              style={{ width: `${maxWidth}px`, maxWidth: '100%' }}
            />
          </div>
        )}

        {/* Loading overlay — shows terminal tail when starting so user can see progress */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center gap-3 z-10 px-4">
            <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-sm text-gray-400">{STATUS_MESSAGES[status] ?? status}</p>
            {status === 'starting' && logs.length > 0 && (
              <div className="w-full max-w-xl mt-2 bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-3 py-1.5 bg-gray-800 text-xs text-gray-500 font-mono">Terminal output</div>
                <div className="p-3 font-mono text-xs text-gray-400 space-y-0.5 max-h-40 overflow-y-auto">
                  {logs.slice(-12).map((l, i) => (
                    <div key={i} className={l.type === 'stderr' ? 'text-red-400' : 'text-gray-400'}>
                      {l.text.trim()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error overlay */}
        <ErrorOverlay
          error={visibleError}
          onFixWithAI={onFixWithAI}
          onDismiss={() => setIsDismissed(true)}
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
