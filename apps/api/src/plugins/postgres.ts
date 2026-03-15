import fp from 'fastify-plugin'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle<typeof schema>>
    pg: ReturnType<typeof postgres>
  }
}

export const postgresPlugin = fp(async app => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')

  const pg = postgres(connectionString, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: msg => app.log.debug({ msg }, 'Postgres notice'),
  })

  const db = drizzle(pg, { schema })

  app.decorate('pg', pg)
  app.decorate('db', db)

  app.addHook('onClose', async () => {
    await pg.end()
  })

  app.log.info('PostgreSQL connected')
})
