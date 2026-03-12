'use client'

import { useEffect, useRef } from 'react'
import type { LogEntry } from '@/hooks/useWebContainer'

interface ConsolePanelProps {
  logs: LogEntry[]
  onClear: () => void
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8)
}

export function ConsolePanel({ logs, onClear }: ConsolePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="flex flex-col h-full bg-gray-950 border-t border-gray-800 font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-gray-300 font-semibold">Console</span>
          <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full border border-gray-700">
            {logs.length}
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded hover:bg-gray-800"
        >
          Clear
        </button>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {logs.length === 0 && (
          <p className="text-gray-600 text-[11px] p-1 italic">No output yet.</p>
        )}
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-2 leading-relaxed">
            <span className="text-gray-600 shrink-0 select-none">{formatTime(log.timestamp)}</span>
            <span
              className={
                log.type === 'stderr'
                  ? 'text-red-400'
                  : log.type === 'system'
                    ? 'text-cyan-400'
                    : 'text-gray-300'
              }
            >
              {log.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
