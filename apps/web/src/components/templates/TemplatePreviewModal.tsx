'use client'

import { useEffect, useState } from 'react'
import type { Template } from '@/hooks/useTemplates'
import { StarRating } from './StarRating'

interface TemplatePreviewModalProps {
  template: Template | null
  isOpen: boolean
  onClose: () => void
  onUse: (id: string) => void
  onRate?: (id: string, rating: number) => void
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onUse,
  onRate,
}: TemplatePreviewModalProps) {
  const [userRating, setUserRating] = useState(0)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen || !template) return null

  const sortedPaths = [...template.filesJson]
    .map(f => f.path)
    .sort((a, b) => a.localeCompare(b))

  const handleRate = (n: number) => {
    setUserRating(n)
    onRate?.(template.id, n)
  }

  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Template Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row overflow-auto flex-1">
          {/* Left panel — 60% */}
          <div className="md:w-3/5 p-6 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-gray-800">
            <div>
              <h3 className="text-2xl font-bold text-white">{template.name}</h3>
              <p className="text-gray-400 mt-2 text-sm leading-relaxed">{template.description}</p>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-800 text-blue-400 border border-gray-700 capitalize">
                {template.framework}
              </span>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-700 text-gray-300 capitalize">
                {template.category}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>⭐ {parseFloat(template.avgRating).toFixed(1)} ({template.ratingCount} ratings)</span>
              <span>📦 {template.useCount} uses</span>
            </div>

            {/* Rating widget */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Rate this template</p>
              <StarRating value={userRating} onChange={handleRate} />
            </div>

            {/* CTA */}
            <button
              onClick={() => onUse(template.id)}
              className="mt-auto w-full py-3 bg-violet-900/60 hover:bg-violet-900/90 text-violet-200 font-semibold rounded-xl transition-all border border-violet-800/40"
            >
              Use This Template
            </button>
          </div>

          {/* Right panel — 40% */}
          <div className="md:w-2/5 p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-300">Included Files</h4>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                {sortedPaths.length} files
              </span>
            </div>
            <div
              className="overflow-y-auto flex-1 space-y-0.5 font-mono text-xs text-gray-400"
              data-testid="file-tree"
            >
              {sortedPaths.map(path => (
                <div
                  key={path}
                  className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-gray-800 transition-colors"
                >
                  <span className="text-gray-600 select-none">
                    {path.includes('/') ? '├─' : '  '}
                  </span>
                  <span>{path}</span>
                </div>
              ))}
              {sortedPaths.length === 0 && (
                <p className="text-gray-600 text-center py-4">No files</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
