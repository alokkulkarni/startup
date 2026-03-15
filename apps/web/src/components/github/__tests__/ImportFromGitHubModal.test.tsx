import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImportFromGitHubModal } from '../ImportFromGitHubModal'

const mockConnect = vi.fn()
const mockImportRepo = vi.fn()
const mockPush = vi.fn()

const defaultHookReturn = {
  connection: null,
  repos: [],
  syncStatus: null,
  loading: false,
  error: null,
  connect: mockConnect,
  disconnect: vi.fn(),
  fetchRepos: vi.fn().mockResolvedValue([]),
  fetchBranches: vi.fn().mockResolvedValue([]),
  pushToNewRepo: mockPush,
  pushToExistingRepo: vi.fn(),
  pull: vi.fn(),
  createPR: vi.fn(),
  importRepo: mockImportRepo,
  refetchSyncStatus: vi.fn(),
}

vi.mock('@/hooks/useGitHub', () => ({
  useGitHub: vi.fn(() => defaultHookReturn),
}))

// Mock RepoBrowserModal
vi.mock('../RepoBrowserModal', () => ({
  RepoBrowserModal: ({
    isOpen,
    onSelect,
  }: {
    isOpen: boolean
    onSelect: (owner: string, repo: string, branch: string) => void
  }) =>
    isOpen ? (
      <div data-testid="repo-browser">
        <button onClick={() => onSelect('octocat', 'my-repo', 'main')}>
          Select Repo
        </button>
      </div>
    ) : null,
}))

// Mock next/navigation
const mockPush2 = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush2 }),
}))

import { useGitHub } from '@/hooks/useGitHub'
const mockUseGitHub = useGitHub as ReturnType<typeof vi.fn>

describe('ImportFromGitHubModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGitHub.mockReturnValue(defaultHookReturn)
  })

  it('renders connect button when not connected', () => {
    render(<ImportFromGitHubModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Connect GitHub')).toBeInTheDocument()
    expect(screen.queryByText('Import project')).not.toBeInTheDocument()
  })

  it('shows repo picker when connected', () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
    })

    render(<ImportFromGitHubModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('+ Select repository…')).toBeInTheDocument()
    expect(screen.getByText('Import project')).toBeInTheDocument()
  })

  it('Import button is disabled when no repo selected', () => {
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
    })

    render(<ImportFromGitHubModal isOpen={true} onClose={vi.fn()} />)
    const importBtn = screen.getByText('Import project')
    expect(importBtn).toBeDisabled()
  })

  it('calls importRepo and redirects on success', async () => {
    mockImportRepo.mockResolvedValue({ projectId: 'new-proj-id' })
    mockUseGitHub.mockReturnValue({
      ...defaultHookReturn,
      connection: {
        githubLogin: 'octocat',
        githubName: null,
        githubAvatarUrl: null,
        connectedAt: '2024-01-01T00:00:00Z',
      },
      importRepo: mockImportRepo,
    })

    const onClose = vi.fn()
    render(<ImportFromGitHubModal isOpen={true} onClose={onClose} />)

    // Open repo browser and select a repo
    fireEvent.click(screen.getByText('+ Select repository…'))
    await waitFor(() => screen.getByTestId('repo-browser'))
    fireEvent.click(screen.getByText('Select Repo'))

    await waitFor(() => {
      expect(screen.getByText('octocat/my-repo (main)')).toBeInTheDocument()
    })

    // Click import
    fireEvent.click(screen.getByText('Import project'))

    await waitFor(() => {
      expect(mockImportRepo).toHaveBeenCalledWith('octocat', 'my-repo', 'main', 'my-repo')
      expect(mockPush2).toHaveBeenCalledWith('/dashboard/projects/new-proj-id')
    })
  })
})
