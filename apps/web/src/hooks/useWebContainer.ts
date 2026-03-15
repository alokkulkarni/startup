'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { WebContainer } from '@webcontainer/api'
import type { FileNode } from '@/hooks/useFileTree'
import { buildFsTree } from '@/lib/wcFileSystem'

export type WCStatus = 'idle' | 'booting' | 'installing' | 'starting' | 'ready' | 'error' | 'stopped'

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
  stop: () => void
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
  const wcRef = useRef<WebContainer | null>(null)
  const devProcessRef = useRef<{ kill: () => void } | null>(null)
  const mountedRef = useRef(false)
  const healingRef = useRef(false)

  // Batch log updates to prevent hundreds of re-renders/sec during npm install
  const logBufferRef = useRef<LogEntry[]>([])
  const logFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addLog = useCallback((type: LogEntry['type'], text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    logBufferRef.current.push({
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      text: trimmed,
    })
    if (!logFlushRef.current) {
      logFlushRef.current = setTimeout(() => {
        const batch = logBufferRef.current.splice(0)
        logFlushRef.current = null
        if (batch.length > 0) {
          setLogs(prev => [...prev, ...batch].slice(-300))
        }
      }, 80) // flush at most ~12 times/sec
    }
  }, [])

  const parseError = useCallback((text: string): WCError | null => {
    // Missing source file (Vite ENOENT during build/HMR)
    if (text.includes('ENOENT') && text.includes('no such file or directory')) {
      const fileMatch = text.match(/open '([^']+)'/)
      const filePath = fileMatch?.[1]
      const fileName = filePath?.split('/').pop() ?? 'unknown'
      return {
        message: `Missing file: ${fileName} — use "Fix with AI" to generate it`,
        file: filePath,
        stack: text,
      }
    }
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
      wcRef.current = wc
      setProgress(30)
      addLog('system', '📦 Mounting project files…')

      const tree = buildFsTree(initialFiles)
      await wc.mount(tree)
      mountedRef.current = true
      setProgress(40)

      setStatus('installing')
      addLog('system', '📥 Installing packages (this may take a minute)…')
      // Run with minimal output flags to avoid flooding the main thread.
      // Buffer output internally — only surface it on failure.
      const installProcess = await wc.spawn('npm', [
        'install',
        '--no-fund',
        '--no-audit',
        '--loglevel=error',
      ])
      let installOutput = ''
      installProcess.output.pipeTo(new WritableStream({
        write(data) { installOutput += data }
      }))
      const installCode = await installProcess.exit
      if (installCode !== 0) {
        // Surface the last 3000 chars of install output so the user can debug
        addLog('stderr', installOutput.slice(-3000))
        throw new Error(`npm install failed with code ${installCode}`)
      }
      addLog('system', '✅ Packages installed')
      setProgress(70)

      setStatus('starting')
      addLog('system', '🚀 Starting app (this may take a moment)…')
      const devProcess = await wc.spawn('npm', ['run', 'dev'])
      devProcessRef.current = devProcess
      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          addLog('stdout', data)
          const err = parseError(data)
          if (err) setError(err)
          if (data.includes('compiled') || data.includes('ready in')) setError(null)

          // Auto-heal: missing npm package (ERR_MODULE_NOT_FOUND)
          // This happens when AI forgot to add a package to package.json.
          // Install it on-the-fly and restart the dev server without a full remount.
          const missingPkg = data.match(/Cannot find package '([^']+)'/)
          if (missingPkg && !healingRef.current && wcRef.current) {
            const pkg = missingPkg[1]
            healingRef.current = true
            addLog('system', `⚙ Auto-healing: installing missing package "${pkg}"…`)
            ;(async () => {
              try {
                devProcessRef.current?.kill()
                devProcessRef.current = null
                setStatus('installing')
                const container = wcRef.current!
                const proc = await container.spawn('npm', [
                  'install', pkg, '--no-fund', '--no-audit', '--loglevel=error',
                ])
                let out = ''
                proc.output.pipeTo(new WritableStream({ write(d) { out += d } }))
                const code = await proc.exit
                if (code === 0) {
                  addLog('system', `✅ Installed "${pkg}", restarting dev server…`)
                  setStatus('starting')
                  const newDev = await container.spawn('npm', ['run', 'dev'])
                  devProcessRef.current = newDev
                  newDev.output.pipeTo(new WritableStream({
                    write(d) {
                      addLog('stdout', d)
                      const e = parseError(d)
                      if (e) setError(e)
                      if (d.includes('compiled') || d.includes('ready in')) setError(null)
                    },
                  }))
                } else {
                  addLog('stderr', out.slice(-1000))
                  setStatus('error')
                  setError({ message: `Package "${pkg}" is missing from package.json. Use "Fix with AI" to add it.` })
                }
              } catch (e) {
                setStatus('error')
                setError({ message: String(e) })
              } finally {
                healingRef.current = false
              }
            })()
          }
        },
      }))

      wc.on('server-ready', (port: number, url: string) => {
        // For full-stack apps concurrently runs Express (:3001) + Vite (:5173).
        // Always prefer the Vite/frontend port (>= 4000) for the preview iframe;
        // API servers on lower ports are logged but don't replace an existing URL.
        const isFrontendPort = port >= 4000
        if (isFrontendPort) {
          setPreviewUrl(url)
          setStatus('ready')
          setProgress(100)
          addLog('system', `✅ App running at ${url}`)
        } else {
          setPreviewUrl(prev => prev ?? url)
          addLog('system', `🔌 API server ready on :${port}`)
        }
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

  const stop = useCallback(() => {
    if (devProcessRef.current) {
      devProcessRef.current.kill()
      devProcessRef.current = null
    }
    setStatus('stopped')
    setPreviewUrl(null)
    setProgress(0)
    setError(null)
    addLog('system', '⏹ Preview stopped')
  }, [addLog])

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

  const clearLogs = useCallback(() => {
    setLogs([])
    logBufferRef.current = []
    if (logFlushRef.current) {
      clearTimeout(logFlushRef.current)
      logFlushRef.current = null
    }
  }, [])

  return { status, previewUrl, logs, error, progress, writeFile, syncFiles, restart, stop, clearLogs }
}
