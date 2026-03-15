import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalyticsPage from './page'

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: vi.fn(),
}))

import { useAnalytics } from '@/hooks/useAnalytics'

const mockUseAnalytics = vi.mocked(useAnalytics)

const defaultReturn = {
  overview: {
    aiRequests: 200,
    deployments: 15,
    projectsCreated: 4,
    templateClones: 2,
    activeProjects: 6,
    activeMembers: 3,
    totalEvents: 300,
  },
  aiSeries: [
    { date: '2024-01-01', requests: 10 },
    { date: '2024-01-02', requests: 20 },
  ],
  activity: [
    {
      id: 'evt-1',
      eventType: 'ai_request',
      metadata: {},
      createdAt: new Date().toISOString(),
      projectId: null,
      userId: null,
      userEmail: 'test@example.com',
      projectName: null,
    },
  ],
  loading: false,
  error: null,
  refresh: vi.fn(),
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAnalytics.mockReturnValue(defaultReturn)
  })

  it('renders the "Analytics" heading', () => {
    render(<AnalyticsPage />)
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
  })

  it('renders 4 stat cards', () => {
    render(<AnalyticsPage />)
    expect(screen.getByText('AI Requests')).toBeInTheDocument()
    // "Deployments" appears in stat card and usage breakdown - use getAllByText
    expect(screen.getAllByText('Deployments').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getByText('Active Members')).toBeInTheDocument()
  })

  it('renders the AI requests chart section', () => {
    render(<AnalyticsPage />)
    expect(screen.getByText('AI Requests — Last 30 Days')).toBeInTheDocument()
  })

  it('renders the usage breakdown section', () => {
    render(<AnalyticsPage />)
    expect(screen.getByText('Usage Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Projects Created')).toBeInTheDocument()
    expect(screen.getByText('Templates Cloned')).toBeInTheDocument()
  })

  it('renders the activity feed section', () => {
    render(<AnalyticsPage />)
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('Last 20 events')).toBeInTheDocument()
  })

  it('handles loading state — stat cards show skeleton', () => {
    mockUseAnalytics.mockReturnValue({ ...defaultReturn, loading: true, overview: null })
    const { container } = render(<AnalyticsPage />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders stat card values from overview data', () => {
    render(<AnalyticsPage />)
    // 200 AI requests - appears in stat card
    expect(screen.getAllByText('200').length).toBeGreaterThanOrEqual(1)
    // 15 deployments - appears in stat card and usage breakdown
    expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1)
  })

  it('renders subtitle text', () => {
    render(<AnalyticsPage />)
    expect(screen.getByText('Workspace usage overview · Last 30 days')).toBeInTheDocument()
  })
})
