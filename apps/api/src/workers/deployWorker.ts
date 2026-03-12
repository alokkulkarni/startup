import { Worker, Queue } from 'bullmq'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import * as schema from '../db/schema.js'
import { deployToVercel, pollVercelDeployment } from '../services/deploy/vercel.js'
import { deployToNetlify, pollNetlifyDeploy } from '../services/deploy/netlify.js'
import { deployToCloudflare } from '../services/deploy/cloudflare.js'
import { decrypt } from '../lib/crypto.js'

export const DEPLOY_QUEUE = 'deploy'

export interface DeployJob {
  deploymentId: string
  projectId: string
  provider: 'vercel' | 'netlify' | 'cloudflare'
}

export function createDeployQueue(redisUrl: string) {
  const url = new URL(redisUrl)
  return new Queue<DeployJob>(DEPLOY_QUEUE, {
    connection: { host: url.hostname, port: parseInt(url.port || '6379') },
  })
}

export function startDeployWorker(redisUrl: string, app: FastifyInstance) {
  const url = new URL(redisUrl)
  const worker = new Worker<DeployJob>(DEPLOY_QUEUE, async (job) => {
    const { deploymentId, projectId, provider } = job.data
    app.log.info({ deploymentId, provider }, '[deploy] starting deployment')

    try {
      // Mark as 'building'
      await app.db.update(schema.deployments)
        .set({ status: 'building', updatedAt: new Date() })
        .where(eq(schema.deployments.id, deploymentId))

      // Fetch project files
      const files = await app.db.select({
        path: schema.projectFiles.path,
        content: schema.projectFiles.content,
      }).from(schema.projectFiles).where(eq(schema.projectFiles.projectId, projectId))

      // Fetch env vars (decrypt)
      const envRows = await app.db.select({
        key: schema.projectEnvVars.key,
        valueEnc: schema.projectEnvVars.valueEnc,
      }).from(schema.projectEnvVars).where(eq(schema.projectEnvVars.projectId, projectId))

      const envVars: Record<string, string> = {}
      for (const row of envRows) {
        envVars[row.key] = decrypt(row.valueEnc)
      }

      // Get project slug
      const project = await app.db.query.projects.findFirst({
        where: (p, { eq: eqFn }) => eqFn(p.id, projectId),
      })
      const slug = project?.name?.toLowerCase().replace(/\s+/g, '-') ?? projectId.slice(0, 8)

      // Deploy
      let providerId: string
      let deployUrl: string

      if (provider === 'vercel') {
        const result = await deployToVercel(slug, files, envVars)
        providerId = result.providerId
        deployUrl = result.deployUrl
      } else if (provider === 'netlify') {
        const result = await deployToNetlify(slug, files, envVars)
        providerId = result.providerId
        deployUrl = result.deployUrl
      } else {
        const result = await deployToCloudflare(slug, files, envVars)
        providerId = result.providerId
        deployUrl = result.deployUrl
      }

      // Update with provider ID
      await app.db.update(schema.deployments)
        .set({ providerId, deployUrl, updatedAt: new Date() })
        .where(eq(schema.deployments.id, deploymentId))

      // Poll until ready (max 5 min, every 5s)
      const startTime = Date.now()
      while (Date.now() - startTime < 300_000) {
        await new Promise(r => setTimeout(r, 5000))
        let pollStatus: 'ready' | 'error' | 'pending'
        if (provider === 'vercel') pollStatus = await pollVercelDeployment(providerId)
        else if (provider === 'netlify') pollStatus = await pollNetlifyDeploy(providerId)
        else break // CF polling needs project name; mark ready immediately after deploy

        if (pollStatus === 'ready') {
          await app.db.update(schema.deployments)
            .set({ status: 'deployed', updatedAt: new Date() })
            .where(eq(schema.deployments.id, deploymentId))
          app.log.info({ deploymentId, deployUrl }, '[deploy] deployment ready')
          return
        }
        if (pollStatus === 'error') throw new Error('Provider reported deployment error')
      }

      // Timeout or CF — mark deployed (URL is live)
      await app.db.update(schema.deployments)
        .set({ status: 'deployed', updatedAt: new Date() })
        .where(eq(schema.deployments.id, deploymentId))

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      app.log.error({ deploymentId, err }, '[deploy] deployment failed')
      await app.db.update(schema.deployments)
        .set({ status: 'failed', errorMessage: message, updatedAt: new Date() })
        .where(eq(schema.deployments.id, deploymentId))
      throw err
    }
  }, {
    connection: { host: url.hostname, port: parseInt(url.port || '6379') },
    concurrency: 3,
  })

  worker.on('failed', (job, err) => {
    app.log.error({ jobId: job?.id, err }, '[deploy] worker job failed')
  })

  return worker
}
