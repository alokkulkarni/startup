'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import { usePlanGate } from '@/hooks/usePlanGate'
import { ZapIcon, ArrowUpRightIcon, ReceiptIcon, ExternalLinkIcon, BarChart2Icon, ClockIcon } from 'lucide-react'

const planLabels: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise',
}

const planColors: Record<string, string> = {
  free: 'bg-gray-700 text-gray-200',
  pro: 'bg-violet-900/60 text-violet-300 border border-violet-700',
  team: 'bg-purple-900/60 text-purple-300 border border-purple-700',
  enterprise: 'bg-amber-900/60 text-amber-300 border border-amber-700',
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const isUnlimited = limit < 0
  const isWarning = pct >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className={isWarning ? 'text-amber-400 font-medium' : 'text-gray-400'}>
          {isUnlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all',
              pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-violet-500',
            ].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const { subscription, usage, loading: subLoading, openPortal } = useSubscription()
  const { projectsUsed, projectsLimit, aiUsed, aiLimit, tier } = usePlanGate()
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState('')

  const isPaid = tier !== 'free'

  // Format the AI counter reset time
  const resetAtLabel = usage?.resetAt
    ? (() => {
        const diff = new Date(usage.resetAt).getTime() - Date.now()
        if (diff <= 0) return 'Resets soon'
        const h = Math.floor(diff / 3_600_000)
        const m = Math.floor((diff % 3_600_000) / 60_000)
        return h > 0 ? `Resets in ${h}h ${m}m` : `Resets in ${m}m`
      })()
    : null

  const handleManageBilling = async () => {
    setPortalLoading(true)
    setPortalError('')
    try {
      await openPortal()
    } catch {
      setPortalError('Could not open billing portal. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">F</div>
          <span className="font-semibold">Forge AI</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Account &amp; billing</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your subscription, usage, and billing details</p>
        </div>

        {/* Current plan card */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Current plan</h2>
            {subLoading ? (
              <div className="w-16 h-5 rounded-full bg-gray-800 animate-pulse" />
            ) : (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${planColors[tier] ?? planColors.free}`}>
                {planLabels[tier] ?? tier}
              </span>
            )}
          </div>

          {/* Usage bars */}
          {!subLoading && (
            <div className="space-y-4 pt-1">
              <UsageBar used={projectsUsed} limit={projectsLimit} label="Projects" />
              <div className="space-y-1.5">
                <UsageBar used={aiUsed} limit={aiLimit} label="AI requests today" />
                {resetAtLabel && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ClockIcon className="w-3 h-3" />
                    {resetAtLabel}
                  </div>
                )}
              </div>
            </div>
          )}

          {subscription?.periodEnd && (
            <p className="text-xs text-gray-500">
              {subscription.cancelAtPeriodEnd
                ? `Cancels on ${new Date(subscription.periodEnd).toLocaleDateString()}`
                : `Renews on ${new Date(subscription.periodEnd).toLocaleDateString()}`}
            </p>
          )}

          {portalError && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2">
              {portalError}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              onClick={() => router.push('/pricing')}
              className="flex items-center gap-2"
            >
              <ZapIcon className="w-4 h-4" />
              {isPaid ? 'Change plan' : 'Upgrade plan'}
            </Button>
            {isPaid && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                loading={portalLoading}
                className="flex items-center gap-2"
              >
                <ReceiptIcon className="w-4 h-4" />
                Billing &amp; invoices
                <ExternalLinkIcon className="w-3.5 h-3.5 opacity-60" />
              </Button>
            )}
          </div>
        </section>

        {/* What's included */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <h2 className="text-base font-semibold">Plan features</h2>
          <PlanFeatureList tier={tier} projectsLimit={projectsLimit} aiLimit={aiLimit} />
          {!isPaid && (
            <div className="pt-2">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                Compare all plans
                <ArrowUpRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* Analytics quick link */}
        <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-900/50 border border-violet-800/50 flex items-center justify-center shrink-0">
              <BarChart2Icon className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Usage analytics</p>
              <p className="text-xs text-gray-400 mt-0.5">AI requests, projects, deployments — last 30 days</p>
            </div>
          </div>
          <Link
            href="/analytics"
            className="shrink-0 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            View analytics →
          </Link>
        </div>

        {/* Profile quick link */}
        <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/30 px-5 py-4">
          <div>
            <p className="text-sm font-medium">Profile settings</p>
            <p className="text-xs text-gray-400 mt-0.5">Update your name, avatar, or delete your account</p>
          </div>
          <Link
            href="/dashboard/profile"
            className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            View profile →
          </Link>
        </div>
      </main>
    </div>
  )
}

function PlanFeatureList({ tier, projectsLimit, aiLimit }: { tier: string; projectsLimit: number; aiLimit: number }) {
  const features: string[] = []

  if (projectsLimit < 0) {
    features.push('Unlimited projects')
  } else {
    features.push(`Up to ${projectsLimit} project${projectsLimit === 1 ? '' : 's'}`)
  }

  if (aiLimit < 0) {
    features.push('Unlimited AI requests per day')
  } else {
    features.push(`${aiLimit} AI requests per day`)
  }

  if (tier === 'pro' || tier === 'team' || tier === 'enterprise') {
    features.push('Priority AI response speed')
    features.push('GitHub repository import')
    features.push('Custom domains (coming soon)')
  }
  if (tier === 'team' || tier === 'enterprise') {
    features.push('Team workspaces & collaboration')
    features.push('Advanced analytics (coming soon)')
  }
  if (tier === 'enterprise') {
    features.push('SSO / SAML')
    features.push('Dedicated support')
    features.push('SLA guarantees')
  }

  return (
    <ul className="space-y-2">
      {features.map(f => (
        <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
          <span className="w-4 h-4 rounded-full bg-violet-900/60 border border-violet-700/60 flex items-center justify-center shrink-0">
            <svg className="w-2.5 h-2.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {f}
        </li>
      ))}
    </ul>
  )
}
