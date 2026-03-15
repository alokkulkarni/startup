'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/auth'
import { api } from '@/lib/api'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { FileTree } from '@/components/editor/FileTree'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { PreviewPanel } from '@/components/preview/PreviewPanel'
import { VersionHistoryPanel } from '@/components/history/VersionHistoryPanel'
import { DeployHistoryPanel } from '@/components/deploy/DeployHistoryPanel'
import { EnvVarsPanel } from '@/components/deploy/EnvVarsPanel'
import { GitHubPanel } from '@/components/github/GitHubPanel'
import { SyncStatusBadge } from '@/components/github/SyncStatusBadge'
import { useGitHub } from '@/hooks/useGitHub'
import { useFileTree } from '@/hooks/useFileTree'
import { useServerPreview, type WCStatus } from '@/hooks/useServerPreview'
import { useSnapshots } from '@/hooks/useSnapshots'
import { useToast } from '@/hooks/useToast'
import { useDeployments } from '@/hooks/useDeployments'
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradePrompt } from '@/components/billing/UpgradePrompt'
import type { FileNode } from '@/hooks/useFileTree'
import type { Project } from '@forge/shared'
import type { Viewport } from '@/components/preview/ViewportToggle'

const DEFAULT_WIDTHS = { fileTree: 15, chat: 25, editor: 30, preview: 30 }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { authenticated, loading: authLoading } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [panelWidths, setPanelWidths] = useState(DEFAULT_WIDTHS)
  const [autoSaved, setAutoSaved] = useState(false)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [showConsole, setShowConsole] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [fixPrompt, setFixPrompt] = useState<string | null>(null)
  // Prompt from onboarding "Start Building" — auto-sent to AI on load
  const [initialBuildPrompt] = useState<string | null>(() => searchParams.get('prompt'))
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deployHistoryOpen, setDeployHistoryOpen] = useState(false)
  const [envVarsOpen, setEnvVarsOpen] = useState(false)
  const [githubPanelOpen, setGithubPanelOpen] = useState(false)
  const [deployMenuOpen, setDeployMenuOpen] = useState(false)
  const [healAttempts, setHealAttempts] = useState(0)
  const [showRateLimitPrompt, setShowRateLimitPrompt] = useState(false)
  const panelWidthsRef = useRef(DEFAULT_WIDTHS)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Capture token once authenticated
  useEffect(() => {
    if (authenticated && typeof window !== 'undefined') {
      setToken(getToken() ?? null)
    }
  }, [authenticated])

  const { toast } = useToast()
  const { startCheckout } = useSubscription()

  const { isDeploying, isWarmingUp: deployWarmingUp, latestDeployUrl, triggerDeploy } = useDeployments(id, token)
  const { syncStatus, refetchSyncStatus } = useGitHub(id)

  // Load panel widths from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      try {
        const saved = localStorage.getItem(`forge:panel:${id}`)
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<typeof DEFAULT_WIDTHS>
          // Merge with defaults so old 3-panel saves gracefully upgrade
          const merged = { ...DEFAULT_WIDTHS, ...parsed }
          setPanelWidths(merged)
          panelWidthsRef.current = merged
        }
      } catch {
        // ignore
      }
    }
  }, [id])

  // Keep ref in sync with state
  useEffect(() => {
    panelWidthsRef.current = panelWidths
  }, [panelWidths])

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

  const {
    files,
    isLoading: filesLoading,
    activeFile,
    setActiveFile,
    refreshFiles,
    createFile,
    updateFile,
    deleteFile,
    renameFile,
  } = useFileTree(id, token)

  const {
    status: wcStatus,
    previewUrl,
    logs: consoleLogs,
    error: wcError,
    progress: wcProgress,
    writeFile,
    syncFiles,
    restart: restartWC,
    stop: stopWC,
    clearLogs,
  } = useServerPreview(id, showPreview && files.length > 0)

  const wcStatusRef = useRef<WCStatus>('idle')
  useEffect(() => { wcStatusRef.current = wcStatus }, [wcStatus])

  const MAX_HEAL_ATTEMPTS = 3

  const { snapshots: _snapshots, fetchSnapshots, undoLast } = useSnapshots(
    id,
    token,
    async () => {
      const freshFiles = await refreshFiles()
      await syncFiles(freshFiles)
    },
  )

  // Auto self-heal on WebContainer errors
  useEffect(() => {
    if (wcError && healAttempts < MAX_HEAL_ATTEMPTS) {
      const location = wcError.file
        ? `\nFile: ${wcError.file}${wcError.line != null ? `:${wcError.line}` : ''}`
        : ''
      const stack = wcError.stack ? `\n\nStack trace:\n${wcError.stack}` : ''
      const healPrompt =
        `The preview crashed (auto-fix attempt ${healAttempts + 1}/${MAX_HEAL_ATTEMPTS}). ` +
        `Review the current files and fix ONLY the root cause — do not regenerate unrelated files:\n\n` +
        wcError.message + location + stack
      setFixPrompt(healPrompt)
      setHealAttempts(prev => prev + 1)
    }
    if (!wcError) {
      setHealAttempts(0)
    }
  }, [wcError]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut: Cmd+Z / Ctrl+Z for undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoLast()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undoLast])

  const handleSave = useCallback(async (path: string, content: string) => {
    await updateFile(path, content)
    // Sync to WebContainer FS for HMR
    await writeFile(path, content)
    setAutoSaved(true)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => setAutoSaved(false), 2000)
  }, [updateFile, writeFile])

  const handleCreateFile = useCallback(async (path: string) => {
    await createFile(path, '')
  }, [createFile])

  const handleCreateFolder = useCallback(async (_path: string) => {
    // Folders are inferred from file paths — create a placeholder .gitkeep
    await createFile(`${_path}/.gitkeep`, '')
  }, [createFile])

  const handleRenameFile = useCallback(async (file: FileNode, newPath: string) => {
    await renameFile(file.path, newPath)
  }, [renameFile])

  const handleDeleteFile = useCallback(async (file: FileNode) => {
    await deleteFile(file.path)
  }, [deleteFile])

  // Drag handle logic — supports 3 drag handles (0, 1, 2) for the 4-panel layout
  const handleDragStart = useCallback((e: React.MouseEvent, dragIndex: 0 | 1 | 2) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidths = { ...panelWidthsRef.current }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const containerEl = document.querySelector('[data-panels]') as HTMLElement
      if (!containerEl) return
      const containerWidth = containerEl.offsetWidth
      const dx = moveEvent.clientX - startX
      const percentDx = (dx / containerWidth) * 100

      if (dragIndex === 0) {
        // fileTree ↔ chat
        const newFileTree = Math.min(Math.max(startWidths.fileTree + percentDx, 10), 60)
        const diff = newFileTree - startWidths.fileTree
        const newChat = Math.min(Math.max(startWidths.chat - diff, 10), 60)
        setPanelWidths(prev => ({ ...prev, fileTree: newFileTree, chat: newChat }))
      } else if (dragIndex === 1) {
        // chat ↔ editor
        const newChat = Math.min(Math.max(startWidths.chat + percentDx, 10), 60)
        const diff = newChat - startWidths.chat
        const newEditor = Math.min(Math.max(startWidths.editor - diff, 10), 60)
        setPanelWidths(prev => ({ ...prev, chat: newChat, editor: newEditor }))
      } else {
        // editor ↔ preview
        const newEditor = Math.min(Math.max(startWidths.editor + percentDx, 10), 60)
        const diff = newEditor - startWidths.editor
        const newPreview = Math.min(Math.max(startWidths.preview - diff, 10), 60)
        setPanelWidths(prev => ({ ...prev, editor: newEditor, preview: newPreview }))
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`forge:panel:${id}`, JSON.stringify(panelWidthsRef.current))
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [id])

  const handleFilesChanged = useCallback(async () => {
    const freshFiles = await refreshFiles()
    await syncFiles(freshFiles)
    // If the preview was errored, restart it so the fix takes effect.
    // Vite HMR handles running apps automatically; only a full restart clears crash state.
    if (wcStatusRef.current === 'error') {
      await restartWC()
    }
  }, [refreshFiles, syncFiles, restartWC])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
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
            className="text-gray-400 hover:text-white text-sm transition-colors"
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
          {/* Undo last AI change */}
          <button
            onClick={async () => {
              const success = await undoLast()
              if (!success) toast('No changes to undo', 'info')
            }}
            title="Undo last AI change (Cmd+Z)"
            className="text-xs px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            ↩ Undo
          </button>
          {/* Version history toggle */}
          <button
            onClick={() => { setHistoryOpen(true); fetchSnapshots() }}
            title="Version history"
            className="text-xs px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            🕐 History
          </button>
          {/* Deploy history toggle */}
          <button
            onClick={() => setDeployHistoryOpen(true)}
            className="text-xs px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            📋 Deploys
          </button>
          {/* Env vars toggle */}
          <button
            onClick={() => setEnvVarsOpen(true)}
            className="text-xs px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
          >
            🔧 Env
          </button>
          {/* GitHub button */}
          <button
            onClick={() => setGithubPanelOpen(true)}
            className="text-xs px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all flex items-center gap-1"
          >
            <GitHubIcon /> GitHub
          </button>
          {/* Sync status badge */}
          <SyncStatusBadge syncStatus={syncStatus} onRefresh={refetchSyncStatus} />
          {/* Download ZIP */}
          <a
            href={`/api/v1/projects/${id}/download`}
            download
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 hover:text-white font-medium transition-all flex items-center gap-1.5"
            title="Download project as ZIP"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
          {/* Deploy button */}
          {isDeploying ? (
            <button
              disabled
              className="text-xs px-3 py-1.5 bg-indigo-600 rounded-lg text-white font-medium flex items-center gap-1.5 opacity-75"
            >
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              Deploying…
            </button>
          ) : deployWarmingUp ? (
            <button
              disabled
              className="text-xs px-3 py-1.5 bg-indigo-600 rounded-lg text-white font-medium flex items-center gap-1.5 opacity-75"
            >
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              Warming up…
            </button>
          ) : latestDeployUrl ? (
            <a
              href={latestDeployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-all flex items-center gap-1.5"
            >
              Live ↗
            </a>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDeployMenuOpen(v => !v)}
                className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-all"
              >
                Deploy ▾
              </button>
              {deployMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  {(['vercel', 'netlify', 'cloudflare'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => { triggerDeploy(p); setDeployMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white capitalize"
                    >
                      {p === 'cloudflare' ? 'Cloudflare Pages' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Four-panel workspace */}
      <div className="flex-1 flex overflow-hidden" data-panels>
        {/* Panel 1 — File Tree */}
        <div
          className="shrink-0 border-r border-gray-800 flex flex-col overflow-hidden"
          style={{ width: `${panelWidths.fileTree}%` }}
        >
          {filesLoading ? (
            <div className="flex-1 flex flex-col gap-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" style={{ width: `${50 + i * 8}%` }} />
              ))}
            </div>
          ) : (
            <FileTree
              files={files}
              activeFilePath={activeFile?.path ?? null}
              onFileClick={setActiveFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRenameFile={handleRenameFile}
              onDeleteFile={handleDeleteFile}
            />
          )}
        </div>

        {/* Drag handle 1 */}
        <div
          className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-500/50 transition-colors active:bg-indigo-500"
          onMouseDown={e => handleDragStart(e, 0)}
        />

        {/* Panel 2 — Chat */}
        <div
          className="shrink-0 border-r border-gray-800 flex flex-col overflow-hidden"
          style={{ width: `${panelWidths.chat}%` }}
        >
          <ChatPanel
            projectId={id}
            onFilesChanged={handleFilesChanged}
            initialPrompt={fixPrompt ?? initialBuildPrompt}
            autoSendPrompt={!!(fixPrompt ?? initialBuildPrompt)}
            onPromptConsumed={() => setFixPrompt(null)}
            files={files}
            onRateLimit={() => setShowRateLimitPrompt(true)}
          />
        </div>

        {/* Drag handle 2 */}
        <div
          className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-500/50 transition-colors active:bg-indigo-500"
          onMouseDown={e => handleDragStart(e, 1)}
        />

        {/* Panel 3 — Code Editor */}
        <div
          className="shrink-0 border-r border-gray-800 flex flex-col overflow-hidden"
          style={{ width: `${panelWidths.editor}%` }}
        >
          <CodeEditor
            projectId={id}
            files={files}
            activeFile={activeFile}
            onSave={handleSave}
            onFileClick={setActiveFile}
          />
        </div>

        {/* Drag handle 3 */}
        <div
          className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-500/50 transition-colors active:bg-indigo-500"
          onMouseDown={e => handleDragStart(e, 2)}
        />

        {/* Panel 4 — Preview */}
        <div
          className="shrink-0 flex flex-col overflow-hidden"
          style={{ width: `${panelWidths.preview}%` }}
        >
          <PreviewPanel
            status={wcStatus}
            previewUrl={previewUrl}
            progress={wcProgress}
            logs={consoleLogs}
            error={wcError}
            viewport={viewport}
            onViewportChange={setViewport}
            onRefresh={restartWC}
            onStop={stopWC}
            onFixWithAI={msg => setFixPrompt(
              `The preview crashed with this error. Review the current files and fix only the root cause — do not regenerate unrelated files:\n\n${msg}`
            )}
            onClearLogs={clearLogs}
            showConsole={showConsole}
            onToggleConsole={() => setShowConsole(v => !v)}
            framework={project?.framework}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="shrink-0 h-6 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-4 text-[10px] text-gray-500">
        <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
        {activeFile && (
          <>
            <span className="text-gray-600">|</span>
            <span className="font-mono text-gray-400">{activeFile.path}</span>
            <span className="text-gray-600">|</span>
            <span>{formatBytes(activeFile.sizeBytes)}</span>
          </>
        )}
        {autoSaved && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-green-500">✓ Auto-saved</span>
          </>
        )}
        {wcStatus !== 'idle' && (
          <>
            <span className="text-gray-600">|</span>
            <span className={wcStatus === 'ready' ? 'text-green-500' : 'text-yellow-500'}>
              ● {wcStatus === 'ready' ? 'Preview running' : wcStatus}
            </span>
          </>
        )}
      </div>

      <VersionHistoryPanel
        projectId={id}
        token={token}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestored={async () => { const fresh = await refreshFiles(); await syncFiles(fresh) }}
      />
      <DeployHistoryPanel
        projectId={id}
        token={token}
        isOpen={deployHistoryOpen}
        onClose={() => setDeployHistoryOpen(false)}
      />
      <EnvVarsPanel
        projectId={id}
        token={token}
        isOpen={envVarsOpen}
        onClose={() => setEnvVarsOpen(false)}
      />
      <GitHubPanel
        projectId={id}
        isOpen={githubPanelOpen}
        onClose={() => setGithubPanelOpen(false)}
      />
      {showRateLimitPrompt && (
        <UpgradePrompt
          type="rate_limit"
          onClose={() => setShowRateLimitPrompt(false)}
          onUpgrade={priceId => startCheckout(priceId)}
        />
      )}
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}
