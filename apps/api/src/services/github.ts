import { Octokit } from '@octokit/rest';
import { decrypt } from '../lib/crypto.js';

export interface GitHubConnection {
  id: string;
  userId: string;
  githubUserId: number;
  githubLogin: string;
  githubName: string | null;
  githubAvatarUrl: string | null;
  encryptedToken: string;
}

export function getOctokit(encryptedToken: string): Octokit {
  const token = decrypt(encryptedToken);
  return new Octokit({ auth: token });
}

export async function getGitHubUser(token: string) {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.users.getAuthenticated();
  return data;
}

export async function listUserRepos(encryptedToken: string, page = 1, perPage = 30) {
  const octokit = getOctokit(encryptedToken);
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: perPage,
    page,
    type: 'owner',
  });
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at,
    description: r.description,
  }));
}

export async function listRepoBranches(encryptedToken: string, owner: string, repo: string) {
  const octokit = getOctokit(encryptedToken);
  const { data } = await octokit.rest.repos.listBranches({ owner, repo });
  return data.map((b) => ({ name: b.name, sha: b.commit.sha }));
}

export async function createRepoAndPush(
  encryptedToken: string,
  repoName: string,
  files: { path: string; content: string }[],
  options?: { private?: boolean; description?: string },
): Promise<{ repoUrl: string; owner: string; repo: string; sha: string }> {
  const octokit = getOctokit(encryptedToken);

  // 1. Create the repo (empty, no auto-init)
  const { data: repoData } = await octokit.rest.repos.createForAuthenticatedUser({
    name: repoName,
    private: options?.private ?? false,
    description: options?.description ?? 'Created with Forge AI',
    auto_init: false,
  });

  const owner = repoData.owner.login;
  const repo = repoData.name;

  // 2. Create individual blobs (more reliable than inline content in createTree)
  const blobs = await Promise.all(
    files.map(async (f) => {
      const { data } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(f.content, 'utf8').toString('base64'),
        encoding: 'base64',
      });
      return { path: f.path, sha: data.sha };
    }),
  );

  // 3. Create tree referencing blob SHAs
  const { data: treeData } = await octokit.rest.git.createTree({
    owner,
    repo,
    tree: blobs.map((b) => ({
      path: b.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: b.sha,
    })),
  });

  // 4. Create initial commit with no parents
  const { data: commitData } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: 'Initial commit from Forge AI',
    tree: treeData.sha,
    parents: [],
  });

  // 5. Create the main branch ref
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: 'refs/heads/main',
    sha: commitData.sha,
  });

  return { repoUrl: repoData.html_url, owner, repo, sha: commitData.sha };
}

export async function pushToExistingRepo(
  encryptedToken: string,
  owner: string,
  repo: string,
  branch: string,
  files: { path: string; content: string }[],
  commitMessage: string,
  baseSha?: string,
): Promise<{ sha: string }> {
  const octokit = getOctokit(encryptedToken);

  let parentSha = baseSha;
  if (!parentSha) {
    const { data: branchData } = await octokit.rest.repos.getBranch({ owner, repo, branch });
    parentSha = branchData.commit.sha;
  }

  const { data: baseTree } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: parentSha });

  const tree = files.map((f) => ({
    path: f.path,
    mode: '100644' as const,
    type: 'blob' as const,
    content: f.content,
  }));

  const { data: treeData } = await octokit.rest.git.createTree({
    owner, repo, tree, base_tree: baseTree.tree.sha,
  });

  const { data: commitData } = await octokit.rest.git.createCommit({
    owner, repo,
    message: commitMessage,
    tree: treeData.sha,
    parents: [parentSha],
  });

  await octokit.rest.git.updateRef({
    owner, repo,
    ref: `heads/${branch}`,
    sha: commitData.sha,
  });

  return { sha: commitData.sha };
}

export async function getRepoFiles(
  encryptedToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ path: string; content: string; sha: string }[]> {
  const octokit = getOctokit(encryptedToken);

  const { data: branchData } = await octokit.rest.repos.getBranch({ owner, repo, branch });
  const treeSha = branchData.commit.commit.tree.sha;

  const { data: treeData } = await octokit.rest.git.getTree({
    owner, repo, tree_sha: treeSha, recursive: '1',
  });

  const fileItems = treeData.tree.filter((item) => item.type === 'blob' && item.path);

  const contents = await Promise.all(
    fileItems.map(async (item) => {
      const { data } = await octokit.rest.git.getBlob({ owner, repo, file_sha: item.sha! });
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { path: item.path!, content, sha: item.sha! };
    }),
  );

  return contents;
}

export async function getSyncStatus(
  encryptedToken: string,
  owner: string,
  repo: string,
  branch: string,
  lastPushedSha: string | null,
): Promise<{ status: 'synced' | 'ahead' | 'behind' | 'diverged'; aheadBy: number; behindBy: number; latestSha: string }> {
  const octokit = getOctokit(encryptedToken);
  const { data: branchData } = await octokit.rest.repos.getBranch({ owner, repo, branch });
  const latestSha = branchData.commit.sha;

  if (!lastPushedSha) {
    return { status: 'behind', aheadBy: 0, behindBy: 1, latestSha };
  }

  if (lastPushedSha === latestSha) {
    return { status: 'synced', aheadBy: 0, behindBy: 0, latestSha };
  }

  try {
    const { data: compare } = await octokit.rest.repos.compareCommits({
      owner, repo, base: lastPushedSha, head: latestSha,
    });

    if (compare.status === 'ahead') return { status: 'behind', aheadBy: 0, behindBy: compare.ahead_by, latestSha };
    if (compare.status === 'behind') return { status: 'ahead', aheadBy: compare.behind_by, behindBy: 0, latestSha };
    return { status: 'diverged', aheadBy: compare.behind_by, behindBy: compare.ahead_by, latestSha };
  } catch {
    return { status: 'behind', aheadBy: 0, behindBy: 1, latestSha };
  }
}

export async function createPullRequest(
  encryptedToken: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string,
): Promise<{ url: string; number: number }> {
  const octokit = getOctokit(encryptedToken);
  const { data } = await octokit.rest.pulls.create({ owner, repo, title, body, head, base });
  return { url: data.html_url, number: data.number };
}
