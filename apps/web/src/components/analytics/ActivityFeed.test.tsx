import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityFeed } from './ActivityFeed'

const now = new Date().toISOString()

const mockEvents = [
  {
    id: 'evt-1',
    eventType: 'ai_request',
    metadata: {},
    createdAt: now,
    userEmail: 'alice@example.com',
    projectName: 'My Project',
  },
  {
    id: 'evt-2',
    eventType: 'deployment_created',
    metadata: { provider: 'vercel' },
    createdAt: now,
    userEmail: 'bob@example.com',
    projectName: null,
  },
  {
    id: 'evt-3',
    eventType: 'project_created',
    metadata: {},
    createdAt: now,
    userEmail: null,
    projectName: 'New Project',
  },
]

describe('ActivityFeed', () => {
  it('shows "No recent activity" when events array is empty', () => {
    render(<ActivityFeed events={[]} />)
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('shows loading skeletons when loading=true', () => {
    const { container } = render(<ActivityFeed events={[]} loading />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
    expect(screen.queryByText('No recent activity')).not.toBeInTheDocument()
  })

  it('renders event with correct icon', () => {
    render(<ActivityFeed events={[mockEvents[0]]} />)
    expect(screen.getByText('🤖')).toBeInTheDocument()
  })

  it('renders event label for ai_request', () => {
    render(<ActivityFeed events={[mockEvents[0]]} />)
    expect(screen.getByText('AI request sent')).toBeInTheDocument()
  })

  it('renders deployment event with provider', () => {
    render(<ActivityFeed events={[mockEvents[1]]} />)
    expect(screen.getByText('Deployed to vercel')).toBeInTheDocument()
  })

  it('renders user email in the meta line', () => {
    render(<ActivityFeed events={[mockEvents[0]]} />)
    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument()
  })

  it('shows "System" when userEmail is null', () => {
    render(<ActivityFeed events={[mockEvents[2]]} />)
    expect(screen.getByText(/System/)).toBeInTheDocument()
  })

  it('shows project name when present', () => {
    render(<ActivityFeed events={[mockEvents[0]]} />)
    expect(screen.getByText(/My Project/)).toBeInTheDocument()
  })

  it('renders multiple events', () => {
    render(<ActivityFeed events={mockEvents} />)
    expect(screen.getByText('AI request sent')).toBeInTheDocument()
    expect(screen.getByText('Deployed to vercel')).toBeInTheDocument()
  })

  it('renders time ago', () => {
    render(<ActivityFeed events={[mockEvents[0]]} />)
    expect(screen.getByText(/just now|ago/)).toBeInTheDocument()
  })
})
