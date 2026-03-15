import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { users, workspaces, workspaceMembers } from '../db/schema.js'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

// ── Helpers ───────────────────────────────────────────────────────────────────

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? 'forge-dev-secret-change-in-production')

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

async function uniqueSlug(db: any, base: string): Promise<string> {
  let slug = base, attempt = 0
  while (true) {
    const existing = await db.query.workspaces.findFirst({ where: (w: any, { eq }: any) => eq(w.slug, slug) })
    if (!existing) return slug
    slug = `${base}-${++attempt}`
  }
}

/** Create or update user by OAuth provider. Returns the DB user. */
async function upsertOAuthUser(db: any, opts: {
  provider: string
  providerId: string
  email: string
  name: string
  avatarUrl?: string
}) {
  const { provider, providerId, email, name, avatarUrl } = opts

  // Try to find by provider+providerId first
  let user = await db.query.users.findFirst({
    where: (u: any, { and, eq }: any) => and(eq(u.authProvider, provider), eq(u.authProviderId, providerId)),
  })

  if (!user) {
    // Check if email already exists (link providers)
    user = await db.query.users.findFirst({ where: (u: any, { eq }: any) => eq(u.email, email) })
    if (user) {
      // Link this provider to existing account
      const [updated] = await db.update(users)
        .set({ authProvider: provider, authProviderId: providerId, avatarUrl: avatarUrl ?? user.avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning()
      return updated
    }
  }

  if (!user) {
    // Create new user
    const slug = await uniqueSlug(db, slugify(name || email.split('@')[0]))
    const [newUser] = await db.insert(users)
      .values({ email, name: name || email.split('@')[0], avatarUrl, authProvider: provider, authProviderId: providerId, plan: 'free' })
      .returning()
    user = newUser

    // Create default workspace
    const [workspace] = await db.insert(workspaces)
      .values({ name: `${user.name}'s Workspace`, slug, ownerId: user.id, plan: 'free' })
      .returning()
    await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: 'owner' })
  }

  return user
}

/** Sign a state JWT for OAuth flows (5 min expiry) */
async function signState(next: string): Promise<string> {
  return new SignJWT({ next })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('forge-oauth-state')
    .setExpirationTime('5m')
    .sign(secret())
}

/** Verify state JWT and return next URL */
async function verifyState(state: string): Promise<string> {
  const { payload } = await jwtVerify(state, secret(), { issuer: 'forge-oauth-state' })
  return (payload.next as string) ?? '/dashboard'
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

const APP_URL = process.env.APP_URL ?? 'http://localhost'

// ── Routes ────────────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {

  // ── GitHub OAuth ────────────────────────────────────────────────────────────

  app.get('/github/authorize', async (request, reply) => {
    const next = (request.query as any).next ?? '/dashboard'
    const state = await signState(next)
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_LOGIN_CLIENT_ID ?? '',
      redirect_uri: `${APP_URL}/api/v1/auth/github/callback`,
      scope: 'user:email',
      state,
    })
    return reply.redirect(`https://github.com/login/oauth/authorize?${params}`)
  })

  app.get('/github/callback', async (request, reply) => {
    const { code, state } = request.query as { code: string; state: string }
    let next = '/dashboard'
    try { next = await verifyState(state) } catch { return reply.redirect(`${APP_URL}/login?error=invalid_state`) }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_LOGIN_CLIENT_ID, client_secret: process.env.GITHUB_LOGIN_CLIENT_SECRET, code }),
    })
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
    if (!tokenData.access_token) return reply.redirect(`${APP_URL}/login?error=github_token_failed`)

    // Fetch GitHub user
    const [profileRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers: { Authorization: `token ${tokenData.access_token}`, 'User-Agent': 'Forge-AI' } }),
      fetch('https://api.github.com/user/emails', { headers: { Authorization: `token ${tokenData.access_token}`, 'User-Agent': 'Forge-AI' } }),
    ])
    const profile = await profileRes.json() as { id: number; login: string; name?: string; email?: string; avatar_url?: string }
    const emails = await emailsRes.json() as { email: string; primary: boolean; verified: boolean }[]
    const primaryEmail = emails.find(e => e.primary && e.verified)?.email ?? profile.email ?? ''
    if (!primaryEmail) return reply.redirect(`${APP_URL}/login?error=no_email`)

    const user = await upsertOAuthUser(app.db, {
      provider: 'github', providerId: String(profile.id),
      email: primaryEmail, name: profile.name ?? profile.login, avatarUrl: profile.avatar_url,
    })

    const token = await (app as any).signToken({ id: user.id, email: user.email, name: user.name, plan: user.plan, roles: [] })
    return reply.setCookie('forge_token', token, COOKIE_OPTS).redirect(`${APP_URL}${next}`)
  })

  // ── Google OAuth ────────────────────────────────────────────────────────────

  app.get('/google/authorize', async (request, reply) => {
    const next = (request.query as any).next ?? '/dashboard'
    const state = await signState(next)
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: `${APP_URL}/api/v1/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
    })
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  app.get('/google/callback', async (request, reply) => {
    const { code, state } = request.query as { code: string; state: string }
    let next = '/dashboard'
    try { next = await verifyState(state) } catch { return reply.redirect(`${APP_URL}/login?error=invalid_state`) }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: `${APP_URL}/api/v1/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json() as { access_token?: string; id_token?: string; error?: string }
    if (!tokenData.access_token) return reply.redirect(`${APP_URL}/login?error=google_token_failed`)

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await userRes.json() as { sub: string; email: string; name: string; picture?: string }
    if (!profile.email) return reply.redirect(`${APP_URL}/login?error=no_email`)

    const user = await upsertOAuthUser(app.db, {
      provider: 'google', providerId: profile.sub,
      email: profile.email, name: profile.name, avatarUrl: profile.picture,
    })

    const token = await (app as any).signToken({ id: user.id, email: user.email, name: user.name, plan: user.plan, roles: [] })
    return reply.setCookie('forge_token', token, COOKIE_OPTS).redirect(`${APP_URL}${next}`)
  })

  // ── Email / Password ────────────────────────────────────────────────────────

  app.post('/email/signup', {
    schema: { tags: ['auth'], body: { type: 'object', required: ['email', 'password', 'name'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, name: { type: 'string', minLength: 1 } } } },
  }, async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name: string }

    const existing = await app.db.query.users.findFirst({ where: (u: any, { eq }: any) => eq(u.email, email) })
    if (existing) return reply.code(409).send({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } })

    const passwordHash = await bcrypt.hash(password, 12)
    const slug = await uniqueSlug(app.db, slugify(name || email.split('@')[0]))

    const [user] = await app.db.insert(users).values({ email, name, passwordHash, authProvider: 'email', plan: 'free' }).returning()

    const [workspace] = await app.db.insert(workspaces).values({ name: `${user.name}'s Workspace`, slug, ownerId: user.id, plan: 'free' }).returning()
    await app.db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: 'owner' })

    const token = await (app as any).signToken({ id: user.id, email: user.email, name: user.name, plan: user.plan, roles: [] })
    return reply.setCookie('forge_token', token, COOKIE_OPTS).send({ success: true, data: { user: { id: user.id, email: user.email, name: user.name, plan: user.plan } } })
  })

  app.post('/email/login', {
    schema: { tags: ['auth'], body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    const user = await app.db.query.users.findFirst({ where: (u: any, { eq }: any) => eq(u.email, email) })
    if (!user || !user.passwordHash) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })

    const token = await (app as any).signToken({ id: user.id, email: user.email, name: user.name, plan: user.plan, roles: [] })
    return reply.setCookie('forge_token', token, COOKIE_OPTS).send({ success: true, data: { user: { id: user.id, email: user.email, name: user.name, plan: user.plan } } })
  })

  // ── Logout ──────────────────────────────────────────────────────────────────

  app.post('/logout', async (_request, reply) => {
    return reply.clearCookie('forge_token', { path: '/' }).send({ success: true })
  })

  // ── Session / Me ────────────────────────────────────────────────────────────

  app.get('/me', { schema: { tags: ['auth'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return
    return reply.send({ success: true, data: request.user })
  })

  // ── Legacy sync (backward compat - now a no-op that returns user info) ──────
  app.post('/sync', { schema: { tags: ['auth'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return
    return reply.send({ success: true, data: { user: request.user, isNew: false } })
  })
}
