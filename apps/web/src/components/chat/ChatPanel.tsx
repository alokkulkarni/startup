'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/auth'
import { useAIChat } from '@/hooks/useAIChat'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { ChatInput } from './ChatInput'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  projectId: string
  onFilesChanged?: () => void
  initialPrompt?: string | null
  autoSendPrompt?: boolean          // if true, auto-sends initialPrompt instead of just pre-filling
  onPromptConsumed?: () => void
  files?: { path: string }[]
  onRateLimit?: () => void
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Forge AI</h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
        Describe what you want to build and I&apos;ll write the code, create files, and set up your
        project.
      </p>
      <div className="mt-8 grid gap-2 w-full max-w-xs">
        {['Build a landing page with hero section', 'Add a login form with validation', 'Create a REST API endpoint'].map(
          suggestion => (
            <div
              key={suggestion}
              className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-400 text-left cursor-default hover:border-gray-600 hover:text-gray-300 transition-all duration-200"
            >
              {suggestion}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function getSuggestions(lastMessage: string): string[] {
  const suggestions: string[] = []
  if (lastMessage.includes('button') || lastMessage.includes('click')) {
    suggestions.push('Add hover animation to the button')
  }
  if (lastMessage.includes('form') || lastMessage.includes('input')) {
    suggestions.push('Add form validation with error messages')
  }
  if (lastMessage.includes('list') || lastMessage.includes('item')) {
    suggestions.push('Add the ability to delete items from the list')
  }
  if (
    lastMessage.includes('color') ||
    lastMessage.includes('style') ||
    lastMessage.includes('css')
  ) {
    suggestions.push('Make it responsive for mobile screens')
  }
  if (
    lastMessage.includes('api') ||
    lastMessage.includes('fetch') ||
    lastMessage.includes('data')
  ) {
    suggestions.push('Add a loading spinner while data is fetching')
    suggestions.push('Handle error states gracefully')
  }
  const fallbacks = [
    'Add a loading state',
    'Make it mobile responsive',
    'Add error handling',
    'Improve the styling with better spacing',
    'Add keyboard navigation support',
  ]
  while (suggestions.length < 3) {
    const fb = fallbacks.shift()
    if (fb && !suggestions.includes(fb)) suggestions.push(fb)
  }
  return suggestions.slice(0, 3)
}

export function ChatPanel({ projectId, onFilesChanged, initialPrompt, autoSendPrompt, onPromptConsumed, files, onRateLimit }: ChatPanelProps) {
  const { authenticated } = useAuth()
  const token = typeof window !== 'undefined' ? getToken() ?? null : null
  const { messages, isStreaming, error, rateLimit, sendMessage, loadHistory } = useAIChat(
    projectId,
    token,
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevStreamingRef = useRef(false)
  const [input, setInput] = useState('')
  const autoSentRef = useRef(false)

  // Pre-fill OR auto-send initial prompt (e.g., from onboarding "Start Building")
  useEffect(() => {
    if (!initialPrompt) return
    if (autoSendPrompt && !autoSentRef.current && !isStreaming) {
      autoSentRef.current = true
      onPromptConsumed?.()
      sendMessage(initialPrompt)
    } else if (!autoSendPrompt) {
      setInput(initialPrompt)
      onPromptConsumed?.()
    }
  }, [initialPrompt, autoSendPrompt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authenticated) {
      loadHistory()
    }
  }, [authenticated, loadHistory])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Notify parent when rate limit is hit
  useEffect(() => {
    if (rateLimit?.remaining === 0) {
      onRateLimit?.()
    }
  }, [rateLimit?.remaining]) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent when AI finishes streaming (files may have changed)
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && messages.length > 0) {
      onFilesChanged?.()
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming, messages.length, onFilesChanged])

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Forge AI</span>
        </div>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg border border-gray-700">
          Claude 3.5 Sonnet
        </span>
      </div>

      {/* Rate limit banner */}
      {rateLimit?.remaining === 0 && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-yellow-900/40 border-b border-yellow-700/50">
          <svg
            className="w-4 h-4 text-yellow-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-xs text-yellow-300">
            Rate limit reached ({rateLimit.limit} messages/day). Upgrade your plan for more.
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isStreaming ? (
          <EmptyState />
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                createdAt={msg.createdAt}
                isStreaming={msg.isStreaming}
              />
            ))}
            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <TypingIndicator />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested follow-up prompts */}
      {!isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
        <div className="px-3 pb-2 flex flex-col gap-1.5">
          {getSuggestions(messages[messages.length - 1].content).map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="text-left text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 transition-all truncate"
            >
              💡 {s}
            </button>
          ))}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl bg-red-950/50 border border-red-800/50">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0">
        <ChatInput
          onSend={sendMessage}
          isStreaming={isStreaming}
          disabled={!authenticated || rateLimit?.remaining === 0}
          value={input}
          onChange={setInput}
          files={files}
        />
      </div>
    </div>
  )
}
