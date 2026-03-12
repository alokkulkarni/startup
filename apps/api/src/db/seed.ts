import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL required')

const pg = postgres(connectionString, { max: 1 })
const db = drizzle(pg, { schema })

console.log('Seeding database...')

// Seed test user
await db.insert(schema.users).values({
  keycloakId: 'test-keycloak-id-001',
  email: 'test@forge.local',
  name: 'Test User',
  plan: 'pro',
}).onConflictDoNothing()

// Seed test workspace
const user = await db.query.users.findFirst({
  where: (u, { eq }) => eq(u.email, 'test@forge.local'),
})

if (user) {
  await db.insert(schema.workspaces).values({
    name: "Test User's Workspace",
    slug: 'test-workspace',
    ownerId: user.id,
    plan: 'pro',
  }).onConflictDoNothing()
}

console.log('Seed complete')
await pg.end()
