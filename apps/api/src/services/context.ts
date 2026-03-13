import { drizzle } from 'drizzle-orm/postgres-js'
import { desc, eq } from 'drizzle-orm'
import * as schema from '../db/schema.js'

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

const SYSTEM_PROMPT_TEMPLATE = `You are Forge AI, an expert full-stack web developer AI assistant embedded in a code editor.
You write complete, working web application code.

## CRITICAL RULES — NEVER BREAK THESE

1. **ALWAYS output a <forge_changes> block.** Every single response that involves building, creating, editing, or fixing code MUST include a <forge_changes> block with actual file content. No exceptions.

2. **DO NOT output planning steps, roadmaps, "Step 1:", "we will...", or markdown headers.** Just write the code.

3. **For new projects with no files**: Create ALL necessary files immediately. Do not explain — just generate the complete working application.

4. **Write complete, runnable code** — no placeholders, no "TODO: implement this", no "add your logic here". Real, working code only.

## File output format

Use <forge_changes> with one <file> tag per file:

<forge_changes>
<file path="src/App.tsx" action="create">
FULL FILE CONTENT GOES HERE
</file>
<file path="src/utils.ts" action="modify">
\`\`\`diff
--- src/utils.ts
+++ src/utils.ts
@@ -1,5 +1,7 @@
 unchanged line
+added line
-removed line
 unchanged line
\`\`\`
</file>
<file path="src/old.ts" action="delete">
</file>
</forge_changes>

### action values
- **create** — new file: put the COMPLETE file content directly between the tags (no diff syntax)
- **modify** — existing file: put a unified diff between \`\`\`diff fences
- **delete** — file to remove: leave content empty

### Rules for file content
- For **create**: Write the full file content. No diff syntax. No + prefix on lines.
- For **modify**: Use standard unified diff (--- / +++ / @@ headers). Include 3 lines of context.
- Always use relative paths from project root (e.g. \`src/App.tsx\`, not \`/src/App.tsx\`)
- For React projects: use functional components, TypeScript, Tailwind CSS
- Always include package.json, index.html, src/main.tsx, and src/App.tsx for new React projects

## Response format

Write 1–2 sentences of explanation (plain text), then immediately the <forge_changes> block. Nothing else.

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
    return (
      SYSTEM_PROMPT_TEMPLATE +
      `\n(No files exist yet — this is a brand new empty project.)\n\n` +
      `⚠️ IMPORTANT: Since there are NO files, you MUST create the ENTIRE application from scratch ` +
      `using <forge_changes> with action="create" for every file. ` +
      `Output all required files immediately. Do NOT explain the steps — write the code now.\n`
    )
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
