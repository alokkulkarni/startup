'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { ArrowLeftIcon, CheckIcon } from 'lucide-react'

interface Plan {
  id: 'free' | 'pro' | 'team' | 'enterprise'
  name: string
  icon: string
  monthlyPrice: number | null
  yearlyPrice: number | null
  priceId: { monthly: string; yearly: string }
  features: string[]
  highlight?: boolean
  badge?: string
  contactSales?: boolean
}

// Price IDs come from env vars; fall back to Stripe test IDs for local dev
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
      '20 files per project',
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
    priceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? 'price_pro_monthly',
      yearly:  process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID  ?? 'price_pro_yearly',
    },
    features: [
      '50 projects',
      '500 AI requests/day',
      '200 files per project',
      'Priority email support',
      '1 workspace',
      'Custom domain previews',
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
    priceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ?? 'price_team_monthly',
      yearly:  process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID  ?? 'price_team_yearly',
    },
    features: [
      'Unlimited projects',
      '2 000 AI requests/day',
      'Unlimited files',
      'Dedicated Slack support',
      '5 workspaces',
      'Team collaboration & presence',
      'Usage analytics',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: '🏢',
    monthlyPrice: null,
    yearlyPrice: null,
    priceId: { monthly: '', yearly: '' },
    features: [
      'Unlimited everything',
      'Custom AI request limits',
      'SSO / SAML',
      'Dedicated infrastructure',
      'SLA guarantee',
      'Custom contract & invoicing',
    ],
    contactSales: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [checkoutError, setCheckoutError] = useState('')
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const { authenticated } = useAuth()
  const { subscription, startCheckout, error: subError } = useSubscription()

  const currentTier = subscription?.tier ?? null

  const handleUpgrade = async (plan: Plan) => {
    if (plan.contactSales) {
      window.location.href = 'mailto:sales@forge.ai?subject=Enterprise%20enquiry'
      return
    }
    if (plan.id === 'free') return
    if (!authenticated) {
      router.push('/login?redirect=/pricing')
      return
    }
    const priceId = billing === 'monthly' ? plan.priceId.monthly : plan.priceId.yearly
    setCheckoutError('')
    setCheckingOut(plan.id)
    try {
      await startCheckout(priceId)
    } catch {
      setCheckoutError('Could not start checkout. Please try again or contact support.')
    } finally {
      setCheckingOut(null)
    }
  }

  const displayError = checkoutError || subError

  return (
    <div className="min-h-screen bg-gray-950 py-16 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Back link */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-white mb-3">Simple, transparent pricing</h1>
          <p className="text-gray-400 mb-8">No hidden fees. Cancel anytime.</p>

          {/* Billing interval toggle */}
          <div className="inline-flex items-center bg-gray-800 border border-gray-700 rounded-xl p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billing === 'monthly' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                billing === 'yearly' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-green-400 text-xs font-semibold">-20%</span>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {displayError && (
          <div className="mb-6 rounded-xl bg-red-950/50 border border-red-700 px-4 py-3 text-sm text-red-300 text-center">
            {displayError}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(plan => {
            const isCurrent = currentTier === plan.id
            const isDowngrade = plan.id === 'free' && currentTier && currentTier !== 'free'
            const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
            const isLoading = checkingOut === plan.id

            return (
              <div
                key={plan.id}
                className={`relative bg-gray-900 rounded-2xl p-7 flex flex-col border transition-all ${
                  isCurrent
                    ? 'border-indigo-500 ring-1 ring-indigo-500/40'
                    : plan.highlight
                    ? 'border-violet-500 ring-2 ring-violet-500/40'
                    : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                {/* Badge */}
                {(plan.badge || isCurrent) && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isCurrent ? 'bg-indigo-600 text-white' : 'bg-violet-600 text-white'
                    }`}>
                      {isCurrent ? 'Your plan' : plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name & price */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {plan.icon && <span aria-hidden="true" className="text-xl">{plan.icon}</span>}
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  </div>
                  {price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">${price}</span>
                      <span className="text-gray-400 text-sm">/mo</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-white">Custom</div>
                  )}
                  {billing === 'yearly' && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Billed ${(plan.yearlyPrice! * 12).toFixed(0)}/yr — save ${((plan.monthlyPrice - plan.yearlyPrice!) * 12).toFixed(0)}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-8">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckIcon className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-indigo-300 border border-indigo-700 rounded-xl bg-indigo-950/30">
                    <CheckIcon className="w-4 h-4" />
                    Current plan
                  </div>
                ) : plan.contactSales ? (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                  >
                    Contact sales
                  </button>
                ) : plan.id === 'free' ? (
                  isDowngrade ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-sm text-gray-500 border border-gray-700 cursor-not-allowed"
                    >
                      Downgrade via portal
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="block text-center py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors text-sm font-semibold"
                    >
                      Get started free
                    </Link>
                  )
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isLoading}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                      plan.highlight
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600 mt-10">
          Payments processed securely by Stripe. You can cancel or change your plan at any time from your profile.
        </p>
      </div>
    </div>
  )
}
