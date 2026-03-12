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
  diffs: Array<{ filePath: string; diff: string }>
  trailing: string
}

function parseForgeChanges(content: string): ParsedContent {
  const result: ParsedContent = { explanation: '', diffs: [], trailing: '' }
  const tagPattern = /<forge_changes>([\s\S]*?)<\/forge_changes>/g
  let lastIndex = 0
  let explanationParts: string[] = []
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(content)) !== null) {
    explanationParts.push(content.slice(lastIndex, match.index))
    const inner = match[1]
    // Expect: <file path="...">diff content</file>
    const filePattern = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g
    let fileMatch: RegExpExecArray | null
    while ((fileMatch = filePattern.exec(inner)) !== null) {
      result.diffs.push({ filePath: fileMatch[1], diff: fileMatch[2].trim() })
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
              {parsed.diffs.map((d, i) => (
                <DiffViewer key={i} filePath={d.filePath} diff={d.diff} />
              ))}
              {parsed.trailing && (
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed mt-3">
                  {parsed.trailing}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {content}
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
              )}
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 pl-1">{formatRelativeTime(createdAt)}</p>
      </div>
    </div>
  )
}
