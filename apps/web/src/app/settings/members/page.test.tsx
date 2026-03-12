import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u-1', email: 'owner@example.com', name: 'Owner', avatarUrl: null, plan: 'pro' },
    loading: false,
    authenticated: true,
    logout: vi.fn(),
  })),
}))

// Mock useWorkspaceMembers
vi.mock('@/hooks/useWorkspaceMembers', () => ({
  useWorkspaceMembers: vi.fn(() => ({
    members: [
      { userId: 'u-1', email: 'owner@example.com', name: 'Owner', role: 'owner', joinedAt: '2024-01-01' },
      { userId: 'u-2', email: 'member@example.com', name: 'Member', role: 'editor', joinedAt: '2024-01-02' },
    ],
    invitations: [],
    loading: false,
    error: null,
    inviteMember: vi.fn(),
    removeMember: vi.fn(),
    changeRole: vi.fn(),
    revokeInvitation: vi.fn(),
    refresh: vi.fn(),
  })),
}))

// Mock fetch for workspaces
beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ workspaces: [{ id: 'ws-1', name: 'Test WS', slug: 'test', role: 'owner' }] }),
  } as Response)
  // Provide localStorage with a workspace ID so the page skips the async fetch path
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue('ws-1'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  })
})

import MembersSettingsPage from './page'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers'

const mockUseAuth = vi.mocked(useAuth)
const mockUseWorkspaceMembers = vi.mocked(useWorkspaceMembers)

describe('MembersSettingsPage', () => {
  it('renders Team Members heading', async () => {
    render(<MembersSettingsPage />)
    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeDefined()
    })
  })

  it('renders page description', async () => {
    render(<MembersSettingsPage />)
    await waitFor(() => {
      expect(screen.getByText('Manage who has access to this workspace')).toBeDefined()
    })
  })

  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      loading: true,
      authenticated: false,
      logout: vi.fn(),
    })
    render(<MembersSettingsPage />)
    // Should show spinner (no heading yet)
    expect(screen.queryByText('Team Members')).toBeNull()
  })

  it('renders members list', async () => {
    render(<MembersSettingsPage />)
    await waitFor(() => {
      expect(screen.getByText('owner@example.com')).toBeDefined()
      expect(screen.getByText('member@example.com')).toBeDefined()
    })
  })

  it('shows invite form for owners', async () => {
    render(<MembersSettingsPage />)
    await waitFor(() => {
      expect(screen.getByText('Invite a team member')).toBeDefined()
    })
  })

  it('hides invite form for non-owners', async () => {
    mockUseWorkspaceMembers.mockReturnValue({
      members: [
        { userId: 'u-2', email: 'member@example.com', name: 'Member', role: 'editor', joinedAt: '2024-01-02' },
      ],
      invitations: [],
      loading: false,
      error: null,
      inviteMember: vi.fn(),
      removeMember: vi.fn(),
      changeRole: vi.fn(),
      revokeInvitation: vi.fn(),
      refresh: vi.fn(),
    })
    render(<MembersSettingsPage />)
    await waitFor(() => {
      expect(screen.queryByText('Invite a team member')).toBeNull()
    })
  })

  it('shows error message when error is present', async () => {
    mockUseWorkspaceMembers.mockReturnValue({
      members: [],
      invitations: [],
      loading: false,
      error: 'Failed to load members',
      inviteMember: vi.fn(),
      removeMember: vi.fn(),
      changeRole: vi.fn(),
      revokeInvitation: vi.fn(),
      refresh: vi.fn(),
    })
    render(<MembersSettingsPage />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load members')).toBeDefined()
    })
  })
})
