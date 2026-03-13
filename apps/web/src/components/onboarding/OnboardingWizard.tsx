'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTemplates } from '@/hooks/useTemplates'
import { useOnboarding } from '@/hooks/useOnboarding'
import { api } from '@/lib/api'
import type { Template } from '@/hooks/useTemplates'
import type { Project } from '@forge/shared'

interface OnboardingWizardProps {
  onComplete: () => void
}

/** Extract a short project name from a description */
function nameFromDescription(desc: string): string {
  const clean = desc.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const words = clean.split(/\s+/).slice(0, 4)
  return words.join(' ') || 'My App'
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const { completeOnboarding } = useOnboarding()
  const { templates, fetchTemplates, cloneTemplate, loading: tplLoading } = useTemplates()

  const [view, setView] = useState<'build' | 'templates'>('build')
  const [description, setDescription] = useState('')
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState('')
  const [tplSearch, setTplSearch] = useState('')
  const [selectedTpl, setSelectedTpl] = useState<Template | null>(null)
  const [projectName, setProjectName] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSkip = async () => {
    await completeOnboarding()
    onComplete()
  }

  const handleStartBuilding = async () => {
    const prompt = description.trim()
    if (!prompt) {
      textareaRef.current?.focus()
      return
    }
    setBuilding(true)
    setError('')
    try {
      const name = nameFromDescription(prompt)
      const res = await api.post<Project>('/v1/projects', { name, framework: 'react' })
      if (!res.data?.id) throw new Error('Project creation failed')
      await completeOnboarding()
      onComplete()
      router.push(`/dashboard/projects/${res.data.id}?prompt=${encodeURIComponent(prompt)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      setBuilding(false)
    }
  }

  const handleBrowseTemplates = () => {
    setView('templates')
    if (templates.length === 0) fetchTemplates()
  }

  const handleUseTemplate = async () => {
    if (!selectedTpl) return
    setBuilding(true)
    setError('')
    try {
      const projectId = await cloneTemplate(selectedTpl.id, projectName || selectedTpl.name)
      await completeOnboarding()
      onComplete()
      if (projectId) router.push(`/dashboard/projects/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      setBuilding(false)
    }
  }

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(tplSearch.toLowerCase()) ||
    t.description.toLowerCase().includes(tplSearch.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">F</div>
            <span className="font-semibold text-white">Forge AI</span>
          </div>
          <button
            onClick={handleSkip}
            disabled={building}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            Skip for now
          </button>
        </div>

        {/* Build view */}
        {view === 'build' && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">What do you want to build?</h2>
              <p className="text-sm text-gray-400 mt-1">
                Describe your app and Forge AI will start building it immediately.
              </p>
            </div>

            <textarea
              ref={textareaRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStartBuilding()
              }}
              placeholder="e.g. A task management app with a kanban board, drag-and-drop, and dark mode"
              rows={4}
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
            />

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartBuilding}
                disabled={building || !description.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {building ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating project…
                  </>
                ) : (
                  <>⚡ Start Building</>
                )}
              </button>

              <button
                onClick={handleBrowseTemplates}
                disabled={building}
                className="w-full py-2.5 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-xl transition-all text-sm disabled:opacity-40"
              >
                Browse Templates
              </button>
            </div>

            <p className="text-center text-xs text-gray-600">
              Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">⌘ Enter</kbd> to submit
            </p>
          </div>
        )}

        {/* Templates view */}
        {view === 'templates' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('build')}
                className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-white">Choose a Template</h2>
            </div>

            <input
              type="search"
              placeholder="Search templates…"
              value={tplSearch}
              onChange={e => {
                setTplSearch(e.target.value)
                fetchTemplates({ search: e.target.value })
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />

            {tplLoading && filteredTemplates.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                Loading templates…
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-gray-500 text-sm">
                <span className="text-2xl">📭</span>
                No templates found — try a different search or
                <button onClick={() => setView('build')} className="text-violet-400 hover:text-violet-300 underline">
                  describe what you want to build
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {filteredTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTpl(tpl)
                      setProjectName(tpl.name)
                    }}
                    className={[
                      'text-left p-3 rounded-xl border transition-all',
                      selectedTpl?.id === tpl.id
                        ? 'border-violet-500 bg-violet-950/40'
                        : 'border-gray-700 hover:border-gray-500',
                    ].join(' ')}
                  >
                    <p className="text-sm font-medium text-white truncate">{tpl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.framework} · {tpl.category}</p>
                  </button>
                ))}
              </div>
            )}

            {selectedTpl && (
              <div className="space-y-3 pt-1 border-t border-gray-800">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Project name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <button
                  onClick={handleUseTemplate}
                  disabled={building}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {building ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</>
                  ) : (
                    `Create from "${selectedTpl.name}"`
                  )}
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
