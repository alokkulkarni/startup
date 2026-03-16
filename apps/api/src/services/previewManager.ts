/**
 * previewManager — server-side Docker container lifecycle for per-project previews.
 *
 * Routing strategy: Traefik subdomain (no host port binding)
 * ──────────────────────────────────────────────────────────
 * Each container gets a unique subdomain URL:  http://{projectId}.localhost/
 * Traefik (Docker provider) reads the container labels and routes traffic from
 * the subdomain to the container's internal IP on forge_forge_network:5173.
 * No host port is bound — the port pool bottleneck is eliminated entirely.
 * The number of concurrent previews is limited only by host RAM/CPU.
 *
 * Isolation model: one container per project (keyed by projectId UUID). Different
 * users each own different projects → different containers → no overlap. Users
 * sharing the same workspace project share one container (correct for collaboration).
 *
 * Idle teardown: the preview container is automatically stopped after 10 minutes of
 * inactivity. The timer is cancelled when a browser tab opens the SSE log stream
 * and restarted when the last tab closes. File syncs also reset the countdown.
 *
 * Files are injected via Docker's putArchive API (tar archive) so no host filesystem
 * sharing is required.
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
  userId: string
  containerId: string
  containerName: string
  /** Subdomain URL the browser uses: http://{projectId}.{PREVIEW_DOMAIN}/ */
  previewUrl: string
  status: PreviewStatus
  error?: string
  logs: string[]
  subscribers: Set<(log: string) => void>
  /** Timestamp of last observed activity (subscribe / syncFiles / start). */
  lastActivityAt: number
  /** Handle for the 10-minute inactivity teardown timer. */
  idleTimer: ReturnType<typeof setTimeout> | null
  readySent?: boolean
}

// ── Docker client ─────────────────────────────────────────────────────────────

const docker = new Docker({ socketPath: '/var/run/docker.sock' })

const PREVIEW_IMAGE   = 'node:20-alpine'
const FLUTTER_IMAGE   = 'ghcr.io/cirruslabs/flutter:stable'
const MEMORY_LIMIT    = 512 * 1024 * 1024       // 512 MB (Node.js projects)
const FLUTTER_MEMORY  = 2 * 1024 * 1024 * 1024  // 2 GB  (Flutter compilation)
const CPU_LIMIT       = 1_000_000_000            // 1 vCPU (nanocpus)
/** Idle timeout: container is stopped 10 minutes after the last subscriber disconnects. */
const IDLE_TTL_MS     = 10 * 60 * 1000
/** Docker network shared with Traefik — containers must join this to be routable. */
const TRAEFIK_NETWORK = process.env.TRAEFIK_NETWORK ?? 'forge_forge_network'
/** Domain suffix for preview subdomains. On *.localhost all subdomains resolve to 127.0.0.1. */
const PREVIEW_DOMAIN  = process.env.PREVIEW_DOMAIN ?? 'localhost'

// ── In-memory state ───────────────────────────────────────────────────────────

const instances = new Map<string, PreviewInstance>()

// ── Helpers ───────────────────────────────────────────────────────────────────

function containerName(projectId: string): string {
  return `forge-preview-${projectId}`
}

function buildPreviewUrl(projectId: string): string {
  return `http://${projectId}.${PREVIEW_DOMAIN}/`
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

// ── Idle-timer helpers ────────────────────────────────────────────────────────

/** Cancel the pending idle-teardown timer (if any). */
function clearIdleTimer(instance: PreviewInstance) {
  if (instance.idleTimer) {
    clearTimeout(instance.idleTimer)
    instance.idleTimer = null
  }
}

/**
 * (Re)schedule the 10-minute idle teardown.
 * Call this whenever activity stops (last subscriber disconnects, etc.)
 */
function scheduleIdleCleanup(instance: PreviewInstance) {
  clearIdleTimer(instance)
  instance.idleTimer = setTimeout(() => {
    pushLog(instance, '⏱ Preview idle for 10 minutes — stopping container')
    stop(instance.projectId)
  }, IDLE_TTL_MS)
}

/**
 * Record activity and cancel any pending idle teardown.
 * Call this whenever the preview is actively being used.
 */
function touchActivity(instance: PreviewInstance) {
  instance.lastActivityAt = Date.now()
  // Only cancel the timer — don't reschedule yet. The timer will be rescheduled
  // when the last subscriber disconnects (or stays cancelled if subs are active).
  clearIdleTimer(instance)
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
 * Inline script injected into every project's index.html.
 * Captures window.onerror + unhandledrejection and posts them to the parent
 * Forge AI frame via postMessage so the error overlay can display them.
 */
const FORGE_REPORTER_SCRIPT = `<script>(function(){function r(m,f,l,s){try{window.parent.postMessage({type:'forge:runtime-error',message:m,file:f,line:l,stack:s},'*')}catch(_){}}window.onerror=function(m,s,l,c,e){r(String(m),s,l,e&&e.stack);return false};window.addEventListener('unhandledrejection',function(ev){var e=ev.reason;r(e&&e.message?e.message:String(e),void 0,void 0,e&&e.stack)})})();</script>`

/** Inject the forge error reporter into index.html content. No-op if already present. */
function patchIndexHtml(html: string): string {
  if (html.includes('forge:runtime-error')) return html
  if (html.includes('<head>')) return html.replace('<head>', `<head>\n  ${FORGE_REPORTER_SCRIPT}`)
  const headMatch = html.match(/<head[^>]*>/)
  if (headMatch) return html.replace(headMatch[0], `${headMatch[0]}\n  ${FORGE_REPORTER_SCRIPT}`)
  return FORGE_REPORTER_SCRIPT + '\n' + html
}

/** Augment the file list with forge-specific dev-only files. */
function injectDevFiles(files: Array<{ path: string; content: string }>): Array<{ path: string; content: string }> {
  return files.map(f => {
    if (f.path === 'index.html' || f.path === '/index.html') {
      return { path: f.path, content: patchIndexHtml(f.content) }
    }
    return f
  })
}

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
    // Pre-pull images in the background so first preview starts faster
    docker.pull(PREVIEW_IMAGE).catch(() => {/* ignore if already present */})
    docker.pull(FLUTTER_IMAGE).catch(() => {/* ignore – large image, best-effort only */})
  } catch (err) {
    // Docker not available (e.g. CI, no socket) — preview will degrade gracefully
    console.warn('[preview] Docker not available:', (err as Error).message)
  }
}

/** Start (or restart) a preview container for the given project. */
export async function start(projectId: string, userId: string, db: DrizzleDB): Promise<string> {
  // Stop any existing container first
  await stop(projectId)

  // Fetch project files from the database
  const files = await db
    .select({ path: schema.projectFiles.path, content: schema.projectFiles.content })
    .from(schema.projectFiles)
    .where(eq(schema.projectFiles.projectId, projectId))

  if (!files.length) throw new Error('No files found for this project')

  const name = containerName(projectId)
  const previewUrl = buildPreviewUrl(projectId)

  // Remove any orphaned container with same name
  try { await docker.getContainer(name).remove({ force: true }) } catch {}

  const instance: PreviewInstance = {
    projectId,
    userId,
    containerId: '',
    containerName: name,
    previewUrl,
    status: 'starting',
    logs: [],
    subscribers: new Set(),
    lastActivityAt: Date.now(),
    idleTimer: null,
  }
  instances.set(projectId, instance)

  pushLog(instance, '⚙ Creating preview container…')

  // Traefik labels — Traefik's Docker provider reads these at container-start time
  // and immediately begins routing http://{projectId}.{PREVIEW_DOMAIN}/ to port 5173.
  const traefikLabels = {
    'traefik.enable': 'true',
    [`traefik.http.routers.preview-${projectId}.rule`]: `Host(\`${projectId}.${PREVIEW_DOMAIN}\`)`,
    [`traefik.http.routers.preview-${projectId}.entrypoints`]: 'web',
    [`traefik.http.services.preview-${projectId}.loadbalancer.server.port`]: '5173',
  }

  const baseLabels = {
    'forge.preview': 'true',
    'forge.project': projectId,
    'forge.user': userId,
  }

  // Networking — containers must be on the same Docker network as Traefik.
  const networkingConfig = {
    EndpointsConfig: { [TRAEFIK_NETWORK]: {} },
  }

  try {
    // Detect Flutter project by presence of pubspec.yaml
    const isFlutter = files.some(f => f.path === 'pubspec.yaml')

    if (isFlutter) {
      pushLog(instance, '🐦 Flutter project detected — using Flutter web-server mode…')
      pushLog(instance, '💡 First Flutter preview pulls a ~2 GB Docker image; this may take a few minutes.')
    }

    const container = await docker.createContainer(isFlutter ? {
      name,
      Image: FLUTTER_IMAGE,
      // flutter pub get fetches Dart packages; then flutter run starts the dev web-server.
      Cmd: ['sh', '-c',
        'flutter pub get --no-color 2>&1' +
        ' && echo "__FORGE_INSTALL_DONE__"' +
        ' && flutter run -d web-server --web-hostname 0.0.0.0 --web-port 5173 --no-color 2>&1',
      ],
      WorkingDir: '/app',
      Env: [],   // Flutter image ships its own environment
      ExposedPorts: { '5173/tcp': {} },
      HostConfig: {
        Memory: FLUTTER_MEMORY,
        NanoCpus: CPU_LIMIT,
        AutoRemove: false,
      },
      Labels: { ...baseLabels, ...traefikLabels },
      NetworkingConfig: networkingConfig,
    } : {
      name,
      Image: PREVIEW_IMAGE,
      // npm install first, then npm run dev.
      // Echo a sentinel after install so we can detect the phase transition.
      Cmd: ['sh', '-c',
        // 1. Install project dependencies from package.json
        'npm install --no-fund --no-audit --loglevel=warn 2>&1' +
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
        Memory: MEMORY_LIMIT,
        NanoCpus: CPU_LIMIT,
        AutoRemove: false,
      },
      Labels: { ...baseLabels, ...traefikLabels },
      NetworkingConfig: networkingConfig,
    })

    instance.containerId = container.id
    instance.status = 'installing'

    // Copy project files into /app inside the container BEFORE starting.
    // We extract to '/' with paths prefixed 'app/' so Docker creates /app automatically
    // (node:20-alpine has no /app directory by default).
    const tar = buildTar(injectDevFiles(files).map(f => ({ path: `app/${f.path.replace(/^\/+/, '')}`, content: f.content })))
    await container.putArchive(tar, { path: '/' })
    pushLog(instance, `📦 Mounted ${files.length} file(s) — running ${isFlutter ? 'flutter pub get' : 'npm install'}…`)

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
          //  Vite/Angular: "ready in", "Local:"
          //  Node/Fastify: "listening at/on" in pino JSON logs
          //  Next.js: "✓ Ready", "started server on"
          //  Angular: "Angular Live Development Server is listening"
          //    NOTE: "watching for file changes" is intentionally NOT here — Angular
          //    prints that BEFORE the HTTP server starts listening. Using it would cause
          //    the iframe to load before the server accepts connections (ERR_CONNECTION_RESET).
          //  Flutter: "is being served at", "flutter run key commands"
          //  CRA/webpack: "compiled successfully"
          //  Express/Hapi/etc: common "listening" patterns
          const lower = text.toLowerCase()
          const isReady =
            text.includes('ready in') ||
            text.includes('Local:') ||
            text.includes('✓ Ready') ||
            text.includes('started server on') ||
            lower.includes('is being served at') ||
            lower.includes('flutter run key commands') ||
            lower.includes('compiled successfully') ||
            lower.includes('angular live development server is listening') ||
            lower.includes('listening at') ||
            lower.includes('listening on') ||
            lower.includes('server listening') ||
            lower.includes('server running') ||
            lower.includes('app running')

          pushLog(instance, isReady ? `✅ ${text}` : text)

          if (isReady && !instance.readySent) {
            instance.readySent = true
            // 500ms grace period: some servers print their "ready" line slightly before
            // the TCP listener is fully bound (e.g. Angular prints "Local:" and then the
            // OS completes the bind). A short delay prevents ERR_CONNECTION_RESET in the
            // iframe on the very first load.
            setTimeout(() => pushLog(instance, '__FORGE_SERVER_READY__'), 500)
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

    // Start the 10-minute idle countdown immediately. It will be cancelled the moment
    // the first browser tab opens an SSE log-stream connection (subscribeToLogs) and
    // restarted when the last tab closes. This prevents orphaned containers when a user
    // starts a preview but never opens / quickly closes the browser.
    scheduleIdleCleanup(instance)

    return previewUrl
  } catch (err) {
    const msg = (err as Error).message
    instance.status = 'error'
    instance.error = msg
    pushLog(instance, `❌ ${msg}`)
    instances.delete(projectId)
    throw err
  }
}

/** Stop and remove the preview container for a project. */
export async function stop(projectId: string): Promise<void> {
  const instance = instances.get(projectId)
  if (!instance) return

  clearIdleTimer(instance)
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

  // Treat file sync as activity — reset the idle countdown.
  touchActivity(instance)
  // If nobody is subscribed, reschedule cleanup from now (not from last sync).
  if (instance.subscribers.size === 0) scheduleIdleCleanup(instance)

  const files = await db
    .select({ path: schema.projectFiles.path, content: schema.projectFiles.content })
    .from(schema.projectFiles)
    .where(eq(schema.projectFiles.projectId, projectId))

  const packageJsonBefore = files.find(f => f.path === 'package.json')?.content ?? ''
  const tar = buildTar(injectDevFiles(files).map(f => ({ path: `app/${f.path.replace(/^\/+/, '')}`, content: f.content })))
  const container = docker.getContainer(instance.containerName)
  await container.putArchive(tar, { path: '/' })

  // If package.json changed (new deps added by AI), run npm install inside container.
  const packageJsonAfter = files.find(f => f.path === 'package.json')?.content ?? ''
  const packageJsonChanged = packageJsonBefore !== packageJsonAfter && packageJsonAfter !== ''

  // Docker putArchive writes via overlay FS which does NOT fire inotify events.
  // Touch only src/ and public/ files — never config files like vite.config.ts
  // (touching vite.config.ts causes a full Vite server restart which is slow).
  try {
    const installCmd = packageJsonChanged
      ? 'cd /app && npm install --prefer-offline --no-audit --no-fund 2>/dev/null; '
      : ''
    const exec = await container.exec({
      Cmd: ['sh', '-c', `${installCmd}find /app/src /app/public -type f 2>/dev/null | xargs touch 2>/dev/null; true`],
      AttachStdout: false,
      AttachStderr: false,
    })
    const stream = await exec.start({ hijack: false, stdin: false })
    stream.resume()
    if (packageJsonChanged) {
      pushLog(instance, '📦 Installing new packages…')
    }
  } catch {
    // Non-fatal — preview will still show updated files on next iframe reload
  }

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

  // A browser tab opened the preview — treat as activity and cancel idle teardown.
  touchActivity(instance)
  instance.subscribers.add(callback)

  return () => {
    instance.subscribers.delete(callback)
    // Last subscriber disconnected (browser tab closed / navigated away).
    // Start the 10-minute idle countdown — the container will be stopped if nobody
    // reconnects within that window.
    if (instance.subscribers.size === 0) {
      scheduleIdleCleanup(instance)
    }
  }
}

// Clean up on process exit
process.on('SIGTERM', async () => {
  await Promise.allSettled([...instances.keys()].map(stop))
})
