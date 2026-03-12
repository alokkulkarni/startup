import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { getWorkspaceMembership } from '../middleware/rbac.js'

interface PresenceMessage {
  type: 'ping' | 'cursor' | 'join' | 'leave'
  workspaceId?: string
  projectId?: string
  cursor?: { line: number; col: number; file: string }
}

const PRESENCE_TTL = 60 // seconds

export async function presenceRoutes(app: FastifyInstance) {
  // WebSocket presence endpoint
  app.get<{ Params: { workspaceId: string } }>(
    '/ws/presence/:workspaceId',
    { websocket: true },
    async (connection, request: any) => {
      if (!(await requireAuth(request, connection))) return

      const { workspaceId } = request.params as { workspaceId: string }
      const userId = request.user.id
      const userEmail = request.user.email

      const membership = await getWorkspaceMembership(app.db, userId, workspaceId)
      if (!membership) {
        connection.socket.close(1008, 'Not a workspace member')
        return
      }

      const redis = app.redis
      const presenceKey = `presence:ws:${workspaceId}`
      const userKey = `presence:user:${workspaceId}:${userId}`

      await redis.setex(userKey, PRESENCE_TTL, JSON.stringify({ userId, email: userEmail, joinedAt: new Date().toISOString() }))
      await redis.sadd(presenceKey, userId)

      const joinMsg = JSON.stringify({ type: 'join', userId, email: userEmail })
      await redis.publish(`presence:channel:${workspaceId}`, joinMsg)

      connection.socket.on('message', async (rawMsg: Buffer) => {
        try {
          const msg: PresenceMessage = JSON.parse(rawMsg.toString())

          if (msg.type === 'ping') {
            await redis.expire(userKey, PRESENCE_TTL)
            connection.socket.send(JSON.stringify({ type: 'pong', ts: Date.now() }))
          } else if (msg.type === 'cursor' && msg.cursor) {
            const cursorMsg = JSON.stringify({
              type: 'cursor',
              userId,
              email: userEmail,
              cursor: msg.cursor,
              projectId: msg.projectId,
            })
            await redis.publish(`presence:channel:${workspaceId}`, cursorMsg)
          }
        } catch {
          // ignore malformed messages
        }
      })

      connection.socket.on('close', async () => {
        await redis.del(userKey)
        const leaveMsg = JSON.stringify({ type: 'leave', userId, email: userEmail })
        await redis.publish(`presence:channel:${workspaceId}`, leaveMsg)
      })

      const onlineIds = await redis.smembers(presenceKey)
      const onlineUsers = await Promise.all(
        onlineIds.map(async (id: string) => {
          const data = await redis.get(`presence:user:${workspaceId}:${id}`)
          return data ? JSON.parse(data) : null
        })
      )
      connection.socket.send(
        JSON.stringify({
          type: 'presence_init',
          users: onlineUsers.filter(Boolean),
        })
      )
    }
  )
}
