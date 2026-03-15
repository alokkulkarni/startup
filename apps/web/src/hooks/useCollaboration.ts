'use client'

import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export interface CollaborationState {
  doc: Y.Doc | null
  provider: WebsocketProvider | null
  /** The shared Y.Text for the current file — use with MonacoBinding */
  yText: Y.Text | null
  connected: boolean
}

interface UseCollaborationOptions {
  projectId: string
  /** Relative file path, e.g. "src/App.tsx". Pass null to disable. */
  filePath: string | null
  /** Master switch — set false to skip WebSocket entirely */
  enabled?: boolean
}

/**
 * Manages a Y.Doc + WebsocketProvider for a single (project, file) pair.
 *
 * The hook re-initialises when projectId or filePath changes.
 * Pass enabled=false (or filePath=null) to skip the WebSocket connection.
 */
export function useCollaboration({
  projectId,
  filePath,
  enabled = true,
}: UseCollaborationOptions): CollaborationState {
  const [connected, setConnected] = useState(false)
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const yTextRef = useRef<Y.Text | null>(null)

  // We also store state refs for the return value so callers get stable
  // object references on every render.
  const [snapshot, setSnapshot] = useState<CollaborationState>({
    doc: null,
    provider: null,
    yText: null,
    connected: false,
  })

  useEffect(() => {
    if (!enabled || !filePath) return

    // Tear down any previous session
    providerRef.current?.destroy()
    docRef.current?.destroy()

    const doc = new Y.Doc()
    const yText = doc.getText('content')
    docRef.current = doc
    yTextRef.current = yText

    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
      .replace(/^http/, 'ws')
      .replace(/\/+$/, '')

    // WebsocketProvider connects to: `${serverUrl}/${roomName}`
    // which resolves to: `ws://host/api/v1/ws/collab/${projectId}/${filePath}`
    const serverUrl = `${apiBase}/api/v1`
    const roomName = `ws/collab/${projectId}/${encodeURIComponent(filePath)}`

    const provider = new WebsocketProvider(serverUrl, roomName, doc, {
      connect: true,
    })
    providerRef.current = provider

    const onStatus = ({ status }: { status: string }) => {
      const isConnected = status === 'connected'
      setConnected(isConnected)
      setSnapshot({ doc, provider, yText, connected: isConnected })
    }

    provider.on('status', onStatus)

    setSnapshot({ doc, provider, yText, connected: false })

    return () => {
      provider.off('status', onStatus)
      provider.destroy()
      doc.destroy()
      docRef.current = null
      providerRef.current = null
      yTextRef.current = null
      setConnected(false)
      setSnapshot({ doc: null, provider: null, yText: null, connected: false })
    }
  }, [projectId, filePath, enabled])

  return snapshot
}
