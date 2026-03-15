/**
 * previewManager — server-side Docker container lifecycle for per-project previews.
 *
 * Each project preview runs in an isolated `node:20-alpine` container:
 *   • Container starts, runs `npm install` then `npm run dev`
 *   • Vite dev server listens on 0.0.0.0:5173 inside the container
 *   • Docker binds a host port (40000-40999) → container:5173
 *   • Browser accesses the preview at http://localhost:{port}/ directly (no proxy needed)
 *   • Express API (if full-stack) runs on :3001 inside the container; Vite proxies /api to it
 *
 * Files are injected via Docker's putArchive API (tar archive) so no host filesystem
 * sharing is required, and the API container can be fully isolated.
 */

import Docker from 'dockerode'
import { Writable } from 'node:stream'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema.js'

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

// ── Types ─────────────────────────────────────────────────────────────────────

export type PreviewStatus = 'starting' | 'installing' | 'running' | 'error' | 'stopped'

export interface PreviewInstance {
  projectId: string
  containerId: string
  containerName: string
  hostPort: number
  status: PreviewStatus
  error?: string
  logs: string[]
  subscribers: Set<(log: string) => void>
  ttlTimer: ReturnType<typeof setTimeout> | null
  readySent?: boolean
}

// ── Docker client ─────────────────────────────────────────────────────────────

const docker = new Docker({ socketPath: '/var/run/docker.sock' })

const PREVIEW_IMAGE = 'node:20-alpine'
const PORT_START = Number(process.env.PREVIEW_PORT_START ?? 40000)
const PORT_END = Number(process.env.PREVIEW_PORT_END ?? 40999)
const MEMORY_LIMIT = 512 * 1024 * 1024   // 512 MB
const CPU_LIMIT = 1_000_000_000           // 1 vCPU (nanocpus)
const TTL_MS = 30 * 60 * 1000            // 30 minutes auto-cleanup

// ── In-memory state ───────────────────────────────────────────────────────────

const instances = new Map<string, PreviewInstance>()
const usedPorts = new Set<number>()

// ── Helpers ───────────────────────────────────────────────────────────────────

function containerName(projectId: string): string {
  return `forge-preview-${projectId}`
}

function allocatePort(): number {
  for (let p = PORT_START; p <= PORT_END; p++) {
    if (!usedPorts.has(p)) {
      usedPorts.add(p)
      return p
    }
  }
  throw new Error('No preview ports available (all 1000 slots in use)')
}

function pushLog(instance: PreviewInstance, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  instance.logs.push(trimmed)
  if (instance.logs.length > 500) instance.logs.shift()
  for (const cb of instance.subscribers) {
    try { cb(trimmed) } catch {}
  }
}

/**
 * Build a POSIX ustar tar archive from an array of { path, content } objects.
 * No external dependencies — pure Node.js Buffer manipulation.
 */
function buildTar(files: Array<{ path: string; content: string }>): Buffer {
  const blocks: Buffer[] = []

  for (const file of files) {
    const name = file.path.replace(/^\/+/, '')   // strip leading slashes
    if (!name) continue
    const nameBuf = Buffer.from(name, 'utf8')
    if (nameBuf.length > 99) {
      console.warn(`[preview] Skipping file with path > 99 bytes: ${name}`)
      continue
    }

    const content = Buffer.from(file.content, 'utf8')

    // 512-byte POSIX ustar header
    const header = Buffer.alloc(512)
    nameBuf.copy(header, 0)
    header.write('0000644\0', 100)                                                        // mode
    header.write('0000000\0', 108)                                                        // uid
    header.write('0000000\0', 116)                                                        // gid
    header.write(content.length.toString(8).padStart(11, '0') + '\0', 124)               // size
    header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0', 136) // mtime
    header[156] = 0x30                                                                    // type '0'
    header.write('ustar\0', 257)                                                          // magic
    header.write('00', 263)                                                               // version

    // Checksum: sum all 512 bytes with 0x20 in checksum field (bytes 148-155)
    header.fill(0x20, 148, 156)
    let checksum = 0
    for (let i = 0; i < 512; i++) checksum += header[i]
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148)

    blocks.push(header)

    if (content.length > 0) {
      const padded = Buffer.alloc(Math.ceil(content.length / 512) * 512)
      content.copy(padded)
      blocks.push(padded)
    }
  }

  blocks.push(Buffer.alloc(1024)) // end-of-archive: two null blocks
  return Buffer.concat(blocks)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Clean up any preview containers left behind by a previous API process.
 * Call once at server startup.
 */
export async function initialize(): Promise<void> {
  try {
    const orphans = await docker.listContainers({
      all: true,
      filters: { label: ['forge.preview=true'] },
    })
    await Promise.allSettled(
      orphans.map(c => docker.getContainer(c.Id).remove({ force: true }))
    )
    if (orphans.length) {
      console.info(`[preview] Cleaned up ${orphans.length} orphaned preview container(s)`)
    }
    // Pre-pull the image in the background so first preview starts faster
    docker.pull(PREVIEW_IMAGE).catch(() => {/* ignore if already present */})
  } catch (err) {
    // Docker not available (e.g. CI, no socket) — preview will degrade gracefully
    console.warn('[preview] Docker not available:', (err as Error).message)
  }
}

/** Start (or restart) a preview container for the given project. */
export async function start(projectId: string, db: DrizzleDB): Promise<number> {
  // Stop any existing container first
  await stop(projectId)

  // Fetch project files from the database
  const files = await db
    .select({ path: schema.projectFiles.path, content: schema.projectFiles.content })
    .from(schema.projectFiles)
    .where(eq(schema.projectFiles.projectId, projectId))

  if (!files.length) throw new Error('No files found for this project')

  const port = allocatePort()
  const name = containerName(projectId)

  // Remove any orphaned container with same name
  try { await docker.getContainer(name).remove({ force: true }) } catch {}

  const instance: PreviewInstance = {
    projectId,
    containerId: '',
    containerName: name,
    hostPort: port,
    status: 'starting',
    logs: [],
    subscribers: new Set(),
    ttlTimer: null,
  }
  instances.set(projectId, instance)

  pushLog(instance, '⚙ Creating preview container…')

  try {
    const container = await docker.createContainer({
      name,
      Image: PREVIEW_IMAGE,
      // npm install first, then npm run dev.
      // Echo a sentinel after install so we can detect the phase transition.
      Cmd: ['sh', '-c',
        // 1. Install project dependencies from package.json
        'npm install --no-fund --no-audit --loglevel=error 2>&1' +
        // 2. Safety net: if postcss.config.js exists, ensure tailwindcss/autoprefixer/postcss
        //    are installed even if the AI forgot to put them in devDependencies.
        ' && ([ ! -f postcss.config.js ] || node -e "require(\'tailwindcss\')" 2>/dev/null' +
        ' || npm install --no-fund --no-audit --no-save tailwindcss@"^3" autoprefixer@"^10" postcss@"^8" 2>&1)' +
        ' && echo "__FORGE_INSTALL_DONE__"' +
        ' && npm run dev 2>&1',
      ],
      WorkingDir: '/app',
      Env: ['NODE_ENV=development', 'FORCE_COLOR=0', 'PORT=5173'],
      ExposedPorts: { '5173/tcp': {} },
      HostConfig: {
        PortBindings: { '5173/tcp': [{ HostPort: String(port) }] },
        Memory: MEMORY_LIMIT,
        NanoCpus: CPU_LIMIT,
        AutoRemove: false,
      },
      Labels: { 'forge.preview': 'true', 'forge.project': projectId },
    })

    instance.containerId = container.id
    instance.status = 'installing'

    // Copy project files into /app inside the container BEFORE starting.
    // We extract to '/' with paths prefixed 'app/' so Docker creates /app automatically
    // (node:20-alpine has no /app directory by default).
    const tar = buildTar(files.map(f => ({ path: `app/${f.path.replace(/^\/+/, '')}`, content: f.content })))
    await container.putArchive(tar, { path: '/' })
    pushLog(instance, `📦 Mounted ${files.length} file(s) — running npm install…`)

    await container.start()

    // Stream container logs
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      timestamps: false,
    }) as NodeJS.ReadableStream

    const stdout = new Writable({
      write(chunk: Buffer, _enc, cb) {
        const text = chunk.toString('utf8').trim()
        if (!text) return cb()
        if (text.includes('__FORGE_INSTALL_DONE__')) {
          instance.status = 'running'
          pushLog(instance, '✅ Packages installed — dev server starting…')
        } else {
          // Detect server-ready across all frameworks:
          //  Vite:    "ready in", "Local:"
          //  Node/Fastify: "listening at/on" in pino JSON logs
          //  Next.js: "✓ Ready", "started server on"
          //  Express/Hapi/etc: common "listening" patterns
          const lower = text.toLowerCase()
          const isReady =
            text.includes('ready in') ||
            text.includes('Local:') ||
            text.includes('✓ Ready') ||
            text.includes('started server on') ||
            lower.includes('listening at') ||
            lower.includes('listening on') ||
            lower.includes('server listening') ||
            lower.includes('server running') ||
            lower.includes('app running')

          pushLog(instance, isReady ? `✅ ${text}` : text)

          if (isReady && !instance.readySent) {
            instance.readySent = true
            pushLog(instance, '__FORGE_SERVER_READY__')
          }
        }
        cb()
      },
    })

    const stderr = new Writable({
      write(chunk: Buffer, _enc, cb) {
        const text = chunk.toString('utf8').trim()
        if (text) pushLog(instance, `⚠ ${text}`)
        cb()
      },
    })

    ;(container.modem as any).demuxStream(logStream, stdout, stderr)

    logStream.on('end', () => {
      if (instance.status === 'running' || instance.status === 'installing') {
        instance.status = 'error'
        instance.error = 'Dev server process exited unexpectedly'
        pushLog(instance, '❌ Dev server exited')
      }
    })

    // Auto-cleanup after TTL
    instance.ttlTimer = setTimeout(() => {
      pushLog(instance, '⏱ Preview timed out after 30 minutes — stopping')
      stop(projectId)
    }, TTL_MS)

    return port
  } catch (err) {
    const msg = (err as Error).message
    instance.status = 'error'
    instance.error = msg
    pushLog(instance, `❌ ${msg}`)
    usedPorts.delete(port)
    instances.delete(projectId)
    throw err
  }
}

/** Stop and remove the preview container for a project. */
export async function stop(projectId: string): Promise<void> {
  const instance = instances.get(projectId)
  if (!instance) return

  if (instance.ttlTimer) clearTimeout(instance.ttlTimer)
  usedPorts.delete(instance.hostPort)
  instances.delete(projectId)
  instance.status = 'stopped'
  pushLog(instance, '⏹ Preview stopped')

  try {
    const container = docker.getContainer(instance.containerName)
    await container.stop({ t: 3 }).catch(() => {})
    await container.remove({ force: true }).catch(() => {})
  } catch {}
}

/** Push updated files into a running container so Vite picks up changes. */
export async function syncFiles(projectId: string, db: DrizzleDB): Promise<void> {
  const instance = instances.get(projectId)
  if (!instance || instance.status === 'stopped') return

  const files = await db
    .select({ path: schema.projectFiles.path, content: schema.projectFiles.content })
    .from(schema.projectFiles)
    .where(eq(schema.projectFiles.projectId, projectId))

  const tar = buildTar(files.map(f => ({ path: `app/${f.path.replace(/^\/+/, '')}`, content: f.content })))
  const container = docker.getContainer(instance.containerName)
  await container.putArchive(tar, { path: '/' })
  pushLog(instance, `🔄 Synced ${files.length} file(s)`)
}

export function getInstance(projectId: string): PreviewInstance | undefined {
  return instances.get(projectId)
}

/** Subscribe to log events for a project. Returns an unsubscribe function. */
export function subscribeToLogs(
  projectId: string,
  callback: (log: string) => void,
): () => void {
  const instance = instances.get(projectId)
  if (!instance) return () => {}
  instance.subscribers.add(callback)
  return () => instance.subscribers.delete(callback)
}

// Clean up on process exit
process.on('SIGTERM', async () => {
  await Promise.allSettled([...instances.keys()].map(stop))
})
