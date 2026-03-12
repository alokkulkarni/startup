'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { WebContainer } from '@webcontainer/api'
import type { FileNode } from '@/hooks/useFileTree'
import { buildFsTree } from '@/lib/wcFileSystem'

export type WCStatus = 'idle' | 'booting' | 'installing' | 'starting' | 'ready' | 'error'

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'stdout' | 'stderr' | 'system'
  text: string
}

export interface WCError {
  message: string
  file?: string
  line?: number
  stack?: string
}

export interface UseWebContainerReturn {
  status: WCStatus
  previewUrl: string | null
  logs: LogEntry[]
  error: WCError | null
  progress: number
  writeFile: (path: string, content: string) => Promise<void>
  syncFiles: (files: FileNode[]) => Promise<void>
  restart: () => Promise<void>
  clearLogs: () => void
}

// Module-level singleton (persists across re-renders)
let wcInstance: WebContainer | null = null
let wcBooting: Promise<WebContainer> | null = null

export function __resetWCInstance() {
  wcInstance = null
  wcBooting = null
}

async function getWebContainer(): Promise<WebContainer> {
  if (wcInstance) return wcInstance
  if (wcBooting) return wcBooting
  const { WebContainer } = await import('@webcontainer/api')
  wcBooting = WebContainer.boot()
  wcInstance = await wcBooting
  wcBooting = null
  return wcInstance
}

export function useWebContainer(projectId: string, files: FileNode[], enabled: boolean): UseWebContainerReturn {
  const [status, setStatus] = useState<WCStatus>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState<WCError | null>(null)
  const [progress, setProgress] = useState(0)
  const devProcessRef = useRef<{ kill: () => void } | null>(null)
  const mountedRef = useRef(false)

  const addLog = useCallback((type: LogEntry['type'], text: string) => {
    setLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      text: text.trim(),
    }].slice(-500))
  }, [])

  const parseError = useCallback((text: string): WCError | null => {
    if (text.includes('Error:') || text.includes('error TS') || text.includes('Cannot find')) {
      const fileMatch = text.match(/([^\s]+\.[jt]sx?):(\d+)/)
      return {
        message: text.split('\n')[0],
        file: fileMatch?.[1],
        line: fileMatch?.[2] ? parseInt(fileMatch[2]) : undefined,
        stack: text,
      }
    }
    return null
  }, [])

  const boot = useCallback(async (initialFiles: FileNode[]) => {
    if (status !== 'idle') return
    try {
      setStatus('booting')
      setProgress(10)
      addLog('system', '⚙ Booting WebContainer…')

      const wc = await getWebContainer()
      setProgress(30)
      addLog('system', '📦 Mounting project files…')

      const tree = buildFsTree(initialFiles)
      await wc.mount(tree)
      mountedRef.current = true
      setProgress(40)

      setStatus('installing')
      addLog('system', '📥 Running npm install…')
      const installProcess = await wc.spawn('npm', ['install'])
      installProcess.output.pipeTo(new WritableStream({
        write(data) { addLog('stdout', data) }
      }))
      const installCode = await installProcess.exit
      if (installCode !== 0) throw new Error(`npm install failed with code ${installCode}`)
      setProgress(70)

      setStatus('starting')
      addLog('system', '🚀 Starting dev server…')
      const devProcess = await wc.spawn('npm', ['run', 'dev'])
      devProcessRef.current = devProcess
      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          addLog('stdout', data)
          const err = parseError(data)
          if (err) setError(err)
          if (data.includes('compiled') || data.includes('ready in')) setError(null)
        }
      }))

      wc.on('server-ready', (_port: number, url: string) => {
        setPreviewUrl(url)
        setStatus('ready')
        setProgress(100)
        addLog('system', `✅ App running at ${url}`)
      })

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus('error')
      setError({ message })
      addLog('stderr', `❌ ${message}`)
    }
  }, [status, addLog, parseError])

  useEffect(() => {
    if (enabled && files.length > 0 && status === 'idle') {
      boot(files)
    }
  }, [enabled, files.length, status]) // eslint-disable-line

  const writeFile = useCallback(async (path: string, content: string) => {
    if (!wcInstance || status !== 'ready') return
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    await wcInstance.fs.writeFile(normalizedPath, content)
  }, [status])

  const syncFiles = useCallback(async (updatedFiles: FileNode[]) => {
    if (!wcInstance || !mountedRef.current) return
    await Promise.all(
      updatedFiles.map(f => wcInstance!.fs.writeFile(
        f.path.startsWith('/') ? f.path : `/${f.path}`,
        f.content
      ))
    )
  }, [])

  const restart = useCallback(async () => {
    if (devProcessRef.current) {
      devProcessRef.current.kill()
      devProcessRef.current = null
    }
    setStatus('idle')
    setPreviewUrl(null)
    setProgress(0)
    setError(null)
  }, [])

  const clearLogs = useCallback(() => setLogs([]), [])

  return { status, previewUrl, logs, error, progress, writeFile, syncFiles, restart, clearLogs }
}
