'use client'

import { useRef, useState, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (prompt: string) => void
  isStreaming: boolean
  disabled?: boolean
}

const MAX_CHARS = 4000
const CHAR_COUNT_THRESHOLD = 3000

export function ChatInput({ onSend, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
      setValue(newValue)
      adjustHeight()
    },
    [adjustHeight],
  )

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, disabled, onSend])

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
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [])

  const charCount = value.length
  const showCharCount = charCount > CHAR_COUNT_THRESHOLD
  const isOverLimit = charCount >= MAX_CHARS
  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  return (
    <div className="flex flex-col gap-2 p-4 border-t border-gray-700 bg-gray-900">
      <div
        className={cn(
          'flex items-end gap-3 rounded-2xl border bg-gray-800 px-4 py-3',
          'border-gray-700 focus-within:border-indigo-500',
          'transition-all duration-200',
          disabled && 'opacity-60',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask Forge AI to build something..."
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
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed',
            )}
          >
            {/* Arrow-up icon */}
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

      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-600">
          {isStreaming ? 'Generating...' : '⌘↵ to send'}
        </p>
        {showCharCount && (
          <p className={cn('text-xs', isOverLimit ? 'text-red-400' : 'text-gray-500')}>
            {charCount}/{MAX_CHARS}
          </p>
        )}
      </div>
    </div>
  )
}
