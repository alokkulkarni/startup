'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function LoggedOutPage() {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (countdown <= 0) {
      window.location.replace('/')
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">You've been signed out</h1>
        <p className="text-gray-400 mb-8">
          Your session has ended securely.
        </p>

        <p className="text-sm text-gray-500 mb-6">
          Redirecting to homepage in <span className="text-white font-medium">{countdown}</span>…
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Return to homepage
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-forge-600 text-white rounded-lg hover:bg-forge-500 transition-colors text-sm font-medium"
          >
            Sign back in
          </Link>
        </div>
      </div>
    </div>
  )
}
