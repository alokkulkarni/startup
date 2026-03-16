import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from './schema.js'
import { TEMPLATE_SEEDS } from './templateSeeds.js'

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

// ── Admin / platform-owner plan overrides ─────────────────────────────────────
// Set plan tiers for admin emails listed in ADMIN_EMAILS env var.
// This runs on every seed so the owner always has enterprise access.
const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

for (const email of adminEmails) {
  const adminUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  })
  if (adminUser) {
    // Upgrade user record
    await db
      .update(schema.users)
      .set({ plan: 'enterprise', updatedAt: new Date() })
      .where(eq(schema.users.id, adminUser.id))

    // Find their workspaces and upgrade subscriptions
    const memberships = await db.query.workspaceMembers.findMany({
      where: (m, { eq }) => eq(m.userId, adminUser.id),
    })
    for (const m of memberships) {
      await db
        .update(schema.workspaces)
        .set({ plan: 'enterprise', updatedAt: new Date() })
        .where(eq(schema.workspaces.id, m.workspaceId))

      await (db as any)
        .insert(schema.subscriptions)
        .values({
          workspaceId: m.workspaceId,
          plan: 'enterprise',
          planTier: 'enterprise',
          status: 'active',
        })
        .onConflictDoUpdate({
          target: schema.subscriptions.workspaceId,
          set: { plan: 'enterprise', planTier: 'enterprise', status: 'active' },
        })
    }
    console.log(`✅ Admin ${email} → enterprise tier`)
  } else {
    console.log(`⚠ Admin ${email} not found in DB (they need to sign up first)`)
  }
}

// Seed templates
console.log('Seeding templates...')
for (const tmpl of TEMPLATE_SEEDS) {
  await db.insert(schema.templates).values(tmpl).onConflictDoUpdate({
    target: schema.templates.slug,
    set: {
      name: tmpl.name,
      description: tmpl.description,
      category: tmpl.category,
      framework: tmpl.framework,
      filesJson: tmpl.filesJson,
      isOfficial: tmpl.isOfficial,
      isPublic: tmpl.isPublic,
      updatedAt: new Date(),
    },
  })
}
console.log(`Seeded ${TEMPLATE_SEEDS.length} templates.`)

console.log('Seed complete')
await pg.end()

