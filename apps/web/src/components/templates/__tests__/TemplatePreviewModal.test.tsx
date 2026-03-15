import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplatePreviewModal } from '../TemplatePreviewModal'
import type { Template } from '@/hooks/useTemplates'

const mockTemplate: Template = {
  id: 'tpl-001',
  name: 'React Starter',
  slug: 'react-starter',
  description: 'A modern React starter template',
  category: 'starter',
  framework: 'React',
  filesJson: [
    { path: 'src/App.tsx', content: '' },
    { path: 'src/index.tsx', content: '' },
    { path: 'package.json', content: '' },
  ],
  thumbnailUrl: null,
  useCount: 42,
  avgRating: '4.50',
  ratingCount: 10,
  isOfficial: true,
  isPublic: true,
}

describe('TemplatePreviewModal', () => {
  it('renders when open', () => {
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={vi.fn()}
        onUse={vi.fn()}
      />,
    )
    expect(screen.getByText('React Starter')).toBeInTheDocument()
    expect(screen.getByText('A modern React starter template')).toBeInTheDocument()
  })

  it('shows file tree paths', () => {
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={vi.fn()}
        onUse={vi.fn()}
      />,
    )
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument()
    expect(screen.getByText('src/index.tsx')).toBeInTheDocument()
    expect(screen.getByText('package.json')).toBeInTheDocument()
  })

  it('Use This Template button calls onUse', () => {
    const onUse = vi.fn()
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={vi.fn()}
        onUse={onUse}
      />,
    )
    fireEvent.click(screen.getByText('Use This Template'))
    expect(onUse).toHaveBeenCalledWith('tpl-001')
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    render(
      <TemplatePreviewModal
        template={mockTemplate}
        isOpen={true}
        onClose={onClose}
        onUse={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('modal-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})
