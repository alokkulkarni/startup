'use client'

import { cn } from '@/lib/utils'
import { DiffViewer } from './DiffViewer'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  isStreaming?: boolean
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

interface ParsedContent {
  explanation: string
  diffs: Array<{ filePath: string; diff: string; action: string }>
  trailing: string
}

function parseForgeChanges(content: string): ParsedContent {
  const result: ParsedContent = { explanation: '', diffs: [], trailing: '' }
  const tagPattern = /<forge_changes>([\s\S]*?)<\/forge_changes>/g
  let lastIndex = 0
  const explanationParts: string[] = []
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(content)) !== null) {
    explanationParts.push(content.slice(lastIndex, match.index))
    const inner = match[1]
    const filePattern = /<file\s+path="([^"]+)"(?:\s+action="([^"]*)")?[^>]*>([\s\S]*?)<\/file>/g
    let fileMatch: RegExpExecArray | null
    while ((fileMatch = filePattern.exec(inner)) !== null) {
      const action = (fileMatch[2] ?? '').toLowerCase() || 'modify'
      result.diffs.push({ filePath: fileMatch[1], diff: fileMatch[3].trim(), action })
    }
    lastIndex = match.index + match[0].length
  }

  result.explanation = explanationParts.join('').trim()
  result.trailing = content.slice(lastIndex).trim()
  return result
}

function hasForgeChanges(content: string): boolean {
  return content.includes('<forge_changes>')
}

/** Strip complete and partial markdown code fences from assistant chat display. */
function stripCodeBlocksForDisplay(text: string): string {
  return text
    .replace(/```[\w.\-/ ]*\n[\s\S]*?```/g, '')  // complete fences
    .replace(/```[\w.\-/ ]*\n[\s\S]*/g, '')        // partial fence (still streaming)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function MessageBubble({ role, content, createdAt, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%]">
          <div
            className={cn(
              'px-4 py-3 rounded-2xl rounded-br-none',
              'bg-indigo-600 text-white',
              'transition-all duration-200',
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right pr-1">
            {formatRelativeTime(createdAt)}
          </p>
        </div>
      </div>
    )
  }

  // Assistant message
  const parsed = hasForgeChanges(content) ? parseForgeChanges(content) : null

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] w-full">
        <div
          className={cn(
            'px-4 py-3 rounded-2xl rounded-bl-none',
            'bg-gray-800 text-white border border-gray-700',
            'transition-all duration-200',
          )}
        >
          {parsed ? (
            <>
              {parsed.explanation && (
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed mb-3">
                  {parsed.explanation}
                </p>
              )}
              {parsed.diffs.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {parsed.diffs.map((d, i) => (
                    d.action === 'create' ? (
                      // New file — show as a badge, not a diff
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-green-950/50 border border-green-800/50 rounded-lg">
                        <span className="text-green-400 text-xs">✚</span>
                        <span className="text-xs font-mono text-green-300 truncate">{d.filePath}</span>
                        <span className="text-xs text-green-600 ml-auto shrink-0">created</span>
                      </div>
                    ) : d.action === 'delete' ? (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-red-950/50 border border-red-800/50 rounded-lg">
                        <span className="text-red-400 text-xs">✕</span>
                        <span className="text-xs font-mono text-red-300 truncate">{d.filePath}</span>
                        <span className="text-xs text-red-600 ml-auto shrink-0">deleted</span>
                      </div>
                    ) : (
                      <DiffViewer key={i} filePath={d.filePath} diff={d.diff} />
                    )
                  ))}
                </div>
              )}
              {parsed.trailing && (
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed mt-3">
                  {parsed.trailing}
                </p>
              )}
            </>
          ) : (
            <>
              {(() => {
                const hasCodeBlocks = /```[\w.\-/ ]*\n/.test(content)
                const displayText = stripCodeBlocksForDisplay(
                  content
                    .replace(/<forge_changes>[\s\S]*?<\/forge_changes>/g, '')
                    .replace(/<forge_changes>[\s\S]*/g, ''),
                )
                const isWritingFiles = isStreaming && hasCodeBlocks

                return (
                  <>
                    {displayText && (
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {displayText}
                      </p>
                    )}
                    {isWritingFiles && (
                      <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-violet-400">
                        <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                        Writing files…
                      </span>
                    )}
                    {!isStreaming && hasCodeBlocks && !displayText && (
                      <p className="text-sm text-gray-400 italic">✓ Files written to project</p>
                    )}
                    {isStreaming && !hasCodeBlocks && !content.includes('<forge_changes>') && (
                      <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
                    )}
                    {isStreaming && content.includes('<forge_changes>') && !content.includes('</forge_changes>') && (
                      <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-violet-400">
                        <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                        Writing files…
                      </span>
                    )}
                  </>
                )
              })()}
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 pl-1">{formatRelativeTime(createdAt)}</p>
      </div>
    </div>
  )
}
