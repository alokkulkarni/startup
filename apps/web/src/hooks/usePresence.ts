'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export interface PresenceUser {
  userId: string
  email: string
  joinedAt: string
  cursor?: { line: number; col: number; file: string }
}

export function usePresence(workspaceId: string | null, projectId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!workspaceId) return
    const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsBase}/api/v1/ws/presence/${workspaceId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      // Start ping every 30s to maintain presence TTL
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'presence_init') {
          setOnlineUsers(msg.users)
        } else if (msg.type === 'join') {
          setOnlineUsers(prev => {
            if (prev.find(u => u.userId === msg.userId)) return prev
            return [...prev, { userId: msg.userId, email: msg.email, joinedAt: new Date().toISOString() }]
          })
        } else if (msg.type === 'leave') {
          setOnlineUsers(prev => prev.filter(u => u.userId !== msg.userId))
        } else if (msg.type === 'cursor') {
          setOnlineUsers(prev => prev.map(u => u.userId === msg.userId ? { ...u, cursor: msg.cursor } : u))
        }
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      setConnected(false)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      // Reconnect after 3s
      setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [workspaceId])

  const sendCursor = useCallback((cursor: { line: number; col: number; file: string }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cursor', cursor, projectId }))
    }
  }, [projectId])

  useEffect(() => {
    connect()
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { onlineUsers, connected, sendCursor }
}
