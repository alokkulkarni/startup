import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GitHubPanel } from '../GitHubPanel'

// Mock useGitHub hook
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockPull = vi.fn().mockResolvedValue(undefined)
const mockRefetchSyncStatus = vi.fn()

const defaultHookReturn = {
  connection: null,
  repos: [],
  syncStatus: null,
  loading: false,
  error: null,
  connect: mockConnect,
  disconnect: mockDisconnect,
  fetchRepos: vi.fn(),
  fetchBranches: vi.fn(),
  pushToNewRepo: vi.fn(),
  pushToExistingRepo: vi.fn(),
  pull: mockPull,
  createPR: vi.fn(),
  importRepo: vi.fn(),
  refetchSyncStatus: mockRefetchSyncStatus,
}

vi.mock('@/hooks/useGitHub', () => ({
  useGitHub: vi.fn(() => defaultHookReturn),
}))

// Mock child modals so they render predictably
vi.mock('../PushModal', () => ({
  PushModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="push-modal">PushModal</div> : null,
}))
vi.mock('../PullModal', () => ({
  PullModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="pull-modal">PullModal</div> : null,
}))
vi.mock('../CreatePRModal', () => ({
  CreatePRModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="create-pr-modal">CreatePRModal</div> : null,
}))

import { useGitHub } from '@/hooks/useGitHub'
const mockUseGitHub = useGitHub as ReturnType<typeof vi.fn>

describe('GitHubPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGitHub.mockReturnValue(defaultHookReturn)
  })

  it('renders "Connect GitHub" button when not connected', () => {
    render(<GitHubPanel projectId="proj-1" isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Connect GitHub')).toBeInTheDocument()
  })

  it('renders username when connected', () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: 'The Octocat',
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
      syncStatus: { status: 'no_repo', aheadBy: 0, behindBy: 0, latestSha: '', repoUrl: null },
    })

    render(<GitHubPanel projectId="proj-1" isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('octocat')).toBeInTheDocument()
  })

  it('shows "No repo linked" when connected but no repo', () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
      syncStatus: { status: 'no_repo', aheadBy: 0, behindBy: 0, latestSha: '', repoUrl: null },
    })

    render(<GitHubPanel projectId="proj-1" isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('No repo linked')).toBeInTheDocument()
  })

  it('Push button opens PushModal', async () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
      syncStatus: { status: 'synced', aheadBy: 0, behindBy: 0, latestSha: 'abc', repoUrl: 'https://github.com/octocat/repo' },
    })

    render(<GitHubPanel projectId="proj-1" isOpen={true} onClose={vi.fn()} />)

    const pushBtn = screen.getByText('Push')
    fireEvent.click(pushBtn)

    await waitFor(() => {
      expect(screen.getByTestId('push-modal')).toBeInTheDocument()
    })
  })

  it('Pull button opens PullModal', async () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
      syncStatus: { status: 'synced', aheadBy: 0, behindBy: 0, latestSha: 'abc', repoUrl: 'https://github.com/octocat/repo' },
    })

    render(<GitHubPanel projectId="proj-1" isOpen={true} onClose={vi.fn()} />)

    const pullBtn = screen.getByText('Pull')
    fireEvent.click(pullBtn)

    await waitFor(() => {
      expect(screen.getByTestId('pull-modal')).toBeInTheDocument()
    })
  })

  it('Create PR button opens CreatePRModal', async () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
      syncStatus: { status: 'synced', aheadBy: 0, behindBy: 0, latestSha: 'abc', repoUrl: 'https://github.com/octocat/repo' },
    })

    render(<GitHubPanel projectId="proj-1" isOpen={true} onClose={vi.fn()} />)

    const prBtn = screen.getByText('Create PR')
    fireEvent.click(prBtn)

    await waitFor(() => {
      expect(screen.getByTestId('create-pr-modal')).toBeInTheDocument()
    })
  })

  it('Disconnect button calls disconnect', async () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
      syncStatus: { status: 'no_repo', aheadBy: 0, behindBy: 0, latestSha: '', repoUrl: null },
    })

    render(<GitHubPanel projectId="proj-1" isOpen={true} onClose={vi.fn()} />)

    const disconnectBtn = screen.getByText('Disconnect GitHub')
    fireEvent.click(disconnectBtn)

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('SyncStatusBadge renders correct status', () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
      syncStatus: { status: 'behind', aheadBy: 0, behindBy: 5, latestSha: 'abc', repoUrl: 'https://github.com/octocat/repo' },
    })

    render(<GitHubPanel projectId="proj-1" isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('↓ 5 behind')).toBeInTheDocument()
  })
})
