import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSubscription } from '../useSubscription'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

import { api } from '@/lib/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApi = api as any

const mockSubscription = {
  tier: 'pro' as const,
  status: 'active',
  periodEnd: '2025-12-31T00:00:00Z',
  cancelAtPeriodEnd: false,
  limits: {
    aiRequestsPerDay: 500,
    maxProjects: 50,
    maxFilesPerProject: 200,
  },
}

const mockUsage = {
  used: 23,
  limit: 500,
  tier: 'pro',
  resetAt: '2024-01-02T00:00:00Z',
}

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.get.mockResolvedValue({ data: mockSubscription })
    mockApi.post.mockResolvedValue({ data: { url: 'https://stripe.com/checkout' } })
  })

  it('fetchSubscription returns subscription info', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockSubscription })
      .mockResolvedValueOnce({ data: mockUsage })

    const { result } = renderHook(() => useSubscription())

    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    expect(result.current.subscription).toEqual(mockSubscription)
    expect(result.current.error).toBeNull()
  })

  it('fetchSubscription defaults to free tier', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: mockUsage })

    const { result } = renderHook(() => useSubscription())

    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    expect(result.current.subscription?.tier).toBe('free')
    expect(result.current.subscription?.limits.maxProjects).toBe(3)
  })

  it('fetchUsage returns usage data', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockSubscription })
      .mockResolvedValueOnce({ data: mockUsage })

    const { result } = renderHook(() => useSubscription())

    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    expect(result.current.usage).toEqual(mockUsage)
    expect(result.current.usage?.used).toBe(23)
  })

  it('startCheckout redirects to Stripe URL', async () => {
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    mockApi.get
      .mockResolvedValueOnce({ data: mockSubscription })
      .mockResolvedValueOnce({ data: mockUsage })
    mockApi.post.mockResolvedValueOnce({
      data: { url: 'https://checkout.stripe.com/pay/session-123' },
    })

    const { result } = renderHook(() => useSubscription())

    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    await act(async () => {
      await result.current.startCheckout('price_pro_monthly')
    })

    expect(window.location.href).toBe('https://checkout.stripe.com/pay/session-123')
    expect(mockApi.post).toHaveBeenCalledWith('/v1/billing/checkout', {
      priceId: 'price_pro_monthly',
    })
  })

  it('openPortal redirects to portal URL', async () => {
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    mockApi.get
      .mockResolvedValueOnce({ data: mockSubscription })
      .mockResolvedValueOnce({ data: mockUsage })
    mockApi.post.mockResolvedValueOnce({
      data: { url: 'https://billing.stripe.com/p/session-portal' },
    })

    const { result } = renderHook(() => useSubscription())

    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    await act(async () => {
      await result.current.openPortal()
    })

    expect(window.location.href).toBe('https://billing.stripe.com/p/session-portal')
    expect(mockApi.post).toHaveBeenCalledWith('/v1/billing/portal', {})
  })

  it('error state set when API fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSubscription())

    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    expect(result.current.error).toBeTruthy()
    // Still defaults to free tier on error
    expect(result.current.subscription?.tier).toBe('free')
  })

  it('loading state managed correctly', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockSubscription })
      .mockResolvedValueOnce({ data: mockUsage })

    const { result } = renderHook(() => useSubscription())

    // effect fires immediately on mount — loading is true
    expect(result.current.loading).toBe(true)

    await act(async () => {
      await new Promise(r => setTimeout(r, 100))
    })

    // After fetches complete, loading is false again
    expect(result.current.loading).toBe(false)
    expect(result.current.subscription).not.toBeNull()
  })

  it('refetch on mount', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockSubscription })
      .mockResolvedValueOnce({ data: mockUsage })

    renderHook(() => useSubscription())

    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    expect(mockApi.get).toHaveBeenCalledWith('/v1/billing/subscription')
    expect(mockApi.get).toHaveBeenCalledWith('/v1/billing/usage')
  })
})
