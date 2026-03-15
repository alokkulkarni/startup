import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectCard } from './ProjectCard'

const mockProject = {
  id: 'proj-001',
  workspaceId: 'ws-001',
  name: 'My Test App',
  framework: 'react' as const,
  description: null,
  status: 'active' as const,
  thumbnail: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('ProjectCard', () => {
  it('renders project name', () => {
    render(
      <ProjectCard
        project={mockProject}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('My Test App')).toBeDefined()
  })

  it('renders framework badge', () => {
    render(
      <ProjectCard
        project={mockProject}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText(/react/i)).toBeDefined()
  })

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn()
    const { container } = render(
      <ProjectCard
        project={mockProject}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onClick={onClick}
      />
    )
    fireEvent.click(container.firstChild as Element)
    expect(onClick).toHaveBeenCalledWith('proj-001')
  })
})
