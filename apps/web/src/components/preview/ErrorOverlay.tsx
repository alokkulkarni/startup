'use client'

import type { WCError } from '@/hooks/useWebContainer'

interface ErrorOverlayProps {
  error: WCError | null
  onFixWithAI: (errorMessage: string) => void
  onDismiss: () => void
}

export function ErrorOverlay({ error, onFixWithAI, onDismiss }: ErrorOverlayProps) {
  if (!error) return null

  const location = error.file
    ? `${error.file}${error.line != null ? `:${error.line}` : ''}`
    : null

  const fullMessage = error.message + (error.stack ? `\n${error.stack}` : '')

  return (
    <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center p-6 z-20">
      <div className="w-full max-w-lg bg-red-950/80 border border-red-800 rounded-xl shadow-2xl p-5 flex flex-col gap-4">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <span className="text-red-400 text-lg mt-0.5 shrink-0">✕</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-300 text-sm leading-snug break-words">
              {error.message}
            </p>
            {location && (
              <p className="text-red-400/70 text-xs mt-1 font-mono">{location}</p>
            )}
          </div>
        </div>

        {/* Stack trace */}
        {error.stack && (
          <pre className="bg-gray-900 rounded-lg p-3 text-xs text-red-300/80 overflow-y-auto max-h-40 font-mono leading-relaxed whitespace-pre-wrap break-all">
            {error.stack}
          </pre>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => onFixWithAI(fullMessage)}
            className="px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg border border-indigo-500 transition-colors font-medium"
          >
            Fix with AI
          </button>
        </div>
      </div>
    </div>
  )
}
