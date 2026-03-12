'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/auth'
import { api } from '@/lib/api'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { FileTree } from '@/components/editor/FileTree'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { PreviewPanel } from '@/components/preview/PreviewPanel'
import { useFileTree } from '@/hooks/useFileTree'
import { useWebContainer } from '@/hooks/useWebContainer'
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
  const panelWidthsRef = useRef(DEFAULT_WIDTHS)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Capture token once authenticated
  useEffect(() => {
    if (authenticated && typeof window !== 'undefined') {
      setToken(getToken() ?? null)
    }
  }, [authenticated])

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
    clearLogs,
  } = useWebContainer(id, files, showPreview && files.length > 0)

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
    await refreshFiles()
    await syncFiles(files)
  }, [refreshFiles, syncFiles, files])

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
          <button className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-all duration-200 opacity-50 cursor-not-allowed">
            Deploy
          </button>
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
            initialPrompt={fixPrompt}
            onPromptConsumed={() => setFixPrompt(null)}
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
            onFixWithAI={msg => setFixPrompt(`Fix this error:\n\n${msg}`)}
            onClearLogs={clearLogs}
            showConsole={showConsole}
            onToggleConsole={() => setShowConsole(v => !v)}
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
    </div>
  )
}
