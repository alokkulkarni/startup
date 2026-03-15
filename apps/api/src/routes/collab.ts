import type { FastifyInstance } from 'fastify'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { requireAuth } from '../middleware/auth.js'
import { getWorkspaceMembership } from '../middleware/rbac.js'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

interface DocEntry {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  connections: Set<import('ws').WebSocket>
}

// In-memory store: `${projectId}:${filePath}` → DocEntry
const docStore = new Map<string, DocEntry>()

async function getOrCreateDocEntry(
  app: FastifyInstance,
  projectId: string,
  filePath: string
): Promise<DocEntry> {
  const key = `${projectId}:${filePath}`
  if (docStore.has(key)) return docStore.get(key)!

  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)

  // Seed with stored file content so the first joiner sees the correct state
  const file = await app.db.query.projectFiles.findFirst({
    where: (f: any, { and, eq }: any) =>
      and(eq(f.projectId, projectId), eq(f.path, filePath)),
  })
  if (file?.content) {
    const yText = doc.getText('content')
    doc.transact(() => {
      yText.insert(0, file.content)
    })
  }

  const entry: DocEntry = { doc, awareness, connections: new Set() }
  docStore.set(key, entry)
  return entry
}

function sendMsg(socket: import('ws').WebSocket, data: Uint8Array) {
  if (socket.readyState === 1 /* OPEN */) {
    socket.send(data)
  }
}

export async function collabRoutes(app: FastifyInstance) {
  /**
   * GET /ws/collab/:projectId/*
   *
   * WebSocket endpoint implementing the y-websocket sync + awareness protocol.
   * The wildcard segment captures the file path (e.g. "src/App.tsx").
   * Auth: requireAuth preHandler; workspace membership verified inside handler.
   */
  app.get<{ Params: { projectId: string; '*': string } }>(
    '/ws/collab/:projectId/*',
    {
      websocket: true,
      preHandler: async (request, reply) => {
        await requireAuth(request, reply)
      },
    },
    async (connection, request: any) => {
      const { projectId } = request.params as { projectId: string }
      const filePath = request.params['*'] as string
      const userId = request.user!.id

      // Verify the project exists and the caller is a workspace member
      const project = await app.db.query.projects.findFirst({
        where: (p: any, { and, eq, ne }: any) =>
          and(eq(p.id, projectId), ne(p.status, 'deleted')),
      })
      if (!project) {
        connection.socket.close(1008, 'Project not found')
        return
      }

      const member = await getWorkspaceMembership(app.db, userId, project.workspaceId)
      if (!member) {
        connection.socket.close(1008, 'Access denied')
        return
      }

      const entry = await getOrCreateDocEntry(app, projectId, filePath)
      const { doc, awareness, connections } = entry
      connections.add(connection.socket)

      // ── Send initial sync state ─────────────────────────────────────────────

      // Step 1: send our current state vector so the client can reply with missing updates
      const step1Encoder = encoding.createEncoder()
      encoding.writeVarUint(step1Encoder, MESSAGE_SYNC)
      syncProtocol.writeSyncStep1(step1Encoder, doc)
      sendMsg(connection.socket, encoding.toUint8Array(step1Encoder))

      // Step 2: proactively send our full state so the client immediately has current content
      const step2Encoder = encoding.createEncoder()
      encoding.writeVarUint(step2Encoder, MESSAGE_SYNC)
      syncProtocol.writeSyncStep2(step2Encoder, doc, Y.encodeStateVector(doc))
      sendMsg(connection.socket, encoding.toUint8Array(step2Encoder))

      // Send current awareness states if any peers are online
      const awarenessStates = awareness.getStates()
      if (awarenessStates.size > 0) {
        const awarenessEncoder = encoding.createEncoder()
        encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS)
        encoding.writeVarUint8Array(
          awarenessEncoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
        )
        sendMsg(connection.socket, encoding.toUint8Array(awarenessEncoder))
      }

      // ── Broadcast helpers ──────────────────────────────────────────────────

      const broadcast = (data: Uint8Array, exclude?: import('ws').WebSocket) => {
        for (const conn of connections) {
          if (conn !== exclude && conn.readyState === 1) {
            conn.send(data)
          }
        }
      }

      // ── Doc + awareness update handlers ───────────────────────────────────

      const onDocUpdate = (update: Uint8Array, origin: unknown) => {
        if (origin === connection.socket) return
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        syncProtocol.writeUpdate(encoder, update)
        broadcast(encoding.toUint8Array(encoder))
      }

      const onAwarenessUpdate = (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        _origin: unknown
      ) => {
        const changed = [...added, ...updated, ...removed]
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changed)
        )
        broadcast(encoding.toUint8Array(encoder))
      }

      doc.on('update', onDocUpdate)
      awareness.on('update', onAwarenessUpdate)

      // ── Incoming message handler ───────────────────────────────────────────

      connection.socket.on('message', (rawMsg: Buffer) => {
        try {
          const data = new Uint8Array(rawMsg)
          const decoder = decoding.createDecoder(data)
          const msgType = decoding.readVarUint(decoder)

          if (msgType === MESSAGE_SYNC) {
            const replyEncoder = encoding.createEncoder()
            encoding.writeVarUint(replyEncoder, MESSAGE_SYNC)
            const hasReply = syncProtocol.readSyncMessage(
              decoder,
              replyEncoder,
              doc,
              connection.socket
            )
            if (hasReply && encoding.length(replyEncoder) > 1) {
              sendMsg(connection.socket, encoding.toUint8Array(replyEncoder))
            }
          } else if (msgType === MESSAGE_AWARENESS) {
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              decoding.readVarUint8Array(decoder),
              connection.socket
            )
          }
        } catch (err) {
          app.log.warn({ err }, 'collab: error processing WebSocket message')
        }
      })

      // ── Cleanup on disconnect ─────────────────────────────────────────────

      connection.socket.on('close', () => {
        connections.delete(connection.socket)
        doc.off('update', onDocUpdate)
        awareness.off('update', onAwarenessUpdate)
        awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null)
      })
    }
  )
}
