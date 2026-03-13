'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { initAuth } from '@/lib/auth'

/**
 * Dedicated OAuth callback page.
 * Keycloak redirects here after login/social-login with ?code=&state=.
 * We call initAuth() (which sets the module-level initPromise cache) so that
 * when AuthProvider mounts on the next page it reuses the already-resolved
 * promise instead of calling kc.init() a second time (which would hang).
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const next = searchParams.get('next') ?? '/dashboard'

    initAuth()
      .then(({ authenticated }) => {
        if (authenticated) {
          router.replace(next)
        } else {
          router.replace('/login')
        }
      })
      .catch(() => {
        router.replace('/login')
      })
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-forge-500 rounded-xl flex items-center justify-center font-bold text-white text-lg animate-pulse">
          F
        </div>
        <p className="text-sm text-gray-400">Signing you in…</p>
      </div>
    </div>
  )
}
