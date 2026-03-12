import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateCard } from '../TemplateCard'
import type { Template } from '@/hooks/useTemplates'

const mockTemplate: Template = {
  id: 'tpl-001',
  name: 'React Starter',
  slug: 'react-starter',
  description: 'A modern React starter template with TypeScript',
  category: 'starter',
  framework: 'React',
  filesJson: [{ path: 'src/App.tsx', content: '' }],
  thumbnailUrl: null,
  useCount: 42,
  avgRating: '4.50',
  ratingCount: 10,
  isOfficial: false,
  isPublic: true,
}

describe('TemplateCard', () => {
  it('renders template name and description', () => {
    render(<TemplateCard template={mockTemplate} onPreview={vi.fn()} onUse={vi.fn()} />)
    expect(screen.getByText('React Starter')).toBeInTheDocument()
    expect(screen.getByText('A modern React starter template with TypeScript')).toBeInTheDocument()
  })

  it('shows official badge when isOfficial', () => {
    const officialTemplate = { ...mockTemplate, isOfficial: true }
    render(<TemplateCard template={officialTemplate} onPreview={vi.fn()} onUse={vi.fn()} />)
    expect(screen.getByText('Official')).toBeInTheDocument()
  })

  it('shows correct framework badge color', () => {
    const reactTemplate = { ...mockTemplate, framework: 'React' }
    render(<TemplateCard template={reactTemplate} onPreview={vi.fn()} onUse={vi.fn()} />)
    const badge = screen.getByTestId('framework-badge')
    expect(badge).toHaveClass('bg-blue-600')
  })

  it('Preview button calls onPreview', () => {
    const onPreview = vi.fn()
    render(<TemplateCard template={mockTemplate} onPreview={onPreview} onUse={vi.fn()} />)
    fireEvent.click(screen.getByText('Preview'))
    expect(onPreview).toHaveBeenCalledOnce()
  })

  it('Use Template button calls onUse', () => {
    const onUse = vi.fn()
    render(<TemplateCard template={mockTemplate} onPreview={vi.fn()} onUse={onUse} />)
    fireEvent.click(screen.getByText('Use Template'))
    expect(onUse).toHaveBeenCalledOnce()
  })
})
