'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ChatPanel } from '@/components/chat/ChatPanel'
import type { Project } from '@forge/shared'

function EditorPlaceholder() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-950 text-center p-12">
      <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-6">
        <svg
          className="w-8 h-8 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-300 mb-2">Code Editor</h3>
      <p className="text-sm text-gray-500">Sprint 4</p>
    </div>
  )
}

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
    api
      .get<Project>(`/v1/projects/${id}`)
      .then(res => {
        if (res.data) setProject(res.data)
      })
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
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-800 px-6 py-3 flex items-center justify-between bg-gray-950 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white text-sm transition-colors transition-all duration-200"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-sm font-medium text-white truncate max-w-48">
            {project?.name ?? id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {project?.framework && (
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg border border-gray-700">
              {project.framework}
            </span>
          )}
          <button className="text-xs px-3 py-1.5 bg-forge-500 hover:bg-forge-600 rounded-lg text-white font-medium transition-all duration-200 opacity-50 cursor-not-allowed">
            Deploy
          </button>
        </div>
      </header>

      {/* Two-panel workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Chat (40%) */}
        <div className="w-[40%] border-r border-gray-800 flex flex-col overflow-hidden">
          <ChatPanel projectId={id} />
        </div>

        {/* Right panel — Editor placeholder (60%) */}
        <div className="flex-1 overflow-hidden">
          <EditorPlaceholder />
        </div>
      </div>
    </div>
  )
}
