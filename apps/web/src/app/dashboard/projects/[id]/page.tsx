'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { Project } from '@forge/shared'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { authenticated, loading: authLoading } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !authenticated) router.push('/login')
  }, [authLoading, authenticated, router])

  useEffect(() => {
    if (!authenticated || !id) return
    api.get<Project>(`/v1/projects/${id}`)
      .then(res => { if (res.data) setProject(res.data) })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [authenticated, id, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forge-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Dashboard
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-sm font-medium truncate max-w-48">{project?.name ?? 'Loading...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">
            {project?.framework}
          </span>
          <button className="text-xs px-3 py-1.5 bg-forge-500 hover:bg-forge-600 rounded-lg text-white font-medium transition-colors">
            Deploy
          </button>
        </div>
      </header>

      {/* Workspace placeholder — built in Sprint 3 & 4 */}
      <div className="flex-1 flex items-center justify-center text-center p-12">
        <div className="space-y-4">
          <div className="text-5xl">🚧</div>
          <h2 className="text-xl font-semibold">Workspace coming in Sprint 3</h2>
          <p className="text-gray-500 text-sm max-w-sm">
            The AI chat, code editor, and live preview panels will be built here.
            Project files have been seeded and are ready.
          </p>
          <div className="mt-6 p-4 bg-gray-900 rounded-xl border border-gray-800 text-left text-xs font-mono text-gray-400 max-w-sm">
            <p className="text-gray-500 mb-2">// Project created ✓</p>
            <p>id: <span className="text-forge-400">{id}</span></p>
            <p>framework: <span className="text-green-400">{project?.framework}</span></p>
            <p>status: <span className="text-green-400">{project?.status}</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
