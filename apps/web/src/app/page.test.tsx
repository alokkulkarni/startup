import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandingPage from './page'

describe('LandingPage', () => {
  it('renders the hero heading', () => {
    render(<LandingPage />)
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
  })

  it('renders navigation links', () => {
    render(<LandingPage />)
    expect(screen.getByText('Sign in')).toBeDefined()
    expect(screen.getByText('Get started free')).toBeDefined()
  })

  it('renders feature cards', () => {
    render(<LandingPage />)
    expect(screen.getByText('Instant preview')).toBeDefined()
    expect(screen.getByText('AI-powered')).toBeDefined()
    expect(screen.getByText('One-click deploy')).toBeDefined()
  })
})
