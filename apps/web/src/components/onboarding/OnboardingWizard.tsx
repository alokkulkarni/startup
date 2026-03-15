'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTemplates } from '@/hooks/useTemplates'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useSubscription } from '@/hooks/useSubscription'
import { api } from '@/lib/api'
import type { Template } from '@/hooks/useTemplates'
import type { Project } from '@forge/shared'
import { CheckIcon } from 'lucide-react'

interface OnboardingWizardProps {
  onComplete: () => void
}

type WizardStep = 'plan' | 'build' | 'templates'

const ONBOARDING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0/mo',
    badge: null,
    description: 'Great for learning & side projects',
    features: ['3 projects', '50 AI requests/day', 'Community support'],
    cta: 'Start free',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19/mo',
    badge: '⭐ Most Popular',
    description: 'For developers building real products',
    features: ['50 projects', '500 AI requests/day', 'Priority support'],
    cta: 'Start Pro',
    highlight: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? 'price_pro_monthly',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$49/mo',
    badge: null,
    description: 'For teams shipping together',
    features: ['Unlimited projects', '2 000 AI requests/day', 'Team workspaces'],
    cta: 'Start Team',
    highlight: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ?? 'price_team_monthly',
  },
]

/** Extract a short project name from a description */
function nameFromDescription(desc: string): string {
  const clean = desc.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const words = clean.split(/\s+/).slice(0, 4)
  return words.join(' ') || 'My App'
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const { completeOnboarding } = useOnboarding()
  const { startCheckout, loading: checkoutLoading } = useSubscription()
  const { templates, fetchTemplates, cloneTemplate, loading: tplLoading } = useTemplates()

  const [step, setStep] = useState<WizardStep>('plan')
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null)
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

  // ── Plan selection ──────────────────────────────────────────────────────────
  const handlePlanSelect = async (plan: typeof ONBOARDING_PLANS[number]) => {
    if (plan.id === 'free') {
      // Proceed directly to the build step
      setStep('build')
      return
    }
    // Paid plan → Stripe checkout; after payment user returns to /dashboard
    // Onboarding is still not completed, so the wizard will re-show with
    // the plan already upgraded. We mark step='build' in localStorage so we
    // skip the plan picker on return.
    if (typeof window !== 'undefined') {
      localStorage.setItem('forge:onboarding_plan_selected', plan.id)
    }
    setCheckoutPlanId(plan.id)
    setError('')
    try {
      await startCheckout(plan.priceId!)
    } catch {
      setError('Could not start checkout. You can upgrade later from your profile.')
      setCheckoutPlanId(null)
    }
  }

  // ── Build / project creation ────────────────────────────────────────────────
  const handleStartBuilding = async () => {
    const prompt = description.trim()
    if (!prompt) { textareaRef.current?.focus(); return }
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
    setStep('templates')
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

  // Check if user already selected a plan (returning from Stripe)
  const hasPlanSelected = typeof window !== 'undefined'
    && !!localStorage.getItem('forge:onboarding_plan_selected')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`bg-gray-900 border border-gray-700 rounded-2xl w-full shadow-2xl overflow-hidden transition-all ${
        step === 'plan' ? 'max-w-3xl' : 'max-w-xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">F</div>
            <span className="font-semibold text-white">Forge AI</span>
            {step !== 'plan' && (
              <span className="text-xs text-gray-500 ml-1">— Choose what to build</span>
            )}
          </div>
          <button
            onClick={handleSkip}
            disabled={building}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            Skip for now
          </button>
        </div>

        {/* ── Step: Plan selection ─────────────────────────────────────────── */}
        {step === 'plan' && !hasPlanSelected && (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">Welcome to Forge AI 👋</h2>
              <p className="text-gray-400 mt-1 text-sm">Choose a plan to get started. You can change it anytime.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {ONBOARDING_PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
                    plan.highlight
                      ? 'border-violet-500 ring-2 ring-violet-500/30 bg-violet-950/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-600 text-white">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-white">{plan.name}</h3>
                    <p className="text-xl font-bold text-white mt-1">{plan.price}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
                  </div>
                  <ul className="space-y-1.5 flex-1 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-300">
                        <CheckIcon className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePlanSelect(plan)}
                    disabled={checkoutLoading && checkoutPlanId === plan.id}
                    className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 ${
                      plan.highlight
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : plan.id === 'free'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {checkoutLoading && checkoutPlanId === plan.id ? (
                      <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting…</>
                    ) : plan.cta}
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-center text-xs text-red-400">{error}</p>
            )}

            <p className="text-center text-xs text-gray-600">
              All plans include a 14-day free trial for paid features. No credit card required for free.
            </p>
          </div>
        )}

        {/* Skip plan step if already selected a plan (returning from Stripe) */}
        {step === 'plan' && hasPlanSelected && (() => {
          setStep('build')
          return null
        })()}

        {/* ── Step: Build ─────────────────────────────────────────────────── */}
        {step === 'build' && (
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
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating project…</>
                ) : <>⚡ Start Building</>}
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

        {/* ── Step: Templates ──────────────────────────────────────────────── */}
        {step === 'templates' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('build')} className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                ← Back
              </button>
              <h2 className="text-lg font-bold text-white">Choose a Template</h2>
            </div>

            <input
              type="search"
              placeholder="Search templates…"
              value={tplSearch}
              onChange={e => { setTplSearch(e.target.value); fetchTemplates({ search: e.target.value }) }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />

            {tplLoading && filteredTemplates.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-500 text-sm">Loading templates…</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-gray-500 text-sm">
                <span className="text-2xl">📭</span>
                No templates found —{' '}
                <button onClick={() => setStep('build')} className="text-violet-400 hover:text-violet-300 underline">
                  describe what you want to build
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {filteredTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => { setSelectedTpl(tpl); setProjectName(tpl.name) }}
                    className={[
                      'text-left p-3 rounded-xl border transition-all',
                      selectedTpl?.id === tpl.id ? 'border-violet-500 bg-violet-950/40' : 'border-gray-700 hover:border-gray-500',
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
                  ) : `Create from "${selectedTpl.name}"`}
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
