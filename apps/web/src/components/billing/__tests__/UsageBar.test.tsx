import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UsageBar } from '../UsageBar'
import type { UsageInfo } from '@/hooks/useSubscription'

const makeUsage = (used: number, limit: number): UsageInfo => ({
  used,
  limit,
  tier: 'free',
  resetAt: '2024-01-02T00:00:00Z',
})

describe('UsageBar', () => {
  it('renders usage count and limit', () => {
    render(<UsageBar usage={makeUsage(23, 50)} />)
    expect(screen.getByText('AI Requests Today')).toBeInTheDocument()
    expect(screen.getByText('23 / 50')).toBeInTheDocument()
    expect(screen.getByText(/Resets at midnight UTC/)).toBeInTheDocument()
  })

  it('shows warning when ≥90% usage', () => {
    render(<UsageBar usage={makeUsage(45, 50)} />)
    expect(screen.getByText(/Nearing limit/)).toBeInTheDocument()
  })

  it('shows limit reached message at 100%', () => {
    render(<UsageBar usage={makeUsage(50, 50)} />)
    expect(screen.getByText(/Limit reached/)).toBeInTheDocument()
  })

  it('calls onUpgrade when upgrade button clicked', () => {
    const onUpgrade = vi.fn()
    render(<UsageBar usage={makeUsage(50, 50)} onUpgrade={onUpgrade} />)
    fireEvent.click(screen.getByText('Upgrade'))
    expect(onUpgrade).toHaveBeenCalledOnce()
  })
})
