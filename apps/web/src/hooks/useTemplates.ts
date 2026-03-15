'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export interface Template {
  id: string
  name: string
  slug: string
  description: string
  category: string
  framework: string
  filesJson: { path: string; content: string }[]
  thumbnailUrl: string | null
  useCount: number
  avgRating: string
  ratingCount: number
  isOfficial: boolean
  isPublic: boolean
}

export interface TemplateFilters {
  category?: string
  search?: string
  sort?: 'popular' | 'newest' | 'top_rated'
  page?: number
  perPage?: number
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchTemplates = async (filters?: TemplateFilters) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters?.category) params.set('category', filters.category)
      if (filters?.search) params.set('search', filters.search)
      if (filters?.sort) params.set('sort', filters.sort)
      if (filters?.page != null) params.set('page', String(filters.page))
      if (filters?.perPage != null) params.set('perPage', String(filters.perPage))
      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await api.get<{ templates: Template[]; total: number }>(`/v1/templates${query}`)
      setTemplates(res.data?.templates ?? [])
      setTotal(res.data?.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplate = async (slug: string): Promise<Template | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Template>(`/v1/templates/${slug}`)
      return res.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch template')
      return null
    } finally {
      setLoading(false)
    }
  }

  const cloneTemplate = async (id: string, projectName?: string): Promise<string | undefined> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ projectId: string }>(`/v1/templates/${id}/clone`, { projectName })
      return res.data?.projectId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone template')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const rateTemplate = async (id: string, rating: number) => {
    setError(null)
    try {
      const res = await api.post<{ avgRating: string; ratingCount: number }>(
        `/v1/templates/${id}/rate`,
        { rating },
      )
      return res.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rate template')
      throw err
    }
  }

  const suggestTemplates = async (description: string): Promise<Template[]> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ templates: Template[] }>('/v1/templates/suggest', { description })
      return res.data?.templates ?? []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest templates')
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    templates,
    loading,
    error,
    total,
    fetchTemplates,
    fetchTemplate,
    cloneTemplate,
    rateTemplate,
    suggestTemplates,
  }
}
