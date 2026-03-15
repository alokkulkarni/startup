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
    // Fallback: extract files from markdown code blocks (when AI ignores the format)
    const mdDiffs = extractMarkdownCodeBlocks(content)
    if (mdDiffs.length > 0) {
      return { explanation: stripCodeBlocks(content), diffs: mdDiffs }
    }
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
  await createSnapshot(projectId, db, 'ai', description)
  await runDiffTransaction(projectId, diffs, db)
  return diffs.map(d => d.path)
}

/**
 * Same as `applyDiffs` but skips the snapshot step (use when a snapshot was
 * already taken earlier in the same generation pass).
 */
export async function applyDiffsNoSnapshot(
  projectId: string,
  diffs: FileDiff[],
  db: DrizzleDB,
): Promise<string[]> {
  if (diffs.length === 0) return []
  await runDiffTransaction(projectId, diffs, db)
  return diffs.map(d => d.path)
}

async function runDiffTransaction(projectId: string, diffs: FileDiff[], db: DrizzleDB): Promise<void> {
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

// ---------------------------------------------------------------------------
// Incremental streaming helpers
// ---------------------------------------------------------------------------

/**
 * Scan a growing buffer for newly-completed <file>…</file> blocks.
 * Returns the FileDiffs for any blocks that have fully arrived and have NOT
 * already been written (tracked in `alreadyWritten`).
 *
 * Call this each time new text is appended to the buffer.
 */
export function extractNewlyCompletedFiles(
  buffer: string,
  alreadyWritten: Set<string>,
): FileDiff[] {
  const results: FileDiff[] = []

  // Only operate inside a <forge_changes> block (complete or partial open)
  const forgeOpen = buffer.indexOf('<forge_changes>')
  if (forgeOpen === -1) return results

  // Work on the portion inside the open forge_changes tag
  const inner = buffer.slice(forgeOpen + '<forge_changes>'.length)

  const fileRe = /<file\s+path="([^"]+)"(?:\s+action="([^"]*)")?[^>]*>([\s\S]*?)<\/file>/g
  let m: RegExpExecArray | null

  while ((m = fileRe.exec(inner)) !== null) {
    const path = m[1].trim()
    if (alreadyWritten.has(path)) continue

    const action = (m[2] ?? '').trim().toLowerCase()
    const fileContent = m[3] ?? ''

    if (action === 'delete') {
      results.push({ path, diff: '', isNew: false, isDeleted: true })
    } else {
      const rawContent = fileContent.trimStart().replace(/^\n/, '')
      results.push({ path, diff: rawContent, isNew: true, isDeleted: false })
    }
  }

  return results
}

/**
 * Write (upsert) a single file to the project — used for incremental streaming.
 * Does NOT take a snapshot (the snapshot is taken before the first file is written).
 */
export async function writeSingleFile(
  projectId: string,
  fileDiff: FileDiff,
  db: DrizzleDB,
): Promise<void> {
  if (fileDiff.isDeleted) {
    await db
      .delete(schema.projectFiles)
      .where(
        and(
          eq(schema.projectFiles.projectId, projectId),
          eq(schema.projectFiles.path, fileDiff.path),
        ),
      )
    return
  }

  // For incremental streaming, content is always "full content" (action="create")
  const content = fileDiff.diff
  const mimeType = detectMimeType(fileDiff.path)

  await db
    .insert(schema.projectFiles)
    .values({
      projectId,
      path: fileDiff.path,
      content,
      mimeType,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
    })
    .onConflictDoUpdate({
      target: [schema.projectFiles.projectId, schema.projectFiles.path],
      set: {
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
        updatedAt: new Date(),
      },
    })
}

/**
 * Fallback: extract file path + content from markdown code blocks.
 * Handles these patterns (in order of preference):
 *   1. Comment on first line: // src/App.tsx  or  // filename: src/App.tsx
 *   2. Header just before the block: ### src/App.tsx  or  **src/App.tsx**  or  `src/App.tsx`
 *   3. Language tag + path in fence: ```jsx src/App.jsx
 * Code blocks without a detectable path are skipped (unless there's only one block).
 */
function extractMarkdownCodeBlocks(content: string): FileDiff[] {
  const diffs: FileDiff[] = []
  // Match fenced code blocks: ```lang\ncode\n```
  const blockRe = /```(?:\w+)?\s*([^\n]*)\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  const seen = new Set<string>()

  while ((match = blockRe.exec(content)) !== null) {
    const fenceRemainder = match[1].trim()   // text after the lang tag on the opening fence
    const code = match[2]
    const blockStart = match.index

    let filePath = ''

    // 1. Path on the fence line itself: ```tsx src/App.tsx
    if (fenceRemainder && looksLikePath(fenceRemainder)) {
      filePath = fenceRemainder
    }

    // 2. First line of code is a comment with the filename
    if (!filePath) {
      const firstLine = code.split('\n')[0] ?? ''
      // matches: // src/App.tsx  or  // filename: src/App.tsx  or  # src/index.css
      const commentMatch = firstLine.match(/^(?:\/\/|#)\s*(?:filename:\s*)?(.+\.\w+)\s*$/)
      if (commentMatch && looksLikePath(commentMatch[1])) {
        filePath = commentMatch[1].trim()
      }
    }

    // 3. Heading or bold/code text immediately before the block
    if (!filePath) {
      const before = content.slice(Math.max(0, blockStart - 200), blockStart)
      // ### src/App.tsx  or  ## src/App.tsx
      const headingMatch = before.match(/(?:^|\n)#{1,4}\s+([^\n]+\.\w+)\s*\n?\s*$/)
      if (headingMatch && looksLikePath(headingMatch[1].trim())) {
        filePath = headingMatch[1].trim()
      }
      // **src/App.tsx**  or  `src/App.tsx`
      if (!filePath) {
        const boldOrCode = before.match(/(?:\*\*|`)([^`*\n]+\.\w+)(?:\*\*|`)[:\s]*\n?\s*$/)
        if (boldOrCode && looksLikePath(boldOrCode[1])) {
          filePath = boldOrCode[1].trim()
        }
      }
    }

    if (!filePath || seen.has(filePath)) continue
    seen.add(filePath)

    // Strip leading comment line if it was the filename comment
    let fileContent = code
    const firstLine = code.split('\n')[0] ?? ''
    if (/^(?:\/\/|#)\s*(?:filename:\s*)?/.test(firstLine)) {
      fileContent = code.slice(firstLine.length + 1)
    }

    diffs.push({ path: filePath, diff: fileContent, isNew: true, isDeleted: false })
  }

  return diffs
}

/** True if str looks like a relative file path */
function looksLikePath(str: string): boolean {
  // Must contain a dot (extension) and no spaces (unless quoted)
  return /^[\w./-]+\.\w+$/.test(str.trim())
}

/** Remove all fenced code blocks from a string (for the explanation text) */
function stripCodeBlocks(content: string): string {
  return content.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim()
}
