'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'

interface Plan {
  id: 'free' | 'pro' | 'team'
  name: string
  icon: string
  monthlyPrice: number
  yearlyPrice: number
  priceId: { monthly: string; yearly: string }
  features: string[]
  highlight?: boolean
  badge?: string
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    icon: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceId: { monthly: '', yearly: '' },
    features: [
      '3 projects',
      '50 AI requests/day',
      '20 files/project',
      'Community support',
      '1 workspace',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: '⭐',
    monthlyPrice: 19,
    yearlyPrice: 15,
    priceId: { monthly: 'price_pro_monthly', yearly: 'price_pro_yearly' },
    features: [
      '50 projects',
      '500 AI requests/day',
      '200 files/project',
      'Priority support',
      '1 workspace',
    ],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'team',
    name: 'Team',
    icon: '🚀',
    monthlyPrice: 49,
    yearlyPrice: 39,
    priceId: { monthly: 'price_team_monthly', yearly: 'price_team_yearly' },
    features: [
      'Unlimited projects',
      '2000 AI requests/day',
      'Unlimited files',
      'Dedicated support',
      '5 workspaces',
    ],
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const { authenticated } = useAuth()
  const { subscription, startCheckout } = useSubscription()

  const currentTier = subscription?.tier ?? null

  const handleUpgrade = async (plan: Plan) => {
    if (plan.id === 'free') return
    if (!authenticated) {
      window.location.href = '/auth/login?redirect=/pricing'
      return
    }
    const priceId = billing === 'monthly' ? plan.priceId.monthly : plan.priceId.yearly
    await startCheckout(priceId)
  }

  return (
    <div className="min-h-screen bg-gray-900 py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-white mb-3">
            Pricing — Simple, transparent
          </h1>
          <p className="text-gray-400 mb-8">No hidden fees. Cancel anytime.</p>

          {/* Billing interval toggle */}
          <div className="inline-flex items-center bg-gray-800 border border-gray-700 rounded-xl p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billing === 'monthly'
                  ? 'bg-gray-700 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                billing === 'yearly'
                  ? 'bg-gray-700 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-green-400 text-xs font-semibold">-20%</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = currentTier === plan.id
            const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice

            return (
              <div
                key={plan.id}
                className={`relative bg-gray-800 rounded-2xl p-8 flex flex-col border ${
                  plan.highlight
                    ? 'border-violet-500 ring-2 ring-violet-500'
                    : 'border-gray-700'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {plan.icon && <span aria-hidden="true">{plan.icon}</span>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">${price}</span>
                    <span className="text-gray-400 text-sm">/mo</span>
                  </div>
                  {billing === 'yearly' && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      (${plan.yearlyPrice}/mo billed yearly)
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-400 border border-gray-600 rounded-xl">
                    <span>✓</span>
                    <span>Current plan</span>
                  </div>
                ) : plan.id === 'free' ? (
                  <Link
                    href="/auth/login"
                    className="block text-center py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors text-sm font-semibold"
                  >
                    Get Started
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors ${
                      plan.highlight
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
