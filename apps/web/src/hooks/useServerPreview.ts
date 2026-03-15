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
    if (text.includes('ENOENT') && text.includes('no such file or directory')) {
      const m = text.match(/open '([^']+)'/)
      const fp = m?.[1]
      return {
        message: `Missing file: ${fp?.split('/').pop() ?? 'unknown'} — use "Fix with AI" to generate it`,
        file: fp,
        stack: text,
      }
    }
    if (text.includes('Error:') || text.includes('error TS') || text.includes('Cannot find')) {
      const m = text.match(/([^\s]+\.[jt]sx?):(\d+)/)
      return {
        message: text.split('\n')[0],
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

      // Status transitions from log sentinel text
      if (text.includes('__FORGE_INSTALL_DONE__') || text.includes('Packages installed')) {
        setStatus('starting')
        setProgress(70)
      }
      if (text.includes('__FORGE_SERVER_READY__') ||
          text.includes('Local:') || text.includes('ready in') || text.includes('App running') ||
          text.includes('✓ Ready') || text.includes('started server on') ||
          text.toLowerCase().includes('is being served at') ||
          text.toLowerCase().includes('flutter run key commands') ||
          text.toLowerCase().includes('compiled successfully') ||
          text.toLowerCase().includes('angular live development server is listening') ||
          // NOTE: 'watching for file changes' is intentionally omitted — Angular prints it
          // before the HTTP server is ready, which causes a premature iframe load.
          text.toLowerCase().includes('listening at') || text.toLowerCase().includes('listening on') ||
          text.toLowerCase().includes('server listening') || text.toLowerCase().includes('server running')) {
        setStatus('ready')
        setProgress(100)
        setError(null)
      }
      if (text.startsWith('❌') || text.includes('exited')) {
        const err = parseError(text)
        if (err) setError(err)
        setStatus('error')
      }
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
      setError({ message: msg })
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

  // ── Cleanup SSE on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      sseRef.current?.close()
    }
  }, [])

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
    setStatus('idle')
    setPreviewUrl(null)
    setProgress(0)
    setError(null)
    // idle triggers auto-start via useEffect
  }, [])

  const stop = useCallback(() => {
    sseRef.current?.close()
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
