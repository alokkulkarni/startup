'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTemplates } from '@/hooks/useTemplates'
import type { Template } from '@/hooks/useTemplates'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { CategoryFilter } from '@/components/templates/CategoryFilter'
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal'
import { Button } from '@/components/ui/button'

/** Small modal that asks for a project name before cloning a template */
function UseTemplateModal({
  template,
  isCreating,
  onConfirm,
  onClose,
}: {
  template: Template
  isCreating: boolean
  onConfirm: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(template.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.select() }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold text-white">Name your project</h2>
          <p className="text-sm text-gray-400 mt-1">
            Starting from <span className="text-white font-medium">{template.name}</span>
          </p>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My awesome project"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) onConfirm(name.trim())
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="flex gap-3">
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim() || isCreating}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-sm"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating…
              </span>
            ) : 'Create project'}
          </button>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const router = useRouter()
  const { templates, loading, total, fetchTemplates, cloneTemplate, rateTemplate } = useTemplates()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<'popular' | 'newest' | 'top_rated'>('popular')
  const [page, setPage] = useState(1)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const PER_PAGE = 12

  // Fetch initial templates on mount
  useEffect(() => {
    fetchTemplates({ sort, perPage: PER_PAGE })
  }, [fetchTemplates]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q: string) => {
    setSearch(q)
    setPage(1)
    fetchTemplates({ search: q, category, sort, page: 1, perPage: PER_PAGE })
  }

  const handleCategory = (cat: string) => {
    setCategory(cat)
    setPage(1)
    fetchTemplates({ search, category: cat, sort, page: 1, perPage: PER_PAGE })
  }

  const handleSort = (s: 'popular' | 'newest' | 'top_rated') => {
    setSort(s)
    setPage(1)
    fetchTemplates({ search, category, sort: s, page: 1, perPage: PER_PAGE })
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchTemplates({ search, category, sort, page: next, perPage: PER_PAGE })
  }

  const handleUse = (id: string) => {
    const tpl = templates.find(t => t.id === id) ?? previewTemplate
    if (tpl) {
      setPreviewTemplate(null)  // close preview modal if open
      setPendingTemplate(tpl)   // open name modal
    }
  }

  const handleConfirmName = async (projectName: string) => {
    if (!pendingTemplate) return
    setIsCreating(true)
    try {
      const projectId = await cloneTemplate(pendingTemplate.id, projectName)
      setPendingTemplate(null)
      if (projectId) router.push(`/dashboard/projects/${projectId}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleRate = async (id: string, rating: number) => {
    try {
      await rateTemplate(id, rating)
    } catch {
      // ignore rating errors
    }
  }

  const hasMore = templates.length < total

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-950/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
            F
          </Link>
          <span className="text-gray-600">/</span>
          <span className="font-semibold text-sm text-white">Template Gallery</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">Dashboard</Button>
          </Link>
          <Button size="sm" variant="secondary">
            Import from GitHub
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-white">Template Gallery</h1>
          <p className="text-gray-400 text-sm mt-1">{total} templates available</p>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-3">
          <input
            type="search"
            placeholder="Search templates…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <select
            value={sort}
            onChange={e => handleSort(e.target.value as 'popular' | 'newest' | 'top_rated')}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
            <option value="top_rated">Top Rated</option>
          </select>
        </div>

        {/* Category filter */}
        <CategoryFilter selected={category} onChange={handleCategory} />

        {/* Loading skeleton */}
        {loading && templates.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-800" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-5xl">🔍</div>
            <h2 className="text-xl font-semibold text-white">No templates found</h2>
            <p className="text-gray-500 text-sm">Try a different search or category</p>
            <Button onClick={() => { setSearch(''); setCategory(''); fetchTemplates() }}>
              Clear filters
            </Button>
          </div>
        )}

        {/* Template grid */}
        {templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tpl => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onPreview={() => setPreviewTemplate(tpl)}
                onUse={() => handleUse(tpl.id)}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center pt-4">
            <Button variant="secondary" onClick={handleLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </main>

      {/* Preview modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        onUse={handleUse}
        onRate={handleRate}
      />

      {/* Name modal — shown before cloning */}
      {pendingTemplate && (
        <UseTemplateModal
          template={pendingTemplate}
          isCreating={isCreating}
          onConfirm={handleConfirmName}
          onClose={() => !isCreating && setPendingTemplate(null)}
        />
      )}
    </div>
  )
}
