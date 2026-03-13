'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getKeycloak } from '@/lib/auth'

/**
 * Dedicated OAuth callback page.
 * Keycloak redirects here after login/social-login with ?code=&state=.
 * We call kc.init() here so the adapter can exchange the code for tokens
 * in a controlled environment, then redirect to the intended destination.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const next = searchParams.get('next') ?? '/dashboard'

    const kc = getKeycloak()
    kc.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      // No silentCheckSsoRedirectUri here — we want the code exchange only
    })
      .then((authenticated) => {
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
