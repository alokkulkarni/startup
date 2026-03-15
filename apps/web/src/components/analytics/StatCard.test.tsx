import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders the value', () => {
    render(<StatCard icon="🤖" label="AI Requests" value={1234} />)
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('renders the label', () => {
    render(<StatCard icon="🚀" label="Deployments" value={42} />)
    expect(screen.getByText('Deployments')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(<StatCard icon="📁" label="Projects" value={5} />)
    expect(screen.getByText('📁')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(<StatCard icon="🤖" label="AI Requests" value={100} loading />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
    expect(screen.queryByText('100')).not.toBeInTheDocument()
  })

  it('shows positive delta in green', () => {
    render(<StatCard icon="🤖" label="AI Requests" value={100} delta={12} />)
    const badge = screen.getByText('+12%')
    expect(badge.className).toContain('text-green-700')
  })

  it('shows negative delta in red', () => {
    render(<StatCard icon="🤖" label="AI Requests" value={100} delta={-5} />)
    const badge = screen.getByText('-5%')
    expect(badge.className).toContain('text-red-600')
  })

  it('renders sublabel when provided', () => {
    render(<StatCard icon="🤖" label="AI Requests" value={100} sublabel="Last 30 days" />)
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('renders string value as-is', () => {
    render(<StatCard icon="📊" label="Status" value="N/A" />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
})
