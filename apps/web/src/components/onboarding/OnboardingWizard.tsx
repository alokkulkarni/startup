'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTemplates } from '@/hooks/useTemplates'
import { useOnboarding } from '@/hooks/useOnboarding'
import type { Template } from '@/hooks/useTemplates'
import { TemplateCard } from '@/components/templates/TemplateCard'

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const { completeOnboarding } = useOnboarding()
  const { suggestTemplates, cloneTemplate, loading } = useTemplates()

  const [step, setStep] = useState(0)
  const [description, setDescription] = useState('')
  const [suggestions, setSuggestions] = useState<Template[]>([])
  const [selected, setSelected] = useState<Template | null>(null)
  const [projectName, setProjectName] = useState('')

  const handleSkip = async () => {
    await completeOnboarding()
    onComplete()
  }

  const handleGetStarted = () => setStep(1)

  const handleSuggest = async () => {
    if (!description.trim()) return
    const results = await suggestTemplates(description.trim())
    setSuggestions(results.slice(0, 3))
    setStep(1)
  }

  const handleSelectTemplate = (tpl: Template) => {
    setSelected(tpl)
    setProjectName(tpl.name)
    setStep(2)
  }

  const handleCreateProject = async () => {
    if (!selected) return
    try {
      const projectId = await cloneTemplate(selected.id, projectName || selected.name)
      await completeOnboarding()
      onComplete()
      if (projectId) router.push(`/dashboard/projects/${projectId}`)
    } catch {
      // error shown elsewhere
    }
  }

  const handleStartBlank = () => {
    completeOnboarding()
    onComplete()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      data-testid="onboarding-overlay"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={[
                  'w-2 h-2 rounded-full transition-colors',
                  i <= step ? 'bg-violet-500' : 'bg-gray-700',
                ].join(' ')}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="p-8 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center text-3xl">
              ⚡
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to Forge AI!</h2>
              <p className="text-gray-400 mt-2">Let&apos;s build something amazing.</p>
            </div>
            <button
              onClick={handleGetStarted}
              className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 1 — Describe + suggestions */}
        {step === 1 && (
          <div className="p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-white">What do you want to build?</h2>
              <p className="text-gray-400 mt-1 text-sm">Describe your project and we&apos;ll suggest templates.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSuggest()}
                placeholder="Describe your project, e.g. a SaaS dashboard with auth"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={handleSuggest}
                disabled={loading || !description.trim()}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all text-sm whitespace-nowrap"
              >
                {loading ? 'Finding…' : 'Find Templates'}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {suggestions.map(tpl => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onPreview={() => {}}
                    onUse={() => handleSelectTemplate(tpl)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Confirm selection */}
        {step === 2 && selected && (
          <div className="p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-white">Confirm your selection</h2>
              <p className="text-gray-400 mt-1 text-sm">You&apos;ve selected: <strong className="text-white">{selected.name}</strong></p>
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-2">Project name</label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCreateProject}
                disabled={loading}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
              >
                {loading ? 'Creating…' : 'Create Project'}
              </button>
              <button
                onClick={handleStartBlank}
                className="text-sm text-gray-500 hover:text-gray-300 text-center transition-colors"
              >
                Start Blank
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
