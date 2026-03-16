'use client'

import type { WCError } from '@/hooks/useWebContainer'

interface ErrorOverlayProps {
  error: WCError | null
  onFixWithAI: (errorMessage: string) => void
  onDismiss: () => void
  onRestart: () => void
}

export function ErrorOverlay({ error, onFixWithAI, onDismiss, onRestart }: ErrorOverlayProps) {
  if (!error) return null

  const isAppError = error.kind === 'app'
  const location = error.file
    ? `${error.file}${error.line != null ? `:${error.line}` : ''}`
    : null
  const fullMessage = error.message + (error.stack ? `\n\n${error.stack}` : '')

  return (
    <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center p-6 z-20">
      <div className={`w-full max-w-lg rounded-xl shadow-2xl p-5 flex flex-col gap-4 border ${
        isAppError
          ? 'bg-red-950/80 border-red-800'
          : 'bg-amber-950/70 border-amber-700'
      }`}>

        {/* Title row */}
        <div className="flex items-start gap-3">
          <span className={`text-lg mt-0.5 shrink-0 ${isAppError ? 'text-red-400' : 'text-amber-400'}`}>
            {isAppError ? '⚠' : '🔧'}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm leading-snug ${isAppError ? 'text-red-200' : 'text-amber-200'}`}>
              {isAppError ? 'App error — your code has a problem' : 'Preview environment error'}
            </p>
            <p className={`text-xs mt-1 break-words leading-relaxed ${isAppError ? 'text-red-300' : 'text-amber-300'}`}>
              {error.message}
            </p>
            {location && (
              <p className={`text-xs mt-1 font-mono ${isAppError ? 'text-red-400/70' : 'text-amber-400/70'}`}>
                {location}
              </p>
            )}
          </div>
        </div>

        {/* Stack / detail trace (app errors only) */}
        {isAppError && error.stack && (
          <pre className="bg-gray-900 rounded-lg p-3 text-xs text-red-300/80 overflow-y-auto max-h-40 font-mono leading-relaxed whitespace-pre-wrap break-all">
            {error.stack}
          </pre>
        )}

        {/* Platform error hint */}
        {!isAppError && (
          <p className="text-xs text-amber-300/70 leading-relaxed">
            This is a problem with the preview environment, not your code.
            Try restarting the preview. If it keeps happening, check the console logs for more details.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
          >
            Dismiss
          </button>
          {isAppError ? (
            <button
              onClick={() => onFixWithAI(fullMessage)}
              className="px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg border border-indigo-500 transition-colors font-medium"
            >
              Fix with AI
            </button>
          ) : (
            <button
              onClick={onRestart}
              className="px-3 py-1.5 text-xs text-white bg-amber-700 hover:bg-amber-600 rounded-lg border border-amber-600 transition-colors font-medium"
            >
              ↺ Restart Preview
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
