import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { githubRoutes } from './github.js'

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      users: {
        getAuthenticated: vi.fn().mockResolvedValue({
          data: { id: 123, login: 'testuser', name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' },
        }),
      },
      repos: {
        listForAuthenticatedUser: vi.fn().mockResolvedValue({
          data: [{ id: 1, name: 'my-repo', full_name: 'testuser/my-repo', private: false, default_branch: 'main', updated_at: '2024-01-01', description: null }],
        }),
        getBranch: vi.fn().mockResolvedValue({
          data: { commit: { sha: 'abc123', commit: { tree: { sha: 'tree123' } } } },
        }),
        listBranches: vi.fn().mockResolvedValue({
          data: [{ name: 'main', commit: { sha: 'abc123' } }],
        }),
        compareCommits: vi.fn().mockResolvedValue({
          data: { status: 'behind', ahead_by: 0, behind_by: 2 },
        }),
        createForAuthenticatedUser: vi.fn().mockResolvedValue({
          data: { html_url: 'https://github.com/testuser/my-repo', owner: { login: 'testuser' }, name: 'my-repo' },
        }),
      },
      git: {
        createTree: vi.fn().mockResolvedValue({ data: { sha: 'tree456' } }),
        createCommit: vi.fn().mockResolvedValue({ data: { sha: 'commit789' } }),
        createRef: vi.fn().mockResolvedValue({ data: {} }),
        updateRef: vi.fn().mockResolvedValue({ data: {} }),
        getCommit: vi.fn().mockResolvedValue({ data: { tree: { sha: 'tree123' } } }),
        getTree: vi.fn().mockResolvedValue({
          data: { tree: [{ type: 'blob', path: 'src/App.tsx', sha: 'blob1' }] },
        }),
        getBlob: vi.fn().mockResolvedValue({
          data: { content: Buffer.from('export default function App() { return <div>Hello</div>; }').toString('base64') },
        }),
      },
      pulls: {
        create: vi.fn().mockResolvedValue({
          data: { html_url: 'https://github.com/testuser/my-repo/pull/1', number: 1 },
        }),
      },
    },
  })),
}))

vi.mock('../services/github.js', () => ({
  getGitHubUser: vi.fn().mockResolvedValue({ id: 123, login: 'testuser', name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' }),
  listUserRepos: vi.fn().mockResolvedValue([
    { id: 1, name: 'my-repo', fullName: 'testuser/my-repo', private: false, defaultBranch: 'main', updatedAt: '2024-01-01', description: null },
  ]),
  listRepoBranches: vi.fn().mockResolvedValue([{ name: 'main', sha: 'abc123' }]),
  createRepoAndPush: vi.fn().mockResolvedValue({ repoUrl: 'https://github.com/testuser/my-repo', owner: 'testuser', repo: 'my-repo', sha: 'commit789' }),
  pushToExistingRepo: vi.fn().mockResolvedValue({ sha: 'commit789' }),
  getRepoFiles: vi.fn().mockResolvedValue([
    { path: 'src/App.tsx', content: 'export default function App() {}', sha: 'blob1' },
  ]),
  getSyncStatus: vi.fn().mockResolvedValue({ status: 'synced', aheadBy: 0, behindBy: 0, latestSha: 'abc123' }),
  createPullRequest: vi.fn().mockResolvedValue({ url: 'https://github.com/testuser/my-repo/pull/1', number: 1 }),
}))

vi.mock('../lib/crypto.js', () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v.replace('enc:', '')),
}))

vi.mock('../services/snapshot.js', () => ({
  createSnapshot: vi.fn().mockResolvedValue('snapshot-uuid-001'),
}))

const mockUser = { id: 'user-uuid-001', keycloakId: 'kc-001', email: 'test@forge.local', name: 'Test User' }
const mockConnection = {
  id: 'conn-uuid-001',
  userId: 'user-uuid-001',
  githubUserId: 123,
  githubLogin: 'testuser',
  githubName: 'Test User',
  githubAvatarUrl: 'https://example.com/avatar.jpg',
  encryptedToken: 'enc:ghp_token123',
  tokenScope: 'repo,read:user',
  connectedAt: new Date(),
}
const mockProject = {
  id: 'proj-uuid-001',
  workspaceId: 'ws-uuid-001',
  name: 'Test Project',
  description: null,
  framework: 'react',
  status: 'active',
  thumbnail: null,
  githubRepoUrl: 'https://github.com/testuser/my-repo',
  githubRepoOwner: 'testuser',
  githubRepoName: 'my-repo',
  githubDefaultBranch: 'main',
  githubLastPushedSha: 'abc123',
  createdAt: new Date(),
  updatedAt: new Date(),
}
const mockMember = { workspaceId: 'ws-uuid-001', userId: 'user-uuid-001', role: 'owner' }
const mockFiles = [
  { id: 'file-uuid-001', projectId: 'proj-uuid-001', path: 'src/App.tsx', content: 'export default function App() {}', mimeType: 'text/plain', sizeBytes: 34 },
]

function buildApp(overrides?: { connection?: unknown | null; project?: unknown | null }) {
  const conn = overrides?.connection === null ? null : (overrides?.connection ?? mockConnection)
  const proj = overrides?.project === null ? null : (overrides?.project ?? mockProject)

  const app = Fastify({ logger: false })
  app.decorate('verifyAuth', async (req: any) => {
    req.user = { id: 'user-uuid-001', keycloakId: 'kc-001', email: 'test@forge.local', workspaceId: 'ws-uuid-001' }
  })
  app.decorate('db', {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(mockUser) },
      githubConnections: { findFirst: vi.fn().mockResolvedValue(conn) },
      projects: { findFirst: vi.fn().mockResolvedValue(proj) },
      workspaceMembers: { findFirst: vi.fn().mockResolvedValue(mockMember) },
      projectFiles: { findMany: vi.fn().mockResolvedValue(mockFiles) },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockProject]),
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockConnection]),
        }),
      }),
      onConflictDoUpdate: vi.fn().mockReturnValue(Promise.resolve()),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as any)
  app.decorate('redis', {} as any)
  app.decorate('storage', {} as any)
  return app
}

// ── GET /github/status ────────────────────────────────────────────────────────
describe('GET /api/v1/github/status', () => {
  it('returns connected=false when no connection', async () => {
    const app = buildApp({ connection: null })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/github/status' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.connected).toBe(false)
    await app.close()
  })

  it('returns connected=true with login and avatar when connected', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/github/status' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.connected).toBe(true)
    expect(res.json().data.login).toBe('testuser')
    expect(res.json().data.avatarUrl).toBe('https://example.com/avatar.jpg')
    await app.close()
  })
})

// ── GET /github/repos ─────────────────────────────────────────────────────────
describe('GET /api/v1/github/repos', () => {
  it('returns list of repos when connected', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/github/repos' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().data.repos)).toBe(true)
    expect(res.json().data.repos[0].name).toBe('my-repo')
    await app.close()
  })

  it('returns 404 when not connected', async () => {
    const app = buildApp({ connection: null })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/github/repos' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('GITHUB_NOT_CONNECTED')
    await app.close()
  })

  it('filters repos by search query', async () => {
    const { listUserRepos } = await import('../services/github.js')
    vi.mocked(listUserRepos).mockResolvedValueOnce([
      { id: 1, name: 'my-repo', fullName: 'testuser/my-repo', private: false, defaultBranch: 'main', updatedAt: '2024-01-01', description: null },
      { id: 2, name: 'another-repo', fullName: 'testuser/another-repo', private: false, defaultBranch: 'main', updatedAt: '2024-01-01', description: null },
    ])

    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/github/repos?search=another' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.repos).toHaveLength(1)
    expect(res.json().data.repos[0].name).toBe('another-repo')
    await app.close()
  })
})

// ── GET /github/repos/:owner/:repo/branches ──────────────────────────────────
describe('GET /api/v1/github/repos/:owner/:repo/branches', () => {
  it('returns branches for a repo', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/github/repos/testuser/my-repo/branches' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.branches[0].name).toBe('main')
    await app.close()
  })

  it('returns 404 when not connected', async () => {
    const app = buildApp({ connection: null })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/github/repos/testuser/my-repo/branches' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

// ── DELETE /github/disconnect ─────────────────────────────────────────────────
describe('DELETE /api/v1/github/disconnect', () => {
  it('disconnects and returns success', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'DELETE', url: '/api/v1/github/disconnect' })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
    await app.close()
  })
})

// ── POST /projects/:id/github/push ────────────────────────────────────────────
describe('POST /api/v1/projects/:id/github/push', () => {
  it('pushes to new repo and returns 201 with repoUrl', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/push',
      payload: { repoName: 'my-new-repo', private: false },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
    expect(res.json().data.repoUrl).toBe('https://github.com/testuser/my-repo')
    await app.close()
  })

  it('returns 404 when not connected to GitHub', async () => {
    const app = buildApp({ connection: null })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/push',
      payload: { repoName: 'my-new-repo' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('GITHUB_NOT_CONNECTED')
    await app.close()
  })

  it('returns 404 when project not found', async () => {
    const app = buildApp({ project: null })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/nonexistent/github/push',
      payload: { repoName: 'my-new-repo' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('PROJECT_NOT_FOUND')
    await app.close()
  })

  it('returns 400 when repoName is missing', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/push',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

// ── POST /projects/:id/github/push-existing ───────────────────────────────────
describe('POST /api/v1/projects/:id/github/push-existing', () => {
  it('pushes to existing repo and returns sha', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/push-existing',
      payload: { owner: 'testuser', repo: 'my-repo', branch: 'main' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
    expect(res.json().data.sha).toBe('commit789')
    await app.close()
  })

  it('uses provided commitMessage', async () => {
    const { pushToExistingRepo } = await import('../services/github.js')
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/push-existing',
      payload: { owner: 'testuser', repo: 'my-repo', branch: 'main', commitMessage: 'chore: custom message' },
    })
    expect(vi.mocked(pushToExistingRepo)).toHaveBeenCalledWith(
      expect.any(String),
      'testuser',
      'my-repo',
      'main',
      expect.any(Array),
      'chore: custom message',
    )
    await app.close()
  })

  it('returns 400 when missing params', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/push-existing',
      payload: { owner: 'testuser' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})

// ── GET /projects/:id/github/sync-status ──────────────────────────────────────
describe('GET /api/v1/projects/:id/github/sync-status', () => {
  it('returns synced status', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/projects/proj-uuid-001/github/sync-status' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('synced')
    await app.close()
  })

  it('returns not_linked when repo not configured', async () => {
    const projectNoRepo = { ...mockProject, githubRepoOwner: null, githubRepoName: null }
    const app = buildApp({ project: projectNoRepo })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/projects/proj-uuid-001/github/sync-status' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('not_linked')
    await app.close()
  })

  it('returns ahead status', async () => {
    const { getSyncStatus } = await import('../services/github.js')
    vi.mocked(getSyncStatus).mockResolvedValueOnce({ status: 'ahead', aheadBy: 3, behindBy: 0, latestSha: 'abc123' })

    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/projects/proj-uuid-001/github/sync-status' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('ahead')
    await app.close()
  })

  it('returns behind status', async () => {
    const { getSyncStatus } = await import('../services/github.js')
    vi.mocked(getSyncStatus).mockResolvedValueOnce({ status: 'behind', aheadBy: 0, behindBy: 2, latestSha: 'def456' })

    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/projects/proj-uuid-001/github/sync-status' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('behind')
    await app.close()
  })

  it('returns 404 when no GitHub connection', async () => {
    const app = buildApp({ connection: null })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/api/v1/projects/proj-uuid-001/github/sync-status' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

// ── POST /projects/:id/github/pull ────────────────────────────────────────────
describe('POST /api/v1/projects/:id/github/pull', () => {
  it('pulls from remote, creates snapshot, returns filesCount', async () => {
    const { createSnapshot } = await import('../services/snapshot.js')
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'POST', url: '/api/v1/projects/proj-uuid-001/github/pull' })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
    expect(res.json().data.snapshotId).toBe('snapshot-uuid-001')
    expect(res.json().data.filesCount).toBe(1)
    expect(vi.mocked(createSnapshot)).toHaveBeenCalled()
    await app.close()
  })

  it('returns 404 when no GitHub connection', async () => {
    const app = buildApp({ connection: null })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'POST', url: '/api/v1/projects/proj-uuid-001/github/pull' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('GITHUB_NOT_CONNECTED')
    await app.close()
  })

  it('returns 400 when repo not linked', async () => {
    const projectNoRepo = { ...mockProject, githubRepoOwner: null, githubRepoName: null }
    const app = buildApp({ project: projectNoRepo })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({ method: 'POST', url: '/api/v1/projects/proj-uuid-001/github/pull' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('REPO_NOT_LINKED')
    await app.close()
  })
})

// ── POST /projects/:id/github/pr ──────────────────────────────────────────────
describe('POST /api/v1/projects/:id/github/pr', () => {
  it('creates PR and returns url and number', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/pr',
      payload: { head: 'feature/my-branch', base: 'main', title: 'My PR', body: 'Description here' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
    expect(res.json().data.url).toBe('https://github.com/testuser/my-repo/pull/1')
    expect(res.json().data.number).toBe(1)
    await app.close()
  })

  it('generates title and body when not provided', async () => {
    const { createPullRequest } = await import('../services/github.js')
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/pr',
      payload: { head: 'feature/branch', base: 'main' },
    })
    expect(vi.mocked(createPullRequest)).toHaveBeenCalledWith(
      expect.any(String),
      'testuser',
      'my-repo',
      'feature/branch',
      'main',
      expect.stringContaining('Test Project'),
      expect.stringContaining('feature/branch'),
    )
    await app.close()
  })

  it('returns 400 when head or base missing', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/pr',
      payload: { head: 'feature/branch' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('returns 400 when repo not linked', async () => {
    const projectNoRepo = { ...mockProject, githubRepoOwner: null, githubRepoName: null }
    const app = buildApp({ project: projectNoRepo })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-uuid-001/github/pr',
      payload: { head: 'feature/branch', base: 'main' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('REPO_NOT_LINKED')
    await app.close()
  })
})

// ── POST /github/import ───────────────────────────────────────────────────────
describe('POST /api/v1/github/import', () => {
  it('imports repo, creates project and files, returns projectId', async () => {
    const insertMock = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockProject]),
        onConflictDoUpdate: vi.fn().mockReturnValue(Promise.resolve()),
      }),
      onConflictDoUpdate: vi.fn().mockReturnValue(Promise.resolve()),
    })

    const app = Fastify({ logger: false })
    app.decorate('verifyAuth', async (req: any) => {
      req.user = { id: 'user-uuid-001', keycloakId: 'kc-001', email: 'test@forge.local', workspaceId: 'ws-uuid-001' }
    })
    app.decorate('db', {
      query: {
        users: { findFirst: vi.fn().mockResolvedValue(mockUser) },
        githubConnections: { findFirst: vi.fn().mockResolvedValue(mockConnection) },
        projects: { findFirst: vi.fn().mockResolvedValue(mockProject) },
        workspaceMembers: { findFirst: vi.fn().mockResolvedValue(mockMember) },
        projectFiles: { findMany: vi.fn().mockResolvedValue(mockFiles) },
      },
      insert: insertMock,
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any)
    app.decorate('redis', {} as any)
    app.decorate('storage', {} as any)

    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/github/import',
      payload: { owner: 'testuser', repo: 'my-repo', branch: 'main', projectName: 'Imported Project' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
    expect(res.json().data.projectId).toBeDefined()
    expect(res.json().data.filesCount).toBe(1)
    await app.close()
  })

  it('returns 404 when not connected to GitHub', async () => {
    const app = buildApp({ connection: null })
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/github/import',
      payload: { owner: 'testuser', repo: 'my-repo', branch: 'main' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('GITHUB_NOT_CONNECTED')
    await app.close()
  })

  it('returns 400 when missing required params', async () => {
    const app = buildApp()
    await app.register(githubRoutes, { prefix: '/api/v1' })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/github/import',
      payload: { owner: 'testuser', repo: 'my-repo' },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})
