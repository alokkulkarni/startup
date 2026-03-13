'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { initAuth, getKeycloak } from '@/lib/auth'
import { api } from '@/lib/api'

interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  plan: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  authenticated: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  authenticated: false,
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  // Guard against React Strict Mode double-invoke
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    initAuth()
      .then(async ({ authenticated: auth }) => {
        setAuthenticated(auth)
        if (auth) {
          try {
            await api.post('/v1/auth/sync', {})
            const res = await api.get<AuthUser>('/v1/users/me')
            if (res.data) setUser(res.data)
          } catch (err) {
            console.error('[AuthProvider] sync failed:', err)
          }
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const logout = () => {
    getKeycloak().logout({ redirectUri: window.location.origin })
  }

  return (
    <AuthContext.Provider value={{ user, loading, authenticated, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
