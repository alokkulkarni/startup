import Fastify from 'fastify'
import cors from '@fastify/cors'
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
await app.register(authPlugin)

// ── Routes ────────────────────────────────────────────────────────────────────
await app.register(healthRoutes, { prefix: '/api/v1' })
await app.register(authRoutes, { prefix: '/api/v1/auth' })
await app.register(userRoutes, { prefix: '/api/v1/users' })
await app.register(workspaceRoutes, { prefix: '/api/v1/workspaces' })
await app.register(uploadRoutes, { prefix: '/api/v1/upload' })

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
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
