import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGitHub } from '../useGitHub'
import type { GitHubRepo } from '../useGitHub'

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

// Mock window.location
const locationAssignMock = vi.fn()
Object.defineProperty(window, 'location', {
  value: { href: '', assign: locationAssignMock },
  writable: true,
})

import { api } from '@/lib/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApi = api as any

const mockConnection = {
  githubLogin: 'octocat',
  githubName: 'The Octocat',
  githubAvatarUrl: 'https://github.com/octocat.png',
  connectedAt: '2024-01-01T00:00:00Z',
}

const mockRepos = [
  {
    id: 1,
    name: 'my-repo',
    fullName: 'octocat/my-repo',
    private: false,
    defaultBranch: 'main',
    updatedAt: '2024-01-01T00:00:00Z',
    description: 'A test repo',
  },
]

const mockBranches = [
  { name: 'main', sha: 'abc123' },
  { name: 'feature/test', sha: 'def456' },
]

const mockSyncStatus = {
  status: 'synced' as const,
  aheadBy: 0,
  behindBy: 0,
  latestSha: 'abc123',
  repoUrl: 'https://github.com/octocat/my-repo',
}

describe('useGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: fetchConnection returns connected
    mockApi.get.mockResolvedValue({ data: mockConnection })
  })

  it('fetches connection status on mount (connected)', async () => {
    const { result } = renderHook(() => useGitHub())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.connection).toEqual(mockConnection)
    expect(result.current.error).toBeNull()
  })

  it('fetches connection status on mount (not connected)', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('404 Not Found'))

    const { result } = renderHook(() => useGitHub())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.connection).toBeNull()
  })

  it('connect redirects to github OAuth URL', async () => {
    const { result } = renderHook(() => useGitHub())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    act(() => {
      result.current.connect()
    })

    expect(window.location.href).toContain('/v1/github/connect')
  })

  it('disconnect calls DELETE and clears connection', async () => {
    mockApi.delete = vi.fn().mockResolvedValue({ data: null })

    const { result } = renderHook(() => useGitHub())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.connection).toEqual(mockConnection)

    await act(async () => {
      await result.current.disconnect()
    })

    expect(mockApi.delete).toHaveBeenCalledWith('/v1/github/disconnect')
    expect(result.current.connection).toBeNull()
  })

  it('fetchRepos returns repos list', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection }) // fetchConnection
      .mockResolvedValueOnce({ data: { repos: mockRepos } }) // fetchRepos

    const { result } = renderHook(() => useGitHub())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    let repos: GitHubRepo[] = []
    await act(async () => {
      repos = await result.current.fetchRepos(1)
    })

    expect(repos).toEqual(mockRepos)
    expect(mockApi.get).toHaveBeenCalledWith('/v1/github/repos?page=1')
  })

  it('fetchBranches returns branches for a repo', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection }) // fetchConnection
      .mockResolvedValueOnce({ data: { branches: mockBranches } }) // fetchBranches

    const { result } = renderHook(() => useGitHub())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    let branches: typeof mockBranches = []
    await act(async () => {
      branches = await result.current.fetchBranches('octocat', 'my-repo')
    })

    expect(branches).toEqual(mockBranches)
    expect(mockApi.get).toHaveBeenCalledWith('/v1/github/repos/octocat/my-repo/branches')
  })

  it('fetchSyncStatus returns synced status', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection }) // fetchConnection
      .mockResolvedValueOnce({ data: mockSyncStatus }) // fetchSyncStatus (triggered by useEffect)

    const { result } = renderHook(() => useGitHub('project-123'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.syncStatus?.status).toBe('synced')
  })

  it('fetchSyncStatus returns behind status', async () => {
    const behindStatus = { ...mockSyncStatus, status: 'behind' as const, behindBy: 3 }
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection })
      .mockResolvedValueOnce({ data: behindStatus })

    const { result } = renderHook(() => useGitHub('project-123'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.syncStatus?.status).toBe('behind')
    expect(result.current.syncStatus?.behindBy).toBe(3)
  })

  it('fetchSyncStatus handles not_connected', async () => {
    const notConnectedStatus = {
      status: 'not_connected' as const,
      aheadBy: 0,
      behindBy: 0,
      latestSha: '',
      repoUrl: null,
    }
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection })
      .mockResolvedValueOnce({ data: notConnectedStatus })

    const { result } = renderHook(() => useGitHub('project-123'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(result.current.syncStatus?.status).toBe('not_connected')
  })

  it('pushToNewRepo posts correct payload', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection })
      .mockResolvedValueOnce({ data: mockSyncStatus }) // fetchSyncStatus from useEffect
    mockApi.post = vi.fn().mockResolvedValue({ data: null })
    mockApi.get.mockResolvedValueOnce({ data: mockSyncStatus }) // fetchSyncStatus after push

    const { result } = renderHook(() => useGitHub('project-123'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    await act(async () => {
      await result.current.pushToNewRepo('new-repo', { private: true, description: 'desc' })
    })

    expect(mockApi.post).toHaveBeenCalledWith(
      '/v1/projects/project-123/github/push',
      { repoName: 'new-repo', private: true, description: 'desc' },
    )
  })

  it('pushToExistingRepo posts correct payload', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection })
      .mockResolvedValueOnce({ data: mockSyncStatus })
    mockApi.post = vi.fn().mockResolvedValue({ data: null })
    mockApi.get.mockResolvedValueOnce({ data: mockSyncStatus })

    const { result } = renderHook(() => useGitHub('project-123'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    await act(async () => {
      await result.current.pushToExistingRepo('octocat', 'my-repo', 'main', 'chore: update')
    })

    expect(mockApi.post).toHaveBeenCalledWith(
      '/v1/projects/project-123/github/push-existing',
      { owner: 'octocat', repo: 'my-repo', branch: 'main', commitMessage: 'chore: update' },
    )
  })

  it('pull calls correct endpoint', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection })
      .mockResolvedValueOnce({ data: mockSyncStatus })
    mockApi.post = vi.fn().mockResolvedValue({ data: null })
    mockApi.get.mockResolvedValueOnce({ data: mockSyncStatus })

    const { result } = renderHook(() => useGitHub('project-123'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    await act(async () => {
      await result.current.pull()
    })

    expect(mockApi.post).toHaveBeenCalledWith('/v1/projects/project-123/github/pull', {})
  })

  it('createPR returns url and number', async () => {
    const prResult = { url: 'https://github.com/octocat/my-repo/pull/1', number: 1 }
    mockApi.get
      .mockResolvedValueOnce({ data: mockConnection })
      .mockResolvedValueOnce({ data: mockSyncStatus })
    mockApi.post = vi.fn().mockResolvedValue({ data: prResult })

    const { result } = renderHook(() => useGitHub('project-123'))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    let pr: typeof prResult | undefined
    await act(async () => {
      pr = await result.current.createPR('feature/test', 'main', 'My PR', 'Description')
    })

    expect(pr).toEqual(prResult)
    expect(mockApi.post).toHaveBeenCalledWith(
      '/v1/projects/project-123/github/pr',
      { head: 'feature/test', base: 'main', title: 'My PR', body: 'Description' },
    )
  })

  it('importRepo returns projectId', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockConnection })
    mockApi.post = vi.fn().mockResolvedValue({ data: { projectId: 'new-project-id' } })

    const { result } = renderHook(() => useGitHub())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    let importResult: { projectId: string } | undefined
    await act(async () => {
      importResult = await result.current.importRepo('octocat', 'my-repo', 'main', 'my-project')
    })

    expect(importResult?.projectId).toBe('new-project-id')
    expect(mockApi.post).toHaveBeenCalledWith('/v1/github/import', {
      owner: 'octocat',
      repo: 'my-repo',
      branch: 'main',
      projectName: 'my-project',
    })
  })

  it('sets error state when API fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useGitHub())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    // fetchConnection sets null on error without setting error for 404-like
    // but fetchRepos should set error
    mockApi.get.mockRejectedValueOnce(new Error('Network error'))
    await act(async () => {
      await result.current.fetchRepos()
    })

    expect(result.current.error).toBe('Network error')
  })
})
