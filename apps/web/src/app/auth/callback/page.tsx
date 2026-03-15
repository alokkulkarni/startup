'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const next = searchParams.get('next') ?? '/dashboard'
    router.replace(next)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-forge-500 rounded-xl flex items-center justify-center font-bold text-white text-lg animate-pulse">F</div>
        <p className="text-sm text-gray-400">Signing you in…</p>
      </div>
    </div>
  )
}
