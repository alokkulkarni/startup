'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
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
  const [recentlyChangedPaths, setRecentlyChangedPaths] = useState<string[]>([])
  const recentlyChangedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelWidthsRef = useRef(DEFAULT_WIDTHS)
  const [showFileTree, setShowFileTree] = useState(true)
  const [showEditor, setShowEditor] = useState(true)
  const showFileTreeRef = useRef(true)
  const showEditorRef = useRef(true)
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
          const parsed = JSON.parse(saved) as Partial<typeof DEFAULT_WIDTHS> & { showFileTree?: boolean; showEditor?: boolean }
          const merged = { ...DEFAULT_WIDTHS, ...parsed }
          setPanelWidths(merged)
          panelWidthsRef.current = merged
          if (parsed.showFileTree != null) { setShowFileTree(parsed.showFileTree); showFileTreeRef.current = parsed.showFileTree }
          if (parsed.showEditor != null) { setShowEditor(parsed.showEditor); showEditorRef.current = parsed.showEditor }
        }
      } catch {
        // ignore
      }
    }
  }, [id])

  // Keep refs in sync with state
  useEffect(() => {
    panelWidthsRef.current = panelWidths
  }, [panelWidths])

  useEffect(() => { showFileTreeRef.current = showFileTree }, [showFileTree])
  useEffect(() => { showEditorRef.current = showEditor }, [showEditor])

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

  // Keyboard shortcuts: Cmd+B = toggle file tree, Cmd+Shift+E = toggle editor
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'b') {
        e.preventDefault()
        const next = !showFileTreeRef.current
        setShowFileTree(next)
        if (typeof window !== 'undefined')
          localStorage.setItem(`forge:panel:${id}`, JSON.stringify({ ...panelWidthsRef.current, showFileTree: next, showEditor: showEditorRef.current }))
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'e') {
        e.preventDefault()
        const next = !showEditorRef.current
        setShowEditor(next)
        if (typeof window !== 'undefined')
          localStorage.setItem(`forge:panel:${id}`, JSON.stringify({ ...panelWidthsRef.current, showFileTree: showFileTreeRef.current, showEditor: next }))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [id])

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

  // Drag handle logic — supports 4 drag types:
  //   0 = fileTree↔chat  1 = chat↔editor  2 = editor↔preview  3 = chat↔preview (when editor hidden)
  const handleDragStart = useCallback((e: React.MouseEvent, dragIndex: 0 | 1 | 2 | 3) => {
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
      } else if (dragIndex === 2) {
        // editor ↔ preview
        const newEditor = Math.min(Math.max(startWidths.editor + percentDx, 10), 60)
        const diff = newEditor - startWidths.editor
        const newPreview = Math.min(Math.max(startWidths.preview - diff, 10), 60)
        setPanelWidths(prev => ({ ...prev, editor: newEditor, preview: newPreview }))
      } else {
        // chat ↔ preview (editor panel is hidden)
        const newChat = Math.min(Math.max(startWidths.chat + percentDx, 10), 60)
        const diff = newChat - startWidths.chat
        const newPreview = Math.min(Math.max(startWidths.preview - diff, 10), 60)
        setPanelWidths(prev => ({ ...prev, chat: newChat, preview: newPreview }))
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`forge:panel:${id}`, JSON.stringify({
          ...panelWidthsRef.current,
          showFileTree: showFileTreeRef.current,
          showEditor: showEditorRef.current,
        }))
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [id])

  const handleFilesChanged = useCallback(async (changedPaths?: string[]) => {
    const freshFiles = await refreshFiles()
    await syncFiles(freshFiles)
    // Show which files changed in the file tree for 8 seconds
    if (changedPaths && changedPaths.length > 0) {
      if (recentlyChangedTimerRef.current) clearTimeout(recentlyChangedTimerRef.current)
      setRecentlyChangedPaths(changedPaths)
      recentlyChangedTimerRef.current = setTimeout(() => setRecentlyChangedPaths([]), 8000)
    }
    // If the preview was errored, restart it so the fix takes effect.
    // Vite HMR handles running apps automatically; only a full restart clears crash state.
    if (wcStatusRef.current === 'error') {
      await restartWC()
    }
  }, [refreshFiles, syncFiles, restartWC])

  // Compute effective panel widths — redistributes hidden-panel space to visible panels
  const displayWidths = useMemo(() => {
    const { fileTree, chat, editor, preview } = panelWidths
    if (!showFileTree && !showEditor) {
      const total = fileTree + chat + editor + preview
      const chatRatio = chat / (chat + preview)
      return { fileTree: 0, chat: total * chatRatio, editor: 0, preview: total * (1 - chatRatio) }
    }
    if (!showFileTree) return { fileTree: 0, chat: chat + fileTree, editor, preview }
    if (!showEditor) {
      const chatRatio = chat / (chat + preview)
      return { fileTree, chat: chat + editor * chatRatio, editor: 0, preview: preview + editor * (1 - chatRatio) }
    }
    return panelWidths
  }, [panelWidths, showFileTree, showEditor])

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
          {/* Panel visibility toggles */}
          <div className="flex items-center border border-gray-700/60 rounded-lg overflow-hidden">
            <button
              onClick={() => {
                const next = !showFileTree
                setShowFileTree(next)
                if (typeof window !== 'undefined')
                  localStorage.setItem(`forge:panel:${id}`, JSON.stringify({ ...panelWidthsRef.current, showFileTree: next, showEditor: showEditorRef.current }))
              }}
              title={`${showFileTree ? 'Hide' : 'Show'} file tree (⌘B)`}
              className={`px-2 py-1.5 transition-colors ${showFileTree ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
            >
              <PanelFilesIcon />
            </button>
            <button
              onClick={() => {
                const next = !showEditor
                setShowEditor(next)
                if (typeof window !== 'undefined')
                  localStorage.setItem(`forge:panel:${id}`, JSON.stringify({ ...panelWidthsRef.current, showFileTree: showFileTreeRef.current, showEditor: next }))
              }}
              title={`${showEditor ? 'Hide' : 'Show'} editor (⌘⇧E)`}
              className={`px-2 py-1.5 border-l border-gray-700/60 transition-colors ${showEditor ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
            >
              <PanelEditorIcon />
            </button>
          </div>
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

        {/* Panel 1 — File Tree (or collapsed strip) */}
        {showFileTree ? (
          <div
            className="shrink-0 border-r border-gray-800 flex flex-col overflow-hidden transition-all duration-200"
            style={{ width: `${displayWidths.fileTree}%` }}
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
                recentlyChangedPaths={recentlyChangedPaths}
              />
            )}
          </div>
        ) : (
          <CollapsedPanel
            label="Files"
            icon={<FolderCollapseIcon />}
            onExpand={() => setShowFileTree(true)}
          />
        )}

        {/* Drag handle 0 — fileTree ↔ chat (only when file tree is expanded) */}
        {showFileTree && (
          <div
            className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-500/50 transition-colors active:bg-indigo-500"
            onMouseDown={e => handleDragStart(e, 0)}
          />
        )}

        {/* Panel 2 — Chat (always visible) */}
        <div
          className="shrink-0 border-r border-gray-800 flex flex-col overflow-hidden transition-all duration-200"
          style={{ width: `${displayWidths.chat}%` }}
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

        {/* Drag handle between chat and next visible panel */}
        {showEditor ? (
          /* chat ↔ editor */
          <div
            className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-500/50 transition-colors active:bg-indigo-500"
            onMouseDown={e => handleDragStart(e, 1)}
          />
        ) : (
          /* chat ↔ preview (editor hidden) */
          <div
            className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-500/50 transition-colors active:bg-indigo-500"
            onMouseDown={e => handleDragStart(e, 3)}
          />
        )}

        {/* Panel 3 — Code Editor (or collapsed strip) */}
        {showEditor ? (
          <div
            className="shrink-0 border-r border-gray-800 flex flex-col overflow-hidden transition-all duration-200"
            style={{ width: `${displayWidths.editor}%` }}
          >
            <CodeEditor
              projectId={id}
              files={files}
              activeFile={activeFile}
              onSave={handleSave}
              onFileClick={setActiveFile}
            />
          </div>
        ) : (
          <CollapsedPanel
            label="Editor"
            icon={<BracketsCollapseIcon />}
            onExpand={() => setShowEditor(true)}
          />
        )}

        {/* Drag handle 2 — editor ↔ preview (only when editor is expanded) */}
        {showEditor && (
          <div
            className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-500/50 transition-colors active:bg-indigo-500"
            onMouseDown={e => handleDragStart(e, 2)}
          />
        )}

        {/* Panel 4 — Preview (always visible, flex-1 so it fills remaining space
             without overflowing — fixed panels like CollapsedPanel strips and drag
             handles consume fixed px; percentage widths on other panels would push
             this past the viewport edge if we used shrink-0 + % width) */}
        <div
          className="flex-1 min-w-[240px] flex flex-col overflow-hidden transition-all duration-200"
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

/** Icon for the "show/hide file tree" toggle button in the header */
function PanelFilesIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
      <line x1="5.5" y1="2" x2="5.5" y2="14" />
    </svg>
  )
}

/** Icon for the "show/hide editor" toggle button in the header */
function PanelEditorIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4.5,5 1.5,8 4.5,11" />
      <polyline points="11.5,5 14.5,8 11.5,11" />
      <line x1="9.5" y1="3" x2="6.5" y2="13" />
    </svg>
  )
}

/** Small icon shown inside the file-tree collapsed strip */
function FolderCollapseIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1.5 4.5A1.5 1.5 0 013 3h2.586l1.5 1.5H13A1.5 1.5 0 0114.5 6v5.5A1.5 1.5 0 0113 13H3a1.5 1.5 0 01-1.5-1.5V4.5z" />
    </svg>
  )
}

/** Small icon shown inside the editor collapsed strip */
function BracketsCollapseIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="5,3 2,8 5,13" />
      <polyline points="11,3 14,8 11,13" />
    </svg>
  )
}

/** A thin 28 px collapsed panel strip with a click-to-expand affordance */
function CollapsedPanel({ label, icon, onExpand }: {
  label: string
  icon: React.ReactNode
  onExpand: () => void
}) {
  return (
    <div
      onClick={onExpand}
      title={`Expand ${label} panel`}
      className="shrink-0 w-7 border-r border-gray-800 flex flex-col items-center justify-center gap-2 bg-gray-950 hover:bg-gray-900/80 cursor-pointer transition-colors group select-none"
    >
      <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
        {icon}
      </div>
      <span
        className="text-[9px] text-gray-600 group-hover:text-gray-400 font-medium tracking-widest uppercase transition-colors"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {label}
      </span>
    </div>
  )
}
