import { drizzle as drizzleMigrate } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { postgresPlugin } from './plugins/postgres.js'
import { redisPlugin } from './plugins/redis.js'
import { storagePlugin } from './plugins/storage.js'
import { authPlugin } from './plugins/auth.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { workspaceRoutes } from './routes/workspaces.js'
import { uploadRoutes } from './routes/upload.js'
import { projectRoutes } from './routes/projects.js'
import { aiRoutes } from './routes/ai.js'
import { previewRoutes } from './routes/preview.js'
import * as previewManager from './services/previewManager.js'
import { fileRoutes } from './routes/files.js'
import { snapshotRoutes } from './routes/snapshots.js'
import { deploymentRoutes } from './routes/deployments.js'
import { githubRoutes } from './routes/github.js'
import { templateRoutes } from './routes/templates.js'
import { billingRoutes } from './routes/billing.js'
import { adminRoutes } from './routes/admin.js'
import websocket from '@fastify/websocket'
import { collaborationRoutes } from './routes/collaboration.js'
import { presenceRoutes } from './routes/presence.js'
import { collabRoutes } from './routes/collab.js'
import { analyticsRoutes } from './routes/analytics.js'
import { startSnapshotCleanupWorker } from './workers/snapshotCleanup.js'
import { startDeployWorker } from './workers/deployWorker.js'

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

// ── Security ─────────────────────────────────────────────────────────────────
await app.register(helmet, {
  contentSecurityPolicy: false, // Handled by Traefik
})

await app.register(cors, {
  origin: process.env.APP_URL ?? 'http://localhost',
  credentials: true,
})

await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } })

// ── Rate limiting ─────────────────────────────────────────────────────────────
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  redis: undefined, // Will be set after redis plugin registers
})

// ── API docs ─────────────────────────────────────────────────────────────────
await app.register(swagger, {
  openapi: {
    info: { title: 'Forge AI API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
})
await app.register(swaggerUi, { routePrefix: '/api/docs' })

// ── Plugins ───────────────────────────────────────────────────────────────────
await app.register(postgresPlugin)
await app.register(redisPlugin)
await app.register(storagePlugin)
await app.register(cookie, { secret: process.env.JWT_SECRET ?? 'forge-dev-secret' })
await app.register(authPlugin)
await app.register(websocket)

// ── Routes ────────────────────────────────────────────────────────────────────
await app.register(healthRoutes, { prefix: '/api/v1' })
await app.register(authRoutes, { prefix: '/api/v1/auth' })
await app.register(userRoutes, { prefix: '/api/v1/users' })
await app.register(workspaceRoutes, { prefix: '/api/v1/workspaces' })
await app.register(uploadRoutes, { prefix: '/api/v1/upload' })
await app.register(projectRoutes, { prefix: '/api/v1/projects' })
await app.register(aiRoutes, { prefix: '/api/v1/projects' })
await app.register(previewRoutes, { prefix: '/api/v1/projects' })
await app.register(fileRoutes, { prefix: '/api/v1/projects' })
await app.register(snapshotRoutes, { prefix: '/api/v1/projects' })
await app.register(deploymentRoutes, { prefix: '/api/v1/projects' })
await app.register(githubRoutes, { prefix: '/api/v1' })
await app.register(templateRoutes, { prefix: '/api/v1' })
await app.register(billingRoutes, { prefix: '/api/v1' })
await app.register(adminRoutes, { prefix: '/api/v1' })
await app.register(collaborationRoutes, { prefix: '/api/v1' })
await app.register(presenceRoutes, { prefix: '/api/v1' })
await app.register(collabRoutes, { prefix: '/api/v1' })
await app.register(analyticsRoutes, { prefix: '/api/v1' })

startSnapshotCleanupWorker(process.env.REDIS_URL ?? 'redis://localhost:6379', app)
startDeployWorker(process.env.REDIS_URL ?? 'redis://localhost:6379', app)
previewManager.initialize()

// ── Auto-migrate on startup ───────────────────────────────────────────────────
// Runs every time the server starts; Drizzle tracks which migrations have
// already been applied via the __drizzle_migrations table, so this is safe
// to run on every restart (idempotent).
async function runMigrationsOnStartup(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('[migrate] DATABASE_URL not set — skipping migrations')
    return
  }
  const pg = postgres(connectionString, { max: 1 })
  try {
    const db = drizzleMigrate(pg)
    // Resolve the drizzle folder from cwd (container workdir is /app/apps/api)
    // Fallback chain: process.cwd()/drizzle → __dirname/../drizzle
    const candidates = [
      join(process.cwd(), 'drizzle'),
      join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle'),
      join(dirname(fileURLToPath(import.meta.url)), '../../', 'drizzle'),
    ]
    const { existsSync } = await import('fs')
    const migrationsFolder = candidates.find(p => existsSync(p)) ?? candidates[0]
    console.log(`[migrate] Running migrations from ${migrationsFolder}`)
    await migrate(db, { migrationsFolder })
    console.log('[migrate] All migrations applied successfully')
  } catch (err) {
    console.error('[migrate] Migration failed:', err)
    process.exit(1)  // Hard fail — do NOT start with an incomplete schema
  } finally {
    await pg.end()
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  await runMigrationsOnStartup()
  try {
    const port = Number(process.env.PORT ?? 3001)
    await app.listen({ port, host: '0.0.0.0' })
    app.log.info(`Server listening on http://0.0.0.0:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

export default app
