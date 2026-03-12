import { createHash } from 'crypto'

const CF_API = 'https://api.cloudflare.com/client/v4'

interface DeployFile { path: string; content: string }
interface DeployResult { providerId: string; deployUrl: string }

export async function deployToCloudflare(
  projectSlug: string,
  files: DeployFile[],
  _envVars: Record<string, string>,
): Promise<DeployResult> {
  const token = process.env.FORGE_CF_API_TOKEN
  const accountId = process.env.FORGE_CF_ACCOUNT_ID
  if (!token || !accountId) throw new Error('Cloudflare credentials not configured')

  const headers = { Authorization: `Bearer ${token}` }
  const projectName = `forge-${projectSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`

  // Create project if not exists (ignore 409 conflict)
  await fetch(`${CF_API}/accounts/${accountId}/pages/projects`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: projectName, production_branch: 'main' }),
  })

  // Upload files as FormData
  const formData = new FormData()
  const manifest: Record<string, string> = {}

  for (const f of files) {
    const blob = new Blob([f.content], { type: 'text/plain' })
    const sha = createHash('sha256').update(f.content, 'utf8').digest('hex')
    formData.append(f.path, blob, f.path)
    manifest[`/${f.path}`] = sha
  }
  formData.append('manifest', JSON.stringify(manifest))

  const deployRes = await fetch(`${CF_API}/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
    method: 'POST',
    headers,
    body: formData,
  })
  const data = await deployRes.json() as { result?: { id: string; url: string } }
  const result = data.result
  if (!result) throw new Error('Cloudflare deploy failed')

  return { providerId: result.id, deployUrl: result.url }
}

export async function pollCloudflareDeploy(
  providerId: string,
  projectName: string,
): Promise<'ready' | 'error' | 'pending'> {
  const token = process.env.FORGE_CF_API_TOKEN
  const accountId = process.env.FORGE_CF_ACCOUNT_ID
  const res = await fetch(`${CF_API}/accounts/${accountId}/pages/projects/${projectName}/deployments/${providerId}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  })
  if (!res.ok) return 'error'
  const data = await res.json() as { result?: { latest_stage?: { status: string } } }
  const status = data.result?.latest_stage?.status
  if (status === 'success') return 'ready'
  if (status === 'failure') return 'error'
  return 'pending'
}
