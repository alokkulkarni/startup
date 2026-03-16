'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/auth'
import { useAIChat } from '@/hooks/useAIChat'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { ChatInput } from './ChatInput'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  projectId: string
  onFilesChanged?: (paths?: string[]) => void
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
  const { messages, isStreaming, error, rateLimit, pendingPlan, sendMessage, loadHistory, clearPendingPlan } = useAIChat(
    projectId,
    token,
    onFilesChanged,
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [chatMode, setChatMode] = useState<'agent' | 'plan'>('agent')
  const autoSentRef = useRef<string | null>(null)

  // Pre-fill OR auto-send initial prompt (e.g., from onboarding "Start Building" or "Fix with AI")
  useEffect(() => {
    if (!initialPrompt) return
    if (autoSendPrompt && autoSentRef.current !== initialPrompt && !isStreaming) {
      autoSentRef.current = initialPrompt
      onPromptConsumed?.()
      sendMessage(initialPrompt, 'agent')
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

  const messagesLenRef = useRef(0)

  useEffect(() => {
    const newMessage = messages.length > messagesLenRef.current
    messagesLenRef.current = messages.length
    bottomRef.current?.scrollIntoView({ behavior: newMessage ? 'smooth' : 'instant' })
  }, [messages.length, isStreaming])

  useEffect(() => {
    if (rateLimit?.remaining === 0) {
      onRateLimit?.()
    }
  }, [rateLimit?.remaining]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback((prompt: string, mode: 'agent' | 'plan') => {
    sendMessage(prompt, mode)
  }, [sendMessage])

  const handleApprovePlan = useCallback(() => {
    clearPendingPlan()
    setChatMode('agent')
    sendMessage('Approved. Please execute the plan above exactly as described.', 'agent')
  }, [clearPendingPlan, sendMessage])

  const handleCancelPlan = useCallback(() => {
    clearPendingPlan()
  }, [clearPendingPlan])


  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Forge AI" className="w-6 h-6 rounded-lg" />
          <span className="text-sm font-semibold text-white">Forge AI</span>
        </div>
        <div className="flex items-center gap-2">
          {chatMode === 'plan' && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-300 bg-amber-900/40 border border-amber-700/40 px-2 py-0.5 rounded-lg">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Plan mode
            </span>
          )}
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg border border-gray-700">
            Claude
          </span>
        </div>
      </div>

      {/* Rate limit banner */}
      {rateLimit?.remaining === 0 && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-yellow-900/40 border-b border-yellow-700/50">
          <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-yellow-300 flex-1">
            Daily limit reached ({rateLimit.limit} messages/day).
          </p>
          <a
            href="/pricing"
            className="shrink-0 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 px-2.5 py-1 rounded-lg transition-colors"
          >
            Upgrade →
          </a>
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
                streamingFilePaths={msg.streamingFilePaths}
                changedPaths={msg.changedPaths}
              />
            ))}
            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <TypingIndicator />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested follow-up prompts — hide when a plan is pending confirmation */}
      {!isStreaming && !pendingPlan && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !messages[messages.length - 1].isPlan && (
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

      {/* Plan confirmation bar */}
      {pendingPlan && !isStreaming && (
        <div className="shrink-0 mx-3 mb-3 rounded-xl border border-amber-700/50 bg-amber-950/30 overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-600/30 flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-200 mb-0.5">Plan ready for review</p>
              <p className="text-xs text-amber-300/70">Review the plan above. Approve to start execution, or cancel to revise your request.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 pb-3">
            <button
              onClick={handleApprovePlan}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Approve &amp; Execute
            </button>
            <button
              onClick={handleCancelPlan}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
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
          onSend={handleSend}
          isStreaming={isStreaming}
          disabled={!authenticated || rateLimit?.remaining === 0}
          value={input}
          onChange={setInput}
          files={files}
          mode={chatMode}
          onModeChange={setChatMode}
        />
      </div>
    </div>
  )
}
