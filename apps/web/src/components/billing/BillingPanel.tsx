'use client'

import Link from 'next/link'
import { useSubscription } from '@/hooks/useSubscription'
import { PlanBadge } from './PlanBadge'
import { UsageBar } from './UsageBar'

const PLAN_NAMES: Record<'free' | 'pro' | 'team' | 'enterprise', string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function BillingPanel() {
  const { subscription, usage, loading, openPortal, startCheckout } = useSubscription()

  if (loading && !subscription) {
    return <div className="p-6 text-gray-400 text-sm animate-pulse">Loading billing info…</div>
  }

  const tier = subscription?.tier ?? 'free'
  const isPaid = tier === 'pro' || tier === 'team' || tier === 'enterprise'

  return (
    <div className="bg-gray-800 rounded-2xl p-6 space-y-6 border border-gray-700">
      {/* Plan header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlanBadge tier={tier} />
          <span className="text-white font-medium">{PLAN_NAMES[tier]} Plan</span>
        </div>
        {isPaid ? (
          <button
            onClick={openPortal}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            Manage Billing
          </button>
        ) : (
          <Link
            href="/pricing"
            className="text-sm bg-violet-600 hover:bg-violet-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Upgrade
          </Link>
        )}
      </div>

      {/* Usage bar */}
      {usage && (
        <UsageBar usage={usage} onUpgrade={() => startCheckout('price_pro_monthly')} />
      )}

      {/* Period end */}
      {subscription?.periodEnd && (
        <p className="text-sm text-gray-400">
          {subscription.cancelAtPeriodEnd
            ? `Cancels on ${formatDate(subscription.periodEnd)}`
            : `Renews on ${formatDate(subscription.periodEnd)}`}
        </p>
      )}

      {/* Usage stats */}
      {subscription && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-700/50 rounded-xl p-3">
            <p className="text-gray-400 mb-1 text-xs">Projects</p>
            <p className="text-white font-semibold">
              {subscription.limits.maxProjects === -1
                ? 'Unlimited'
                : `Up to ${subscription.limits.maxProjects}`}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-3">
            <p className="text-gray-400 mb-1 text-xs">Files per project</p>
            <p className="text-white font-semibold">
              {subscription.limits.maxFilesPerProject === -1
                ? 'Unlimited'
                : `Up to ${subscription.limits.maxFilesPerProject}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
