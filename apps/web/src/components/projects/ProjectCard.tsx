'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Project } from '@forge/shared'

interface ProjectCardProps {
  project: Project
  onRename: (id: string, name: string) => Promise<void>
  onDuplicate: (id: string) => Promise<void>
  onDelete: (project: Project) => void
  onClick: (id: string) => void
}

const frameworkColors: Record<string, string> = {
  react:   'text-blue-400 bg-blue-950/60 border-blue-800',
  nextjs:  'text-gray-300 bg-gray-800/60 border-gray-600',
  vue:     'text-green-400 bg-green-950/60 border-green-800',
  svelte:  'text-orange-400 bg-orange-950/60 border-orange-800',
  vanilla: 'text-yellow-400 bg-yellow-950/60 border-yellow-800',
}

const frameworkIcons: Record<string, string> = {
  react: '⚛', nextjs: '▲', vue: '💚', svelte: '🔥', vanilla: '🟡',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ProjectCard({ project, onRename, onDuplicate, onDelete, onClick }: ProjectCardProps) {
  const [renaming, setRenaming] = useState(false)
  const [nameValue, setNameValue] = useState(project.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState<'rename' | 'duplicate' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (renaming) inputRef.current?.select()
  }, [renaming])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const commitRename = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === project.name) { setRenaming(false); return }
    setLoading('rename')
    await onRename(project.id, trimmed)
    setLoading(null)
    setRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') { setNameValue(project.name); setRenaming(false) }
  }

  const handleDuplicate = async () => {
    setMenuOpen(false)
    setLoading('duplicate')
    await onDuplicate(project.id)
    setLoading(null)
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 hover:border-gray-700 transition-all cursor-pointer overflow-hidden',
        loading && 'opacity-60 pointer-events-none',
      )}
      onClick={() => !renaming && !menuOpen && onClick(project.id)}
      onDoubleClick={e => { e.stopPropagation(); setRenaming(true) }}
    >
      {/* Thumbnail */}
      <div className="h-36 bg-gradient-to-br from-forge-950 to-gray-900 flex items-center justify-center border-b border-gray-800">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl opacity-30">{frameworkIcons[project.framework] ?? '📦'}</span>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2">
        {/* Name */}
        <div className="flex items-center gap-2" onClick={e => renaming && e.stopPropagation()}>
          {renaming ? (
            <input
              ref={inputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-b border-forge-500 text-sm font-medium text-white outline-none py-0.5"
            />
          ) : (
            <h3 className="flex-1 text-sm font-medium text-white truncate">{project.name}</h3>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', frameworkColors[project.framework])}>
            {frameworkIcons[project.framework]} {project.framework}
          </span>
          <span className="text-xs text-gray-500">{timeAgo(project.updatedAt)}</span>
        </div>
      </div>

      {/* Context menu button */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        ref={menuRef}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white text-sm"
        >
          ⋯
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
            <button
              onClick={() => { setMenuOpen(false); setRenaming(true) }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center gap-2"
            >
              ✏️ Rename
            </button>
            <button
              onClick={handleDuplicate}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center gap-2"
            >
              {loading === 'duplicate' ? '⏳' : '⧉'} Duplicate
            </button>
            <hr className="border-gray-700 my-1" />
            <button
              onClick={() => { setMenuOpen(false); onDelete(project) }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/50 flex items-center gap-2"
            >
              🗑 Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
