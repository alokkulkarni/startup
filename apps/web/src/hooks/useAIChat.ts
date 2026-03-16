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
  /** File paths being written to project (during streaming, from server file_written events). */
  streamingFilePaths?: string[]
  /** File paths created/modified/deleted by this assistant message (after streaming complete). */
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

    // Safety net: if the server never sends 'done' (network drop, crash, etc.)
    // abort after 5 minutes so the Stop button doesn't stay up forever.
    const abortController = new AbortController()
    const streamingTimeout = setTimeout(() => abortController.abort(), 300_000)

    try {
      const response = await fetch(`${API_URL}/v1/projects/${projectId}/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, mode }),
        signal: abortController.signal,
      })

      if (response.status === 429) {
        clearTimeout(streamingTimeout)
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

      // Stream text tokens directly into React state. React 18 automatic batching
      // groups all setState calls inside a single reader.read() chunk into one render.
      // KEY OPTIMIZATION: stop accumulating raw file/code content in React state.
      // We truncate at two boundaries:
      //   1. <forge_changes> — model using proper XML format
      //   2. \n``` — model writing code directly (non-compliant, but must be handled)
      // In both cases, once we hit these markers we flip the message into
      // "writing files" mode (streamingFilePaths defined) which shows the spinner/
      // file badge UI instead of rendering raw code in the chat bubble.
      // File paths are populated via file_written server events.

      const parser = createParser({
        onEvent(event) {
          try {
            const data = JSON.parse(event.data) as { type: string; text?: string; path?: string; error?: string; paths?: string[]; isPlan?: boolean }

            if (data.type === 'text' && data.text) {
              setMessages(prev =>
                prev.map(m => {
                  if (m.id !== assistantId) return m
                  // Once writing mode starts (streamingFilePaths defined), stop
                  // accumulating text. The model continues streaming XML/code which
                  // must NOT enter React state — it causes unbounded growth and freezes.
                  if (m.streamingFilePaths !== undefined) return m
                  const newContent = m.content + data.text!

                  // Find the earliest truncation boundary
                  const forgeIdx = newContent.indexOf('<forge_changes>')
                  // Detect code fence opening: newline then ``` (multi-line code block)
                  const fenceIdx = newContent.search(/\n```[\w.\-/ ]*\n/)

                  const truncateAt = Math.min(
                    forgeIdx !== -1 ? forgeIdx : Infinity,
                    fenceIdx !== -1 ? fenceIdx : Infinity,
                  )

                  if (truncateAt !== Infinity) {
                    // Switch to writing-files mode: keep only explanation before the boundary.
                    // streamingFilePaths: [] (defined but empty) signals "writing phase started".
                    return {
                      ...m,
                      content: newContent.slice(0, truncateAt).trimEnd(),
                      streamingFilePaths: m.streamingFilePaths ?? [],
                    }
                  }
                  return { ...m, content: newContent }
                }),
              )
            } else if (data.type === 'file_written') {
              // Track each file as it's written so MessageBubble can show progress badges.
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, streamingFilePaths: [...(m.streamingFilePaths ?? []), data.path!] }
                    : m,
                ),
              )
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
              clearTimeout(streamingTimeout)
              setMessages(prev =>
                prev.map(m => {
                  if (m.id !== assistantId) return m
                  // content is already explanation-only (XML/code stripped during streaming).
                  // extractExplanation runs once as a safety net for any residual tags.
                  return {
                    ...m,
                    content: extractExplanation(m.content),
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
              clearTimeout(streamingTimeout)
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

      // Ensure streaming flag is cleared if stream ended without explicit done event.
      // content is already explanation-only (XML/code stripped during streaming).
      clearTimeout(streamingTimeout)
      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: extractExplanation(m.content), isStreaming: false }
          : m),
      )
      setIsStreaming(false)
    } catch (err) {
      clearTimeout(streamingTimeout)
      // AbortError = our 5-min safety timeout fired — clean up silently
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m => m.id === assistantId
            ? { ...m, content: extractExplanation(m.content), isStreaming: false }
            : m),
        )
        setIsStreaming(false)
        return
      }
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
      setMessages(prev => prev.filter(m => m.id !== assistantId))
      setIsStreaming(false)
    }
  }, [projectId, token, isStreaming, onFilesChanged])

  return { messages, isStreaming, error, rateLimit, pendingPlan, sendMessage, loadHistory, clearPendingPlan }
}
