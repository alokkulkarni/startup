import { drizzle } from 'drizzle-orm/postgres-js'
import { desc, eq } from 'drizzle-orm'
import * as schema from '../db/schema.js'

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

const SYSTEM_PROMPT_TEMPLATE = `You are Forge AI, an expert full-stack web developer assistant embedded in an AI-powered app builder.

Your job is to help users build web applications by making precise, targeted code changes.

## How to respond

Always structure your response as:
1. A brief explanation of what you're doing (plain text, 1-3 sentences)
2. File changes wrapped in <forge_changes> tags

## File change format

<forge_changes>
<file path="relative/path/to/file.tsx">
\`\`\`diff
--- relative/path/to/file.tsx
+++ relative/path/to/file.tsx
@@ -1,5 +1,7 @@
 unchanged line
+added line
-removed line
 unchanged line
\`\`\`
</file>
</forge_changes>

## Rules
- Use standard unified diff format (--- / +++ / @@ headers required)
- For NEW files: use /dev/null as the --- line, e.g. \`--- /dev/null\`
- For DELETED files: use /dev/null as the +++ line
- Always include 3 lines of context around changes
- Make minimal, surgical changes — never rewrite entire files unnecessarily
- Preserve existing code style and formatting
- If no file changes are needed (e.g., answering a question), omit <forge_changes> entirely

## Current project files
`

export async function buildSystemPrompt(
  projectId: string,
  db: DrizzleDB,
): Promise<string> {
  const files = await db
    .select({ path: schema.projectFiles.path, content: schema.projectFiles.content })
    .from(schema.projectFiles)
    .where(eq(schema.projectFiles.projectId, projectId))

  if (files.length === 0) {
    return SYSTEM_PROMPT_TEMPLATE + '\n(No files yet — this is a new project)\n'
  }

  const fileTree = files
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => {
      const preview = f.content.slice(0, 400)
      const truncated = f.content.length > 400 ? '\n... (truncated)' : ''
      return `### ${f.path}\n\`\`\`\n${preview}${truncated}\n\`\`\``
    })
    .join('\n\n')

  return SYSTEM_PROMPT_TEMPLATE + '\n' + fileTree + '\n'
}

export async function getOrCreateConversation(
  projectId: string,
  db: DrizzleDB,
): Promise<string> {
  // Get the most recent conversation for this project
  const existing = await db
    .select({ id: schema.aiConversations.id })
    .from(schema.aiConversations)
    .where(eq(schema.aiConversations.projectId, projectId))
    .orderBy(desc(schema.aiConversations.createdAt))
    .limit(1)

  if (existing.length > 0) return existing[0].id

  // Create a new one
  const [created] = await db
    .insert(schema.aiConversations)
    .values({ projectId })
    .returning({ id: schema.aiConversations.id })

  return created.id
}

export async function getConversationHistory(
  projectId: string,
  db: DrizzleDB,
  limit = 20,
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const conversationId = await getOrCreateConversation(projectId, db)

  const messages = await db
    .select({
      role: schema.aiMessages.role,
      content: schema.aiMessages.content,
    })
    .from(schema.aiMessages)
    .where(eq(schema.aiMessages.conversationId, conversationId))
    .orderBy(desc(schema.aiMessages.createdAt))
    .limit(limit)

  // Reverse so oldest-first for the AI
  return messages
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}
