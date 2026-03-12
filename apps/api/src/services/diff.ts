import { applyPatch, parsePatch } from 'diff'
import { drizzle } from 'drizzle-orm/postgres-js'
import { and, eq } from 'drizzle-orm'
import * as schema from '../db/schema.js'
import { createSnapshot } from './snapshot.js'

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

export interface FileDiff {
  path: string
  diff: string
  isNew: boolean
  isDeleted: boolean
}

export interface ParsedAIResponse {
  explanation: string
  diffs: FileDiff[]
}

export function parseAIResponse(content: string): ParsedAIResponse {
  const forgeChangesMatch = content.match(/<forge_changes>([\s\S]*?)<\/forge_changes>/)

  if (!forgeChangesMatch) {
    return { explanation: content.trim(), diffs: [] }
  }

  const explanation = content
    .replace(/<forge_changes>[\s\S]*?<\/forge_changes>/g, '')
    .trim()

  const forgeBlock = forgeChangesMatch[1]
  const diffs: FileDiff[] = []

  // Match each <file path="...">...</file> block
  const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g
  let match: RegExpExecArray | null

  while ((match = fileRegex.exec(forgeBlock)) !== null) {
    const path = match[1].trim()
    const fileContent = match[2]

    // Extract the diff block (between ```diff and ```)
    const diffMatch = fileContent.match(/```diff\n([\s\S]*?)```/)
    if (!diffMatch) continue

    const diff = diffMatch[1]

    // Detect new/deleted files from diff headers
    const isNew = diff.includes('--- /dev/null') || diff.includes('--- a/dev/null')
    const isDeleted = diff.includes('+++ /dev/null') || diff.includes('+++ b/dev/null')

    diffs.push({ path, diff, isNew, isDeleted })
  }

  return { explanation, diffs }
}

export async function applyDiffs(
  projectId: string,
  diffs: FileDiff[],
  db: DrizzleDB,
  description?: string,
): Promise<void> {
  if (diffs.length === 0) return

  // Auto-snapshot before applying AI changes
  await createSnapshot(projectId, db, 'ai', description)

  await db.transaction(async (tx) => {
    for (const fileDiff of diffs) {
      if (fileDiff.isDeleted) {
        await tx
          .delete(schema.projectFiles)
          .where(
            and(
              eq(schema.projectFiles.projectId, projectId),
              eq(schema.projectFiles.path, fileDiff.path),
            ),
          )
        continue
      }

      if (fileDiff.isNew) {
        // Extract content from the diff (all + lines without the + prefix)
        const patches = parsePatch(fileDiff.diff)
        let newContent = ''
        for (const patch of patches) {
          for (const hunk of patch.hunks) {
            for (const line of hunk.lines) {
              if (line.startsWith('+')) newContent += line.slice(1) + '\n'
            }
          }
        }
        const mimeType = detectMimeType(fileDiff.path)
        await tx
          .insert(schema.projectFiles)
          .values({
            projectId,
            path: fileDiff.path,
            content: newContent,
            mimeType,
            sizeBytes: Buffer.byteLength(newContent, 'utf8'),
          })
          .onConflictDoUpdate({
            target: [schema.projectFiles.projectId, schema.projectFiles.path],
            set: {
              content: newContent,
              sizeBytes: Buffer.byteLength(newContent, 'utf8'),
              updatedAt: new Date(),
            },
          })
        continue
      }

      // Modify existing file
      const existing = await tx
        .select({ content: schema.projectFiles.content })
        .from(schema.projectFiles)
        .where(
          and(
            eq(schema.projectFiles.projectId, projectId),
            eq(schema.projectFiles.path, fileDiff.path),
          ),
        )

      const originalContent = existing[0]?.content ?? ''
      const patched = applyPatch(originalContent, fileDiff.diff)

      if (patched === false) {
        console.warn(`[diff] Failed to apply patch to ${fileDiff.path} — skipping`)
        continue
      }

      await tx
        .update(schema.projectFiles)
        .set({
          content: patched,
          sizeBytes: Buffer.byteLength(patched, 'utf8'),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.projectFiles.projectId, projectId),
            eq(schema.projectFiles.path, fileDiff.path),
          ),
        )
    }
  })
}

function detectMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'text/typescript', tsx: 'text/typescript', js: 'text/javascript', jsx: 'text/javascript',
    css: 'text/css', scss: 'text/x-scss', html: 'text/html', json: 'application/json',
    md: 'text/markdown', py: 'text/x-python', go: 'text/x-go', rs: 'text/x-rust',
    sql: 'application/sql', sh: 'application/x-sh', yaml: 'text/x-yaml', yml: 'text/x-yaml',
  }
  return map[ext] ?? 'text/plain'
}
