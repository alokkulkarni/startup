import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyncStatusBadge } from '../SyncStatusBadge'
import type { SyncStatus } from '@/hooks/useGitHub'

describe('SyncStatusBadge', () => {
  it('renders "In sync" for synced status', () => {
    const status: SyncStatus = {
      status: 'synced',
      aheadBy: 0,
      behindBy: 0,
      latestSha: 'abc123',
      repoUrl: 'https://github.com/octocat/repo',
    }
    render(<SyncStatusBadge syncStatus={status} />)
    expect(screen.getByText('✓ In sync')).toBeInTheDocument()
  })

  it('renders "N behind" for behind status', () => {
    const status: SyncStatus = {
      status: 'behind',
      aheadBy: 0,
      behindBy: 3,
      latestSha: 'abc123',
      repoUrl: 'https://github.com/octocat/repo',
    }
    render(<SyncStatusBadge syncStatus={status} />)
    expect(screen.getByText('↓ 3 behind')).toBeInTheDocument()
  })

  it('renders "Not connected" for not_connected status', () => {
    const status: SyncStatus = {
      status: 'not_connected',
      aheadBy: 0,
      behindBy: 0,
      latestSha: '',
      repoUrl: null,
    }
    render(<SyncStatusBadge syncStatus={status} />)
    expect(screen.getByText('Not connected')).toBeInTheDocument()
  })
})
