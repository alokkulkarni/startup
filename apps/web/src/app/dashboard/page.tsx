'use client'

import { useEffect, useState } from 'react'
import { initAuth, logout, getToken } from '@/lib/auth'
import { api } from '@/lib/api'

interface HealthData {
  status: string
  version: string
  services: Record<string, string>
}

export default function DashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)

  useEffect(() => {
    initAuth().then(({ authenticated }) => {
      setAuthenticated(authenticated)
      if (!authenticated) {
        window.location.href = '/login'
        return
      }
      // Fetch API health to confirm connectivity
      api.get<HealthData>('/v1/health')
        .then(res => res.data && setHealth(res.data))
        .catch(console.error)
    })
  }, [])

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-forge-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-forge-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">F</div>
          <span className="font-semibold text-lg">Forge AI</span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Welcome to Forge AI. Your projects will appear here.</p>

        {health && (
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/50 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${health.status === 'ok' ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <span className="text-sm font-medium">API {health.status} · v{health.version}</span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              {Object.entries(health.services).map(([svc, status]) => (
                <span key={svc}>{svc}: <span className={status === 'ok' ? 'text-green-400' : 'text-red-400'}>{status}</span></span>
              ))}
            </div>
          </div>
        )}

        <div className="border border-dashed border-gray-700 rounded-xl p-12 text-center">
          <p className="text-4xl mb-4">🔨</p>
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-gray-500 text-sm mb-6">Create your first AI-powered web app</p>
          <button className="px-6 py-3 bg-forge-500 hover:bg-forge-600 rounded-xl text-sm font-medium transition-colors">
            New project
          </button>
        </div>
      </main>
    </div>
  )
}
