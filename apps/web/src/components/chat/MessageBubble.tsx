'use client'

import { memo, useMemo } from 'react'
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

// ── Lightweight Markdown Renderer ──────────────────────────────────────────
// Only used for completed messages — never during streaming (avoids freeze).

interface InlineNode {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link'
  text: string
  href?: string
}

function parseInlines(line: string): InlineNode[] {
  const nodes: InlineNode[] = []
  // Match bold, italic, inline code, and links
  const rx = /(\*\*(.+?)\*\*|__(.+?)__)|(\*(.+?)\*|_(.+?)_)|(`([^`]+?)`)|(\[([^\]]+?)\]\(([^)]+?)\))/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = rx.exec(line)) !== null) {
    if (m.index > last) nodes.push({ type: 'text', text: line.slice(last, m.index) })
    if (m[1]) nodes.push({ type: 'bold', text: m[2] ?? m[3] })
    else if (m[4]) nodes.push({ type: 'italic', text: m[5] ?? m[6] })
    else if (m[7]) nodes.push({ type: 'code', text: m[8] })
    else if (m[9]) nodes.push({ type: 'link', text: m[10], href: m[11] })
    last = m.index + m[0].length
  }
  if (last < line.length) nodes.push({ type: 'text', text: line.slice(last) })
  return nodes
}

function renderInlines(nodes: InlineNode[], keyPrefix: string) {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-${i}`
    switch (n.type) {
      case 'bold':
        return <strong key={key} className="font-semibold text-white">{n.text}</strong>
      case 'italic':
        return <em key={key} className="italic text-gray-300">{n.text}</em>
      case 'code':
        return <code key={key} className="px-1.5 py-0.5 bg-gray-700/60 rounded text-indigo-300 text-xs font-mono">{n.text}</code>
      case 'link':
        return <a key={key} href={n.href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300">{n.text}</a>
      default:
        return <span key={key}>{n.text}</span>
    }
  })
}

interface Block {
  type: 'heading' | 'code' | 'bullet' | 'numbered' | 'paragraph'
  content: string
  lang?: string
  level?: number
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      blocks.push({ type: 'code', content: codeLines.join('\n'), lang })
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (headingMatch) {
      blocks.push({ type: 'heading', content: headingMatch[2], level: headingMatch[1].length })
      i++
      continue
    }

    // Bullet list item
    if (line.match(/^\s*[-*+]\s+/)) {
      blocks.push({ type: 'bullet', content: line.replace(/^\s*[-*+]\s+/, '') })
      i++
      continue
    }

    // Numbered list item
    if (line.match(/^\s*\d+[.)]\s+/)) {
      blocks.push({ type: 'numbered', content: line.replace(/^\s*\d+[.)]\s+/, '') })
      i++
      continue
    }

    // Empty line — skip
    if (!line.trim()) {
      i++
      continue
    }

    // Paragraph
    blocks.push({ type: 'paragraph', content: line })
    i++
  }

  return blocks
}

function AssistantMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text])

  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-100">
      {blocks.map((block, idx) => {
        const key = `b-${idx}`
        switch (block.type) {
          case 'heading': {
            const Tag = (`h${Math.min(block.level ?? 2, 4)}`) as 'h1' | 'h2' | 'h3' | 'h4'
            const sizes = { h1: 'text-base font-bold', h2: 'text-sm font-bold', h3: 'text-sm font-semibold', h4: 'text-sm font-medium' }
            return <Tag key={key} className={cn(sizes[Tag], 'text-white mt-1')}>{renderInlines(parseInlines(block.content), key)}</Tag>
          }
          case 'code':
            return (
              <div key={key} className="rounded-lg overflow-hidden border border-gray-700 my-1">
                {block.lang && (
                  <div className="bg-gray-800/80 px-3 py-1 border-b border-gray-700">
                    <span className="text-xs text-gray-400 font-mono">{block.lang}</span>
                  </div>
                )}
                <pre className="bg-gray-950 p-3 overflow-x-auto">
                  <code className="text-xs font-mono text-gray-300 leading-relaxed">{block.content}</code>
                </pre>
              </div>
            )
          case 'bullet':
            return (
              <div key={key} className="flex gap-2 pl-2">
                <span className="text-gray-500 shrink-0">•</span>
                <span>{renderInlines(parseInlines(block.content), key)}</span>
              </div>
            )
          case 'numbered':
            return (
              <div key={key} className="flex gap-2 pl-2">
                <span>{renderInlines(parseInlines(block.content), key)}</span>
              </div>
            )
          default:
            return <p key={key}>{renderInlines(parseInlines(block.content), key)}</p>
        }
      })}
    </div>
  )
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
            <AssistantMarkdown text={displayText} />
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
