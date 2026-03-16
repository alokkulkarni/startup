'use client'

import { useRef, useCallback, useState, type KeyboardEvent, type ChangeEvent } from 'react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (prompt: string, mode: 'agent' | 'plan') => void
  isStreaming: boolean
  disabled?: boolean
  value: string
  onChange: (value: string) => void
  files?: { path: string }[]
  mode: 'agent' | 'plan'
  onModeChange: (mode: 'agent' | 'plan') => void
}

const MAX_CHARS = 4000
const CHAR_COUNT_THRESHOLD = 3000

export function ChatInput({ onSend, isStreaming, disabled, value, onChange, files, mode, onModeChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([])

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * 5
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value.slice(0, MAX_CHARS)
      onChange(newValue)
      adjustHeight()

      // Detect @mention for file autocomplete
      const atMatch = newValue.match(/@([^@\s]*)$/)
      if (atMatch) {
        const query = atMatch[1].toLowerCase()
        const matches = (files ?? [])
          .filter(f => f.path.toLowerCase().includes(query))
          .slice(0, 5)
        setMentionSuggestions(matches.map(f => f.path))
      } else {
        setMentionSuggestions([])
      }
    },
    [adjustHeight, onChange, files],
  )

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || disabled) return
    onSend(trimmed, mode)
    onChange('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, disabled, onSend, onChange, mode])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleStop = useCallback(() => {
    onChange('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [onChange])

  const charCount = value.length
  const showCharCount = charCount > CHAR_COUNT_THRESHOLD
  const isOverLimit = charCount >= MAX_CHARS
  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  return (
    <div className="flex flex-col gap-2 p-4 border-t border-gray-700 bg-gray-900">
      {/* @mention file autocomplete dropdown */}
      {mentionSuggestions.length > 0 && (
        <div className="relative">
          <div className="absolute bottom-0 left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl z-50">
            {mentionSuggestions.map(path => (
              <button
                key={path}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white font-mono"
                onMouseDown={e => {
                  e.preventDefault()
                  const newValue = value.replace(/@([^@\s]*)$/, `@${path} `)
                  onChange(newValue)
                  setMentionSuggestions([])
                }}
              >
                @{path}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode indicator strip — shown when plan mode is active */}
      {mode === 'plan' && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-700/40">
          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <p className="text-xs text-amber-300/90 flex-1">
            <span className="font-semibold">Plan mode:</span> AI will create a step-by-step plan for your approval before writing any code.
          </p>
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-3 rounded-2xl border bg-gray-800 px-4 py-3',
          mode === 'plan'
            ? 'border-amber-700/50 focus-within:border-amber-500'
            : 'border-gray-700 focus-within:border-indigo-500',
          'transition-all duration-200',
          disabled && 'opacity-60',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'plan' ? 'Describe what you want to plan...' : 'Ask Forge AI to build something...'}
          disabled={disabled || isStreaming}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-gray-100',
            'placeholder-gray-500 focus:outline-none leading-6',
            'disabled:cursor-not-allowed',
            'min-h-[24px] max-h-[120px]',
          )}
          style={{ height: '24px' }}
        />

        {isStreaming ? (
          <button
            onClick={handleStop}
            type="button"
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl',
              'text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600',
              'border border-gray-600 transition-all duration-200',
            )}
          >
            <span className="w-2 h-2 bg-gray-300 rounded-sm" />
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            type="button"
            aria-label="Send message"
            className={cn(
              'shrink-0 w-8 h-8 flex items-center justify-center rounded-xl',
              'transition-all duration-200',
              canSend
                ? mode === 'plan'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed',
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom bar: mode toggle + char count + hint */}
      <div className="flex items-center justify-between px-1">
        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onModeChange('agent')}
            title="Agent mode: AI executes your request immediately"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
              mode === 'agent'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200',
            )}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Agent
          </button>
          <button
            type="button"
            onClick={() => onModeChange('plan')}
            title="Plan mode: AI creates a step-by-step plan for your approval before writing code"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
              mode === 'plan'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200',
            )}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Plan
          </button>
        </div>

        <div className="flex items-center gap-3">
          {showCharCount && (
            <p className={cn('text-xs', isOverLimit ? 'text-red-400' : 'text-gray-500')}>
              {charCount}/{MAX_CHARS}
            </p>
          )}
          <p className="text-xs text-gray-600">
            {isStreaming ? 'Generating...' : '⌘↵ to send'}
          </p>
        </div>
      </div>
    </div>
  )
}
