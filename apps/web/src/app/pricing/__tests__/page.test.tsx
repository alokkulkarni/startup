import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PricingPage from '../page'

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, authenticated: false, logout: vi.fn() })),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import { useSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/contexts/AuthContext'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseSubscription = useSubscription as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseAuth = useAuth as any

const mockStartCheckout = vi.fn()

const defaultHookReturn = {
  subscription: null,
  usage: null,
  loading: false,
  error: null,
  startCheckout: mockStartCheckout,
  openPortal: vi.fn(),
  fetchSubscription: vi.fn(),
  fetchUsage: vi.fn(),
}

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSubscription.mockReturnValue(defaultHookReturn)
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      authenticated: true,
      logout: vi.fn(),
    })
  })

  it('renders 3 plan cards', () => {
    render(<PricingPage />)
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('Pro card has Most Popular badge', () => {
    render(<PricingPage />)
    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('billing toggle changes displayed prices', () => {
    render(<PricingPage />)

    // Monthly prices shown by default
    expect(screen.getByText('$19')).toBeInTheDocument()

    // Click yearly toggle
    fireEvent.click(screen.getByRole('button', { name: /Yearly/ }))

    // Yearly price for Pro shown
    expect(screen.getByText('$15')).toBeInTheDocument()
  })

  it('clicking upgrade calls startCheckout', () => {
    render(<PricingPage />)

    fireEvent.click(screen.getByText('Upgrade to Pro'))

    expect(mockStartCheckout).toHaveBeenCalledWith('price_pro_monthly')
  })

  it('shows current plan badge for logged-in user', () => {
    mockUseSubscription.mockReturnValue({
      ...defaultHookReturn,
      subscription: {
        tier: 'pro',
        status: 'active',
        periodEnd: '2025-12-31T00:00:00Z',
        cancelAtPeriodEnd: false,
        limits: { aiRequestsPerDay: 500, maxProjects: 50, maxFilesPerProject: 200 },
      },
    })

    render(<PricingPage />)
    expect(screen.getByText(/Current plan/)).toBeInTheDocument()
  })
})
