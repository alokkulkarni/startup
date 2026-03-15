'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircleIcon } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'

export default function PricingSuccessPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)
  const { fetchSubscription } = useSubscription()

  // Re-fetch subscription so plan badge updates immediately on dashboard
  useEffect(() => {
    fetchSubscription()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-redirect to dashboard
  useEffect(() => {
    if (countdown <= 0) { router.push('/dashboard'); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, router])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <CheckCircleIcon className="w-20 h-20 text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">You're all set! 🎉</h1>
        <p className="text-gray-400 mb-8">
          Your subscription has been activated. Your new limits are now in effect.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 text-left space-y-3">
          <p className="text-sm text-gray-300">✅ Plan upgraded successfully</p>
          <p className="text-sm text-gray-300">✅ AI request limits updated</p>
          <p className="text-sm text-gray-300">✅ Project limits unlocked</p>
          <p className="text-sm text-gray-500 text-xs mt-2">
            A receipt has been sent to your email by Stripe.
          </p>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Redirecting to dashboard in <span className="text-white font-semibold">{countdown}</span>s…
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Go to dashboard now
        </Link>
      </div>
    </div>
  )
}
