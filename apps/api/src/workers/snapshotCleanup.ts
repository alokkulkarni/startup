import { Worker, Queue } from 'bullmq'
import type { FastifyInstance } from 'fastify'
import { pruneSnapshots } from '../services/snapshot.js'

export const SNAPSHOT_CLEANUP_QUEUE = 'snapshot-cleanup'

export interface SnapshotCleanupJob {
  projectId: string
}

export function createSnapshotCleanupQueue(redisUrl: string) {
  const url = new URL(redisUrl)
  return new Queue<SnapshotCleanupJob>(SNAPSHOT_CLEANUP_QUEUE, {
    connection: { host: url.hostname, port: parseInt(url.port || '6379') },
  })
}

export function startSnapshotCleanupWorker(redisUrl: string, app: FastifyInstance) {
  const url = new URL(redisUrl)
  const worker = new Worker<SnapshotCleanupJob>(
    SNAPSHOT_CLEANUP_QUEUE,
    async (job) => {
      await pruneSnapshots(job.data.projectId, app.db)
      app.log.info({ projectId: job.data.projectId }, '[snapshot-cleanup] pruned snapshots')
    },
    { connection: { host: url.hostname, port: parseInt(url.port || '6379') } },
  )
  worker.on('failed', (job, err) => {
    app.log.error({ jobId: job?.id, err }, '[snapshot-cleanup] job failed')
  })
  return worker
}
