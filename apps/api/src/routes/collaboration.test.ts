import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify from 'fastify'
import { collaborationRoutes } from './collaboration.js'

// ── Mock DB factory ───────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      workspaceMembers: { findFirst: vi.fn() },
      workspaceInvitations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      users: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  }
}

function makeMockRedis() {
  return {
    setex: vi.fn().mockResolvedValue('OK'),
    sadd: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    publish: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  }
}

// ── App builder ───────────────────────────────────────────────────────────────

function buildApp(userOverride?: { id: string; email: string; workspaceId: string }) {
  const app = Fastify({ logger: false })
  const mockDb = makeMockDb()
  const mockRedis = makeMockRedis()

  app.decorate('db', mockDb)
  app.decorate('redis', mockRedis)
  app.decorate('verifyAuth', async (req: any) => {
    req.user = userOverride ?? {
      id: 'user-1',
      keycloakId: 'kc-1',
      email: 'owner@test.com',
      workspaceId: 'ws-1',
    }
  })

  app.register(collaborationRoutes, { prefix: '/api/v1' })

  return { app, mockDb, mockRedis }
}

// Helper: owner membership mock
const ownerMembership = { id: 'mem-1', role: 'owner', workspaceId: 'ws-1', userId: 'user-1' }
const editorMembership = { id: 'mem-2', role: 'editor', workspaceId: 'ws-1', userId: 'user-2' }
const viewerMembership = { id: 'mem-3', role: 'viewer', workspaceId: 'ws-1', userId: 'user-3' }

// ── Members tests ─────────────────────────────────────────────────────────────

describe('GET /api/v1/workspaces/:workspaceId/members', () => {
  it('returns members list for workspace member', async () => {
    const { app, mockDb } = buildApp()

    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    const mockMembers = [
      { id: 'mem-1', userId: 'user-1', role: 'owner', joinedAt: new Date(), name: 'Owner', email: 'owner@test.com', avatarUrl: null },
    ]
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockMembers),
        }),
      }),
    })

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/members' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('members')
    expect(body.members).toHaveLength(1)
    expect(body.members[0].email).toBe('owner@test.com')
  })

  it('returns 403 if not a workspace member', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/members' })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Not a workspace member')
  })

  it('returns multiple members', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    const mockMembers = [
      { id: 'mem-1', userId: 'user-1', role: 'owner', joinedAt: new Date(), name: 'Owner', email: 'owner@test.com', avatarUrl: null },
      { id: 'mem-2', userId: 'user-2', role: 'editor', joinedAt: new Date(), name: 'Editor', email: 'editor@test.com', avatarUrl: null },
    ]
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockMembers),
        }),
      }),
    })

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/members' })
    expect(res.statusCode).toBe(200)
    expect(res.json().members).toHaveLength(2)
  })

  it('viewer can also list members', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(viewerMembership)
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/members' })
    expect(res.statusCode).toBe(200)
  })
})

// ── PATCH member role tests ───────────────────────────────────────────────────

describe('PATCH /api/v1/workspaces/:workspaceId/members/:userId', () => {
  it('owner can change member role to editor', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    const updatedMember = { id: 'mem-2', userId: 'user-2', role: 'editor', workspaceId: 'ws-1' }
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedMember]),
        }),
      }),
    })

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/workspaces/ws-1/members/user-2',
      payload: { role: 'editor' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().member.role).toBe('editor')
  })

  it('owner can change member role to viewer', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    const updatedMember = { id: 'mem-2', userId: 'user-2', role: 'viewer', workspaceId: 'ws-1' }
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedMember]),
        }),
      }),
    })

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/workspaces/ws-1/members/user-2',
      payload: { role: 'viewer' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 400 for invalid role', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/workspaces/ws-1/members/user-2',
      payload: { role: 'superadmin' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Role must be editor or viewer')
  })

  it('returns 403 if actor is not owner', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(editorMembership)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/workspaces/ws-1/members/user-3',
      payload: { role: 'viewer' },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Only owners can change roles')
  })

  it('returns 400 when trying to change own role', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/workspaces/ws-1/members/user-1',
      payload: { role: 'viewer' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Cannot change your own role')
  })

  it('returns 404 when target member not found', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/workspaces/ws-1/members/nonexistent-user',
      payload: { role: 'viewer' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 if not a workspace member at all', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/workspaces/ws-1/members/user-2',
      payload: { role: 'editor' },
    })
    expect(res.statusCode).toBe(403)
  })
})

// ── DELETE member tests ───────────────────────────────────────────────────────

describe('DELETE /api/v1/workspaces/:workspaceId/members/:userId', () => {
  it('owner can remove a member', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([editorMembership]),
      }),
    })

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/members/user-2',
    })
    expect(res.statusCode).toBe(204)
  })

  it('returns 403 if actor is not owner', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(editorMembership)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/members/user-3',
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Only owners can remove members')
  })

  it('returns 400 when owner tries to remove self', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/members/user-1',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Cannot remove yourself from workspace')
  })

  it('returns 404 when target member not found', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    })

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/members/nonexistent',
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 if not a workspace member at all', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/members/user-2',
    })
    expect(res.statusCode).toBe(403)
  })
})

// ── GET invitations tests ─────────────────────────────────────────────────────

describe('GET /api/v1/workspaces/:workspaceId/invitations', () => {
  it('owner can list pending invitations', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    const mockInvitations = [
      { id: 'inv-1', workspaceId: 'ws-1', email: 'invite@test.com', role: 'viewer', status: 'pending', expiresAt: new Date() },
    ]
    mockDb.query.workspaceInvitations.findMany.mockResolvedValue(mockInvitations)

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/invitations' })
    expect(res.statusCode).toBe(200)
    expect(res.json().invitations).toHaveLength(1)
    expect(res.json().invitations[0].email).toBe('invite@test.com')
  })

  it('editor can list pending invitations', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(editorMembership)
    mockDb.query.workspaceInvitations.findMany.mockResolvedValue([])

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/invitations' })
    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for viewer (below editor threshold)', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(viewerMembership)

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/invitations' })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Requires editor role or higher')
  })

  it('returns 403 if not a workspace member', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/invitations' })
    expect(res.statusCode).toBe(403)
  })

  it('returns empty list when no pending invitations', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockDb.query.workspaceInvitations.findMany.mockResolvedValue([])

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/invitations' })
    expect(res.statusCode).toBe(200)
    expect(res.json().invitations).toHaveLength(0)
  })
})

// ── POST invitation tests ─────────────────────────────────────────────────────

describe('POST /api/v1/workspaces/:workspaceId/invitations', () => {
  function setupOwnerInviteDb(mockDb: ReturnType<typeof makeMockDb>, inviteOverride?: any) {
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockDb.query.users.findFirst.mockResolvedValue(null) // user doesn't exist yet
    const mockInvite = inviteOverride ?? {
      id: 'inv-1',
      email: 'invite@test.com',
      role: 'viewer',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockInvite]),
      }),
    })
    return mockInvite
  }

  it('owner can send an invitation', async () => {
    const { app, mockDb } = buildApp()
    setupOwnerInviteDb(mockDb)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'invite@test.com', role: 'viewer' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().invitation.email).toBe('invite@test.com')
  })

  it('defaults role to viewer when not specified', async () => {
    const { app, mockDb } = buildApp()
    setupOwnerInviteDb(mockDb)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'invite@test.com' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('can invite with editor role', async () => {
    const { app, mockDb } = buildApp()
    const invite = { id: 'inv-2', email: 'editor@test.com', role: 'editor', expiresAt: new Date(Date.now() + 86400000) }
    setupOwnerInviteDb(mockDb, invite)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'editor@test.com', role: 'editor' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().invitation.role).toBe('editor')
  })

  it('returns 400 on invalid email (no @)', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'notanemail' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Valid email required')
  })

  it('returns 400 on empty email', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 on invalid role', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'test@test.com', role: 'owner' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Role must be editor or viewer')
  })

  it('returns 403 if actor is not owner', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(editorMembership)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'test@test.com', role: 'viewer' },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Only owners can invite members')
  })

  it('returns 403 if not a workspace member', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'test@test.com' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 409 if user is already a member', async () => {
    const { app, mockDb } = buildApp()
    // First call: actor membership check, second: existing user check
    mockDb.query.workspaceMembers.findFirst
      .mockResolvedValueOnce(ownerMembership)   // actor is owner
      .mockResolvedValueOnce(viewerMembership)   // target is already member
    mockDb.query.users.findFirst.mockResolvedValue({ id: 'user-3', email: 'existing@test.com' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'existing@test.com' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('User is already a member')
  })

  it('expires existing pending invite before creating new one', async () => {
    const { app, mockDb } = buildApp()
    const updateSetMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'old-inv' }]),
      }),
    })
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockDb.query.users.findFirst.mockResolvedValue(null)
    mockDb.update.mockReturnValue({ set: updateSetMock })
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-inv', email: 'reinvite@test.com', role: 'viewer', expiresAt: new Date() }]),
      }),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces/ws-1/invitations',
      payload: { email: 'reinvite@test.com' },
    })
    expect(res.statusCode).toBe(201)
    expect(mockDb.update).toHaveBeenCalled()
    expect(updateSetMock).toHaveBeenCalledWith({ status: 'expired' })
  })
})

// ── DELETE invitation (revoke) tests ──────────────────────────────────────────

describe('DELETE /api/v1/workspaces/:workspaceId/invitations/:invitationId', () => {
  it('owner can revoke an invitation', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'inv-1' }]),
      }),
    })

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/invitations/inv-1',
    })
    expect(res.statusCode).toBe(204)
  })

  it('returns 403 if actor is not owner', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(editorMembership)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/invitations/inv-1',
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Only owners can revoke invitations')
  })

  it('returns 404 when invitation not found', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    })

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/invitations/nonexistent',
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('Invitation not found')
  })

  it('returns 403 if not a workspace member', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/workspaces/ws-1/invitations/inv-1',
    })
    expect(res.statusCode).toBe(403)
  })
})

// ── POST accept invitation tests ──────────────────────────────────────────────

describe('POST /api/v1/invitations/:token/accept', () => {
  const validInvitation = {
    id: 'inv-1',
    workspaceId: 'ws-1',
    email: 'owner@test.com', // matches default user email
    role: 'editor',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // future
  }

  function setupAcceptMocks(mockDb: ReturnType<typeof makeMockDb>, invitation = validInvitation) {
    mockDb.query.workspaceInvitations.findFirst.mockResolvedValue(invitation)
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      }),
    })
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'inv-1', status: 'accepted' }]),
        }),
      }),
    })
  }

  it('user can accept a valid invitation', async () => {
    const { app, mockDb } = buildApp()
    setupAcceptMocks(mockDb)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/valid-token/accept',
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().workspaceId).toBe('ws-1')
    expect(res.json().role).toBe('editor')
  })

  it('returns the correct workspaceId and role on accept', async () => {
    const { app, mockDb } = buildApp()
    setupAcceptMocks(mockDb, { ...validInvitation, role: 'viewer' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/valid-token/accept',
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().role).toBe('viewer')
  })

  it('returns 404 on invalid/unknown token', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceInvitations.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/bad-token/accept',
      payload: {},
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('Invitation not found or already used')
  })

  it('returns 403 when invitation email does not match user email', async () => {
    const { app, mockDb } = buildApp()
    const wrongEmailInvitation = { ...validInvitation, email: 'someone-else@test.com' }
    mockDb.query.workspaceInvitations.findFirst.mockResolvedValue(wrongEmailInvitation)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/valid-token/accept',
      payload: {},
    })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('This invitation was sent to a different email address')
  })

  it('returns 410 when invitation has expired', async () => {
    const { app, mockDb } = buildApp()
    const expiredInvitation = {
      ...validInvitation,
      expiresAt: new Date(Date.now() - 1000), // past
    }
    mockDb.query.workspaceInvitations.findFirst.mockResolvedValue(expiredInvitation)
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'inv-1', status: 'expired' }]),
        }),
      }),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/expired-token/accept',
      payload: {},
    })
    expect(res.statusCode).toBe(410)
    expect(res.json().error).toBe('Invitation has expired')
  })

  it('marks invitation as accepted after successful accept', async () => {
    const { app, mockDb } = buildApp()
    const updateSetMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'inv-1', status: 'accepted' }]),
      }),
    })
    mockDb.query.workspaceInvitations.findFirst.mockResolvedValue(validInvitation)
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      }),
    })
    mockDb.update.mockReturnValue({ set: updateSetMock })

    await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/valid-token/accept',
      payload: {},
    })

    expect(mockDb.update).toHaveBeenCalled()
    expect(updateSetMock).toHaveBeenCalledWith({ status: 'accepted' })
  })

  it('adds user as workspace member on accept', async () => {
    const { app, mockDb } = buildApp()
    const insertValuesMock = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue([]),
    })
    mockDb.query.workspaceInvitations.findFirst.mockResolvedValue(validInvitation)
    mockDb.insert.mockReturnValue({ values: insertValuesMock })
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    await app.inject({
      method: 'POST',
      url: '/api/v1/invitations/valid-token/accept',
      payload: {},
    })

    expect(mockDb.insert).toHaveBeenCalled()
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'ws-1',
      role: 'editor',
    }))
  })
})

// ── GET presence tests ────────────────────────────────────────────────────────

describe('GET /api/v1/workspaces/:workspaceId/presence', () => {
  it('returns empty users list when no one is online', async () => {
    const { app, mockDb, mockRedis } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockRedis.smembers.mockResolvedValue([])

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/presence' })
    expect(res.statusCode).toBe(200)
    expect(res.json().users).toEqual([])
  })

  it('returns list of online users', async () => {
    const { app, mockDb, mockRedis } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockRedis.smembers.mockResolvedValue(['user-1', 'user-2'])
    mockRedis.get
      .mockResolvedValueOnce(JSON.stringify({ userId: 'user-1', email: 'user1@test.com', joinedAt: new Date().toISOString() }))
      .mockResolvedValueOnce(JSON.stringify({ userId: 'user-2', email: 'user2@test.com', joinedAt: new Date().toISOString() }))

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/presence' })
    expect(res.statusCode).toBe(200)
    expect(res.json().users).toHaveLength(2)
  })

  it('returns 403 if not a workspace member', async () => {
    const { app, mockDb } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/presence' })
    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Not a workspace member')
  })

  it('filters out null entries (stale Redis keys)', async () => {
    const { app, mockDb, mockRedis } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(ownerMembership)
    mockRedis.smembers.mockResolvedValue(['user-1', 'user-stale'])
    mockRedis.get
      .mockResolvedValueOnce(JSON.stringify({ userId: 'user-1', email: 'user1@test.com', joinedAt: new Date().toISOString() }))
      .mockResolvedValueOnce(null) // stale

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/presence' })
    expect(res.statusCode).toBe(200)
    expect(res.json().users).toHaveLength(1)
  })

  it('viewer can also view presence', async () => {
    const { app, mockDb, mockRedis } = buildApp()
    mockDb.query.workspaceMembers.findFirst.mockResolvedValue(viewerMembership)
    mockRedis.smembers.mockResolvedValue([])

    const res = await app.inject({ method: 'GET', url: '/api/v1/workspaces/ws-1/presence' })
    expect(res.statusCode).toBe(200)
  })
})
