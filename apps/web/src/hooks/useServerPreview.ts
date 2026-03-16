'use client'
/**
 * useServerPreview — replaces useWebContainer with server-side Docker preview.
 *
 * Each preview runs in a node:20-alpine Docker container on the server.
 * Each preview runs in an isolated Docker container. Traefik routes
 * http://{projectId}.localhost/ to the container — no host port binding needed.
 * no browser WASM, no memory exhaustion.
 *
 * Drop-in replacement for useWebContainer: same return interface (UseWebContainerReturn).
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { FileNode } from '@/hooks/useFileTree'

// ── Re-export types so callers don't need to change their imports ──────────────
export type WCStatus = 'idle' | 'booting' | 'installing' | 'starting' | 'ready' | 'error' | 'stopped'

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'stdout' | 'stderr' | 'system'
  text: string
}

export interface WCError {
  /** 'app'      — user's code is broken (compile/runtime error); show Fix with AI
   *  'platform' — WebContainer / infra issue (boot fail, server crash) */
  kind: 'app' | 'platform'
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

// ── API ────────────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    // Always send a JSON body — Fastify rejects Content-Type:application/json with no body (400)
    body: JSON.stringify(body ?? {}),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message ?? `HTTP ${res.status}`)
  return json.data as T
}

async function apiDelete(path: string): Promise<void> {
  await fetch(`${API_URL}${path}`, { method: 'DELETE', credentials: 'include' })
}

function sseUrl(projectId: string): string {
  return `${API_URL}/v1/projects/${projectId}/preview/logs`
}

// ── Hook ────────────────────────────────────────────────────────────────────────
export function useServerPreview(projectId: string, enabled: boolean): UseWebContainerReturn {
  const [status, setStatus] = useState<WCStatus>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState<WCError | null>(null)
  const [progress, setProgress] = useState(0)

  const sseRef = useRef<EventSource | null>(null)
  const startingRef = useRef(false)
  const startFailedRef = useRef(false)  // prevents auto-restart loop when API itself errors
  const previewUrlRef = useRef<string | null>(null)
  // true while a container is running — used by cleanup to decide whether to stop
  const containerActiveRef = useRef(false)
  // Rolling buffer: accumulate recent log lines for multi-line error detection
  const errorBufRef = useRef('')

  // ── Log helpers ──────────────────────────────────────────────────────────────
  const logBufRef = useRef<LogEntry[]>([])
  const logFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addLog = useCallback((type: LogEntry['type'], text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    logBufRef.current.push({
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      text: trimmed,
    })
    if (!logFlushRef.current) {
      logFlushRef.current = setTimeout(() => {
        const batch = logBufRef.current.splice(0)
        logFlushRef.current = null
        if (batch.length > 0) setLogs(prev => [...prev, ...batch].slice(-300))
      }, 80)
    }
  }, [])

  const parseError = useCallback((text: string): WCError | null => {
    // Vite internal server error (compile / transform failure)
    if (text.includes('[vite] Internal server error:') || text.includes('[vite] Pre-transform error:')) {
      const tag = text.includes('Internal server error:') ? 'Internal server error:' : 'Pre-transform error:'
      const msgLine = text.split('\n').find(l => l.includes(tag))
      const message = msgLine?.replace(/.*\[vite\][^:]+:\s*/, '').trim() || 'Vite transform error'
      const fileMatch = text.match(/([^\s(]+\.[jt]sx?)[:(](\d+)/)
      return { kind: 'app', message, file: fileMatch?.[1], line: fileMatch?.[2] ? parseInt(fileMatch[2]) : undefined, stack: text }
    }
    // esbuild errors: ✘ [ERROR] ... (Vite's bundler)
    if (text.includes('✘ [ERROR]') || text.match(/\[plugin:vite:[^\]]+\]/)) {
      const errLine = text.split('\n').find(l => l.includes('✘ [ERROR]')) ?? ''
      const message = errLine.replace(/.*✘ \[ERROR\]\s*/, '').trim()
        || text.split('\n').find(l => l.match(/\[plugin:vite:/))?.replace(/.*\[plugin:[^\]]+\]\s*/, '').trim()
        || 'Build error'
      const fileMatch = text.match(/([^\s(]+\.[jt]sx?):(\d+):(\d+):/)
      return { kind: 'app', message, file: fileMatch?.[1], line: fileMatch?.[2] ? parseInt(fileMatch[2]) : undefined, stack: text }
    }
    // Failed to resolve import / module not found
    if (text.includes('Failed to resolve import') || text.includes("Cannot find module '") || text.includes('Could not resolve')) {
      const importMatch = text.match(/Failed to resolve import "([^"]+)"|Cannot find module '([^']+)'|Could not resolve "([^"]+)"/)
      const mod = importMatch?.[1] ?? importMatch?.[2] ?? importMatch?.[3] ?? 'unknown'
      return { kind: 'app', message: `Cannot find module "${mod}" — it may be missing from package.json`, stack: text }
    }
    // Syntax / parse errors
    if (text.match(/SyntaxError:|Unexpected token|Unterminated string|Expected ";"/)) {
      const fileMatch = text.match(/([^\s(]+\.[jt]sx?)[:(](\d+)/)
      return { kind: 'app', message: text.split('\n')[0].trim(), file: fileMatch?.[1], line: fileMatch?.[2] ? parseInt(fileMatch[2]) : undefined, stack: text }
    }
    // Build / compile failures
    if (text.includes('error during build') || text.includes('Build failed') || text.match(/\d+ error[s]? generated/)) {
      const line = text.split('\n').find(l => l.trim() && !l.includes('error during build')) ?? 'Build failed'
      return { kind: 'app', message: line.trim(), stack: text }
    }
    // Missing source file (ENOENT)
    if (text.includes('ENOENT') && text.includes('no such file or directory')) {
      const m = text.match(/open '([^']+)'/)
      const fp = m?.[1]
      return {
        kind: 'app' as const,
        message: `Missing file: ${fp?.split('/').pop() ?? 'unknown'} — use "Fix with AI" to generate it`,
        file: fp,
        stack: text,
      }
    }
    // TypeScript and general errors
    if (text.includes('error TS') || (text.includes('Error:') && !text.includes('npm warn'))) {
      const m = text.match(/([^\s(]+\.[jt]sx?)[:(](\d+)/)
      return {
        kind: 'app' as const,
        message: text.split('\n')[0].trim(),
        file: m?.[1],
        line: m?.[2] ? parseInt(m[2]) : undefined,
        stack: text,
      }
    }
    return null
  }, [])

  // ── SSE connection ──────────────────────────────────────────────────────────
  const connectSSE = useCallback((pid: string) => {
    if (sseRef.current) sseRef.current.close()

    const sse = new EventSource(sseUrl(pid), { withCredentials: true })
    sseRef.current = sse

    sse.addEventListener('message', (e) => {
      let data: { log?: string }
      try { data = JSON.parse(e.data) } catch { return }
      const text = data.log ?? ''
      if (!text) return

      const logType = text.startsWith('⚠') || text.startsWith('❌') ? 'stderr'
        : text.startsWith('⚙') || text.startsWith('✅') || text.startsWith('📦') ? 'system'
        : 'stdout'
      addLog(logType, text)

      // Accumulate recent output into a rolling buffer so multi-line Vite/esbuild
      // errors (which arrive as separate SSE messages) can be matched as a unit.
      errorBufRef.current = (errorBufRef.current + '\n' + text).slice(-4000)

      // ── Status transitions ────────────────────────────────────────────────
      if (text.includes('__FORGE_INSTALL_DONE__') || text.includes('Packages installed')) {
        setStatus('starting')
        setProgress(70)
      }

      const isServerReady =
        text.includes('__FORGE_SERVER_READY__') ||
        text.includes('Local:') || text.includes('ready in') || text.includes('App running') ||
        text.includes('✓ Ready') || text.includes('started server on') ||
        text.toLowerCase().includes('is being served at') ||
        text.toLowerCase().includes('flutter run key commands') ||
        text.toLowerCase().includes('compiled successfully') ||
        text.toLowerCase().includes('angular live development server is listening') ||
        text.toLowerCase().includes('listening at') || text.toLowerCase().includes('listening on') ||
        text.toLowerCase().includes('server listening') || text.toLowerCase().includes('server running')

      if (isServerReady) {
        setStatus('ready')
        setProgress(100)
        setError(null)
        errorBufRef.current = ''  // fresh compile succeeded — clear error buffer
        return
      }

      // ── Hard process failures → always set status=error ───────────────────
      if (text.startsWith('❌') || text.includes('exited with code')) {
        const err = parseError(errorBufRef.current) ?? { kind: 'platform' as const, message: text.replace(/^❌\s*/, '') }
        setError(err)
        setStatus('error')
        return
      }

      // ── Soft app errors (compile / transform) — overlay without killing status ──
      // Parse the rolling buffer on every message so multi-line errors are caught
      // as soon as the last line arrives, regardless of how chunks are split.
      // Don't change status='error' here — the server is still running; the iframe
      // shows blank because the app is broken, and the overlay explains why.
      const appErr = parseError(errorBufRef.current)
      if (appErr) setError(appErr)
    })

    sse.addEventListener('error', () => {
      // EventSource auto-reconnects; only mark error if we never became ready
      if (status !== 'ready' && status !== 'stopped') {
        // noop — EventSource will retry automatically
      }
    })
  }, [addLog, parseError, status])

  // ── Start preview container ──────────────────────────────────────────────────
  const startPreview = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    try {
      setStatus('booting')
      setProgress(10)
      addLog('system', '⚙ Starting preview container…')

      const data = await apiPost<{ port: number | null; previewUrl: string }>(
        `/v1/projects/${projectId}/preview/start`
      )
      previewUrlRef.current = data.previewUrl
      containerActiveRef.current = true

      // Timestamp-bust the URL on each start so the iframe actually reloads
      setPreviewUrl(`${data.previewUrl}?t=${Date.now()}`)
      setStatus('installing')
      setProgress(30)
      addLog('system', `📦 Container started — running npm install…`)

      connectSSE(projectId)
    } catch (err) {
      const msg = (err as Error).message
      startFailedRef.current = true   // block auto-restart loop
      setStatus('error')
      setError({ kind: 'platform', message: msg })
      addLog('stderr', `❌ ${msg}`)
    } finally {
      startingRef.current = false
    }
  }, [projectId, addLog, connectSSE])

  // ── Auto-start ───────────────────────────────────────────────────────────────
  useEffect(() => {
    // Don't auto-start if the API start call itself failed (user must manually refresh)
    if (enabled && status === 'idle' && !startFailedRef.current) {
      startPreview()
    }
  }, [enabled, status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount / navigation away ────────────────────────────────────
  // Stop the preview container when the user navigates to another page or
  // closes the tab.  keepalive:true ensures the fetch survives page unload.
  useEffect(() => {
    const stopContainer = () => {
      if (!containerActiveRef.current) return
      containerActiveRef.current = false
      fetch(`${API_URL}/v1/projects/${projectId}/preview/stop`, {
        method: 'DELETE',
        credentials: 'include',
        keepalive: true,   // fires even if the page is being unloaded
      }).catch(() => {})
    }

    // Extra safety: fire on browser tab/window close before React unmounts
    window.addEventListener('beforeunload', stopContainer)

    return () => {
      window.removeEventListener('beforeunload', stopContainer)
      sseRef.current?.close()
      stopContainer()    // navigation away (component unmount)
    }
  }, [projectId])  // re-register when projectId changes

  // ── Public API ───────────────────────────────────────────────────────────────
  const syncFiles = useCallback(async (_files?: FileNode[]) => {
    // Files are already in the DB (saved by useFileTree) — just tell the
    // server to re-upload them to the running container.
    try {
      await apiPost(`/v1/projects/${projectId}/preview/sync`)
      if (previewUrlRef.current) {
        // Refresh timestamp so iframe picks up changes
        setPreviewUrl(`${previewUrlRef.current}?t=${Date.now()}`)
      }
    } catch (err) {
      addLog('stderr', `⚠ Sync failed: ${(err as Error).message}`)
    }
  }, [projectId, addLog])

  // writeFile is a no-op in server preview mode:
  // saves already go through updateFile → DB → syncFiles.
  const writeFile = useCallback(async (_path: string, _content: string) => {
    // intentional no-op
  }, [])

  const restart = useCallback(async () => {
    sseRef.current?.close()
    startingRef.current = false
    startFailedRef.current = false   // allow auto-start again after manual restart
    errorBufRef.current = ''
    setStatus('idle')
    setPreviewUrl(null)
    setProgress(0)
    setError(null)
    // idle triggers auto-start via useEffect
  }, [])

  const stop = useCallback(() => {
    sseRef.current?.close()
    containerActiveRef.current = false
    setStatus('stopped')
    setPreviewUrl(null)
    setProgress(0)
    setError(null)
    addLog('system', '⏹ Preview stopped')
    apiDelete(`/v1/projects/${projectId}/preview/stop`).catch(() => {})
  }, [projectId, addLog])

  const clearLogs = useCallback(() => {
    setLogs([])
    logBufRef.current = []
    if (logFlushRef.current) {
      clearTimeout(logFlushRef.current)
      logFlushRef.current = null
    }
  }, [])

  return { status, previewUrl, logs, error, progress, writeFile, syncFiles, restart, stop, clearLogs }
}

// Keep backward-compatible named export so existing imports don't break
export { useServerPreview as useWebContainer }
