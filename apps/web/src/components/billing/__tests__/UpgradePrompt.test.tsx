import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpgradePrompt } from '../UpgradePrompt'

describe('UpgradePrompt', () => {
  const onClose = vi.fn()
  const onUpgrade = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders rate_limit message', () => {
    render(<UpgradePrompt type="rate_limit" onClose={onClose} onUpgrade={onUpgrade} />)
    expect(screen.getByText(/50 AI requests/)).toBeInTheDocument()
    expect(screen.getAllByText(/Upgrade to Pro/).length).toBeGreaterThan(0)
  })

  it('renders project_limit message', () => {
    render(<UpgradePrompt type="project_limit" onClose={onClose} onUpgrade={onUpgrade} />)
    expect(screen.getByText(/3-project limit/)).toBeInTheDocument()
    expect(screen.getAllByText(/Upgrade to Pro/).length).toBeGreaterThan(0)
  })

  it('calls onUpgrade with correct priceId', () => {
    render(<UpgradePrompt type="rate_limit" onClose={onClose} onUpgrade={onUpgrade} />)
    fireEvent.click(screen.getByText(/Upgrade to Pro — \$19\/mo/))
    expect(onUpgrade).toHaveBeenCalledWith('price_pro_monthly')
  })

  it('calls onClose on dismiss', () => {
    render(<UpgradePrompt type="rate_limit" onClose={onClose} onUpgrade={onUpgrade} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })
})
