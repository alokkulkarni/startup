'use client'

import { useEffect } from 'react'
import { login } from '@/lib/auth'

export default function LoginPage() {
  useEffect(() => {
    // Trigger Keycloak OIDC redirect flow
    login()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-forge-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Redirecting to sign in...</p>
      </div>
    </div>
  )
}
