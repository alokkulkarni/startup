'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  isStreaming?: boolean
  /** File paths being written to project (during streaming). */
  streamingFilePaths?: string[]
  /** File paths created/modified/deleted by this assistant message. */
  changedPaths?: string[]
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour}h ago`
  return date.toLocaleDateString()
}

function stripFileXml(text: string): string {
  return text
    .replace(/<forge_changes>[\s\S]*?<\/forge_changes>/g, '')
    .replace(/<forge_changes>[\s\S]*/g, '')
    .replace(/<file\s[^>]*>[\s\S]*?<\/file>/g, '')
    .replace(/<file\s[^>]*>[\s\S]*/g, '')
    .replace(/```[\w.\-/ ]*\n[\s\S]*?```/g, '')
    .replace(/```[\w.\-/ ]*\n[\s\S]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  createdAt,
  isStreaming,
  streamingFilePaths,
  changedPaths,
}: MessageBubbleProps) {
  const isUser = role === 'user'

  // ── User bubble ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%]">
          <div className={cn('px-4 py-3 rounded-2xl rounded-br-none bg-indigo-600 text-white')}>
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right pr-1">{formatRelativeTime(createdAt)}</p>
        </div>
      </div>
    )
  }

  // ── Assistant bubble — STREAMING ─────────────────────────────────────────
  // streamingFilePaths === undefined  → explanation phase (show text + cursor)
  // streamingFilePaths === []         → writing phase, no files confirmed yet
  // streamingFilePaths === [...]      → files being written (show path badges)
  if (isStreaming) {
    const isWritingFiles = streamingFilePaths !== undefined

    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%] w-full">
          <div className={cn('px-4 py-3 rounded-2xl rounded-bl-none bg-gray-800 text-white border border-gray-700')}>
            {content && (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-gray-100 mb-2">
                {content}
                {!isWritingFiles && (
                  <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
                )}
              </p>
            )}
            {!content && !isWritingFiles && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Thinking…
              </span>
            )}
            {isWritingFiles && (
              <div className="space-y-1 mt-1">
                {streamingFilePaths!.length > 0 ? (
                  streamingFilePaths!.map((fp, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-violet-950/30 border border-violet-800/40 rounded-lg">
                      <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="text-xs font-mono text-violet-300 truncate">{fp}</span>
                    </div>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-violet-400">
                    <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                    Writing files…
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 pl-1">{formatRelativeTime(createdAt)}</p>
        </div>
      </div>
    )
  }

  // ── Assistant bubble — COMPLETE (includes historical DB messages) ─────────
  // stripFileXml cleans any residual XML in fresh or historical messages.
  const displayText = stripFileXml(content)
  const filePaths = changedPaths ?? []

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] w-full">
        <div className={cn('px-4 py-3 rounded-2xl rounded-bl-none bg-gray-800 text-white border border-gray-700')}>
          {displayText ? (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-gray-100">
              {displayText}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">✓ Done</p>
          )}
          {filePaths.length > 0 && (
            <div className="mt-3 space-y-1">
              {filePaths.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-green-950/50 border border-green-800/50 rounded-lg">
                  <span className="text-green-400 text-xs shrink-0">✓</span>
                  <span className="text-xs font-mono text-green-300 truncate">{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 pl-1">{formatRelativeTime(createdAt)}</p>
      </div>
    </div>
  )
})
