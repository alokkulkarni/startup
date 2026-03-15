import { desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../db/schema.js'

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

export interface SnapshotFile {
  path: string
  content: string
  mimeType: string
  sizeBytes: number
}

export async function createSnapshot(
  projectId: string,
  db: DrizzleDB,
  triggeredBy: 'ai' | 'manual' | 'restore' = 'ai',
  description?: string,
  label?: string,
): Promise<string> {
  const files = await db
    .select({
      path: schema.projectFiles.path,
      content: schema.projectFiles.content,
      mimeType: schema.projectFiles.mimeType,
      sizeBytes: schema.projectFiles.sizeBytes,
    })
    .from(schema.projectFiles)
    .where(eq(schema.projectFiles.projectId, projectId))

  const [snapshot] = await db
    .insert(schema.projectSnapshots)
    .values({
      projectId,
      filesJson: files as unknown as Record<string, unknown>[],
      triggeredBy,
      description: description ?? null,
      label: label ?? null,
    })
    .returning({ id: schema.projectSnapshots.id })

  return snapshot.id
}

export async function restoreSnapshot(
  projectId: string,
  snapshotId: string,
  db: DrizzleDB,
): Promise<void> {
  const snapshot = await db.query.projectSnapshots.findFirst({
    where: (s, { and, eq }) => and(eq(s.id, snapshotId), eq(s.projectId, projectId)),
  })
  if (!snapshot) throw new Error('Snapshot not found')

  const files = snapshot.filesJson as unknown as SnapshotFile[]

  await db.transaction(async (tx) => {
    // Create pre-restore snapshot
    await createSnapshot(projectId, tx as unknown as DrizzleDB, 'restore', `Before restoring to ${snapshotId}`)

    // Delete all current files
    await tx.delete(schema.projectFiles).where(eq(schema.projectFiles.projectId, projectId))

    // Re-insert snapshot files
    if (files.length > 0) {
      await tx.insert(schema.projectFiles).values(
        files.map(f => ({
          projectId,
          path: f.path,
          content: f.content,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
        }))
      )
    }
  })
}

export async function pruneSnapshots(projectId: string, db: DrizzleDB, keepLast = 50): Promise<void> {
  const all = await db
    .select({ id: schema.projectSnapshots.id })
    .from(schema.projectSnapshots)
    .where(eq(schema.projectSnapshots.projectId, projectId))
    .orderBy(desc(schema.projectSnapshots.createdAt))

  if (all.length <= keepLast) return

  const toDelete = all.slice(keepLast).map(s => s.id)
  for (const id of toDelete) {
    await db.delete(schema.projectSnapshots).where(eq(schema.projectSnapshots.id, id))
  }
}
