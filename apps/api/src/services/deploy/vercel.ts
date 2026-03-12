import { createHash } from 'crypto'

const VERCEL_API = 'https://api.vercel.com'

interface DeployFile { path: string; content: string }
interface DeployResult { providerId: string; deployUrl: string }

export async function deployToVercel(
  projectSlug: string,
  files: DeployFile[],
  envVars: Record<string, string>,
): Promise<DeployResult> {
  const token = process.env.FORGE_VERCEL_API_KEY
  if (!token) throw new Error('FORGE_VERCEL_API_KEY not configured')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // 1. Upload files
  const fileRefs = await Promise.all(files.map(async (f) => {
    const buf = Buffer.from(f.content, 'utf8')
    const sha = createHash('sha1').update(buf).digest('hex')

    await fetch(`${VERCEL_API}/v2/files`, {
      method: 'POST',
      headers: { ...headers, 'x-vercel-digest': sha, 'Content-Length': buf.length.toString() },
      body: buf,
    })

    return { file: f.path, sha, size: buf.length }
  }))

  // 2. Create deployment
  const deployName = `forge-${projectSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`
  const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: deployName,
      files: fileRefs,
      projectSettings: { framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist', installCommand: 'npm install' },
      env: Object.entries(envVars).map(([k, v]) => ({ key: k, value: v, type: 'plain' })),
      target: 'production',
    }),
  })

  if (!deployRes.ok) {
    const err = await deployRes.text()
    throw new Error(`Vercel deploy failed: ${err}`)
  }

  const deploy = await deployRes.json() as { id: string; url: string }
  return { providerId: deploy.id, deployUrl: `https://${deploy.url}` }
}

export async function pollVercelDeployment(providerId: string): Promise<'ready' | 'error' | 'pending'> {
  const token = process.env.FORGE_VERCEL_API_KEY
  if (!token) throw new Error('FORGE_VERCEL_API_KEY not configured')

  const res = await fetch(`${VERCEL_API}/v13/deployments/${providerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return 'error'
  const data = await res.json() as { readyState: string; url?: string }
  if (data.readyState === 'READY') return 'ready'
  if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') return 'error'
  return 'pending'
}
