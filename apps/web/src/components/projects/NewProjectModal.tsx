'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useTemplates } from '@/hooks/useTemplates'
import type { Template } from '@/hooks/useTemplates'
import { FolderIcon } from 'lucide-react'
import { api } from '@/lib/api'

interface Workspace { id: string; name: string; slug: string; role: string }

interface NewProjectModalProps {
  onClose: () => void
  onCreate: (name: string, framework: string, workspaceId: string) => Promise<void>
  activeWorkspaceId?: string
}

const FRAMEWORKS = [
  { id: 'react',   label: 'React',    icon: '⚛',  desc: 'Vite + React + TypeScript' },
  { id: 'nextjs',  label: 'Next.js',  icon: '▲',  desc: 'Next.js 14 + Tailwind CSS' },
  { id: 'vue',     label: 'Vue',      icon: '💚', desc: 'Vite + Vue 3 + TypeScript' },
  { id: 'svelte',  label: 'Svelte',   icon: '🔥', desc: 'Vite + Svelte 4' },
  { id: 'vanilla', label: 'Vanilla',  icon: '🟡', desc: 'Vite + TypeScript' },
  { id: 'angular', label: 'Angular',  icon: '🅰',  desc: 'Angular 18 + TypeScript' },
  { id: 'node',    label: 'Node.js',  icon: '🟢', desc: 'Fastify + Swagger REST API' },
  { id: 'flutter', label: 'Flutter',  icon: '🐦', desc: 'Flutter 3 Web + Material 3' },
]

type Tab = 'template' | 'blank'

export function NewProjectModal({ onClose, onCreate, activeWorkspaceId = '' }: NewProjectModalProps) {
  const router = useRouter()
  const { templates, loading: tplLoading, cloneTemplate, fetchTemplates } = useTemplates()

  const [tab, setTab] = useState<Tab>('template')
  const [name, setName] = useState('')
  const [framework, setFramework] = useState('react')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tplSearch, setTplSearch] = useState('')
  const [selectedTpl, setSelectedTpl] = useState<Template | null>(null)

  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [wsLoading, setWsLoading] = useState(true)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(activeWorkspaceId)

  useEffect(() => {
    api.get<Workspace[]>('/v1/workspaces')
      .then(d => {
        const list: Workspace[] = d.data ?? []
        setWorkspaces(list)
        if (!selectedWorkspaceId && list.length > 0) {
          setSelectedWorkspaceId(list[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setWsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTemplate = (tpl: Template) => {
    setSelectedTpl(tpl)
    setName(tpl.name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required'); return }
    if (!selectedWorkspaceId) { setError('Please select a workspace first'); return }
    setLoading(true)
    setError('')
    try {
      if (tab === 'template' && selectedTpl) {
        const projectId = await cloneTemplate(selectedTpl.id, name.trim(), selectedWorkspaceId)
        onClose()
        if (projectId) router.push(`/dashboard/projects/${projectId}`)
      } else {
        await onCreate(name.trim(), framework, selectedWorkspaceId)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project'
      setError(msg)
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(
    t =>
      t.name.toLowerCase().includes(tplSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(tplSearch.toLowerCase()),
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full mx-4 shadow-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {([['template', 'From Template'], ['blank', 'Blank Project']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors',
                tab === id
                  ? 'text-white border-b-2 border-violet-500'
                  : 'text-gray-400 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-800 bg-red-950/50 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* From Template tab */}
            {tab === 'template' && (
              <div className="space-y-3">
                <input
                  type="search"
                  placeholder="Search templates…"
                  value={tplSearch}
                  onChange={e => {
                    setTplSearch(e.target.value)
                    fetchTemplates({ search: e.target.value })
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
                {tplLoading && templates.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                    Loading templates…
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {filteredTemplates.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tpl)}
                        className={cn(
                          'text-left p-3 rounded-xl border transition-all',
                          selectedTpl?.id === tpl.id
                            ? 'border-violet-500 bg-violet-950/40'
                            : 'border-gray-700 hover:border-gray-500',
                        )}
                      >
                        <p className="text-sm font-medium text-white truncate">{tpl.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.framework} · {tpl.category}</p>
                      </button>
                    ))}
                    {filteredTemplates.length === 0 && (
                      <p className="col-span-2 text-center text-gray-500 text-sm py-8">No templates found</p>
                    )}
                  </div>
                )}

                {selectedTpl && (
                  <Input
                    id="project-name-tpl"
                    label="Project name"
                    value={name}
                    onChange={e => { setName(e.target.value); setError('') }}
                    maxLength={100}
                    error={error && !name.trim() ? error : undefined}
                  />
                )}
              </div>
            )}

            {/* Blank Project tab */}
            {tab === 'blank' && (
              <div className="space-y-5">
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
                            ? 'border-violet-500 bg-violet-950/60 text-white'
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
              </div>
            )}

            <div className="flex gap-3 pt-1">
              {/* Workspace selector */}
              <div className="w-full">
                <label className="text-xs font-medium text-gray-400 mb-1 block">Workspace</label>
                {wsLoading ? (
                  <div className="h-9 rounded-md bg-gray-800 animate-pulse" />
                ) : workspaces.length === 0 ? (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <FolderIcon className="h-3 w-3" />
                    Create a workspace first before making a project.
                  </p>
                ) : (
                  <select
                    value={selectedWorkspaceId}
                    onChange={e => setSelectedWorkspaceId(e.target.value)}
                    className="w-full h-9 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                loading={loading}
                disabled={(tab === 'template' && !selectedTpl) || !selectedWorkspaceId || workspaces.length === 0}
                className="flex-1"
              >
                Create project
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
