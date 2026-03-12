import { createHash } from 'crypto'

const NETLIFY_API = 'https://api.netlify.com/api/v1'

interface DeployFile { path: string; content: string }
interface DeployResult { providerId: string; deployUrl: string }

export async function deployToNetlify(
  projectSlug: string,
  files: DeployFile[],
  envVars: Record<string, string>,
): Promise<DeployResult> {
  const token = process.env.FORGE_NETLIFY_API_KEY
  if (!token) throw new Error('FORGE_NETLIFY_API_KEY not configured')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const siteName = `forge-${projectSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`

  // 1. Create or get site
  const siteRes = await fetch(`${NETLIFY_API}/sites`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: siteName }),
  })
  const site = await siteRes.json() as { id: string; ssl_url: string }

  // 2. Create deploy with file digests
  const fileDigests: Record<string, string> = {}
  for (const f of files) {
    const sha = createHash('sha1').update(f.content, 'utf8').digest('hex')
    fileDigests[`/${f.path}`] = sha
  }

  const deployRes = await fetch(`${NETLIFY_API}/sites/${site.id}/deploys`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files: fileDigests }),
  })
  const deployData = await deployRes.json() as { id: string; required: string[] }

  // 3. Upload required files
  for (const f of files) {
    const sha = createHash('sha1').update(f.content, 'utf8').digest('hex')
    if (deployData.required?.includes(sha)) {
      await fetch(`${NETLIFY_API}/deploys/${deployData.id}/files/${f.path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
        body: f.content,
      })
    }
  }

  // envVars are intentionally unused for Netlify (set via dashboard/API separately)
  void envVars

  return { providerId: deployData.id, deployUrl: site.ssl_url }
}

export async function pollNetlifyDeploy(providerId: string): Promise<'ready' | 'error' | 'pending'> {
  const token = process.env.FORGE_NETLIFY_API_KEY
  const res = await fetch(`${NETLIFY_API}/deploys/${providerId}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  })
  if (!res.ok) return 'error'
  const data = await res.json() as { state: string }
  if (data.state === 'ready') return 'ready'
  if (data.state === 'error') return 'error'
  return 'pending'
}
