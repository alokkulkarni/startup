import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryFilter } from '../CategoryFilter'

describe('CategoryFilter', () => {
  it('renders all categories', () => {
    render(<CategoryFilter selected="" onChange={vi.fn()} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByText('SaaS')).toBeInTheDocument()
    expect(screen.getByText('Landing')).toBeInTheDocument()
    expect(screen.getByText('Blog')).toBeInTheDocument()
    expect(screen.getByText('E-commerce')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('API')).toBeInTheDocument()
  })

  it('active category has different style', () => {
    render(<CategoryFilter selected="starter" onChange={vi.fn()} />)
    const activeBtn = screen.getByText('Starter')
    expect(activeBtn).toHaveClass('bg-violet-600')
    const inactiveBtn = screen.getByText('All')
    expect(inactiveBtn).toHaveClass('bg-gray-800')
  })

  it('clicking category calls onChange', () => {
    const onChange = vi.fn()
    render(<CategoryFilter selected="" onChange={onChange} />)
    fireEvent.click(screen.getByText('SaaS'))
    expect(onChange).toHaveBeenCalledWith('saas')
  })
})
