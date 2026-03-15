import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      tags: ['system'],
      summary: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            version: { type: 'string' },
            timestamp: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
                storage: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const services = {
      database: 'ok' as const,
      redis: 'ok' as const,
      storage: 'ok' as const,
    }

    // Check database
    try {
      await app.pg`SELECT 1`
    } catch {
      services.database = 'down' as any
    }

    // Check Redis
    try {
      await app.redis.ping()
    } catch {
      services.redis = 'down' as any
    }

    const allOk = Object.values(services).every(s => s === 'ok')

    return reply.code(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '0.0.1',
      timestamp: new Date().toISOString(),
      services,
    })
  })
}
