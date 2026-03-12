'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NewProjectModalProps {
  onClose: () => void
  onCreate: (name: string, framework: string) => Promise<void>
}

const FRAMEWORKS = [
  { id: 'react',   label: 'React',    icon: '⚛',  desc: 'Vite + React + TypeScript' },
  { id: 'nextjs',  label: 'Next.js',  icon: '▲',  desc: 'Next.js 14 + Tailwind CSS' },
  { id: 'vue',     label: 'Vue',      icon: '💚', desc: 'Vite + Vue 3 + TypeScript' },
  { id: 'svelte',  label: 'Svelte',   icon: '🔥', desc: 'Vite + Svelte 4' },
  { id: 'vanilla', label: 'Vanilla',  icon: '🟡', desc: 'Vite + TypeScript' },
]

export function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('')
  const [framework, setFramework] = useState('react')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    setError('')
    try {
      await onCreate(name.trim(), framework)
    } catch (err: any) {
      setError(err.message ?? 'Failed to create project')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-bold mb-1">New project</h2>
        <p className="text-sm text-gray-400 mb-6">Choose a framework and give your project a name</p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-950/50 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Framework grid */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 block">Framework</label>
            <div className="grid grid-cols-5 gap-2">
              {FRAMEWORKS.map(fw => (
                <button
                  key={fw.id}
                  type="button"
                  onClick={() => setFramework(fw.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                    framework === fw.id
                      ? 'border-forge-500 bg-forge-950/60 text-white'
                      : 'border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white',
                  )}
                >
                  <span className="text-2xl">{fw.icon}</span>
                  <span className="text-xs font-medium">{fw.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {FRAMEWORKS.find(f => f.id === framework)?.desc}
            </p>
          </div>

          {/* Project name */}
          <Input
            id="project-name"
            label="Project name"
            placeholder="My awesome app"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            autoFocus
            maxLength={100}
            error={error && !name.trim() ? error : undefined}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} className="flex-1">
              Create project
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
