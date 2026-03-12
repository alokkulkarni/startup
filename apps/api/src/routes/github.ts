import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { encrypt } from '../lib/crypto.js';
import {
  getGitHubUser,
  listUserRepos,
  listRepoBranches,
  createRepoAndPush,
  pushToExistingRepo,
  getRepoFiles,
  getSyncStatus,
  createPullRequest,
} from '../services/github.js';
import { createSnapshot } from '../services/snapshot.js';

function generateCommitMessage(files: string[]): string {
  const changed = files.slice(0, 3).join(', ');
  const more = files.length > 3 ? ` and ${files.length - 3} more` : '';
  return `feat: update ${changed}${more} via Forge AI`;
}

export async function githubRoutes(app: FastifyInstance) {
  // GET /github/connect — redirect to GitHub OAuth
  app.get('/github/connect', async (request, reply) => {
    await requireAuth(request, reply);
    if (!request.user) return;
    const { id } = request.user;
    const state = Buffer.from(id).toString('base64');
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: `${process.env.APP_URL}/api/v1/github/callback`,
      scope: 'repo read:user',
      state,
    });
    return reply.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  // GET /github/callback — exchange code for token
  app.get<{ Querystring: { code: string; state: string } }>('/github/callback', async (request, reply) => {
    const { code, state } = request.query;
    if (!code || !state) {
      return reply.code(400).send({ success: false, error: { code: 'MISSING_PARAMS' } });
    }

    const userId = Buffer.from(state, 'base64').toString('utf-8');

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.APP_URL}/api/v1/github/callback`,
      }),
    });

    const tokenData = await tokenRes.json() as { access_token: string; scope: string; error?: string };

    if (tokenData.error || !tokenData.access_token) {
      return reply.code(400).send({ success: false, error: { code: 'OAUTH_ERROR' } });
    }

    const ghUser = await getGitHubUser(tokenData.access_token);
    const encryptedToken = encrypt(tokenData.access_token);

    await app.db.insert(schema.githubConnections).values({
      userId,
      githubUserId: ghUser.id,
      githubLogin: ghUser.login,
      githubName: ghUser.name ?? null,
      githubAvatarUrl: ghUser.avatar_url,
      encryptedToken,
      tokenScope: tokenData.scope,
    }).onConflictDoUpdate({
      target: schema.githubConnections.userId,
      set: {
        githubUserId: ghUser.id,
        githubLogin: ghUser.login,
        githubName: ghUser.name ?? null,
        githubAvatarUrl: ghUser.avatar_url,
        encryptedToken,
        tokenScope: tokenData.scope,
      },
    });

    return reply.redirect(`${process.env.APP_URL}/dashboard?github=connected`);
  });

  // DELETE /github/disconnect — remove connection
  app.delete('/github/disconnect', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    const user = await app.db.query.users.findFirst({
      where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
    });
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

    await app.db.delete(schema.githubConnections).where(eq(schema.githubConnections.userId, user.id));

    return reply.send({ success: true });
  });

  // GET /github/status — return connection status
  app.get('/github/status', async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    const user = await app.db.query.users.findFirst({
      where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
    });
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

    const connection = await app.db.query.githubConnections.findFirst({
      where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
    });

    if (!connection) {
      return reply.send({ success: true, data: { connected: false } });
    }

    return reply.send({
      success: true,
      data: {
        connected: true,
        login: connection.githubLogin,
        name: connection.githubName,
        avatarUrl: connection.githubAvatarUrl,
        connectedAt: connection.connectedAt,
      },
    });
  });

  // GET /github/repos — list user repos
  app.get<{ Querystring: { page?: string; perPage?: string; search?: string } }>(
    '/github/repos',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
      });
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

      const connection = await app.db.query.githubConnections.findFirst({
        where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
      });
      if (!connection) return reply.code(404).send({ success: false, error: { code: 'GITHUB_NOT_CONNECTED' } });

      const page = parseInt(request.query.page ?? '1', 10);
      const perPage = parseInt(request.query.perPage ?? '30', 10);
      const repos = await listUserRepos(connection.encryptedToken, page, perPage);

      const search = request.query.search?.toLowerCase();
      const filtered = search ? repos.filter((r) => r.name.toLowerCase().includes(search)) : repos;

      return reply.send({ success: true, data: { repos: filtered } });
    },
  );

  // GET /github/repos/:owner/:repo/branches — list branches
  app.get<{ Params: { owner: string; repo: string } }>(
    '/github/repos/:owner/:repo/branches',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
      });
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

      const connection = await app.db.query.githubConnections.findFirst({
        where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
      });
      if (!connection) return reply.code(404).send({ success: false, error: { code: 'GITHUB_NOT_CONNECTED' } });

      const { owner, repo } = request.params;
      const branches = await listRepoBranches(connection.encryptedToken, owner, repo);

      return reply.send({ success: true, data: { branches } });
    },
  );

  // POST /projects/:id/github/push — push to NEW repo
  app.post<{ Params: { id: string }; Body: { repoName: string; private?: boolean; description?: string } }>(
    '/projects/:id/github/push',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
      });
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

      const connection = await app.db.query.githubConnections.findFirst({
        where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
      });
      if (!connection) return reply.code(404).send({ success: false, error: { code: 'GITHUB_NOT_CONNECTED' } });

      const project = await app.db.query.projects.findFirst({
        where: (p, { and, eq: eqFn, ne }) => and(eqFn(p.id, request.params.id), ne(p.status, 'deleted')),
      });
      if (!project) return reply.code(404).send({ success: false, error: { code: 'PROJECT_NOT_FOUND' } });

      const member = await app.db.query.workspaceMembers.findFirst({
        where: (m, { and, eq: eqFn }) => and(eqFn(m.workspaceId, project.workspaceId), eqFn(m.userId, user.id)),
      });
      if (!member) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN' } });

      const body = request.body as { repoName: string; private?: boolean; description?: string };
      if (!body?.repoName) return reply.code(400).send({ success: false, error: { code: 'MISSING_REPO_NAME' } });

      const files = await app.db.query.projectFiles.findMany({
        where: (f, { eq: eqFn }) => eqFn(f.projectId, project.id),
      });

      const result = await createRepoAndPush(
        connection.encryptedToken,
        body.repoName,
        files.map((f) => ({ path: f.path, content: f.content })),
        { private: body.private, description: body.description },
      );

      await app.db.update(schema.projects)
        .set({
          githubRepoUrl: result.repoUrl,
          githubRepoOwner: result.owner,
          githubRepoName: result.repo,
          githubDefaultBranch: 'main',
          githubLastPushedSha: result.sha,
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, project.id));

      return reply.code(201).send({ success: true, data: { repoUrl: result.repoUrl, sha: result.sha } });
    },
  );

  // POST /projects/:id/github/push-existing — push to EXISTING repo
  app.post<{
    Params: { id: string };
    Body: { owner: string; repo: string; branch: string; commitMessage?: string };
  }>(
    '/projects/:id/github/push-existing',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
      });
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

      const connection = await app.db.query.githubConnections.findFirst({
        where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
      });
      if (!connection) return reply.code(404).send({ success: false, error: { code: 'GITHUB_NOT_CONNECTED' } });

      const project = await app.db.query.projects.findFirst({
        where: (p, { and, eq: eqFn, ne }) => and(eqFn(p.id, request.params.id), ne(p.status, 'deleted')),
      });
      if (!project) return reply.code(404).send({ success: false, error: { code: 'PROJECT_NOT_FOUND' } });

      const member = await app.db.query.workspaceMembers.findFirst({
        where: (m, { and, eq: eqFn }) => and(eqFn(m.workspaceId, project.workspaceId), eqFn(m.userId, user.id)),
      });
      if (!member) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN' } });

      const body = request.body as { owner: string; repo: string; branch: string; commitMessage?: string };
      if (!body?.owner || !body?.repo || !body?.branch) {
        return reply.code(400).send({ success: false, error: { code: 'MISSING_PARAMS' } });
      }

      const files = await app.db.query.projectFiles.findMany({
        where: (f, { eq: eqFn }) => eqFn(f.projectId, project.id),
      });

      const commitMessage = body.commitMessage ?? generateCommitMessage(files.map((f) => f.path));

      const result = await pushToExistingRepo(
        connection.encryptedToken,
        body.owner,
        body.repo,
        body.branch,
        files.map((f) => ({ path: f.path, content: f.content })),
        commitMessage,
      );

      await app.db.update(schema.projects)
        .set({
          githubRepoOwner: body.owner,
          githubRepoName: body.repo,
          githubDefaultBranch: body.branch,
          githubLastPushedSha: result.sha,
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, project.id));

      return reply.send({ success: true, data: { sha: result.sha } });
    },
  );

  // GET /projects/:id/github/sync-status — sync status
  app.get<{ Params: { id: string } }>(
    '/projects/:id/github/sync-status',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
      });
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

      const connection = await app.db.query.githubConnections.findFirst({
        where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
      });
      if (!connection) return reply.code(404).send({ success: false, error: { code: 'GITHUB_NOT_CONNECTED' } });

      const project = await app.db.query.projects.findFirst({
        where: (p, { and, eq: eqFn, ne }) => and(eqFn(p.id, request.params.id), ne(p.status, 'deleted')),
      });
      if (!project) return reply.code(404).send({ success: false, error: { code: 'PROJECT_NOT_FOUND' } });

      const member = await app.db.query.workspaceMembers.findFirst({
        where: (m, { and, eq: eqFn }) => and(eqFn(m.workspaceId, project.workspaceId), eqFn(m.userId, user.id)),
      });
      if (!member) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN' } });

      if (!project.githubRepoOwner || !project.githubRepoName) {
        return reply.send({ success: true, data: { status: 'not_linked' } });
      }

      const syncStatus = await getSyncStatus(
        connection.encryptedToken,
        project.githubRepoOwner,
        project.githubRepoName,
        project.githubDefaultBranch ?? 'main',
        project.githubLastPushedSha,
      );

      return reply.send({ success: true, data: syncStatus });
    },
  );

  // POST /projects/:id/github/pull — pull latest from remote
  app.post<{ Params: { id: string } }>(
    '/projects/:id/github/pull',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
      });
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

      const connection = await app.db.query.githubConnections.findFirst({
        where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
      });
      if (!connection) return reply.code(404).send({ success: false, error: { code: 'GITHUB_NOT_CONNECTED' } });

      const project = await app.db.query.projects.findFirst({
        where: (p, { and, eq: eqFn, ne }) => and(eqFn(p.id, request.params.id), ne(p.status, 'deleted')),
      });
      if (!project) return reply.code(404).send({ success: false, error: { code: 'PROJECT_NOT_FOUND' } });

      const member = await app.db.query.workspaceMembers.findFirst({
        where: (m, { and, eq: eqFn }) => and(eqFn(m.workspaceId, project.workspaceId), eqFn(m.userId, user.id)),
      });
      if (!member) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN' } });

      if (!project.githubRepoOwner || !project.githubRepoName) {
        return reply.code(400).send({ success: false, error: { code: 'REPO_NOT_LINKED' } });
      }

      // Create snapshot before pulling
      const snapshotId = await createSnapshot(project.id, app.db as any, 'manual', 'Before GitHub pull');

      const remoteFiles = await getRepoFiles(
        connection.encryptedToken,
        project.githubRepoOwner,
        project.githubRepoName,
        project.githubDefaultBranch ?? 'main',
      );

      // Delete existing files and re-insert from remote
      await app.db.delete(schema.projectFiles).where(eq(schema.projectFiles.projectId, project.id));

      if (remoteFiles.length > 0) {
        await app.db.insert(schema.projectFiles).values(
          remoteFiles.map((f) => ({
            projectId: project.id,
            path: f.path,
            content: f.content,
            mimeType: 'text/plain',
            sizeBytes: Buffer.byteLength(f.content, 'utf-8'),
          })),
        );
      }

      // Update last pushed sha
      const latestSha = remoteFiles[0]?.sha ?? null;
      await app.db.update(schema.projects)
        .set({ githubLastPushedSha: latestSha, updatedAt: new Date() })
        .where(eq(schema.projects.id, project.id));

      return reply.send({ success: true, data: { snapshotId, filesCount: remoteFiles.length } });
    },
  );

  // POST /projects/:id/github/pr — create PR
  app.post<{
    Params: { id: string };
    Body: { head: string; base: string; title?: string; body?: string };
  }>(
    '/projects/:id/github/pr',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
      });
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

      const connection = await app.db.query.githubConnections.findFirst({
        where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
      });
      if (!connection) return reply.code(404).send({ success: false, error: { code: 'GITHUB_NOT_CONNECTED' } });

      const project = await app.db.query.projects.findFirst({
        where: (p, { and, eq: eqFn, ne }) => and(eqFn(p.id, request.params.id), ne(p.status, 'deleted')),
      });
      if (!project) return reply.code(404).send({ success: false, error: { code: 'PROJECT_NOT_FOUND' } });

      const member = await app.db.query.workspaceMembers.findFirst({
        where: (m, { and, eq: eqFn }) => and(eqFn(m.workspaceId, project.workspaceId), eqFn(m.userId, user.id)),
      });
      if (!member) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN' } });

      if (!project.githubRepoOwner || !project.githubRepoName) {
        return reply.code(400).send({ success: false, error: { code: 'REPO_NOT_LINKED' } });
      }

      const prBody = request.body as { head: string; base: string; title?: string; body?: string };
      if (!prBody?.head || !prBody?.base) {
        return reply.code(400).send({ success: false, error: { code: 'MISSING_PARAMS' } });
      }

      const title = prBody.title ?? `feat: changes from Forge AI on ${project.name}`;
      const body = prBody.body ?? `This pull request was created by Forge AI for project **${project.name}**.\n\nMerging \`${prBody.head}\` into \`${prBody.base}\`.`;

      const pr = await createPullRequest(
        connection.encryptedToken,
        project.githubRepoOwner,
        project.githubRepoName,
        prBody.head,
        prBody.base,
        title,
        body,
      );

      return reply.code(201).send({ success: true, data: { url: pr.url, number: pr.number } });
    },
  );

  // POST /github/import — import GitHub repo to new project
  app.post<{
    Body: { owner: string; repo: string; branch: string; projectName?: string };
  }>(
    '/github/import',
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const user = await app.db.query.users.findFirst({
        where: (u, { eq: eqFn }) => eqFn(u.keycloakId, request.user!.keycloakId),
      });
      if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND' } });

      const connection = await app.db.query.githubConnections.findFirst({
        where: (c, { eq: eqFn }) => eqFn(c.userId, user.id),
      });
      if (!connection) return reply.code(404).send({ success: false, error: { code: 'GITHUB_NOT_CONNECTED' } });

      const body = request.body as { owner: string; repo: string; branch: string; projectName?: string };
      if (!body?.owner || !body?.repo || !body?.branch) {
        return reply.code(400).send({ success: false, error: { code: 'MISSING_PARAMS' } });
      }

      // Get the user's workspace
      const membership = await app.db.query.workspaceMembers.findFirst({
        where: (m, { eq: eqFn }) => eqFn(m.userId, user.id),
      });
      if (!membership) return reply.code(404).send({ success: false, error: { code: 'NO_WORKSPACE' } });

      const remoteFiles = await getRepoFiles(
        connection.encryptedToken,
        body.owner,
        body.repo,
        body.branch,
      );

      const [newProject] = await app.db.insert(schema.projects).values({
        workspaceId: membership.workspaceId,
        name: body.projectName ?? body.repo,
        description: `Imported from GitHub: ${body.owner}/${body.repo}`,
        framework: 'react',
        githubRepoUrl: `https://github.com/${body.owner}/${body.repo}`,
        githubRepoOwner: body.owner,
        githubRepoName: body.repo,
        githubDefaultBranch: body.branch,
      }).returning();

      if (remoteFiles.length > 0) {
        await app.db.insert(schema.projectFiles).values(
          remoteFiles.map((f) => ({
            projectId: newProject.id,
            path: f.path,
            content: f.content,
            mimeType: 'text/plain',
            sizeBytes: Buffer.byteLength(f.content, 'utf-8'),
          })),
        );
      }

      return reply.code(201).send({ success: true, data: { projectId: newProject.id, filesCount: remoteFiles.length } });
    },
  );
}
