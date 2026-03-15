import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatPanel } from './ChatPanel'

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ token: 'test-token', user: null, loading: false, authenticated: true, logout: vi.fn() })),
}))

// Mock getToken from auth lib
vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(() => 'test-token'),
  getKeycloak: vi.fn(() => ({ token: 'test-token' })),
  initAuth: vi.fn(() => Promise.resolve({ authenticated: true })),
  login: vi.fn(),
  logout: vi.fn(),
}))

// Mock the useAIChat hook
vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: vi.fn(() => ({
    messages: [],
    isStreaming: false,
    error: null,
    rateLimit: null,
    sendMessage: vi.fn(),
    loadHistory: vi.fn(),
  })),
}))

import { useAIChat } from '@/hooks/useAIChat'

const mockUseAIChat = vi.mocked(useAIChat)

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAIChat.mockReturnValue({
      messages: [],
      isStreaming: false,
      error: null,
      rateLimit: null,
      sendMessage: vi.fn(),
      loadHistory: vi.fn(),
    })
  })

  it('renders empty state when no messages', () => {
    render(<ChatPanel projectId="test-project-id" />)

    // Both the header and empty state show "Forge AI"
    expect(screen.getAllByText('Forge AI').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Describe what you want to build/)).toBeInTheDocument()
  })

  it('renders user and assistant message bubbles', () => {
    mockUseAIChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Build me a landing page',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Sure! Here is a landing page for you.',
          createdAt: new Date().toISOString(),
        },
      ],
      isStreaming: false,
      error: null,
      rateLimit: null,
      sendMessage: vi.fn(),
      loadHistory: vi.fn(),
    })

    render(<ChatPanel projectId="test-project-id" />)

    expect(screen.getByText('Build me a landing page')).toBeInTheDocument()
    expect(screen.getByText('Sure! Here is a landing page for you.')).toBeInTheDocument()
  })

  it('renders typing indicator when isStreaming is true', () => {
    mockUseAIChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Build me something',
          createdAt: new Date().toISOString(),
        },
      ],
      isStreaming: true,
      error: null,
      rateLimit: null,
      sendMessage: vi.fn(),
      loadHistory: vi.fn(),
    })

    render(<ChatPanel projectId="test-project-id" />)

    expect(screen.getByText('Forge AI is thinking')).toBeInTheDocument()
  })
})
