import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanBadge } from '../PlanBadge'

describe('PlanBadge', () => {
  it('renders Free badge', () => {
    render(<PlanBadge tier="free" />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('renders Pro badge with icon', () => {
    render(<PlanBadge tier="pro" />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })

  it('renders Team badge with icon', () => {
    render(<PlanBadge tier="team" />)
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('🚀')).toBeInTheDocument()
  })
})
