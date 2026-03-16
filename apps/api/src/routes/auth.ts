import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { users, workspaces, workspaceMembers } from '../db/schema.js'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { sendOtpEmail } from '../services/email.js'

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

/** Verify a Cloudflare Turnstile captcha token. Returns true if valid. */
async function verifyCaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY ?? '1x0000000000000000000000000000000AA'
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    })
    const data = await res.json() as { success: boolean }
    return data.success === true
  } catch {
    return false
  }
}

/** Generate a 6-digit OTP code */
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Create or update user by OAuth provider. Returns the DB user and whether it was just created. */
async function upsertOAuthUser(db: any, opts: {
  provider: string
  providerId: string
  email: string
  name: string
  avatarUrl?: string
}) {
  const { provider, providerId, email, name, avatarUrl } = opts
  let isNew = false

  let user = await db.query.users.findFirst({
    where: (u: any, { and, eq }: any) => and(eq(u.authProvider, provider), eq(u.authProviderId, providerId)),
  })

  if (!user) {
    user = await db.query.users.findFirst({ where: (u: any, { eq }: any) => eq(u.email, email) })
    if (user) {
      const [updated] = await db.update(users)
        .set({ authProvider: provider, authProviderId: providerId, avatarUrl: avatarUrl ?? user.avatarUrl, emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning()
      return { user: updated, isNew: false }
    }
  }

  if (!user) {
    isNew = true
    const slug = await uniqueSlug(db, slugify(name || email.split('@')[0]))
    const [newUser] = await db.insert(users)
      .values({ email, name: name || email.split('@')[0], avatarUrl, authProvider: provider, authProviderId: providerId, plan: 'free', emailVerified: true })
      .returning()
    user = newUser

    const [workspace] = await db.insert(workspaces)
      .values({ name: `${user.name}'s Workspace`, slug, ownerId: user.id, plan: 'free' })
      .returning()
    await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: 'owner' })
  }

  return { user, isNew }
}

/** Sign a state JWT for OAuth flows (5 min expiry) */
async function signState(next: string, captchaVerified = false): Promise<string> {
  return new SignJWT({ next, captchaVerified })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('forge-oauth-state')
    .setExpirationTime('5m')
    .sign(secret())
}

/** Verify state JWT and return payload */
async function verifyState(state: string): Promise<{ next: string; captchaVerified: boolean }> {
  const { payload } = await jwtVerify(state, secret(), { issuer: 'forge-oauth-state' })
  return { next: (payload.next as string) ?? '/dashboard', captchaVerified: !!payload.captchaVerified }
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

const APP_URL = process.env.APP_URL ?? 'http://localhost'

// ── Routes ────────────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {

  // ── GitHub OAuth ────────────────────────────────────────────────────────────

  app.get('/github/authorize', async (request, reply) => {
    const { next = '/dashboard', captchaToken } = request.query as { next?: string; captchaToken?: string }
    let captchaVerified = false
    if (captchaToken) {
      captchaVerified = await verifyCaptcha(captchaToken)
    }
    const state = await signState(next, captchaVerified)
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
    try { ({ next } = await verifyState(state)) } catch { return reply.redirect(`${APP_URL}/login?error=invalid_state`) }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_LOGIN_CLIENT_ID, client_secret: process.env.GITHUB_LOGIN_CLIENT_SECRET, code }),
    })
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
    if (!tokenData.access_token) return reply.redirect(`${APP_URL}/login?error=github_token_failed`)

    const [profileRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers: { Authorization: `token ${tokenData.access_token}`, 'User-Agent': 'Forge-AI' } }),
      fetch('https://api.github.com/user/emails', { headers: { Authorization: `token ${tokenData.access_token}`, 'User-Agent': 'Forge-AI' } }),
    ])
    const profile = await profileRes.json() as { id: number; login: string; name?: string; email?: string; avatar_url?: string }
    const emails = await emailsRes.json() as { email: string; primary: boolean; verified: boolean }[]
    const primaryEmail = emails.find(e => e.primary && e.verified)?.email ?? profile.email ?? ''
    if (!primaryEmail) return reply.redirect(`${APP_URL}/login?error=no_email`)

    const { user, isNew } = await upsertOAuthUser(app.db, {
      provider: 'github', providerId: String(profile.id),
      email: primaryEmail, name: profile.name ?? profile.login, avatarUrl: profile.avatar_url,
    })

    const token = await (app as any).signToken({ id: user.id, email: user.email, name: user.name, plan: user.plan, roles: [] })
    reply.setCookie('forge_token', token, COOKIE_OPTS)

    // OAuth users are verified by the provider — redirect straight to destination
    return reply.redirect(`${APP_URL}${next}`)
  })

  // ── Google OAuth ────────────────────────────────────────────────────────────

  app.get('/google/authorize', async (request, reply) => {
    const { next = '/dashboard', captchaToken } = request.query as { next?: string; captchaToken?: string }
    let captchaVerified = false
    if (captchaToken) {
      captchaVerified = await verifyCaptcha(captchaToken)
    }
    const state = await signState(next, captchaVerified)
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
    try { ({ next } = await verifyState(state)) } catch { return reply.redirect(`${APP_URL}/login?error=invalid_state`) }

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

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await userRes.json() as { sub: string; email: string; name: string; picture?: string }
    if (!profile.email) return reply.redirect(`${APP_URL}/login?error=no_email`)

    const { user, isNew } = await upsertOAuthUser(app.db, {
      provider: 'google', providerId: profile.sub,
      email: profile.email, name: profile.name, avatarUrl: profile.picture,
    })

    const token = await (app as any).signToken({ id: user.id, email: user.email, name: user.name, plan: user.plan, roles: [] })
    reply.setCookie('forge_token', token, COOKIE_OPTS)

    // OAuth users are verified by Google — redirect straight to destination
    return reply.redirect(`${APP_URL}${next}`)
  })

  // ── Email / Password ────────────────────────────────────────────────────────

  app.post('/email/signup', {
    schema: { tags: ['auth'], body: { type: 'object', required: ['email', 'password', 'name'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, name: { type: 'string', minLength: 1 }, captchaToken: { type: 'string' } } } },
  }, async (request, reply) => {
    const { email, password, name, captchaToken } = request.body as { email: string; password: string; name: string; captchaToken?: string }

    // Captcha required for email signup
    if (!captchaToken) {
      return reply.code(400).send({ success: false, error: { code: 'CAPTCHA_REQUIRED', message: 'Captcha verification is required' } })
    }
    const captchaOk = await verifyCaptcha(captchaToken)
    if (!captchaOk) {
      return reply.code(400).send({ success: false, error: { code: 'CAPTCHA_FAILED', message: 'Captcha verification failed. Please try again.' } })
    }

    const existing = await app.db.query.users.findFirst({ where: (u: any, { eq }: any) => eq(u.email, email) })
    if (existing) return reply.code(409).send({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } })

    const passwordHash = await bcrypt.hash(password, 12)
    const slug = await uniqueSlug(app.db, slugify(name || email.split('@')[0]))

    const [user] = await app.db.insert(users).values({ email, name, passwordHash, authProvider: 'email', plan: 'free', emailVerified: false }).returning()

    const [workspace] = await app.db.insert(workspaces).values({ name: `${user.name}'s Workspace`, slug, ownerId: user.id, plan: 'free' }).returning()
    await app.db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: 'owner' })

    // Issue JWT and send OTP — user must verify email before using the app
    const token = await (app as any).signToken({ id: user.id, email: user.email, name: user.name, plan: user.plan, roles: [] })
    await sendOtpToUser(app, user)
    return reply.setCookie('forge_token', token, COOKIE_OPTS).send({
      success: true,
      data: { user: { id: user.id, email: user.email, name: user.name, plan: user.plan }, requiresVerification: true },
    })
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
    reply.setCookie('forge_token', token, COOKIE_OPTS)

    // If returning unverified user, send them to verify
    if (!user.emailVerified) {
      await sendOtpToUser(app, user)
      return reply.send({ success: true, data: { user: { id: user.id, email: user.email, name: user.name, plan: user.plan }, requiresVerification: true } })
    }
    return reply.send({ success: true, data: { user: { id: user.id, email: user.email, name: user.name, plan: user.plan } } })
  })

  // ── OTP send / verify ───────────────────────────────────────────────────────

  app.post('/otp/send', { schema: { tags: ['auth'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return

    const user = await app.db.query.users.findFirst({ where: (u: any, { eq }: any) => eq(u.id, request.user!.id) })
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } })
    if (user.emailVerified) return reply.send({ success: true, data: { message: 'Email already verified' } })

    await sendOtpToUser(app, user)
    return reply.send({ success: true, data: { message: 'Verification code sent' } })
  })

  app.post('/otp/verify', {
    schema: { tags: ['auth'], security: [{ bearerAuth: [] }], body: { type: 'object', required: ['code'], properties: { code: { type: 'string', minLength: 6, maxLength: 6 } } } },
  }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return

    const { code } = request.body as { code: string }
    const userId = request.user.id
    const stored = await (app as any).redis.get(`otp:${userId}`)

    if (!stored || stored !== code) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_OTP', message: 'Invalid or expired verification code' } })
    }

    await app.db.update(users).set({ emailVerified: true, updatedAt: new Date() }).where(eq(users.id, userId))
    await (app as any).redis.del(`otp:${userId}`)

    return reply.send({ success: true, data: { message: 'Email verified successfully' } })
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

  app.post('/sync', { schema: { tags: ['auth'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    await (app as any).verifyAuth(request, reply)
    if (!request.user) return
    return reply.send({ success: true, data: { user: request.user, isNew: false } })
  })
}

// ── Shared helper ─────────────────────────────────────────────────────────────

async function sendOtpToUser(app: FastifyInstance, user: { id: string; email: string; name: string }) {
  const key = `otp:${user.id}`
  // Respect cooldown: don't resend if OTP was sent within the last 60 seconds (TTL > 9*60)
  const ttl = await (app as any).redis.ttl(key)
  if (ttl > 9 * 60) return  // OTP was sent very recently, skip

  const code = generateOtp()
  await (app as any).redis.set(key, code, 'EX', 10 * 60)  // 10-minute TTL
  await sendOtpEmail(user.email, user.name, code)
}

