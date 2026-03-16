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
  // Runtime errors caught by the forge-reporter injected into the preview iframe.
  // These are JavaScript / React errors that only appear in the browser, not in server SSE logs.
  const [runtimeError, setRuntimeError] = useState<WCError | null>(null)

  useEffect(() => {
    if (status === 'idle' || status === 'stopped') {
      setIsDismissed(false)
      setRuntimeError(null)   // fresh start — clear any stale runtime error
    }
    // When status flips to 'error' (new error session), re-show the overlay
    if (status === 'error') setIsDismissed(false)
  }, [status])

  // ── Runtime error listener ────────────────────────────────────────────────
  // The forge-reporter.js script injected into each preview container catches
  // window.onerror and unhandledrejection events and posts them here.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'forge:runtime-error') return
      const { message, file, line, stack } = event.data
      setRuntimeError({ kind: 'app', message: message ?? 'Runtime error', file, line, stack })
      setIsDismissed(false)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Ctrl+Shift+R keyboard shortcut — also clears any runtime error from previous session
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        setRuntimeError(null)
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
  // Priority: runtimeError (iframe JS) > SSE-detected error > status=error fallback
  const activeError = runtimeError ?? error ?? (status === 'error'
    ? { kind: 'platform' as const, message: 'The preview stopped unexpectedly. Check the console for details, or restart the preview.' }
    : null)
  const visibleError = activeError && !isDismissed ? activeError : null

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-b border-gray-800 bg-gray-900 overflow-hidden">
        {/* Left side — viewport toggle or API label; flex-1 so it yields space to controls */}
        <div className="flex-1 min-w-0">
          {!isApiProject && <ViewportToggle current={viewport} onChange={onViewportChange} />}
          {isApiProject && (
            <span className="text-xs font-medium text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50">
              API Explorer
            </span>
          )}
        </div>

        {/* Right side — controls always pinned, never overflow */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={onStop}
            disabled={status === 'idle' || status === 'stopped'}
            title="Stop preview"
            aria-label="Stop preview"
            className="p-1.5 rounded-lg transition-colors text-base leading-none disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-red-400 hover:bg-gray-800"
          >
            ⏹
          </button>
          <button
            onClick={onRefresh}
            title="Restart preview (Ctrl+Shift+R)"
            aria-label="Refresh preview"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-base leading-none"
          >
            ↺
          </button>
          <button
            onClick={() => previewUrl && window.open(previewUrl, '_blank')}
            disabled={!previewUrl}
            title="Open in new tab"
            aria-label="Open in new tab"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm leading-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↗
          </button>
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
        {/* Idle / stopped placeholder */}
        {(status === 'idle' || status === 'stopped') && (
          <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-500 text-sm gap-3 px-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl">
              {status === 'stopped' ? '⏹' : '▶'}
            </div>
            <p className="font-medium text-gray-400">
              {status === 'stopped' ? 'Preview stopped' : 'Live Preview'}
            </p>
            <p className="text-xs text-gray-600 max-w-48">
              {status === 'stopped'
                ? 'Click below or press Ctrl+Shift+R to restart'
                : 'Start chatting to generate files — the preview will appear here automatically'}
            </p>
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

        {/* Error overlay — shown for both app errors (red) and platform errors (amber).
             Always renders something when status=error so user is never left with a blank screen. */}
        <ErrorOverlay
          error={visibleError}
          onFixWithAI={onFixWithAI}
          onDismiss={() => setIsDismissed(true)}
          onRestart={onRefresh}
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
