import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MembersList } from './MembersList'
import type { WorkspaceMember, WorkspaceInvitation } from '@/hooks/useWorkspaceMembers'

const mockMembers: WorkspaceMember[] = [
  { userId: 'u-1', email: 'alice@example.com', name: 'Alice', role: 'owner', joinedAt: '2024-01-01' },
  { userId: 'u-2', email: 'bob@example.com', name: 'Bob', role: 'editor', joinedAt: '2024-01-02' },
  { userId: 'u-3', email: 'carol@example.com', name: 'Carol', role: 'viewer', joinedAt: '2024-01-03' },
]

const mockInvitations: WorkspaceInvitation[] = [
  {
    id: 'inv-1',
    email: 'dave@example.com',
    role: 'editor',
    status: 'pending',
    expiresAt: '2025-12-31',
    createdAt: '2024-01-01',
  },
]

const baseProps = {
  members: mockMembers,
  invitations: mockInvitations,
  currentUserId: 'u-1',
  isOwner: true,
  onChangeRole: vi.fn().mockResolvedValue(undefined),
  onRemoveMember: vi.fn().mockResolvedValue(undefined),
  onRevokeInvitation: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => vi.clearAllMocks())

describe('MembersList', () => {
  it('renders all members', () => {
    render(<MembersList {...baseProps} />)
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
    expect(screen.getByText('Carol')).toBeDefined()
  })

  it('renders member emails', () => {
    render(<MembersList {...baseProps} />)
    expect(screen.getByText('alice@example.com')).toBeDefined()
    expect(screen.getByText('bob@example.com')).toBeDefined()
  })

  it('shows role badge for owner role', () => {
    render(<MembersList {...baseProps} />)
    expect(screen.getByText('Owner')).toBeDefined()
  })

  it('shows role change dropdown for non-owner members when current user is owner', () => {
    render(<MembersList {...baseProps} />)
    const roleSelects = screen.getAllByRole('combobox')
    expect(roleSelects.length).toBeGreaterThan(0)
  })

  it('shows remove button for non-owner, non-self members when owner', () => {
    render(<MembersList {...baseProps} />)
    const removeButtons = screen.getAllByText('Remove')
    // Bob and Carol can be removed, but not Alice (self) or owners
    expect(removeButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('calls onRemoveMember when remove is clicked', async () => {
    render(<MembersList {...baseProps} />)
    const removeButtons = screen.getAllByText('Remove')
    fireEvent.click(removeButtons[0])
    await waitFor(() => {
      expect(baseProps.onRemoveMember).toHaveBeenCalled()
    })
  })

  it('calls onChangeRole when role dropdown changes', async () => {
    render(<MembersList {...baseProps} />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'viewer' } })
    await waitFor(() => {
      expect(baseProps.onChangeRole).toHaveBeenCalled()
    })
  })

  it('hides remove/role-change controls when not owner', () => {
    render(<MembersList {...baseProps} isOwner={false} currentUserId="u-2" />)
    expect(screen.queryByText('Remove')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('shows pending invitations', () => {
    render(<MembersList {...baseProps} />)
    expect(screen.getByText('dave@example.com')).toBeDefined()
    expect(screen.getByText('Pending')).toBeDefined()
  })

  it('shows revoke button for pending invitations when owner', () => {
    render(<MembersList {...baseProps} />)
    expect(screen.getByText('Revoke')).toBeDefined()
  })

  it('calls onRevokeInvitation when revoke is clicked', async () => {
    render(<MembersList {...baseProps} />)
    fireEvent.click(screen.getByText('Revoke'))
    await waitFor(() => {
      expect(baseProps.onRevokeInvitation).toHaveBeenCalledWith('inv-1')
    })
  })

  it('shows empty state when no members', () => {
    render(<MembersList {...baseProps} members={[]} />)
    expect(screen.getByText('No members yet.')).toBeDefined()
  })
})
