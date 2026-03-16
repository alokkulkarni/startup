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

      // Stream text tokens directly into React state. React 18 automatic batching
      // groups all setState calls inside a single reader.read() chunk into one render.
      // KEY OPTIMIZATION: once <forge_changes> appears we stop accumulating raw XML
      // into React state (it can be 100-200KB of file bodies). File progress is
      // tracked separately via file_written events from the server.

      const parser = createParser({
        onEvent(event) {
          try {
            const data = JSON.parse(event.data) as { type: string; text?: string; path?: string; error?: string; paths?: string[]; isPlan?: boolean }

            if (data.type === 'text' && data.text) {
              setMessages(prev =>
                prev.map(m => {
                  if (m.id !== assistantId) return m
                  const newContent = m.content + data.text!
                  // Once forge_changes XML starts, stop accumulating file bodies in state.
                  // The explanation text before the tag is all we need to display.
                  const forgeIdx = newContent.indexOf('<forge_changes>')
                  if (forgeIdx !== -1) {
                    return { ...m, content: newContent.slice(0, forgeIdx).trimEnd() }
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
              setMessages(prev =>
                prev.map(m => {
                  if (m.id !== assistantId) return m
                  // content is already explanation-only (XML was stripped during streaming).
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
      // content is already explanation-only (XML stripped during streaming).
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
