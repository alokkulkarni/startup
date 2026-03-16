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

      // Stream text tokens directly into React state on every SSE event.
      // React 18 automatic batching groups all setState calls that arrive
      // inside a single reader.read() chunk into one render pass, so this
      // is both correct and efficient — no timers, no buffers needed.
      // On `done` we call extractExplanation() once to strip raw XML from
      // the stored message so the DB and history display are clean.

      const parser = createParser({
        onEvent(event) {
          try {
            const data = JSON.parse(event.data) as { type: string; text?: string; error?: string; paths?: string[]; isPlan?: boolean }

            if (data.type === 'text' && data.text) {
              // Append token directly — React 18 batches rapid-fire calls
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: m.content + data.text! } : m,
                ),
              )
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
              setMessages(prev =>
                prev.map(m => {
                  if (m.id !== assistantId) return m
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
      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: extractExplanation(m.content), isStreaming: false }
          : m),
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
