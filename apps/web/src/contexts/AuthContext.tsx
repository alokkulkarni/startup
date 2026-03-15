'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { logout as authLogout } from '@/lib/auth'
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
  user: null, loading: true, authenticated: false, logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    api.get<AuthUser>('/v1/users/me')
      .then(res => {
        if (res.data) {
          setUser(res.data)
          setAuthenticated(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, authenticated, logout: authLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
