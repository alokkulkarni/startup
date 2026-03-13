'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { NewProjectModal } from '@/components/projects/NewProjectModal'
import { DeleteProjectModal } from '@/components/projects/DeleteProjectModal'
import { ImportFromGitHubModal } from '@/components/github/ImportFromGitHubModal'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useSubscription } from '@/hooks/useSubscription'
import { PlanBadge } from '@/components/billing/PlanBadge'
import { UpgradePrompt } from '@/components/billing/UpgradePrompt'
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher'
import { AvatarStack } from '@/components/presence/AvatarStack'
import { usePresence } from '@/hooks/usePresence'
import type { Project } from '@forge/shared'

export default function DashboardPage() {
  const { user, loading: authLoading, authenticated } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { onboarding } = useOnboarding()
  const { subscription, startCheckout } = useSubscription()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showProjectLimitPrompt, setShowProjectLimitPrompt] = useState(false)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('forge:workspaceId') ?? ''
    return ''
  })

  const { onlineUsers } = usePresence(activeWorkspaceId || null)

  function handleWorkspaceSwitch(workspaceId: string) {
    setActiveWorkspaceId(workspaceId)
    if (typeof window !== 'undefined') localStorage.setItem('forge:workspaceId', workspaceId)
  }

  useEffect(() => {
    if (!authLoading && !authenticated) router.push('/login')
  }, [authLoading, authenticated, router])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get<Project[]>('/v1/projects')
      if (res.data) setProjects(res.data)
    } catch {
      toast('Failed to load projects', 'error')
    } finally {
      setProjectsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (authenticated) fetchProjects()
  }, [authenticated, fetchProjects])

  const handleNewProject = () => {
    const maxProjects = subscription?.limits.maxProjects ?? -1
    if (maxProjects !== -1 && projects.length >= maxProjects) {
      setShowProjectLimitPrompt(true)
      return
    }
    setShowNewModal(true)
  }

  const handleCreate = async (name: string, framework: string) => {
    const res = await api.post<Project>('/v1/projects', { name, framework })
    if (res.data) {
      setProjects(prev => [res.data!, ...prev])
      setShowNewModal(false)
      toast(`"${name}" created!`, 'success')
      router.push(`/dashboard/projects/${res.data.id}`)
    }
  }

  const handleRename = async (id: string, name: string) => {
    const res = await api.patch<Project>(`/v1/projects/${id}`, { name })
    if (res.data) {
      setProjects(prev => prev.map(p => p.id === id ? res.data! : p))
      toast('Project renamed', 'success')
    }
  }

  const handleDuplicate = async (id: string) => {
    const res = await api.post<Project>(`/v1/projects/${id}/duplicate`, {})
    if (res.data) {
      setProjects(prev => [res.data!, ...prev])
      toast(`Duplicated — "${res.data.name}" created`, 'success')
    }
  }

  const handleDelete = async (id: string) => {
    await api.delete(`/v1/projects/${id}`)
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleteTarget(null)
    toast('Project deleted', 'info')
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forge-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between sticky top-0 bg-gray-950/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="w-8 h-8 bg-forge-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">
            F
          </Link>
          <WorkspaceSwitcher
            currentWorkspaceId={activeWorkspaceId}
            onSwitch={handleWorkspaceSwitch}
          />
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-gray-600 text-sm">/</span>
            <span className="text-sm text-gray-400">{user?.name ?? 'Dashboard'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="hidden sm:block h-9 w-52 bg-gray-800 border border-gray-700 rounded-xl px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-forge-500"
          />
          <Button size="sm" onClick={handleNewProject}>
            + New project
          </Button>
          <Link href="/templates">
            <Button size="sm" variant="secondary">
              Templates
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="sm" variant="secondary">
              Pricing
            </Button>
          </Link>
          <Link href="/analytics" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <span>📊</span> Analytics
          </Link>
          <Button size="sm" variant="secondary" onClick={() => setShowImportModal(true)}>
            Import from GitHub
          </Button>
          <PlanBadge tier={subscription?.tier ?? 'free'} size="sm" />
          {onlineUsers.length > 0 && (
            <AvatarStack users={onlineUsers} maxVisible={4} size="sm" />
          )}
          <Link href="/dashboard/profile">
            <div className="w-8 h-8 rounded-full bg-forge-700 flex items-center justify-center text-sm font-bold text-white cursor-pointer hover:ring-2 hover:ring-forge-500 transition-all overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase() ?? '?'
              )}
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Page heading */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-gray-500 mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={handleNewProject} className="hidden sm:inline-flex">
            + New project
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)} className="hidden sm:inline-flex">
            Import from GitHub
          </Button>
        </div>

        {/* Loading skeleton */}
        {projectsLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-800" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!projectsLoading && filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">🔨</div>
            <h2 className="text-xl font-semibold">
              {searchQuery ? 'No projects match your search' : 'No projects yet'}
            </h2>
            <p className="text-gray-500 text-sm max-w-md">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first AI-powered web app in seconds. Just describe what you want.'}
            </p>
            {!searchQuery && (
              <Button onClick={handleNewProject} size="lg">
                Create your first project
              </Button>
            )}
          </div>
        )}

        {/* Project grid */}
        {!projectsLoading && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onDelete={setDeleteTarget}
                onClick={id => router.push(`/dashboard/projects/${id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showNewModal && (
        <NewProjectModal onClose={() => setShowNewModal(false)} onCreate={handleCreate} />
      )}
      {deleteTarget && (
        <DeleteProjectModal
          project={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
      <ImportFromGitHubModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
      {showProjectLimitPrompt && (
        <UpgradePrompt
          type="project_limit"
          onClose={() => setShowProjectLimitPrompt(false)}
          onUpgrade={priceId => startCheckout(priceId)}
        />
      )}
      {/* Onboarding wizard — shown to first-time users until dismissed */}
      {onboarding !== null && !onboarding.completed && showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  )
}
