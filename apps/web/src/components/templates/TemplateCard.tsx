'use client'

import type { Template } from '@/hooks/useTemplates'

const CATEGORY_GRADIENTS: Record<string, string> = {
  starter:   'from-violet-900/35 to-purple-950/20',
  saas:      'from-blue-900/35 to-indigo-950/20',
  landing:   'from-emerald-900/35 to-teal-950/20',
  blog:      'from-orange-900/35 to-rose-950/20',
  ecommerce: 'from-pink-900/35 to-rose-950/20',
  dashboard: 'from-cyan-900/35 to-blue-950/20',
  api:       'from-gray-800/40 to-slate-900/20',
}

const FRAMEWORK_COLORS: Record<string, string> = {
  react:     'bg-gray-800 text-blue-400 border border-gray-700',
  nextjs:    'bg-gray-800 text-gray-400 border border-gray-700',
  'next.js': 'bg-gray-800 text-gray-400 border border-gray-700',
  vue:       'bg-gray-800 text-green-400 border border-gray-700',
  svelte:    'bg-gray-800 text-orange-400 border border-gray-700',
  node:      'bg-gray-800 text-green-400 border border-gray-700',
  angular:   'bg-gray-800 text-red-400 border border-gray-700',
  flutter:   'bg-gray-800 text-sky-400 border border-gray-700',
}

interface TemplateCardProps {
  template: Template
  onPreview: () => void
  onUse: () => void
}

export function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  const gradient =
    CATEGORY_GRADIENTS[template.category.toLowerCase()] ?? CATEGORY_GRADIENTS.starter
  const fwKey = template.framework.toLowerCase()
  const fwColor = FRAMEWORK_COLORS[fwKey] ?? 'bg-gray-700 text-gray-200'
  const avgRating = parseFloat(template.avgRating)

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden flex flex-col hover:border-gray-500 transition-all">
      {/* Thumbnail */}
      <div className={`h-36 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
        {template.thumbnailUrl ? (
          <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl opacity-40 select-none">⚡</span>
        )}
        {template.isOfficial && (
          <span className="absolute top-2 right-2 bg-gray-700/80 text-amber-400 border border-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
            Official
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base text-white leading-tight">{template.name}</h3>
        </div>

        <p className="text-gray-400 text-sm line-clamp-2">{template.description}</p>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span
            data-testid="framework-badge"
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${fwColor}`}
          >
            {template.framework}
          </span>
          <span className="text-xs text-gray-500 capitalize">{template.category}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto pt-2">
          <span>⭐ {isNaN(avgRating) ? '—' : avgRating.toFixed(1)} ({template.ratingCount})</span>
          <span>📦 {template.useCount} uses</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onPreview}
            className="flex-1 text-sm py-1.5 px-3 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white transition-all"
          >
            Preview
          </button>
          <button
            onClick={onUse}
            className="flex-1 text-sm py-1.5 px-3 rounded-lg bg-violet-900/60 hover:bg-violet-900/90 text-violet-200 font-medium transition-all border border-violet-800/40"
          >
            Use Template
          </button>
        </div>
      </div>
    </div>
  )
}
