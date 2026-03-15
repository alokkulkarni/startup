'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { BeforeMount, OnMount } from '@monaco-editor/react'
import type { FileNode } from '@/hooks/useFileTree'
import { cn } from '@/lib/utils'
import { useCollaboration } from '@/hooks/useCollaboration'

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  css: 'css', scss: 'scss', html: 'html', json: 'json',
  md: 'markdown', py: 'python', sh: 'shell', yaml: 'yaml', yml: 'yaml',
  svg: 'xml', toml: 'toml',
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return LANG_MAP[ext] ?? 'plaintext'
}

interface OpenTab {
  path: string
  content: string
  isDirty: boolean
  language: string
}

interface CodeEditorProps {
  projectId: string
  files: FileNode[]
  activeFile: FileNode | null
  onSave: (path: string, content: string) => Promise<void>
  onFileClick: (file: FileNode) => void
  /** Enable real-time collaborative editing via Yjs WebSocket */
  collaborationEnabled?: boolean
}

// Lazy-load Monaco — @monaco-editor/react handles dynamic loading internally
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-[#0D1117] flex flex-col gap-3 p-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-800 rounded animate-pulse"
          style={{ width: `${60 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  ),
})

export function CodeEditor({ projectId, files, activeFile, onSave, collaborationEnabled = false }: CodeEditorProps) {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)
  const bindingController = useRef<{ binding: { destroy: () => void } | null }>({ binding: null })

  // Yjs collaboration — only active when collaborationEnabled + a file is open
  const { yText, provider } = useCollaboration({
    projectId,
    filePath: collaborationEnabled ? activeTabPath : null,
    enabled: collaborationEnabled,
  })

  // When activeFile changes, add it to open tabs if not already there
  useEffect(() => {
    if (!activeFile) return
    setOpenTabs(prev => {
      if (prev.find(t => t.path === activeFile.path)) return prev
      return [
        ...prev,
        {
          path: activeFile.path,
          content: activeFile.content,
          isDirty: false,
          language: getLanguage(activeFile.path),
        },
      ]
    })
    setActiveTabPath(activeFile.path)
  }, [activeFile])

  // Sync tab content when files change (only for non-dirty tabs)
  useEffect(() => {
    setOpenTabs(prev =>
      prev.map(tab => {
        const file = files.find(f => f.path === tab.path)
        if (file && !tab.isDirty) {
          return { ...tab, content: file.content }
        }
        return tab
      }),
    )
  }, [files])

  const handleEditorChange = useCallback(
    (value: string | undefined, tabPath: string) => {
      if (value === undefined) return
      setOpenTabs(prev =>
        prev.map(tab => (tab.path === tabPath ? { ...tab, content: value, isDirty: true } : tab)),
      )
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        onSave(tabPath, value)
          .then(() => {
            setOpenTabs(prev =>
              prev.map(tab => (tab.path === tabPath ? { ...tab, isDirty: false } : tab)),
            )
          })
          .catch(console.error)
      }, 500)
    },
    [onSave],
  )

  const closeTab = useCallback(
    (path: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setOpenTabs(prev => {
        const newTabs = prev.filter(t => t.path !== path)
        if (activeTabPath === path) {
          setActiveTabPath(newTabs[newTabs.length - 1]?.path ?? null)
        }
        return newTabs
      })
    },
    [activeTabPath],
  )

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme('forge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0D1117',
        'editor.lineHighlightBackground': '#161B22',
        'editorLineNumber.foreground': '#4A5568',
        'editorLineNumber.activeForeground': '#A0AEC0',
      },
    })
  }, [])

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  // Create/destroy MonacoBinding when collaborative mode is active
  useEffect(() => {
    if (!collaborationEnabled || !yText || !editorRef.current) return

    const ctrl = bindingController.current
    // Destroy any previous binding before creating a new one
    ctrl.binding?.destroy()
    ctrl.binding = null

    import('y-monaco')
      .then(({ MonacoBinding }) => {
        if (!editorRef.current || !yText) return
        const model = editorRef.current.getModel()
        if (!model) return
        ctrl.binding = new MonacoBinding(
          yText,
          model,
          new Set([editorRef.current]),
          provider?.awareness ?? null
        )
      })
      .catch(console.error)

    return () => {
      ctrl.binding?.destroy()
      ctrl.binding = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaborationEnabled, yText, provider?.awareness])

  const activeTab = openTabs.find(t => t.path === activeTabPath)

  if (openTabs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-950 text-center p-12">
        <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
          <svg
            className="w-7 h-7 text-gray-500"
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
        <p className="text-sm text-gray-500">Select a file from the tree to start editing</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Tab bar */}
      <div className="shrink-0 flex items-end bg-gray-900 border-b border-gray-800 overflow-x-auto">
        {openTabs.map(tab => {
          const fileName = tab.path.split('/').pop() ?? tab.path
          const isActive = tab.path === activeTabPath
          return (
            <button
              key={tab.path}
              onClick={() => setActiveTabPath(tab.path)}
              title={tab.path}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs border-r border-gray-800 shrink-0 max-w-[160px] transition-colors',
                isActive
                  ? 'bg-gray-800 text-white border-t-2 border-t-indigo-500 -mb-px'
                  : 'bg-gray-900 text-gray-400 hover:text-gray-200',
              )}
            >
              {tab.isDirty && <span className="text-indigo-400 text-[10px]">●</span>}
              <span className="truncate font-mono">{fileName}</span>
              <span
                role="button"
                aria-label="close tab"
                onClick={e => closeTab(tab.path, e)}
                className="ml-0.5 text-gray-500 hover:text-gray-200 shrink-0 text-base leading-none"
              >
                ×
              </span>
            </button>
          )
        })}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <MonacoEditor
            height="100%"
            language={activeTab.language}
            // In collaborative mode Yjs owns the model content — skip the controlled value
            value={collaborationEnabled ? undefined : activeTab.content}
            theme="forge-dark"
            beforeMount={handleBeforeMount}
            onMount={handleMount}
            onChange={value => handleEditorChange(value, activeTab.path)}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 22,
              tabSize: 2,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              smoothScrolling: true,
            }}
          />
        ) : (
          <div className="h-full bg-[#0D1117]" />
        )}
      </div>
    </div>
  )
}
