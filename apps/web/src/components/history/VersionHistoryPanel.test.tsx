import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VersionHistoryPanel } from './VersionHistoryPanel'

vi.mock('@/hooks/useSnapshots', () => ({
  useSnapshots: vi.fn(() => ({
    snapshots: [],
    isLoading: false,
    fetchSnapshots: vi.fn(),
    createSnapshot: vi.fn(),
    restoreSnapshot: vi.fn(),
    undoLast: vi.fn(),
  })),
}))

import { useSnapshots } from '@/hooks/useSnapshots'

const mockUseSnapshots = vi.mocked(useSnapshots)

const baseProps = {
  projectId: 'test-project',
  token: 'test-token',
  isOpen: true,
  onClose: vi.fn(),
  onRestored: vi.fn(),
}

describe('VersionHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSnapshots.mockReturnValue({
      snapshots: [],
      isLoading: false,
      fetchSnapshots: vi.fn(),
      createSnapshot: vi.fn(),
      restoreSnapshot: vi.fn(),
      undoLast: vi.fn(),
    })
  })

  it('renders empty state when no snapshots', () => {
    render(<VersionHistoryPanel {...baseProps} />)
    expect(screen.getByText('No snapshots yet.')).toBeInTheDocument()
    expect(screen.getByText('AI changes will appear here.')).toBeInTheDocument()
  })

  it('renders snapshot list', () => {
    mockUseSnapshots.mockReturnValue({
      snapshots: [
        {
          id: 'snap-1',
          triggeredBy: 'ai',
          description: 'Added login form',
          label: null,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        {
          id: 'snap-2',
          triggeredBy: 'manual',
          description: null,
          label: 'Before refactor',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
      isLoading: false,
      fetchSnapshots: vi.fn(),
      createSnapshot: vi.fn(),
      restoreSnapshot: vi.fn(),
      undoLast: vi.fn(),
    })
    render(<VersionHistoryPanel {...baseProps} />)
    expect(screen.getByText('Added login form')).toBeInTheDocument()
    expect(screen.getByText('Before refactor')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<VersionHistoryPanel {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close version history'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
