import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BillingPanel } from '../BillingPanel'

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import { useSubscription } from '@/hooks/useSubscription'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseSubscription = useSubscription as any

const makeHookReturn = (overrides: Record<string, unknown> = {}) => ({
  subscription: null,
  usage: null,
  loading: false,
  error: null,
  openPortal: vi.fn(),
  startCheckout: vi.fn(),
  fetchSubscription: vi.fn(),
  fetchUsage: vi.fn(),
  ...overrides,
})

describe('BillingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders current plan info', () => {
    mockUseSubscription.mockReturnValue(
      makeHookReturn({
        subscription: {
          tier: 'free',
          status: 'active',
          periodEnd: null,
          cancelAtPeriodEnd: false,
          limits: { aiRequestsPerDay: 50, maxProjects: 3, maxFilesPerProject: 20 },
        },
        usage: { used: 10, limit: 50, tier: 'free', resetAt: '' },
      }),
    )

    render(<BillingPanel />)
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText(/Free Plan/)).toBeInTheDocument()
  })

  it('shows Manage Billing for paid plan', () => {
    mockUseSubscription.mockReturnValue(
      makeHookReturn({
        subscription: {
          tier: 'pro',
          status: 'active',
          periodEnd: '2025-12-31T00:00:00Z',
          cancelAtPeriodEnd: false,
          limits: { aiRequestsPerDay: 500, maxProjects: 50, maxFilesPerProject: 200 },
        },
        usage: { used: 50, limit: 500, tier: 'pro', resetAt: '' },
      }),
    )

    render(<BillingPanel />)
    expect(screen.getByText('Manage Billing')).toBeInTheDocument()
  })

  it('shows Upgrade button for free plan', () => {
    mockUseSubscription.mockReturnValue(
      makeHookReturn({
        subscription: {
          tier: 'free',
          status: 'active',
          periodEnd: null,
          cancelAtPeriodEnd: false,
          limits: { aiRequestsPerDay: 50, maxProjects: 3, maxFilesPerProject: 20 },
        },
        usage: { used: 5, limit: 50, tier: 'free', resetAt: '' },
      }),
    )

    render(<BillingPanel />)
    expect(screen.getByText('Upgrade')).toBeInTheDocument()
  })

  it('displays period end date', () => {
    mockUseSubscription.mockReturnValue(
      makeHookReturn({
        subscription: {
          tier: 'pro',
          status: 'active',
          periodEnd: '2026-03-12T00:00:00Z',
          cancelAtPeriodEnd: false,
          limits: { aiRequestsPerDay: 500, maxProjects: 50, maxFilesPerProject: 200 },
        },
        usage: { used: 100, limit: 500, tier: 'pro', resetAt: '' },
      }),
    )

    render(<BillingPanel />)
    expect(screen.getByText(/Renews on/)).toBeInTheDocument()
  })
})
