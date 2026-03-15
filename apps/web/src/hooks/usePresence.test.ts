import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePresence } from './usePresence'

// WebSocket mock
const mockSend = vi.fn()
const mockClose = vi.fn()
let mockOnOpen: (() => void) | null = null
let mockOnMessage: ((e: { data: string }) => void) | null = null
let mockOnClose: (() => void) | null = null
let mockOnError: (() => void) | null = null
let mockReadyState = 1

const MockWebSocket = vi.fn().mockImplementation(() => {
  const ws = {
    send: mockSend,
    close: mockClose,
    get readyState() { return mockReadyState },
    set onopen(fn: () => void) { mockOnOpen = fn },
    set onmessage(fn: (e: { data: string }) => void) { mockOnMessage = fn },
    set onclose(fn: () => void) { mockOnClose = fn },
    set onerror(fn: () => void) { mockOnError = fn },
  }
  return ws
})
;(MockWebSocket as unknown as { OPEN: number }).OPEN = 1

beforeEach(() => {
  vi.clearAllMocks()
  mockOnOpen = null
  mockOnMessage = null
  mockOnClose = null
  mockOnError = null
  mockReadyState = 1
  vi.useFakeTimers()
  global.WebSocket = MockWebSocket as unknown as typeof WebSocket
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePresence', () => {
  it('does not connect when workspaceId is null', () => {
    renderHook(() => usePresence(null))
    expect(MockWebSocket).not.toHaveBeenCalled()
  })

  it('connects WebSocket on mount with valid workspaceId', () => {
    renderHook(() => usePresence('ws-1'))
    expect(MockWebSocket).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ws/presence/ws-1'),
    )
  })

  it('sets connected true on WS open', () => {
    const { result } = renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
    })
    expect(result.current.connected).toBe(true)
  })

  it('handles presence_init message', () => {
    const { result } = renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
      mockOnMessage?.({
        data: JSON.stringify({
          type: 'presence_init',
          users: [{ userId: 'u-1', email: 'a@b.com', joinedAt: '2024-01-01' }],
        }),
      })
    })
    expect(result.current.onlineUsers).toHaveLength(1)
    expect(result.current.onlineUsers[0].email).toBe('a@b.com')
  })

  it('handles join message adding new user', () => {
    const { result } = renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
      mockOnMessage?.({
        data: JSON.stringify({ type: 'join', userId: 'u-2', email: 'b@c.com' }),
      })
    })
    expect(result.current.onlineUsers).toHaveLength(1)
    expect(result.current.onlineUsers[0].userId).toBe('u-2')
  })

  it('does not duplicate user on join if already present', () => {
    const { result } = renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
      mockOnMessage?.({ data: JSON.stringify({ type: 'join', userId: 'u-2', email: 'b@c.com' }) })
      mockOnMessage?.({ data: JSON.stringify({ type: 'join', userId: 'u-2', email: 'b@c.com' }) })
    })
    expect(result.current.onlineUsers).toHaveLength(1)
  })

  it('handles leave message removing user', () => {
    const { result } = renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
      mockOnMessage?.({ data: JSON.stringify({ type: 'join', userId: 'u-2', email: 'b@c.com' }) })
      mockOnMessage?.({ data: JSON.stringify({ type: 'leave', userId: 'u-2' }) })
    })
    expect(result.current.onlineUsers).toHaveLength(0)
  })

  it('handles cursor message updating user cursor', () => {
    const { result } = renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
      mockOnMessage?.({ data: JSON.stringify({ type: 'join', userId: 'u-2', email: 'b@c.com' }) })
      mockOnMessage?.({
        data: JSON.stringify({
          type: 'cursor',
          userId: 'u-2',
          cursor: { line: 5, col: 10, file: 'index.ts' },
        }),
      })
    })
    expect(result.current.onlineUsers[0].cursor).toEqual({ line: 5, col: 10, file: 'index.ts' })
  })

  it('sets connected false on WS close', () => {
    const { result } = renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
    })
    expect(result.current.connected).toBe(true)
    act(() => {
      mockOnClose?.()
    })
    expect(result.current.connected).toBe(false)
  })

  it('closes WebSocket on unmount', () => {
    const { unmount } = renderHook(() => usePresence('ws-1'))
    unmount()
    expect(mockClose).toHaveBeenCalled()
  })

  it('sends cursor via sendCursor', () => {
    const { result } = renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
    })
    act(() => {
      result.current.sendCursor({ line: 1, col: 2, file: 'app.ts' })
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('"type":"cursor"'),
    )
  })

  it('sends ping on interval after connection', () => {
    renderHook(() => usePresence('ws-1'))
    act(() => {
      mockOnOpen?.()
      vi.advanceTimersByTime(30000)
    })
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))
  })
})
