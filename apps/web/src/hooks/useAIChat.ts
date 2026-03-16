'use client'

import { useState, useCallback } from 'react'
import { createParser } from 'eventsource-parser'
import { api } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  isStreaming?: boolean
  isPlan?: boolean
  /** File paths created/modified/deleted by this assistant message. */
  changedPaths?: string[]
}

/**
 * Strip all AI file-output XML (<forge_changes>, <file> tags and their content)
 * so the chat only stores and displays the human-readable explanation text.
 */
function extractExplanation(content: string): string {
  return content
    .replace(/<forge_changes>[\s\S]*?<\/forge_changes>/g, '')
    .replace(/<forge_changes>[\s\S]*/g, '')        // incomplete tag (shouldn't happen on done)
    .replace(/<file\s[^>]*>[\s\S]*?<\/file>/g, '') // bare file tags (AI ignoring format)
    .replace(/<file\s[^>]*>[\s\S]*/g, '')           // incomplete bare tag
    .replace(/```[\w.\-/ ]*\n[\s\S]*?```/g, '')     // markdown code blocks
    .replace(/```[\w.\-/ ]*\n[\s\S]*/g, '')          // partial code block
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface HistoryResponse {
  messages: Message[]
  conversationId: string
}

interface UseAIChatReturn {
  messages: Message[]
  isStreaming: boolean
  error: string | null
  rateLimit: { remaining: number; limit: number } | null
  pendingPlan: boolean
  sendMessage: (prompt: string, mode?: 'agent' | 'plan') => Promise<void>
  loadHistory: () => Promise<void>
  clearPendingPlan: () => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useAIChat(
  projectId: string,
  token: string | null,
  onFilesChanged?: () => void,
): UseAIChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null)
  const [pendingPlan, setPendingPlan] = useState(false)

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get<HistoryResponse>(`/v1/projects/${projectId}/ai/history`)
      if (res.data?.messages) {
        setMessages(res.data.messages)
      }
    } catch (err) {
      // History load failure is non-fatal; start fresh
      console.error('Failed to load chat history', err)
    }
  }, [projectId])

  const clearPendingPlan = useCallback(() => setPendingPlan(false), [])

  const sendMessage = useCallback(async (prompt: string, mode: 'agent' | 'plan' = 'agent') => {
    if (!prompt.trim() || isStreaming) return

    setError(null)
    // Clear any pending plan confirmation when a new message is sent
    setPendingPlan(false)

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    }

    const assistantId = generateId()
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMessage, assistantPlaceholder])
    setIsStreaming(true)

    try {
      const response = await fetch(`${API_URL}/v1/projects/${projectId}/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, mode }),
      })

      if (response.status === 429) {
        setRateLimit({ remaining: 0, limit: 50 })
        setMessages(prev => prev.filter(m => m.id !== assistantId))
        setIsStreaming(false)
        setError('Rate limit reached. Please wait before sending another message.')
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()

      // Buffer incoming text tokens and flush to state on a 100ms throttle.
      // requestAnimationFrame (60fps) was too fast for large responses — streaming
      // 100KB+ of code caused React to re-render and lay out a huge text node 60x/s,
      // eventually blocking the main thread long enough to trigger "Page Unresponsive".
      let pendingContent = ''
      let flushTimerId: ReturnType<typeof setTimeout> | null = null

      // ── CRITICAL: raw file content must NEVER enter React state ────────────
      // Storing the full streaming content (prose + <forge_changes> XML with
      // entire file bodies) in React state and calling setMessages at 10fps
      // triggers expensive re-renders on a 50–200 KB whitespace-pre-wrap node,
      // blocking the main thread and causing "Page Unresponsive".
      //
      // Solution: flushContent only ever puts METADATA into state:
      //   • Thinking phase  → nothing (empty content → "Thinking…" spinner)
      //   • Writing phase   → short explanation preview (≤400 chars) + file paths
      //   • Done            → extractExplanation() strips XML → clean prose
      //
      // The pendingContent local var still accumulates the full raw stream so
      // extractExplanation() can strip it correctly on done.

      let thinkingStartMs: number | null = null

      const flushContent = () => {
        flushTimerId = null
        const snapshot = pendingContent
        const forgeStart = snapshot.indexOf('<forge_changes>')

        if (forgeStart === -1) {
          // ── Thinking phase ─────────────────────────────────────────────────
          if (thinkingStartMs === null) thinkingStartMs = Date.now()
          const elapsedMs = Date.now() - thinkingStartMs

          // Guard: preamble is runaway-large OR model has been thinking too long
          if (snapshot.length > 30_000 || elapsedMs > 120_000) {
            reader.cancel()
            const reason = elapsedMs > 120_000
              ? 'The model took too long to respond. Please try again with a more specific request.'
              : 'Response was unexpectedly large without producing file changes. Please try a more specific request.'
            setError(reason)
            setMessages(prev => prev.filter(m => m.id !== assistantId))
            setIsStreaming(false)
            return
          }

          // No state update — content stays '' → MessageBubble shows "Thinking…"
          return
        }

        // ── File-writing phase ────────────────────────────────────────────────
        // Extract file paths from partial XML (cheap regex on just the forge section)
        const forgeSection = snapshot.slice(forgeStart)
        const fileRe = /<file\s+path="([^"]+)"/g
        const paths: string[] = []
        let fm: RegExpExecArray | null
        while ((fm = fileRe.exec(forgeSection)) !== null) paths.push(fm[1])

        // Store ONLY the short explanation preview + file paths.
        // Never store the file body content — it can be 100 KB+.
        const shortExplanation = snapshot.slice(0, forgeStart)
          .replace(/```[\s\S]*?```/g, '')
          .replace(/```[\s\S]*/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
          .slice(0, 400)

        setMessages(prev =>
          prev.map(m => m.id === assistantId
            ? { ...m, content: shortExplanation, changedPaths: paths }
            : m),
        )
      }

      const parser = createParser({
        onEvent(event) {
          try {
            const data = JSON.parse(event.data) as { type: string; text?: string; error?: string; paths?: string[]; isPlan?: boolean }

            if (data.type === 'text' && data.text) {
              pendingContent += data.text
              // Throttle UI updates to 100ms — prevents browser hang on large responses
              if (flushTimerId === null) {
                flushTimerId = setTimeout(flushContent, 100)
              }
            } else if (data.type === 'file_written') {
              onFilesChanged?.()
            } else if (data.type === 'files_changed') {
              const paths: string[] = data.paths ?? []
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, changedPaths: paths } : m,
                ),
              )
              onFilesChanged?.()
            } else if (data.type === 'done') {
              if (flushTimerId !== null) {
                clearTimeout(flushTimerId)
                flushTimerId = null
              }
              setMessages(prev =>
                prev.map(m => {
                  if (m.id !== assistantId) return m
                  return {
                    ...m,
                    content: extractExplanation(pendingContent),
                    isStreaming: false,
                    isPlan: data.isPlan === true,
                  }
                }),
              )
              setIsStreaming(false)
              if (data.isPlan === true) {
                setPendingPlan(true)
              }
              onFilesChanged?.()
            } else if (data.type === 'error') {
              if (flushTimerId !== null) { clearTimeout(flushTimerId); flushTimerId = null }
              setError(data.error ?? 'An error occurred')
              setMessages(prev => prev.filter(m => m.id !== assistantId))
              setIsStreaming(false)
            }
          } catch {
            // Ignore malformed JSON events
          }
        },
      })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        parser.feed(decoder.decode(value, { stream: true }))
      }

      // Ensure streaming flag is cleared if stream ended without explicit done event
      if (flushTimerId !== null) { clearTimeout(flushTimerId); flushTimerId = null }
      setMessages(prev =>
        prev.map(m => (m.id === assistantId ? { ...m, content: extractExplanation(pendingContent), isStreaming: false } : m)),
      )
      setIsStreaming(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
      setMessages(prev => prev.filter(m => m.id !== assistantId))
      setIsStreaming(false)
    }
  }, [projectId, token, isStreaming, onFilesChanged])

  return { messages, isStreaming, error, rateLimit, pendingPlan, sendMessage, loadHistory, clearPendingPlan }
}
