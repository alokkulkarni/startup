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
  sendMessage: (prompt: string) => Promise<void>
  loadHistory: () => Promise<void>
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

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isStreaming) return

    setError(null)

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
        body: JSON.stringify({ prompt }),
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

      // Buffer incoming text tokens and flush to state via rAF to avoid
      // re-rendering on every single token (which freezes the browser).
      let pendingContent = ''
      let rafId: number | null = null

      const flushContent = () => {
        rafId = null
        const snapshot = pendingContent
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: snapshot } : m),
        )
      }

      const parser = createParser({
        onEvent(event) {
          try {
            const data = JSON.parse(event.data) as { type: string; text?: string; error?: string; paths?: string[] }

            if (data.type === 'text' && data.text) {
              pendingContent += data.text
              // Batch all tokens arriving within the same animation frame
              if (rafId === null) {
                rafId = requestAnimationFrame(flushContent)
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
              if (rafId !== null) {
                cancelAnimationFrame(rafId)
                rafId = null
              }
              setMessages(prev =>
                prev.map(m => {
                  if (m.id !== assistantId) return m
                  return {
                    ...m,
                    content: extractExplanation(pendingContent),
                    isStreaming: false,
                  }
                }),
              )
              setIsStreaming(false)
              onFilesChanged?.()
            } else if (data.type === 'error') {
              if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
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
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
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

  return { messages, isStreaming, error, rateLimit, sendMessage, loadHistory }
}
