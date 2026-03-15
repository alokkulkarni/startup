import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeployHistoryPanel } from './DeployHistoryPanel'

vi.mock('@/hooks/useDeployments', () => ({
  useDeployments: vi.fn(() => ({
    deployments: [],
    isDeploying: false,
    isWarmingUp: false,
    isLoading: false,
    latestDeployUrl: null,
    triggerDeploy: vi.fn(),
    rollback: vi.fn(),
    refresh: vi.fn(),
    clearHistory: vi.fn(),
  })),
}))

import { useDeployments } from '@/hooks/useDeployments'

const mockUseDeployments = vi.mocked(useDeployments)

const baseProps = {
  projectId: 'test-project',
  token: 'test-token',
  isOpen: true,
  onClose: vi.fn(),
}

describe('DeployHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDeployments.mockReturnValue({
      deployments: [],
      isDeploying: false,
      isWarmingUp: false,
      isLoading: false,
      latestDeployUrl: null,
      triggerDeploy: vi.fn(),
      rollback: vi.fn(),
      refresh: vi.fn(),
      clearHistory: vi.fn(),
    })
  })

  it('renders empty state when no deployments', () => {
    render(<DeployHistoryPanel {...baseProps} />)
    expect(screen.getByText('No deployments yet.')).toBeInTheDocument()
    expect(screen.getByText('Click Deploy to get started.')).toBeInTheDocument()
  })

  it('renders deployment with Live link when deployed', () => {
    mockUseDeployments.mockReturnValue({
      deployments: [
        {
          id: 'deploy-1',
          provider: 'vercel',
          status: 'deployed',
          deployUrl: 'https://my-app.vercel.app',
          errorMessage: null,
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
      ],
      isDeploying: false,
      isWarmingUp: false,
      isLoading: false,
      latestDeployUrl: 'https://my-app.vercel.app',
      triggerDeploy: vi.fn(),
      rollback: vi.fn(),
      refresh: vi.fn(),
      clearHistory: vi.fn(),
    })
    render(<DeployHistoryPanel {...baseProps} />)
    expect(screen.getByText('Vercel')).toBeInTheDocument()
    const liveLink = screen.getByRole('link', { name: /live/i })
    expect(liveLink).toHaveAttribute('href', 'https://my-app.vercel.app')
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<DeployHistoryPanel {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close deploy history'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
