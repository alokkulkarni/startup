import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { users, workspaces, workspaceMembers } from '../db/schema.js'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

async function uniqueSlug(db: any, base: string): Promise<string> {
  let slug = base
  let attempt = 0
  while (true) {
    const existing = await db.query.workspaces.findFirst({
      where: (w: any, { eq }: any) => eq(w.slug, slug),
    })
    if (!existing) return slug
    attempt++
    slug = `${base}-${attempt}`
  }
}

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/sync — Called after OIDC login to sync user to DB
  app.post('/sync', {
    schema: {
      tags: ['auth'],
      summary: 'Sync Keycloak user to database (idempotent)',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return

    const { keycloakId, email, name } = request.user

    // Check for existing user
    let user = await app.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.keycloakId, keycloakId),
    })

    let isNew = false

    if (!user) {
      isNew = true
      const slug = await uniqueSlug(app.db, slugify(name || email.split('@')[0]))

      const [newUser] = await app.db
        .insert(users)
        .values({ keycloakId, email, name: name || email.split('@')[0], plan: 'free' })
        .returning()

      user = newUser

      // Create default personal workspace
      const [workspace] = await app.db
        .insert(workspaces)
        .values({ name: `${user.name}'s Workspace`, slug, ownerId: user.id, plan: 'free' })
        .returning()

      // Add as owner
      await app.db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
      })

      app.log.info({ userId: user.id, email }, 'New user created with workspace')
    }

    return reply.send({
      success: true,
      data: { user, isNew },
    })
  })

  // GET /api/v1/auth/me — quick token info (no DB hit)
  app.get('/me', {
    schema: {
      tags: ['auth'],
      summary: 'Get JWT claims (no DB)',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return

    return reply.send({ success: true, data: request.user })
  })
}
