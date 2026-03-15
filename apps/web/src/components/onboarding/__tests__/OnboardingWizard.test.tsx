import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { OnboardingWizard } from '../OnboardingWizard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: vi.fn(),
}))

vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: vi.fn(),
}))

import { useOnboarding } from '@/hooks/useOnboarding'
import { useTemplates } from '@/hooks/useTemplates'

const mockUseOnboarding = vi.mocked(useOnboarding)
const mockUseTemplates = vi.mocked(useTemplates)

const mockTemplate = {
  id: 'tpl-001',
  name: 'React Starter',
  slug: 'react-starter',
  description: 'A modern React starter template',
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

const defaultOnboarding = {
  onboarding: { completed: false, step: 0 },
  loading: false,
  fetchOnboarding: vi.fn(),
  updateOnboarding: vi.fn(),
  completeOnboarding: vi.fn().mockResolvedValue(undefined),
}

const defaultTemplates = {
  templates: [],
  loading: false,
  error: null,
  total: 0,
  fetchTemplates: vi.fn(),
  fetchTemplate: vi.fn(),
  cloneTemplate: vi.fn().mockResolvedValue('proj-new'),
  rateTemplate: vi.fn(),
  suggestTemplates: vi.fn().mockResolvedValue([]),
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOnboarding.mockReturnValue(defaultOnboarding)
    mockUseTemplates.mockReturnValue(defaultTemplates)
  })

  it('shows welcome step initially', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    expect(screen.getByText('Welcome to Forge AI!')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('advances to step 1 on Get Started', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    expect(screen.getByText('What do you want to build?')).toBeInTheDocument()
  })

  it('calls suggestTemplates on describe step', async () => {
    const mockSuggest = vi.fn().mockResolvedValue([])
    mockUseTemplates.mockReturnValue({ ...defaultTemplates, suggestTemplates: mockSuggest })

    render(<OnboardingWizard onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))

    const input = screen.getByPlaceholderText(/describe your project/i)
    fireEvent.change(input, { target: { value: 'an e-commerce site' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Find Templates'))
    })

    expect(mockSuggest).toHaveBeenCalledWith('an e-commerce site')
  })

  it('shows suggested template cards', async () => {
    const mockSuggest = vi.fn().mockResolvedValue([mockTemplate])
    mockUseTemplates.mockReturnValue({ ...defaultTemplates, suggestTemplates: mockSuggest })

    render(<OnboardingWizard onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))

    const input = screen.getByPlaceholderText(/describe your project/i)
    fireEvent.change(input, { target: { value: 'a React app' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Find Templates'))
    })

    expect(screen.getByText('React Starter')).toBeInTheDocument()
  })

  it('skip button completes onboarding', async () => {
    const mockComplete = vi.fn().mockResolvedValue(undefined)
    mockUseOnboarding.mockReturnValue({ ...defaultOnboarding, completeOnboarding: mockComplete })
    const onComplete = vi.fn()

    render(<OnboardingWizard onComplete={onComplete} />)

    await act(async () => {
      fireEvent.click(screen.getByText('Skip'))
    })

    expect(mockComplete).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalled()
  })
})
