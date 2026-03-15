import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAnalytics } from './useAnalytics'

const mockOverview = {
  aiRequests: 100,
  deployments: 20,
  projectsCreated: 5,
  templateClones: 3,
  activeProjects: 8,
  activeMembers: 4,
  totalEvents: 500,
}

const mockSeries = [
  { date: '2024-01-01', requests: 10 },
  { date: '2024-01-02', requests: 15 },
]

const mockActivity = [
  {
    id: 'evt-1',
    eventType: 'ai_request',
    metadata: {},
    createdAt: new Date().toISOString(),
    projectId: 'proj-1',
    userId: 'user-1',
    userEmail: 'test@example.com',
    projectName: 'My Project',
  },
]

function makeFetch(overviewOk = true, seriesOk = true, activityOk = true) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('overview')) {
      return Promise.resolve({
        ok: overviewOk,
        json: () => Promise.resolve(mockOverview),
      })
    }
    if (url.includes('ai-usage')) {
      return Promise.resolve({
        ok: seriesOk,
        json: () => Promise.resolve({ series: mockSeries }),
      })
    }
    if (url.includes('activity')) {
      return Promise.resolve({
        ok: activityOk,
        json: () => Promise.resolve({ events: mockActivity }),
      })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
  })
}

describe('useAnalytics', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches all 3 endpoints on mount', async () => {
    const fetchMock = makeFetch()
    global.fetch = fetchMock

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const urls = fetchMock.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(urls.some(u => u.includes('overview'))).toBe(true)
    expect(urls.some(u => u.includes('ai-usage'))).toBe(true)
    expect(urls.some(u => u.includes('activity'))).toBe(true)
  })

  it('sets overview data from response', async () => {
    global.fetch = makeFetch()

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.overview).not.toBeNull())

    expect(result.current.overview?.aiRequests).toBe(100)
    expect(result.current.overview?.deployments).toBe(20)
    expect(result.current.overview?.activeProjects).toBe(8)
  })

  it('sets aiSeries from ai-usage response', async () => {
    global.fetch = makeFetch()

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.aiSeries).toHaveLength(2)
    expect(result.current.aiSeries[0].date).toBe('2024-01-01')
    expect(result.current.aiSeries[0].requests).toBe(10)
  })

  it('sets activity from activity response', async () => {
    global.fetch = makeFetch()

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.activity).toHaveLength(1)
    expect(result.current.activity[0].eventType).toBe('ai_request')
    expect(result.current.activity[0].userEmail).toBe('test@example.com')
  })

  it('sets error on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to load analytics')
  })

  it('handles empty series response gracefully', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('overview')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockOverview) })
      }
      if (url.includes('ai-usage')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) // no series key
      }
      if (url.includes('activity')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) // no events key
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.aiSeries).toEqual([])
    expect(result.current.activity).toEqual([])
  })

  it('starts with loading=true', () => {
    global.fetch = makeFetch()
    const { result } = renderHook(() => useAnalytics())
    expect(result.current.loading).toBe(true)
  })

  it('exposes a refresh function', async () => {
    const fetchMock = makeFetch()
    global.fetch = fetchMock

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const callsBefore = fetchMock.mock.calls.length
    await result.current.refresh()

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('does not set overview when endpoint returns non-ok', async () => {
    global.fetch = makeFetch(false, true, true)

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.overview).toBeNull()
    expect(result.current.aiSeries).toHaveLength(2)
  })
})
