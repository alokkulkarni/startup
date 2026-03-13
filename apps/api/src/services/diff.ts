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

  // Match each <file path="..." action="...">...</file> block
  const fileRegex = /<file\s+path="([^"]+)"(?:\s+action="([^"]*)")?[^>]*>([\s\S]*?)<\/file>/g
  let match: RegExpExecArray | null

  while ((match = fileRegex.exec(forgeBlock)) !== null) {
    const path = match[1].trim()
    const action = (match[2] ?? '').trim().toLowerCase() // create | modify | delete | ''
    const fileContent = match[3] ?? ''

    // action="delete" — mark for deletion
    if (action === 'delete') {
      diffs.push({ path, diff: '', isNew: false, isDeleted: true })
      continue
    }

    // action="create" or content has no diff fences → treat as full file content
    if (action === 'create' || (!fileContent.includes('```diff') && !fileContent.includes('--- ') && fileContent.trim().length > 0)) {
      // Store full content in diff field with a sentinel prefix so applyDiffs can detect it
      const rawContent = fileContent.trimStart().replace(/^\n/, '')
      diffs.push({ path, diff: rawContent, isNew: true, isDeleted: false })
      continue
    }

    // action="modify" or legacy format — extract the unified diff block
    const diffMatch = fileContent.match(/```diff\n([\s\S]*?)```/)
    if (diffMatch) {
      const diff = diffMatch[1]
      const isNew = diff.includes('--- /dev/null') || diff.includes('--- a/dev/null')
      const isDeleted = diff.includes('+++ /dev/null') || diff.includes('+++ b/dev/null')
      diffs.push({ path, diff, isNew, isDeleted })
      continue
    }

    // Raw diff without fences
    const rawDiff = fileContent.trim()
    if (rawDiff.startsWith('---') || rawDiff.startsWith('@@')) {
      const isNew = rawDiff.includes('--- /dev/null')
      const isDeleted = rawDiff.includes('+++ /dev/null')
      diffs.push({ path, diff: rawDiff, isNew, isDeleted })
    }
  }

  return { explanation, diffs }
}

export async function applyDiffs(
  projectId: string,
  diffs: FileDiff[],
  db: DrizzleDB,
  description?: string,
): Promise<string[]> {
  if (diffs.length === 0) return []

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
        // Full content format (action="create") — use diff field directly as content
        // Unified diff format (--- /dev/null) — extract + lines
        let newContent: string
        if (fileDiff.diff.startsWith('---') || fileDiff.diff.includes('@@ ')) {
          const patches = parsePatch(fileDiff.diff)
          newContent = ''
          for (const patch of patches) {
            for (const hunk of patch.hunks) {
              for (const line of hunk.lines) {
                if (line.startsWith('+')) newContent += line.slice(1) + '\n'
              }
            }
          }
        } else {
          // Full raw content (action="create" format)
          newContent = fileDiff.diff
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

  // Return list of changed file paths
  return diffs.map(d => d.path)
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
