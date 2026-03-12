import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTemplates } from '../useTemplates'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

import { api } from '@/lib/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApi = api as any

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
  isOfficial: true,
  isPublic: true,
}

describe('useTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.get.mockResolvedValue({ data: { templates: [], total: 0 } })
    mockApi.post.mockResolvedValue({ data: {} })
  })

  it('fetchTemplates returns list', async () => {
    mockApi.get.mockResolvedValue({ data: { templates: [mockTemplate], total: 1 } })

    const { result } = renderHook(() => useTemplates())

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    expect(result.current.templates).toHaveLength(1)
    expect(result.current.templates[0].name).toBe('React Starter')
    expect(result.current.total).toBe(1)
  })

  it('fetchTemplates with category filter', async () => {
    mockApi.get.mockResolvedValue({ data: { templates: [mockTemplate], total: 1 } })

    const { result } = renderHook(() => useTemplates())

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    await act(async () => {
      await result.current.fetchTemplates({ category: 'starter' })
    })

    const calls = mockApi.get.mock.calls
    const categoryCall = calls.find((c: string[]) => c[0].includes('category=starter'))
    expect(categoryCall).toBeTruthy()
  })

  it('fetchTemplates with search filter', async () => {
    mockApi.get.mockResolvedValue({ data: { templates: [], total: 0 } })

    const { result } = renderHook(() => useTemplates())

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    await act(async () => {
      await result.current.fetchTemplates({ search: 'react' })
    })

    const calls = mockApi.get.mock.calls
    const searchCall = calls.find((c: string[]) => c[0].includes('search=react'))
    expect(searchCall).toBeTruthy()
  })

  it('fetchTemplate by slug returns single', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { templates: [], total: 0 } })
      .mockResolvedValueOnce({ data: mockTemplate })

    const { result } = renderHook(() => useTemplates())

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    let template
    await act(async () => {
      template = await result.current.fetchTemplate('react-starter')
    })

    expect(mockApi.get).toHaveBeenCalledWith('/v1/templates/react-starter')
    expect(template).toEqual(mockTemplate)
  })

  it('cloneTemplate returns projectId', async () => {
    mockApi.post.mockResolvedValue({ data: { projectId: 'proj-abc' } })

    const { result } = renderHook(() => useTemplates())

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    let projectId
    await act(async () => {
      projectId = await result.current.cloneTemplate('tpl-001', 'My Project')
    })

    expect(mockApi.post).toHaveBeenCalledWith('/v1/templates/tpl-001/clone', { projectName: 'My Project' })
    expect(projectId).toBe('proj-abc')
  })

  it('rateTemplate returns updated avg', async () => {
    mockApi.post.mockResolvedValue({ data: { avgRating: '4.75', ratingCount: 11 } })

    const { result } = renderHook(() => useTemplates())

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    let ratingResult
    await act(async () => {
      ratingResult = await result.current.rateTemplate('tpl-001', 5)
    })

    expect(mockApi.post).toHaveBeenCalledWith('/v1/templates/tpl-001/rate', { rating: 5 })
    expect(ratingResult).toEqual({ avgRating: '4.75', ratingCount: 11 })
  })

  it('suggestTemplates returns top 3', async () => {
    const suggestions = [mockTemplate, { ...mockTemplate, id: 'tpl-002', name: 'SaaS Kit' }, { ...mockTemplate, id: 'tpl-003', name: 'Landing Pro' }]
    mockApi.post.mockResolvedValue({ data: { templates: suggestions } })

    const { result } = renderHook(() => useTemplates())

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    let suggested
    await act(async () => {
      suggested = await result.current.suggestTemplates('an e-commerce store')
    })

    expect(mockApi.post).toHaveBeenCalledWith('/v1/templates/suggest', { description: 'an e-commerce store' })
    expect((suggested as unknown as typeof suggestions).length).toBe(3)
  })

  it('error handling when API fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTemplates())

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.templates).toHaveLength(0)
  })
})
