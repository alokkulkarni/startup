'use client'

import { Fragment, memo } from 'react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  isStreaming?: boolean
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

// ---------------------------------------------------------------------------
// Lightweight inline markdown renderer (no external deps)
// Handles: paragraphs, bold, italic, inline code, links, h1-h3, ul/ol lists.
// ---------------------------------------------------------------------------

type Inline = { type: 'text'; value: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'italic'; children: Inline[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; children: Inline[] }

type Block = { type: 'paragraph'; inlines: Inline[] }
  | { type: 'heading'; level: 1 | 2 | 3; inlines: Inline[] }
  | { type: 'ul'; items: Inline[][] }
  | { type: 'ol'; items: Inline[][] }
  | { type: 'code_block'; value: string; lang: string }

/** Parse inline markdown spans in a string. */
function parseInlines(text: string): Inline[] {
  const out: Inline[] = []
  // Combined regex: **bold** | *italic* | `code` | [text](url)
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) })
    if (m[1] !== undefined)      out.push({ type: 'bold',   children: parseInlines(m[1]) })
    else if (m[2] !== undefined) out.push({ type: 'italic', children: parseInlines(m[2]) })
    else if (m[3] !== undefined) out.push({ type: 'code',   value: m[3] })
    else if (m[4] !== undefined) out.push({ type: 'link',   href: m[5], children: parseInlines(m[4]) })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
  return out
}

/** Convert parsed inline nodes to React elements. */
function renderInlines(nodes: Inline[], keyPrefix: string): React.ReactNode {
  return nodes.map((n, i) => {
    const k = `${keyPrefix}-${i}`
    if (n.type === 'text')   return <Fragment key={k}>{n.value}</Fragment>
    if (n.type === 'bold')   return <strong key={k} className="font-semibold text-white">{renderInlines(n.children, k)}</strong>
    if (n.type === 'italic') return <em key={k} className="italic text-gray-300">{renderInlines(n.children, k)}</em>
    if (n.type === 'code')   return <code key={k} className="bg-gray-900 rounded px-1.5 py-0.5 text-xs font-mono text-violet-300 border border-gray-700">{n.value}</code>
    if (n.type === 'link')   return <a key={k} href={n.href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300">{renderInlines(n.children, k)}</a>
    return null
  })
}

/** Parse a markdown string into blocks. */
function parseBlocks(md: string): Block[] {
  const lines = md.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'code_block', value: codeLines.join('\n'), lang })
      i++
      continue
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.+)/)
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length as 1|2|3, inlines: parseInlines(h[2]) })
      i++
      continue
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: Inline[][] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(parseInlines(lines[i].replace(/^[-*]\s+/, '')))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: Inline[][] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(parseInlines(lines[i].replace(/^\d+\.\s+/, '')))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // Blank line → skip
    if (line.trim() === '') { i++; continue }

    // Paragraph: gather consecutive non-empty, non-special lines
    const paraLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3}|```|[-*]|\d+\.)/.test(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length) {
      blocks.push({ type: 'paragraph', inlines: parseInlines(paraLines.join(' ')) })
    }
  }
  return blocks
}

/** Render parsed blocks as React elements. */
function renderBlocks(blocks: Block[]): React.ReactNode {
  return blocks.map((b, bi) => {
    const k = `b${bi}`
    if (b.type === 'heading') {
      const cls = b.level === 1
        ? 'text-base font-bold text-white mb-2 mt-3'
        : b.level === 2
        ? 'text-sm font-bold text-white mb-1.5 mt-3'
        : 'text-sm font-semibold text-gray-200 mb-1 mt-2'
      const Tag = `h${b.level}` as 'h1'|'h2'|'h3'
      return <Tag key={k} className={cls}>{renderInlines(b.inlines, k)}</Tag>
    }
    if (b.type === 'paragraph') {
      return <p key={k} className="text-sm leading-relaxed mb-2 last:mb-0">{renderInlines(b.inlines, k)}</p>
    }
    if (b.type === 'ul') {
      return (
        <ul key={k} className="text-sm list-disc list-inside space-y-1 mb-2 text-gray-200">
          {b.items.map((item, ii) => (
            <li key={ii} className="leading-relaxed">{renderInlines(item, `${k}-li${ii}`)}</li>
          ))}
        </ul>
      )
    }
    if (b.type === 'ol') {
      return (
        <ol key={k} className="text-sm list-decimal list-inside space-y-1 mb-2 text-gray-200">
          {b.items.map((item, ii) => (
            <li key={ii} className="leading-relaxed">{renderInlines(item, `${k}-li${ii}`)}</li>
          ))}
        </ol>
      )
    }
    if (b.type === 'code_block') {
      return (
        <code key={k} className="block bg-gray-900 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 overflow-x-auto my-2 border border-gray-700 whitespace-pre">
          {b.value}
        </code>
      )
    }
    return null
  })
}

/** Renders markdown explanation text with no external dependencies. */
function AssistantMarkdown({ text }: { text: string }) {
  if (!text.trim()) return null
  const blocks = parseBlocks(text)
  return <div className="text-white">{renderBlocks(blocks)}</div>
}

// ---------------------------------------------------------------------------
// Streaming-state parser
// ---------------------------------------------------------------------------

interface StreamState {
  explanation: string
  isWritingFiles: boolean
  streamingFilePaths: string[]
}

function parseStreamState(content: string): StreamState {
  if (!content.includes('<forge_changes>')) {
    return { explanation: stripFileXml(content), isWritingFiles: false, streamingFilePaths: [] }
  }

  const openIdx = content.indexOf('<forge_changes>')
  const explanation = content.slice(0, openIdx).trim()
  const closeIdx = content.indexOf('</forge_changes>')

  if (closeIdx !== -1) {
    const inner = content.slice(openIdx + '<forge_changes>'.length, closeIdx)
    return { explanation, isWritingFiles: false, streamingFilePaths: extractFilePaths(inner) }
  }

  // Block still open (streaming)
  const partial = content.slice(openIdx)
  return { explanation, isWritingFiles: true, streamingFilePaths: extractFilePaths(partial) }
}

function extractFilePaths(text: string): string[] {
  const paths: string[] = []
  const re = /<file\s+path="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) paths.push(m[1])
  return paths
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StreamingFileBadge({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-violet-950/30 border border-violet-800/40 rounded-lg">
      <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
      <span className="text-xs font-mono text-violet-300 truncate">{path}</span>
    </div>
  )
}

function FileSummaryCard({ paths }: { paths: string[] }) {
  const MAX_SHOWN = 8
  const shown = paths.slice(0, MAX_SHOWN)
  const overflow = paths.length - MAX_SHOWN

  return (
    <div className="mt-3 rounded-xl border border-green-800/40 bg-green-950/25 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-green-800/30">
        <span className="text-green-400 text-xs">✓</span>
        <span className="text-xs font-medium text-green-300">
          {paths.length} file{paths.length !== 1 ? 's' : ''} written to project
        </span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {shown.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-green-500 text-xs shrink-0">+</span>
            <span className="text-xs font-mono text-green-300 truncate">{p}</span>
          </div>
        ))}
        {overflow > 0 && (
          <p className="text-xs text-green-700 pt-0.5">…and {overflow} more</p>
        )}
      </div>
    </div>
  )
}

// For historical DB messages that still have raw XML
interface LegacyParsed {
  explanation: string
  diffs: Array<{ filePath: string; diff: string; action: string }>
}

function parseLegacyContent(content: string): LegacyParsed {
  const explanation = stripFileXml(content)
  const diffs: LegacyParsed['diffs'] = []
  const forgeMatch = content.match(/<forge_changes>([\s\S]*?)<\/forge_changes>/)
  if (forgeMatch) {
    const re = /<file\s+path="([^"]+)"(?:\s+action="([^"]*)")?[^>]*>([\s\S]*?)<\/file>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(forgeMatch[1])) !== null) {
      diffs.push({ filePath: m[1], diff: m[3].trim(), action: (m[2] ?? '').toLowerCase() || 'create' })
    }
  }
  return { explanation, diffs }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const MessageBubble = memo(function MessageBubble({ role, content, createdAt, isStreaming, changedPaths }: MessageBubbleProps) {
  const isUser = role === 'user'

  // ── User bubble ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%]">
          <div className={cn('px-4 py-3 rounded-2xl rounded-br-none bg-indigo-600 text-white transition-all duration-200')}>
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right pr-1">{formatRelativeTime(createdAt)}</p>
        </div>
      </div>
    )
  }

  // ── Assistant bubble — STREAMING ─────────────────────────────────────────
  if (isStreaming) {
    // content accumulates raw stream text (including <forge_changes> XML).
    // parseStreamState extracts the explanation and detects the writing phase
    // by checking for an open <forge_changes> block. stripFileXml ensures
    // file body content is never rendered into the DOM.
    const { explanation, isWritingFiles, streamingFilePaths } = parseStreamState(content)

    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%] w-full">
          <div className={cn('px-4 py-3 rounded-2xl rounded-bl-none bg-gray-800 text-white border border-gray-700')}>
            {explanation && (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-gray-100 mb-2">
                {explanation}
                {!isWritingFiles && (
                  <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
                )}
              </p>
            )}
            {!explanation && !isWritingFiles && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Thinking…
              </span>
            )}
            {isWritingFiles && (
              <div className="space-y-1">
                {streamingFilePaths.length > 0 ? (
                  streamingFilePaths.map((fp, i) => <StreamingFileBadge key={i} path={fp} />)
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

  // ── Assistant bubble — COMPLETE (fresh, changedPaths known) ─────────────
  if (changedPaths !== undefined) {
    const explanation = stripFileXml(content)
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%] w-full">
          <div className={cn('px-4 py-3 rounded-2xl rounded-bl-none bg-gray-800 text-white border border-gray-700 transition-all duration-200')}>
            {explanation
              ? <AssistantMarkdown text={explanation} />
              : <p className="text-sm text-gray-400 italic">✓ Done</p>
            }
          </div>
          <p className="text-xs text-gray-500 mt-1 pl-1">{formatRelativeTime(createdAt)}</p>
        </div>
      </div>
    )
  }

  // ── Assistant bubble — HISTORICAL (loaded from DB, may contain XML) ──────
  const legacy = parseLegacyContent(content)
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] w-full">
        <div className={cn('px-4 py-3 rounded-2xl rounded-bl-none bg-gray-800 text-white border border-gray-700 transition-all duration-200')}>
          {legacy.explanation
            ? <AssistantMarkdown text={legacy.explanation} />
            : <p className="text-sm text-gray-400 italic">✓ Done</p>
          }
        </div>
        <p className="text-xs text-gray-500 mt-1 pl-1">{formatRelativeTime(createdAt)}</p>
      </div>
    </div>
  )
})
