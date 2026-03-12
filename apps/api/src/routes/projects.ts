import type { FastifyInstance } from 'fastify'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { projects, projectFiles, workspaceMembers } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

// ── Starter templates ──────────────────────────────────────────────────────────
const STARTER_FILES: Record<string, Record<string, string>> = {
  react: {
    'package.json': JSON.stringify({
      name: 'my-app',
      version: '0.0.1',
      private: true,
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0' },
      devDependencies: { '@vitejs/plugin-react': '^4.3.0', vite: '^5.3.0', typescript: '^5.5.0' },
    }, null, 2),
    'vite.config.ts': `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })\n`,
    'index.html': `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>My App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
    'src/main.tsx': `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)\n`,
    'src/App.tsx': `export default function App() {\n  return (\n    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>\n      <h1>Hello from Forge AI 🔨</h1>\n      <p>Start editing <code>src/App.tsx</code> to build your app.</p>\n    </div>\n  )\n}\n`,
    'src/App.css': `body { margin: 0; background: #fff; }\n`,
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2020', lib: ['ES2020','DOM'], jsx: 'react-jsx', module: 'ESNext', moduleResolution: 'bundler', strict: true }, include: ['src'] }, null, 2),
  },
  nextjs: {
    'package.json': JSON.stringify({
      name: 'my-next-app',
      version: '0.0.1',
      private: true,
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: { next: '14.2.5', react: '^18.3.0', 'react-dom': '^18.3.0' },
      devDependencies: { typescript: '^5.5.0', '@types/react': '^18.3.0', tailwindcss: '^3.4.0', autoprefixer: '^10.4.0', postcss: '^8.4.0' },
    }, null, 2),
    'next.config.mjs': `/** @type {import('next').NextConfig} */\nexport default {}\n`,
    'src/app/layout.tsx': `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="en"><body>{children}</body></html>\n}\n`,
    'src/app/page.tsx': `export default function Home() {\n  return (\n    <main className="flex min-h-screen flex-col items-center justify-center p-24">\n      <h1 className="text-4xl font-bold">Hello from Forge AI 🔨</h1>\n      <p className="mt-4 text-gray-600">Edit <code>src/app/page.tsx</code> to get started.</p>\n    </main>\n  )\n}\n`,
    'src/app/globals.css': `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
    'tailwind.config.ts': `import type { Config } from 'tailwindcss'\nexport default { content: ['./src/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] } satisfies Config\n`,
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2017', lib: ['dom','esnext'], module: 'esnext', moduleResolution: 'bundler', jsx: 'preserve', strict: true, paths: { '@/*': ['./src/*'] } } }, null, 2),
  },
  vue: {
    'package.json': JSON.stringify({
      name: 'my-vue-app',
      version: '0.0.1',
      private: true,
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { vue: '^3.4.0' },
      devDependencies: { '@vitejs/plugin-vue': '^5.0.0', vite: '^5.3.0', typescript: '^5.5.0' },
    }, null, 2),
    'vite.config.ts': `import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'\nexport default defineConfig({ plugins: [vue()] })\n`,
    'src/App.vue': `<template>\n  <div style="font-family: sans-serif; padding: 2rem">\n    <h1>Hello from Forge AI 🔨</h1>\n    <p>Edit <code>src/App.vue</code> to build your app.</p>\n  </div>\n</template>\n`,
    'src/main.ts': `import { createApp } from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#app')\n`,
    'index.html': `<!DOCTYPE html>\n<html><head><title>Vue App</title></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n`,
  },
  svelte: {
    'package.json': JSON.stringify({
      name: 'my-svelte-app',
      version: '0.0.1',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { svelte: '^4.2.0' },
      devDependencies: { '@sveltejs/vite-plugin-svelte': '^3.0.0', vite: '^5.3.0' },
    }, null, 2),
    'src/App.svelte': `<h1>Hello from Forge AI 🔨</h1>\n<p>Edit <code>src/App.svelte</code> to build your app.</p>\n`,
    'src/main.ts': `import App from './App.svelte'\nconst app = new App({ target: document.getElementById('app')! })\nexport default app\n`,
  },
  vanilla: {
    'package.json': JSON.stringify({ name: 'my-app', version: '0.0.1', scripts: { dev: 'vite', build: 'vite build' }, devDependencies: { vite: '^5.3.0', typescript: '^5.5.0' } }, null, 2),
    'index.html': `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>My App</title></head>\n<body>\n  <h1>Hello from Forge AI 🔨</h1>\n  <p>Edit <code>src/main.ts</code> to build your app.</p>\n  <script type="module" src="/src/main.ts"></script>\n</body>\n</html>\n`,
    'src/main.ts': `console.log('Hello from Forge AI!')\n`,
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'ESNext', moduleResolution: 'bundler', strict: true } }, null, 2),
  },
}

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  framework: z.enum(['react', 'nextjs', 'vue', 'svelte', 'vanilla']).default('react'),
  description: z.string().max(500).optional(),
})

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

async function getDbUser(app: FastifyInstance, keycloakId: string) {
  return app.db.query.users.findFirst({
    where: (u, { eq }) => eq(u.keycloakId, keycloakId),
  })
}

async function assertProjectAccess(app: FastifyInstance, projectId: string, userId: string) {
  const project = await app.db.query.projects.findFirst({
    where: (p, { and, eq, ne }) =>
      and(eq(p.id, projectId), ne(p.status, 'deleted')),
  })
  if (!project) return null

  const member = await app.db.query.workspaceMembers.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.workspaceId, project.workspaceId), eq(m.userId, userId)),
  })
  return member ? project : null
}

export async function projectRoutes(app: FastifyInstance) {
  // POST /api/v1/projects
  app.post('/', {
    schema: { tags: ['projects'], summary: 'Create a new project', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const parsed = CreateProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    }

    const user = await getDbUser(app, request.user.keycloakId)
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Call /auth/sync first' } })

    // Get user's first workspace
    const membership = await app.db.query.workspaceMembers.findFirst({
      where: (m, { eq }) => eq(m.userId, user.id),
      with: { workspace: true },
    })
    if (!membership) return reply.code(404).send({ success: false, error: { code: 'NO_WORKSPACE', message: 'No workspace found' } })

    const { name, framework, description } = parsed.data

    const [project] = await app.db
      .insert(projects)
      .values({ workspaceId: membership.workspaceId, name, framework, description, status: 'active' })
      .returning()

    // Seed starter files
    const starterFiles = STARTER_FILES[framework] ?? STARTER_FILES.react
    const fileInserts = Object.entries(starterFiles).map(([path, content]) => ({
      projectId: project.id,
      path,
      content,
      mimeType: path.endsWith('.json') ? 'application/json' : path.endsWith('.html') ? 'text/html' : path.endsWith('.css') ? 'text/css' : 'text/plain',
      sizeBytes: Buffer.byteLength(content, 'utf8'),
    }))

    if (fileInserts.length > 0) {
      await app.db.insert(projectFiles).values(fileInserts)
    }

    app.log.info({ projectId: project.id, framework }, 'Project created with starter files')

    return reply.code(201).send({ success: true, data: project })
  })

  // GET /api/v1/projects
  app.get('/', {
    schema: { tags: ['projects'], summary: 'List projects for current user', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const user = await getDbUser(app, request.user.keycloakId)
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } })

    const memberships = await app.db.query.workspaceMembers.findMany({
      where: (m, { eq }) => eq(m.userId, user.id),
    })
    const workspaceIds = memberships.map(m => m.workspaceId)

    if (workspaceIds.length === 0) {
      return reply.send({ success: true, data: [] })
    }

    const userProjects = await app.db.query.projects.findMany({
      where: (p, { and, inArray, ne }) =>
        and(inArray(p.workspaceId, workspaceIds), ne(p.status, 'deleted')),
      orderBy: (p, { desc }) => [desc(p.updatedAt)],
    })

    return reply.send({ success: true, data: userProjects })
  })

  // GET /api/v1/projects/:id
  app.get('/:id', {
    schema: { tags: ['projects'], summary: 'Get project by ID', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const { id } = request.params as { id: string }
    const user = await getDbUser(app, request.user.keycloakId)
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } })

    const project = await assertProjectAccess(app, id, user.id)
    if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } })

    return reply.send({ success: true, data: project })
  })

  // PATCH /api/v1/projects/:id
  app.patch('/:id', {
    schema: { tags: ['projects'], summary: 'Update project', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const { id } = request.params as { id: string }
    const parsed = UpdateProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    }

    const user = await getDbUser(app, request.user.keycloakId)
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } })

    const existing = await assertProjectAccess(app, id, user.id)
    if (!existing) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } })

    const [updated] = await app.db
      .update(projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning()

    return reply.send({ success: true, data: updated })
  })

  // DELETE /api/v1/projects/:id — soft delete
  app.delete('/:id', {
    schema: { tags: ['projects'], summary: 'Soft-delete project', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const { id } = request.params as { id: string }
    const user = await getDbUser(app, request.user.keycloakId)
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } })

    const existing = await assertProjectAccess(app, id, user.id)
    if (!existing) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } })

    await app.db
      .update(projects)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(projects.id, id))

    return reply.send({ success: true, data: { message: 'Project deleted' } })
  })

  // POST /api/v1/projects/:id/duplicate
  app.post('/:id/duplicate', {
    schema: { tags: ['projects'], summary: 'Duplicate a project', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const { id } = request.params as { id: string }
    const user = await getDbUser(app, request.user.keycloakId)
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } })

    const source = await assertProjectAccess(app, id, user.id)
    if (!source) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } })

    // Clone project record
    const [copy] = await app.db
      .insert(projects)
      .values({
        workspaceId: source.workspaceId,
        name: `${source.name} (copy)`,
        framework: source.framework,
        description: source.description,
        status: 'active',
      })
      .returning()

    // Clone all files
    const sourceFiles = await app.db.query.projectFiles.findMany({
      where: (f, { eq }) => eq(f.projectId, id),
    })

    if (sourceFiles.length > 0) {
      await app.db.insert(projectFiles).values(
        sourceFiles.map(f => ({
          projectId: copy.id,
          path: f.path,
          content: f.content,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
        })),
      )
    }

    app.log.info({ sourceId: id, copyId: copy.id }, 'Project duplicated')
    return reply.code(201).send({ success: true, data: copy })
  })

  // GET /api/v1/projects/:id/files
  app.get('/:id/files', {
    schema: { tags: ['projects'], summary: 'List project files', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const { id } = request.params as { id: string }
    const user = await getDbUser(app, request.user.keycloakId)
    if (!user) return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } })

    const project = await assertProjectAccess(app, id, user.id)
    if (!project) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } })

    const files = await app.db.query.projectFiles.findMany({
      where: (f, { eq }) => eq(f.projectId, id),
      columns: { projectId: true, path: true, mimeType: true, sizeBytes: true, updatedAt: true },
    })

    return reply.send({ success: true, data: files })
  })
}
