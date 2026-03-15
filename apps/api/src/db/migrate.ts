import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL required')

const pg = postgres(connectionString, { max: 1 })
const db = drizzle(pg)

// Resolve drizzle folder robustly — works from host (pnpm db:migrate) and inside Docker
const __dirname = dirname(fileURLToPath(import.meta.url))
const candidates = [
  join(process.cwd(), 'drizzle'),
  join(__dirname, '..', '..', 'drizzle'),
  join(__dirname, '..', 'drizzle'),
]
const migrationsFolder = candidates.find(p => existsSync(p)) ?? candidates[0]

console.log(`[migrate] Running migrations from ${migrationsFolder}`)
await migrate(db, { migrationsFolder })
console.log('[migrate] Migrations complete')
await pg.end()
