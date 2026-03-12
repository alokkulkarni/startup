# Forge AI — Architecture & Design Document

**Version:** 1.0  
**Status:** Approved for Engineering  
**Date:** March 2026  
**Audience:** Engineering team, Technical co-founders, Senior engineers

---

## Table of Contents

1. [Document Overview](#1-document-overview)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [AI Layer Architecture](#5-ai-layer-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Infrastructure Architecture](#7-infrastructure-architecture)
8. [Integration Architecture](#8-integration-architecture)
9. [Frontend Component Architecture](#9-frontend-component-architecture)
10. [Security & Compliance](#10-security--compliance)
11. [Architectural Decision Records (ADRs)](#11-architectural-decision-records-adrs)
12. [Open Questions & Future Considerations](#12-open-questions--future-considerations)

---

## 1. Document Overview

### Purpose
This document defines the complete technical architecture for Forge AI — an AI-powered full-stack application builder. It serves as the authoritative reference for all engineering decisions and is intended to be read before writing a single line of production code.

### Architecture Principles

| Principle | Description |
|-----------|-------------|
| **API-First** | Every feature is built as an API endpoint before any UI. The UI is a consumer of the API, not the other way around. |
| **Security by Default** | Authentication, authorization, and input validation are non-negotiable on every endpoint. No "we'll add auth later." |
| **Value at Every Layer** | Each layer (frontend, API, AI, infra) must be independently deployable and testable. No big-bang deploys. |
| **Fail Gracefully** | Every integration with an external service (Claude, Vercel, GitHub, Stripe) has a fallback, timeout, and meaningful error message. |
| **Observable by Design** | Logs, metrics, and traces are built in from Sprint 0 — not bolted on after incidents. |
| **No Lock-in for Users** | Users own their code. Export as ZIP, push to GitHub, deploy anywhere. We compete on value, not captivity. |
| **12-Factor App** | Config in env vars, stateless processes, dev/prod parity, disposable containers. |

### Key Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| In-browser execution | WebContainers | Zero server compute, infinite scale, instant preview |
| Primary AI provider | AWS Bedrock | Enterprise SLA, cost control, no egress to third-party, unified AWS billing |
| Primary AI model | Claude 3.5 Sonnet via Bedrock | Best code quality; accessed through Bedrock for compliance + cost |
| Fallback AI tier 1 | Anthropic API (direct) | Same model, direct API if Bedrock has regional outage |
| Fallback AI tier 2 | Google Gemini 2.0 Flash | Different model family; 1M context, cheaper than GPT-4o |
| Fallback AI tier 3 | OpenAI GPT-4o | Last resort only |
| Vision tasks | Claude 3.5 Sonnet v2 (Bedrock) primary, Gemini 2.0 Flash fallback | Both support multimodal natively |
| AI response format | Unified diffs | Efficient context use, easier review, partial apply |
| **Auth provider** | **Keycloak 24** | **Open source, Docker-native, OIDC/OAuth2/SAML/MFA — cloud-agnostic, self-hosted** |
| **Database** | **PostgreSQL 16 + Drizzle ORM** | **Standard SQL, Docker-native, runs anywhere — RDS, Cloud SQL, Azure DB, or self-hosted** |
| **Cache / Queue** | **Redis 7** | **Open standard, Docker-native — ElastiCache, Memorystore, or self-hosted** |
| **File storage** | **MinIO (S3-compatible API)** | **Runs locally in Docker; same API works against AWS S3, GCS, Azure Blob in cloud** |
| **Reverse proxy** | **Traefik** | **Docker-native, auto SSL, cloud-agnostic — no Vercel/Railway hosting dependency** |
| **Container registry** | **GHCR (GitHub Container Registry)** | **Free, integrated with GitHub Actions CI/CD pipeline** |
| **Local dev** | **Docker Compose** | **Single command spins full stack locally: Postgres, Redis, MinIO, Keycloak, API, Web** |
| Real-time collab | Liveblocks | CRDT-based, Monaco binding available, battle-tested |
| API framework | Fastify | 2× throughput vs Express, TypeScript-native, schema validation |

---

## 2. System Architecture Overview

### C4 Level 1 — System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FORGE AI PLATFORM                           │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐   │
│  │              │    │                                          │   │
│  │   Browser    │◄──►│         Forge AI Web App                │   │
│  │   (User)     │    │   (Next.js in Docker / Traefik)         │   │
│  │              │    │                                          │   │
│  └──────────────┘    └──────────────┬───────────────────────────┘   │
│                                     │                               │
│                                     ▼                               │
│                        ┌────────────────────┐                       │
│                        │   Forge API        │                       │
│                        │  (Fastify/Docker)  │                       │
│                        └────────┬───────────┘                       │
│                                 │                                   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
        ┌─────────────────────────┼──────────────────────────────┐
        │                         │                              │
        ▼                         ▼                              ▼
┌──────────────┐        ┌──────────────────┐         ┌────────────────┐
│  AWS Bedrock │        │   PostgreSQL 16  │         │    Stripe      │
│  (PRIMARY)   │        │  (Postgres DB    │         │   (Billing)    │
│  Claude 3.5  │        │  + RLS policies) │         │                │
└──────────────┘        └──────────────────┘         └────────────────┘
        │                         │                              │
┌──────────────┐        ┌──────────────────┐         ┌────────────────┐
│  Anthropic   │        │   Redis 7        │         │    GitHub      │
│  API         │        │  (Cache + Queue) │         │    API         │
│  (Fallback 1)│        │                  │         │                │
└──────────────┘        └──────────────────┘         └────────────────┘
        │                         │
┌──────────────┐        ┌──────────────────┐
│  Gemini 2.0  │        │     MinIO        │
│  Flash       │        │  (S3-compatible  │
│  (Fallback 2)│        │   File Storage)  │
└──────────────┘        └──────────────────┘
        │                         │
┌──────────────┐        ┌──────────────────┐
│  OpenAI API  │        │   Keycloak 24    │
│  GPT-4o      │        │  (OIDC/OAuth2    │
│  (Fallback 3)│        │   Identity)      │
└──────────────┘        └──────────────────┘
                                  │
                        ┌──────────────────┐
                        │   Vercel API     │
                        │   Netlify API    │
                        │  Cloudflare API  │
                        │  (User deploy    │
                        │   targets only)  │
                        └──────────────────┘
```

### C4 Level 2 — Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  USER BROWSER                                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Next.js Web App (Docker + Traefik / any cloud)         │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │   │
│  │  │  Dashboard  │  │  Workspace   │  │  Marketing    │  │   │
│  │  │  (SSR)      │  │  (CSR Heavy) │  │  Pages (SSG)  │  │   │
│  │  └─────────────┘  └──────┬───────┘  └───────────────┘  │   │
│  │                          │                              │   │
│  │              ┌───────────┼───────────┐                  │   │
│  │              │           │           │                  │   │
│  │    ┌─────────▼──┐  ┌─────▼─────┐  ┌─▼──────────────┐  │   │
│  │    │   Monaco   │  │  AI Chat  │  │  WebContainer  │  │   │
│  │    │   Editor   │  │  Stream   │  │  (Node.js in   │  │   │
│  │    │            │  │           │  │   browser)     │  │   │
│  │    └────────────┘  └───────────┘  └────────────────┘  │   │
│  │                                                         │   │
│  │  State: Zustand (UI) + TanStack Query (server)          │   │
│  │          + Liveblocks (real-time collaboration)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS / SSE
                                  │
                    ┌─────────────▼──────────────┐
                    │  Traefik (Reverse Proxy)    │
                    │  - TLS termination          │
                    │  - Route /api → API         │
                    │  - Route /    → Web         │
                    │  - Docker-native, auto SSL  │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  FORGE API  (Fastify — Docker container)                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  REST API   │  │  SSE Stream │  │  BullMQ Workers         │ │
│  │  Routes     │  │  (AI Chat)  │  │  deploy / snapshot /    │ │
│  │             │  │             │  │  thumbnail / email      │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│  ┌──────▼──────────────────────────────────────▼─────────────┐ │
│  │  Services Layer                                           │ │
│  │  AIService | DeployService | GitHubService | StorageService│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└───────────┬─────────────────────┬───────────────────────────────┘
            │                     │
            ▼                     ▼
┌──────────────────┐   ┌──────────────────────────────────────────┐
│  PostgreSQL 16   │   │  Redis 7                                 │
│  (Docker local / │   │  (Docker local /                         │
│   RDS/Cloud SQL  │   │   ElastiCache/Memorystore in cloud)      │
│   in cloud)      │   │  - Session cache                         │
│  - RLS policies  │   │  - Rate limit counters                   │
│  - Drizzle ORM   │   │  - BullMQ job queue                      │
│  - pgBouncer     │   │  - AI response cache (future)            │
│    (pool)        │   └──────────────────────────────────────────┘
└──────────────────┘
            │
┌──────────────────┐   ┌──────────────────────────────────────────┐
│  MinIO           │   │  Keycloak 24                             │
│  (Docker local / │   │  (Docker local /                         │
│   any S3-compat. │   │   any container platform in cloud)       │
│   in cloud)      │   │  - OIDC / OAuth2                         │
│  - User avatars  │   │  - GitHub + Google identity brokering    │
│  - Snapshots     │   │  - MFA, SAML (Enterprise)                │
│  - Assets        │   │  - Session management                    │
└──────────────────┘   └──────────────────────────────────────────┘
```

### Core Data Flow: User Prompt → Live Preview Update

```
1. User types prompt in AI Chat input
       │
2. POST /v1/projects/:id/ai/chat  (HTTP request with body)
       │
3. API middleware: validate Keycloak OIDC token → check rate limit → load project
       │
4. AIService.buildContext():
   - Load project files from PostgreSQL (via Drizzle ORM)
   - Fetch last 20 messages from ai_conversations
   - Assemble system prompt + file tree + history + user prompt
       │
5. Call Anthropic streaming API (Claude 3.5 Sonnet)
       │
6. Stream tokens back to browser via SSE
       │  (browser renders tokens in real time)
       │
7. DiffParser extracts file changes from completed response
       │
8. Apply diffs → update project_files in PostgreSQL
       │
9. Create snapshot in project_snapshots (before apply)
       │
10. Browser receives "files_changed" event via SSE
        │
11. useWebContainer hook writes new file content to WebContainer FS
        │
12. Vite HMR detects file change → hot-reloads preview
        │
13. User sees updated app in preview pane within 500ms of AI completing
```

---

## 3. Frontend Architecture

### 3.1 Application Directory Structure

```
apps/web/
├── src/
│   ├── app/                          # Next.js 14 App Router
│   │   ├── (auth)/                   # Auth route group (no layout)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx            # Minimal auth layout
│   │   ├── (marketing)/              # Public pages (no auth)
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── pricing/page.tsx
│   │   │   ├── templates/page.tsx    # Public template gallery
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Protected dashboard
│   │   │   ├── dashboard/page.tsx    # Project grid
│   │   │   ├── settings/page.tsx     # User + workspace settings
│   │   │   ├── billing/page.tsx
│   │   │   └── layout.tsx            # Dashboard shell (sidebar + header)
│   │   ├── workspace/
│   │   │   └── [projectId]/
│   │   │       └── page.tsx          # The main workspace (CSR only)
│   │   └── api/                      # Next.js API routes (thin proxy)
│   │       ├── auth/callback/route.ts # Keycloak OIDC callback handler
│   │       └── ai/stream/route.ts    # SSE proxy (streams from Forge API)
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (Button, Card, etc.)
│   │   ├── editor/
│   │   │   ├── MonacoEditor.tsx      # Lazy-loaded Monaco wrapper
│   │   │   ├── FileTree.tsx          # Recursive file tree
│   │   │   ├── FileTreeNode.tsx      # Single file/folder node
│   │   │   └── TabBar.tsx            # Open file tabs
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx         # Full chat UI container
│   │   │   ├── ChatMessage.tsx       # User/assistant message bubble
│   │   │   ├── DiffViewer.tsx        # Syntax-highlighted diff display
│   │   │   ├── ChatInput.tsx         # Textarea + send controls
│   │   │   └── SuggestedPrompts.tsx  # Contextual prompt chips
│   │   ├── preview/
│   │   │   ├── PreviewPanel.tsx      # Container with toolbar + iframe
│   │   │   ├── PreviewFrame.tsx      # WebContainer iframe
│   │   │   ├── ConsolePanel.tsx      # Console output display
│   │   │   ├── ErrorOverlay.tsx      # Runtime error overlay
│   │   │   └── ViewportToggle.tsx    # Mobile/tablet/desktop switcher
│   │   ├── workspace/
│   │   │   ├── WorkspaceLayout.tsx   # Resizable three-panel layout
│   │   │   ├── WorkspaceHeader.tsx   # Top bar with project name + actions
│   │   │   └── CommandPalette.tsx    # Cmd+K global command palette
│   │   ├── dashboard/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectGrid.tsx
│   │   │   └── NewProjectModal.tsx
│   │   └── shared/
│   │       ├── ToastProvider.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── SkeletonCard.tsx
│   │
│   ├── hooks/                        # Custom React hooks (see §9.2)
│   │   ├── useWebContainer.ts
│   │   ├── useAIStream.ts
│   │   ├── useProject.ts
│   │   ├── useVersionHistory.ts
│   │   ├── useCollaboration.ts
│   │   └── useDeploy.ts
│   │
│   ├── stores/                       # Zustand stores
│   │   ├── editorStore.ts            # Open tabs, active file, cursor positions
│   │   ├── workspaceStore.ts         # Panel sizes, sidebar state, view mode
│   │   └── uiStore.ts                # Toasts, modals, command palette state
│   │
│   ├── lib/
│   │   ├── api.ts                    # Typed API client (wraps fetch)
│   │   ├── auth/
│   │   │   ├── keycloak.ts           # Keycloak OIDC client (openid-client)
│   │   │   └── session.ts            # Server-side session helpers (iron-session)
│   │   ├── db/
│   │   │   ├── client.ts             # Drizzle ORM client (postgres.js driver)
│   │   │   └── types.ts              # Inferred types from Drizzle schema
│   │   ├── storage/
│   │   │   └── minio.ts              # MinIO S3 client (aws-sdk v3 S3Client)
│   │   ├── webcontainer/
│   │   │   ├── manager.ts            # WebContainer lifecycle manager
│   │   │   └── fileSync.ts           # Postgres files → WebContainer FS sync
│   │   ├── diff/
│   │   │   ├── parser.ts             # Parse unified diff strings
│   │   │   └── renderer.tsx          # Render diff as React component
│   │   └── constants.ts
│   │
│   └── types/
│       ├── api.ts                    # API request/response types
│       ├── project.ts
│       └── ai.ts
│
├── public/
├── next.config.ts                    # COOP/COEP headers for WebContainers
├── tailwind.config.ts
└── tsconfig.json
```

### 3.2 State Management Strategy

| State Type | Tool | Examples |
|-----------|------|---------|
| **UI State** | Zustand | Open tabs, panel widths, sidebar collapsed, active modal |
| **Server State** | TanStack Query | Projects list, file content, deployment history, conversation |
| **Real-time Shared** | Liveblocks | Cursor positions, collaborator presence, shared annotations |
| **URL State** | Next.js router | Project ID, active file path (`?file=src/app/page.tsx`), view mode |
| **Form State** | React Hook Form | New project modal, settings forms |

```typescript
// stores/editorStore.ts
interface EditorStore {
  openTabs: Tab[]          // All open file tabs
  activeTabId: string | null
  openTab: (file: ProjectFile) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  unsavedChanges: Set<string>  // file paths with unsaved changes
  markUnsaved: (path: string) => void
  markSaved: (path: string) => void
}

// stores/workspaceStore.ts
interface WorkspaceStore {
  fileTreeWidth: number    // pixels, default 240
  previewWidth: number     // pixels, default 40% of viewport
  consoleHeight: number    // pixels, default 120 (collapsed)
  sidebarCollapsed: boolean
  activePanel: 'editor' | 'chat'
  viewportSize: 'mobile' | 'tablet' | 'desktop' | 'custom'
}
```

### 3.3 WebContainer Integration

WebContainers run a full Node.js environment inside the browser using WASM. No server compute is needed.

**Required HTTP Headers (next.config.ts):**
```typescript
const nextConfig = {
  async headers() {
    return [{
      source: '/workspace/:path*',
      headers: [
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
      ],
    }]
  }
}
```

**Boot Sequence:**
```typescript
// lib/webcontainer/manager.ts
export class WebContainerManager {
  private instance: WebContainer | null = null

  async boot(files: ProjectFile[]): Promise<void> {
    // 1. Boot WebContainer (WASM init ~1-2s)
    this.instance = await WebContainer.boot()

    // 2. Mount all project files
    const fsTree = filesToFsTree(files)   // Convert DB files to WC fs format
    await this.instance.mount(fsTree)

    // 3. Install dependencies
    const installProcess = await this.instance.spawn('npm', ['install'])
    await installProcess.exit                // Wait for npm install

    // 4. Start dev server
    const devProcess = await this.instance.spawn('npm', ['run', 'dev'])

    // 5. Wait for server-ready event
    this.instance.on('server-ready', (port, url) => {
      this.serverUrl = url     // e.g. http://localhost:5173
      this.emit('ready', url)
    })

    // 6. Capture console output
    devProcess.output.pipeTo(new WritableStream({
      write: (chunk) => this.emit('console', chunk)
    }))
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.instance!.fs.writeFile(path, content)
    // Vite HMR picks this up automatically
  }

  async teardown(): Promise<void> {
    this.instance?.teardown()
    this.instance = null
  }
}
```

**File Sync Pipeline (Editor → WebContainer → HMR):**
```
User types in Monaco
      ↓ (debounce 300ms)
Auto-save: PUT /v1/projects/:id/files/:path → PostgreSQL
      ↓ (optimistic: don't wait for API)
writeFile() → WebContainer FS
      ↓
Vite HMR detects change → hot-reload
      ↓
Preview updates in < 500ms
```

### 3.4 Real-time Collaboration (Liveblocks)

```typescript
// Each project gets its own Liveblocks room
const roomId = `project-${projectId}`

// Presence: who's online + their cursor
type Presence = {
  cursor: { x: number; y: number } | null
  activeFile: string | null
  user: { name: string; avatar: string; color: string }
}

// Storage: shared document state (for future CRDT editing)
type Storage = {
  annotations: LiveMap<string, Annotation>
}

// Conflict resolution:
// - AI changes: always win (create snapshot first, then apply)
// - Manual edits: last-write-wins per character (Monaco default)
// - File creates/deletes: optimistic, server is source of truth
```

### 3.5 Performance Strategy

```typescript
// Heavy components are lazy-loaded
const MonacoEditor = dynamic(
  () => import('@/components/editor/MonacoEditor'),
  { loading: () => <EditorSkeleton />, ssr: false }
)

const WebContainerFrame = dynamic(
  () => import('@/components/preview/PreviewFrame'),
  { loading: () => <PreviewSkeleton />, ssr: false }
)
```

**Bundle Targets:**
- Marketing pages: < 100KB JS (SSG, minimal client JS)
- Dashboard: < 250KB JS (SSR, minimal client)
- Workspace: < 1.2MB JS (Monaco ~900KB, WebContainers ~200KB, app ~100KB)

**Workspace loads in stages:**
1. Shell + file tree: visible in < 1s
2. Monaco editor: loads when user clicks a file (~800ms)
3. WebContainer: boots in background, preview shows when ready (8–12s)

---

## 4. Backend Architecture

### 4.1 API Server Structure

```
apps/api/
├── src/
│   ├── routes/
│   │   ├── auth/
│   │   │   └── me.ts              # GET/PATCH/DELETE /auth/me
│   │   ├── projects/
│   │   │   ├── index.ts           # GET/POST /projects
│   │   │   ├── [id].ts            # GET/PATCH/DELETE /projects/:id
│   │   │   ├── duplicate.ts       # POST /projects/:id/duplicate
│   │   │   └── snapshots.ts       # GET + restore snapshots
│   │   ├── files/
│   │   │   └── index.ts           # GET/PUT/DELETE /projects/:id/files/*
│   │   ├── ai/
│   │   │   ├── chat.ts            # POST /projects/:id/ai/chat (SSE)
│   │   │   └── history.ts         # GET/DELETE conversation history
│   │   ├── deployments/
│   │   │   └── index.ts           # GET/POST deployments, rollback
│   │   ├── templates/
│   │   │   └── index.ts           # GET templates, POST clone
│   │   ├── billing/
│   │   │   ├── checkout.ts        # POST /billing/checkout
│   │   │   ├── portal.ts          # POST /billing/portal
│   │   │   ├── usage.ts           # GET /billing/usage
│   │   │   └── webhook.ts         # POST /billing/webhook (Stripe)
│   │   └── github/
│   │       └── index.ts           # GitHub integration endpoints
│   │
│   ├── middleware/
│   │   ├── auth.ts                # Keycloak OIDC token validation → req.user
│   │   ├── ratelimit.ts           # Redis sliding window rate limiter
│   │   ├── planCheck.ts           # Verify user plan for gated features
│   │   └── requestLogger.ts       # Pino structured request logging
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── index.ts           # Main AI service (orchestrator + routing)
│   │   │   ├── contextBuilder.ts  # Assembles prompt context
│   │   │   ├── diffApplier.ts     # Parses + applies unified diffs
│   │   │   ├── bedrock.ts         # AWS Bedrock SDK wrapper (PRIMARY)
│   │   │   ├── anthropic.ts       # Anthropic direct API wrapper (Fallback 1)
│   │   │   ├── gemini.ts          # Google Gemini 2.0 Flash wrapper (Fallback 2)
│   │   │   ├── openai.ts          # OpenAI GPT-4o wrapper (Fallback 3)
│   │   │   └── router.ts          # Model routing + circuit breaker
│   │   ├── deploy/
│   │   │   ├── vercel.ts          # Vercel API client (user deploy target)
│   │   │   ├── netlify.ts         # Netlify API client (user deploy target)
│   │   │   └── cloudflare.ts      # Cloudflare Pages API client (user deploy target)
│   │   ├── github/
│   │   │   └── index.ts           # isomorphic-git wrapper
│   │   ├── storage/
│   │   │   └── minio.ts           # MinIO S3-compatible client (AWS SDK v3 S3Client)
│   │   └── email/
│   │       └── resend.ts          # Transactional email via Resend
│   │
│   ├── workers/                   # BullMQ job processors
│   │   ├── deploy.worker.ts
│   │   ├── snapshot.worker.ts
│   │   └── thumbnail.worker.ts
│   │
│   ├── plugins/
│   │   ├── postgres.ts            # Drizzle/postgres.js as Fastify plugin
│   │   ├── redis.ts               # Redis 7 as Fastify plugin (ioredis)
│   │   └── stripe.ts              # Stripe as Fastify plugin
│   │
│   ├── errors/
│   │   └── index.ts               # Typed error classes + error handler
│   ├── types/
│   │   └── index.ts               # Shared TypeScript types
│   └── server.ts                  # App entry point
│
├── migrations/                    # SQL migration files
└── package.json
```

### 4.2 Request/Response Format

**Standard envelope for all responses:**
```typescript
// Success
{
  "data": { /* response payload */ },
  "meta": { "requestId": "uuid", "timestamp": "ISO8601" }
}

// Error
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've used your 50 daily AI messages. Upgrade to Pro for 500/day.",
    "statusCode": 429
  },
  "meta": { "requestId": "uuid" }
}
```

**Typed error classes:**
```typescript
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number,
    public context?: Record<string, unknown>
  ) { super(message) }
}

export class UnauthorizedError extends AppError {
  constructor() { super('UNAUTHORIZED', 'Authentication required', 401) }
}

export class PlanLimitError extends AppError {
  constructor(feature: string) {
    super('PLAN_LIMIT', `${feature} requires a Pro plan`, 403)
  }
}
```

### 4.3 Rate Limiting (Redis Sliding Window)

```typescript
// middleware/ratelimit.ts
async function rateLimitMiddleware(req, reply) {
  const userId = req.user.id
  const plan = req.user.plan
  const limits = { free: 60, pro: 300, team: 1000 }  // req/min
  const limit = limits[plan] ?? 60

  const key = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`
  const current = await redis.incr(key)
  await redis.expire(key, 60)  // 1-minute window

  reply.header('X-RateLimit-Limit', limit)
  reply.header('X-RateLimit-Remaining', Math.max(0, limit - current))

  if (current > limit) {
    throw new RateLimitError()
  }
}

// AI-specific daily limit
async function aiRateLimitMiddleware(req, reply) {
  const dailyLimits = { free: 50, pro: 500, team: 1000 }
  const limit = dailyLimits[req.user.plan] ?? 50

  const today = new Date().toISOString().split('T')[0]
  const key = `ai:daily:${req.user.id}:${today}`
  const current = await redis.incr(key)
  await redis.expireat(key, getEndOfDayTimestamp())

  if (current > limit) {
    throw new PlanLimitError('AI messages')
  }
}
```

### 4.4 Background Jobs (BullMQ)

```typescript
// workers/deploy.worker.ts
interface DeployJobData {
  deploymentId: string
  projectId: string
  provider: 'vercel' | 'netlify' | 'cloudflare-pages'   // user's chosen deploy target
  files: ProjectFile[]
  envVars: Record<string, string>
}

const deployWorker = new Worker<DeployJobData>('deployments', async (job) => {
  const { deploymentId, provider, files, envVars } = job.data

  try {
    await db.deployments.update(deploymentId, { status: 'building' })

    const deployUrl = await deployService[provider].deploy({ files, envVars })

    await db.deployments.update(deploymentId, {
      status: 'deployed',
      deploy_url: deployUrl,
      completed_at: new Date()
    })
  } catch (err) {
    await db.deployments.update(deploymentId, {
      status: 'failed',
      build_log: err.message
    })
    throw err  // BullMQ will retry
  }
}, {
  connection: redis,
  concurrency: 5,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
})
```

---

## 5. AI Layer Architecture

### 5.1 Prompt Engineering System

**System Prompt Template (Next.js project):**
```
You are an expert full-stack developer specializing in Next.js 14, TypeScript,
Tailwind CSS, and shadcn/ui. You are helping a user build their web application.

RULES:
- Always respond with a brief plain-English explanation (1-3 sentences) followed by file changes
- Express file changes ONLY as unified diffs (git diff format)
- Never rewrite entire files — only change what's necessary
- Keep changes minimal and focused on exactly what was asked
- If you create a new file, use +++ /dev/null as the "before" path
- Prefer shadcn/ui components over custom implementations
- Always use TypeScript, never plain JavaScript
- Use Tailwind for all styling, never inline styles or separate CSS files

CURRENT PROJECT STACK:
Framework: Next.js 14 (App Router)
Language: TypeScript 5.x
Styling: Tailwind CSS + shadcn/ui
Package manager: npm

RESPONSE FORMAT:
[Plain English explanation]

--- a/[filepath]
+++ b/[filepath]
@@ [line numbers] @@
[unified diff content]
```

**Context Assembly Algorithm:**
```typescript
// services/ai/contextBuilder.ts
async function buildContext(
  project: Project,
  files: ProjectFile[],
  history: AIMessage[],
  userPrompt: string
): Promise<AnthropicMessage[]> {
  const tokenBudget = {
    total: 180_000,
    systemPrompt: 2_000,
    fileTree: 3_000,
    history: 12_000,     // ~20 messages
    currentFile: 8_000,
    userPrompt: 2_000,
    generation: 8_000,   // reserve for response
  }

  // 1. Build file tree summary (not full content — just paths + sizes)
  const fileTreeSummary = files
    .map(f => `${f.path} (${f.size_bytes} bytes)`)
    .join('\n')

  // 2. Compress history if needed (summarize older messages)
  const recentHistory = history.slice(-20)

  // 3. Find currently active file (from @mention or last edited)
  const mentionedFile = extractFileMention(userPrompt, files)
  const currentFileContent = mentionedFile
    ? truncateTokens(mentionedFile.content, tokenBudget.currentFile)
    : null

  return [
    { role: 'user', content: buildSystemContext(project, fileTreeSummary) },
    ...recentHistory.map(msg => ({ role: msg.role, content: msg.content })),
    {
      role: 'user',
      content: currentFileContent
        ? `Current file (${mentionedFile.path}):\n\`\`\`\n${currentFileContent}\n\`\`\`\n\n${userPrompt}`
        : userPrompt
    }
  ]
}
```

### 5.2 Streaming Response Pipeline

```typescript
// routes/ai/chat.ts
fastify.post('/projects/:id/ai/chat', async (req, reply) => {
  const { prompt } = req.body
  const project = await getProject(req.params.id)
  const files = await getProjectFiles(project.id)
  const history = await getConversationHistory(project.id)

  // Set SSE headers
  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')

  const sendEvent = (event: string, data: unknown) => {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  // Create snapshot BEFORE applying changes
  const snapshotId = await createSnapshot(project.id, prompt, files)

  // Stream via AI router (Bedrock → Anthropic → Gemini → GPT-4o)
  const stream = await aiRouter.stream({
    model: 'claude-3-5-sonnet',   // logical model name, router resolves provider
    max_tokens: 8096,
    messages: await buildContext(project, files, history, prompt),
  })

  let fullResponse = ''

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      const token = chunk.delta.text
      fullResponse += token
      sendEvent('token', { text: token })
    }
  }

  // Parse and apply diffs
  const { explanation, diffs } = parseDiffs(fullResponse)
  const changedFiles = await applyDiffs(project.id, diffs)

  // Save message to DB
  await saveAIMessage(project.id, prompt, fullResponse, changedFiles)

  // Notify client to sync files
  sendEvent('done', { changedFiles, snapshotId, explanation })
  reply.raw.end()
})
```

### 5.3 Diff Parsing & Application

```typescript
// services/ai/diffApplier.ts
interface FileDiff {
  path: string
  isNew: boolean
  isDeleted: boolean
  hunks: DiffHunk[]
}

interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  changes: DiffChange[]
}

function parseDiffs(aiResponse: string): { explanation: string; diffs: FileDiff[] } {
  const diffRegex = /^--- a\/(.+)\n\+\+\+ b\/(.+)\n((?:@@.*?@@\n(?:[ +\-].*\n)*)+)/gm
  const diffs: FileDiff[] = []
  let explanation = aiResponse

  for (const match of aiResponse.matchAll(diffRegex)) {
    const [fullMatch, oldPath, newPath, hunksText] = match
    explanation = explanation.replace(fullMatch, '')

    diffs.push({
      path: newPath,
      isNew: oldPath === '/dev/null',
      isDeleted: newPath === '/dev/null',
      hunks: parseHunks(hunksText),
    })
  }

  return { explanation: explanation.trim(), diffs }
}

async function applyDiffs(projectId: string, diffs: FileDiff[]): Promise<string[]> {
  const changedPaths: string[] = []

  for (const diff of diffs) {
    if (diff.isNew) {
      const content = diff.hunks.flatMap(h =>
        h.changes.filter(c => c.type === 'add').map(c => c.line)
      ).join('\n')
      await upsertFile(projectId, diff.path, content)
    } else if (diff.isDeleted) {
      await deleteFile(projectId, diff.path)
    } else {
      const currentFile = await getFile(projectId, diff.path)
      const patched = applyPatch(currentFile.content, diff.hunks)
      await upsertFile(projectId, diff.path, patched)
    }
    changedPaths.push(diff.path)
  }

  return changedPaths
}
```

### 5.4 Self-Healing Error Loop

```typescript
// hooks/useAIStream.ts (frontend)
async function selfHeal(error: ConsoleError, projectId: string) {
  const MAX_RETRIES = 3

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const fixPrompt = `
Fix this runtime error in my app:

Error: ${error.message}
Stack: ${error.stack}
File: ${error.filename} (line ${error.lineno})

Fix only the specific error. Don't change anything else.
    `.trim()

    const result = await sendAIMessage(projectId, fixPrompt)

    // Wait for WebContainer to reload
    await sleep(800)

    // Check if error is gone
    const stillErroring = await checkForErrors()
    if (!stillErroring) {
      return { fixed: true, attempts: attempt }
    }
  }

  // All retries failed — surface to user
  return { fixed: false, attempts: MAX_RETRIES }
}
```

### 5.5 Model Selection by Task

Different tasks have different latency, quality, and cost requirements. We route to the most appropriate model per task rather than using one model for everything.

#### Available Models on AWS Bedrock (with Vision Support)

| Model | Bedrock ID | Context | Vision | Best For |
|-------|-----------|---------|--------|----------|
| **Claude 3.5 Sonnet v2** | `anthropic.claude-3-5-sonnet-20241022-v2:0` | 200K | ✅ | Code gen, reasoning, vision |
| **Claude 3.5 Haiku** | `anthropic.claude-3-5-haiku-20241022-v1:0` | 200K | ✅ | Fast completions, cheap tasks |
| **Claude 3 Opus** | `anthropic.claude-3-opus-20240229-v1:0` | 200K | ✅ | Max quality long-context refactors |
| **Amazon Nova Pro** | `amazon.nova-pro-v1:0` | 300K | ✅ | Multi-modal, AWS-native, cost-efficient |
| **Amazon Nova Lite** | `amazon.nova-lite-v1:0` | 300K | ✅ | Ultra-fast, ultra-cheap utility tasks |
| **Llama 3.2 Vision 90B** | `meta.llama3-2-90b-instruct-v1:0` | 128K | ✅ | Open-weight fallback, no data sharing |

> **Key insight:** Claude 3.5 Sonnet v2 on Bedrock fully supports vision (images). There is no need to leave Bedrock for image-to-UI tasks — GPT-4o is only used as a last-resort fallback.

#### Gemini as Additional Fallback Provider

Google Gemini 2.0 is a strong alternative, especially for vision, and can replace GPT-4o as Fallback 2:

| Model | API | Context | Vision | Notes |
|-------|-----|---------|--------|-------|
| **Gemini 2.0 Flash** | Google AI / Vertex AI | 1M | ✅ | Fastest Gemini, best cost/performance, excellent for vision |
| **Gemini 2.0 Pro** | Vertex AI | 2M | ✅ | Highest quality, 2M context window |
| **Gemini 1.5 Flash** | Google AI / Vertex AI | 1M | ✅ | Battle-tested, slightly older |

**Decision:** Use **Gemini 2.0 Flash via Vertex AI** as Fallback 2 instead of GPT-4o — it's cheaper, has a larger context window, and strong vision support. GPT-4o becomes Fallback 3 (last resort).

---

#### Task-to-Model Routing Table

| Task | Primary Model | Provider | Fallback 1 | Fallback 2 | Fallback 3 | Rationale |
|------|--------------|----------|-----------|-----------|-----------|-----------|
| **Code generation** (main AI chat) | Claude 3.5 Sonnet v2 | AWS Bedrock | Anthropic API (Claude 3.5 Sonnet) | Gemini 2.0 Pro (Vertex) | GPT-4o | Best code quality; 200K context handles large projects |
| **Image → UI** (screenshot to code) | Claude 3.5 Sonnet v2 | AWS Bedrock | Gemini 2.0 Flash (Vertex) | GPT-4o | — | All three support vision; Bedrock keeps data in AWS |
| **Inline code suggestions** (editor ghost text) | Claude 3.5 Haiku | AWS Bedrock | Amazon Nova Lite (Bedrock) | — | — | Must be < 300ms; Haiku is 5× faster than Sonnet |
| **Error self-healing** (auto-fix loop) | Claude 3.5 Sonnet v2 | AWS Bedrock | Claude 3.5 Haiku (Bedrock) | Gemini 2.0 Flash | — | Needs full code understanding; Haiku as cheap retry |
| **Large codebase refactor** (> 50 files) | Claude 3 Opus | AWS Bedrock | Claude 3.5 Sonnet v2 (Bedrock) | — | — | Opus handles complex multi-file reasoning better |
| **Commit message generation** | Claude 3.5 Haiku | AWS Bedrock | Amazon Nova Lite (Bedrock) | — | — | Simple summarisation; cheap + fast |
| **PR description generation** | Claude 3.5 Haiku | AWS Bedrock | Amazon Nova Lite (Bedrock) | — | — | Structured text; no deep code reasoning needed |
| **Template description generation** | Amazon Nova Lite | AWS Bedrock | Claude 3.5 Haiku (Bedrock) | — | — | Ultra-cheap; runs on every template clone |
| **Prompt suggestions** (chat chips) | Amazon Nova Lite | AWS Bedrock | Claude 3.5 Haiku (Bedrock) | — | — | 3 short suggestions after every message; must be cheap |
| **Onboarding template recommendation** | Gemini 2.0 Flash | Vertex AI | Claude 3.5 Haiku (Bedrock) | — | — | Large context for browsing all templates; Gemini's 1M ctx shines |

---

#### Provider Priority Chain (Code Generation — default path)

```
AWS Bedrock — Claude 3.5 Sonnet v2       ← PRIMARY
        ↓  (timeout > 8s / 5xx / throttled)
Anthropic Direct API — Claude 3.5 Sonnet ← FALLBACK 1  (same model, different endpoint)
        ↓  (timeout / rate limit)
Google Vertex AI — Gemini 2.0 Flash      ← FALLBACK 2  (different model family)
        ↓  (timeout / rate limit)
OpenAI — GPT-4o                          ← FALLBACK 3  (last resort)
```

**Why Bedrock as primary:**
- ✅ No data leaves AWS — models run in your AWS account (compliance, GDPR, SOC 2)
- ✅ Unified AWS billing — one invoice, reserved capacity pricing available
- ✅ AWS Enterprise SLA (99.99%) + Bedrock-native throttle management
- ✅ No per-token rate limits on provisioned throughput
- ✅ AWS IAM auth — no API keys in env vars for the primary path
- ✅ Bedrock supports Claude 3.5 Sonnet, Claude 3 Opus, Llama 3, Titan — model flexibility

```typescript
// services/ai/router.ts
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const PROVIDERS = ['bedrock', 'anthropic', 'gemini', 'openai'] as const
type Provider = typeof PROVIDERS[number]

// Circuit breaker state per provider
const circuitBreaker = new Map<Provider, {
  failures: number
  openUntil: number   // timestamp — don't attempt until this time
}>()

const CIRCUIT_OPEN_MS = 60_000    // stay open for 60s after tripping
const FAILURE_THRESHOLD = 3       // trip after 3 consecutive failures
const PRIMARY_TIMEOUT_MS = 8_000  // 8s before trying next provider

export class AIRouter {
  private bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION })
  private anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  private gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)  // Gemini 2.0 Flash
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Task-specific model overrides (see task-to-model table)
  private modelForTask: Record<AITask, string> = {
    code_generation:    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    vision:             'anthropic.claude-3-5-sonnet-20241022-v2:0',
    inline_suggestion:  'anthropic.claude-3-5-haiku-20241022-v1:0',
    error_healing:      'anthropic.claude-3-5-sonnet-20241022-v2:0',
    large_refactor:     'anthropic.claude-3-opus-20240229-v1:0',
    commit_message:     'anthropic.claude-3-5-haiku-20241022-v1:0',
    prompt_suggestion:  'amazon.nova-lite-v1:0',
    template_desc:      'amazon.nova-lite-v1:0',
  }

  async stream(params: AICallParams): Promise<AsyncIterable<string>> {
    for (const provider of PROVIDERS) {
      if (this.isCircuitOpen(provider)) {
        console.warn(`[AI Router] ${provider} circuit OPEN — skipping`)
        continue
      }

      try {
        const result = await Promise.race([
          this.callProvider(provider, params),
          timeout(PRIMARY_TIMEOUT_MS),
        ])
        this.recordSuccess(provider)
        return result
      } catch (err) {
        this.recordFailure(provider, err)
        console.error(`[AI Router] ${provider} failed, trying next:`, err.message)
      }
    }
    throw new Error('All AI providers failed — please try again shortly')
  }

  private async callProvider(provider: Provider, params: AICallParams) {
    switch (provider) {
      case 'bedrock':   return this.callBedrock(params)
      case 'anthropic': return this.callAnthropic(params)
      case 'gemini':    return this.callGemini(params)
      case 'openai':    return this.callOpenAI(params)
    }
  }

  // --- AWS Bedrock (PRIMARY) ---
  private async *callBedrock(params: AICallParams): AsyncIterable<string> {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: params.max_tokens ?? 8096,
        messages: params.messages,
        system: params.system,
      }),
    })

    const response = await this.bedrock.send(command)
    for await (const chunk of response.body!) {
      if (chunk.chunk?.bytes) {
        const parsed = JSON.parse(Buffer.from(chunk.chunk.bytes).toString())
        if (parsed.type === 'content_block_delta') {
          yield parsed.delta.text
        }
      }
    }
  }

  // --- Anthropic Direct API (FALLBACK 1) ---
  private async *callAnthropic(params: AICallParams): AsyncIterable<string> {
    const stream = await this.anthropic.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: params.max_tokens ?? 8096,
      messages: params.messages,
      system: params.system,
    })
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        yield chunk.delta.text
      }
    }
  }

  // --- Google Gemini 2.0 Flash (FALLBACK 2) ---
  private async *callGemini(params: AICallParams): AsyncIterable<string> {
    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const chat = model.startChat({
      history: params.messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: params.system,
    })
    const result = await chat.sendMessageStream(
      params.messages[params.messages.length - 1].content
    )
    for await (const chunk of result.stream) {
      yield chunk.text()
    }
  }

  // --- OpenAI GPT-4o (FALLBACK 3 — last resort) ---
  private async *callOpenAI(params: AICallParams): AsyncIterable<string> {
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: params.max_tokens ?? 8096,
      messages: [
        { role: 'system', content: params.system ?? '' },
        ...params.messages,
      ],
      stream: true,
    })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  // --- Circuit Breaker ---
  private isCircuitOpen(provider: Provider): boolean {
    const state = circuitBreaker.get(provider)
    if (!state) return false
    if (Date.now() < state.openUntil) return true
    // Half-open: allow one attempt through
    circuitBreaker.delete(provider)
    return false
  }

  private recordFailure(provider: Provider, err: Error): void {
    const state = circuitBreaker.get(provider) ?? { failures: 0, openUntil: 0 }
    state.failures++
    if (state.failures >= FAILURE_THRESHOLD) {
      state.openUntil = Date.now() + CIRCUIT_OPEN_MS
      console.error(`[AI Router] Circuit TRIPPED for ${provider} — pausing ${CIRCUIT_OPEN_MS / 1000}s`)
    }
    circuitBreaker.set(provider, state)
  }

  private recordSuccess(provider: Provider): void {
    circuitBreaker.delete(provider)   // reset on success
    // Emit metric: which provider was used
    metrics.increment(`ai.provider.${provider}.success`)
  }
}

export const aiRouter = new AIRouter()

// Vision: primary path is Bedrock (Claude 3.5 Sonnet v2 supports images).
// Gemini 2.0 Flash is fallback for vision — also excellent at image understanding.
// GPT-4o is last resort only.
export async function callAIWithVision(params: VisionParams): Promise<string> {
  // Try Bedrock first (Claude 3.5 Sonnet v2 vision)
  try {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: params.imageUrl } },
            { type: 'text', text: params.prompt },
          ],
        }],
      }),
    })
    const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION })
    let result = ''
    const response = await bedrock.send(command)
    for await (const chunk of response.body!) {
      if (chunk.chunk?.bytes) {
        const parsed = JSON.parse(Buffer.from(chunk.chunk.bytes).toString())
        if (parsed.type === 'content_block_delta') result += parsed.delta.text
      }
    }
    return result
  } catch {
    // Fallback to Gemini 2.0 Flash vision
    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const imageData = await fetchImageAsBase64(params.imageUrl)
      const result = await model.generateContent([
        { inlineData: { data: imageData, mimeType: 'image/png' } },
        params.prompt,
      ])
      return result.response.text()
    } catch {
      // Last resort: GPT-4o
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: params.imageUrl } },
          { type: 'text', text: params.prompt },
        ]}],
      })
      return response.choices[0].message.content ?? ''
    }
  }
}
```

**Required environment variables:**
```bash
# AWS Bedrock (Primary) — uses IAM role in production, keys in dev
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...          # dev only; use IAM role in prod (ECS task role)
AWS_SECRET_ACCESS_KEY=...      # dev only

# Anthropic Direct (Fallback 1)
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini via Vertex AI (Fallback 2)
GOOGLE_API_KEY=...             # or use GOOGLE_APPLICATION_CREDENTIALS for Vertex AI

# OpenAI (Fallback 3 — last resort)
OPENAI_API_KEY=sk-...
```

**AWS IAM Policy for Bedrock (least privilege — all models used):**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
    "Resource": [
      "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
      "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0",
      "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-opus-20240229-v1:0",
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0",
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0",
      "arn:aws:bedrock:us-east-1::foundation-model/meta.llama3-2-90b-instruct-v1:0"
    ]
  }]
}
```

**Observability — track provider, model, and cost per call:**
```typescript
await db.ai_messages.update(messageId, {
  model: resolvedModel,   // e.g. 'bedrock:claude-3-5-sonnet-v2' | 'gemini-2.0-flash' | 'gpt-4o'
  tokens_used: inputTokens + outputTokens,
  cost_usd: calculateCost(resolvedModel, inputTokens, outputTokens),
})
```

**Cost comparison across all models (per 1M tokens, 2026):**
| Provider | Model | Input $/1M | Output $/1M | Vision | Usage in Forge AI |
|----------|-------|-----------|------------|--------|------------------|
| AWS Bedrock | Claude 3.5 Sonnet v2 | $3.00 | $15.00 | ✅ | Code gen, vision, self-heal, test-gen |
| AWS Bedrock | Claude 3.5 Haiku | $0.80 | $4.00 | ✅ | Fast edits, commit msgs, inline suggest |
| AWS Bedrock | Claude 3 Opus | $15.00 | $75.00 | ✅ | Deep refactoring only |
| AWS Bedrock | Amazon Nova Pro | $0.80 | $3.20 | ✅ | Vision fallback (stays in AWS) |
| AWS Bedrock | Amazon Nova Lite | $0.06 | $0.24 | ✅ | Inline suggest fallback, doc-gen |
| AWS Bedrock | Amazon Nova Micro | $0.035 | $0.14 | ❌ | Commit msg, template tagging |
| Anthropic Direct | Claude 3.5 Sonnet | $3.00 | $15.00 | ✅ | Fallback 1 |
| Anthropic Direct | Claude 3.5 Haiku | $0.80 | $4.00 | ✅ | Fallback 1 (Haiku tasks) |
| Google | Gemini 2.0 Flash | $0.075 | $0.30 | ✅ | Fallback 2 — all tasks |
| Google | Gemini 2.0 Pro | $1.25 | $5.00 | ✅ | Fallback 2 — complex tasks |
| OpenAI | GPT-4o (latest) | $2.50 | $10.00 | ✅ | Fallback 3 — last resort only |

---

## 6. Database Architecture

### 6.1 Multi-Tenancy Model

All data is scoped to a **workspace**. Every table with user data has a `workspace_id` or traces back to one via foreign key. PostgreSQL Row Level Security (RLS) enforces this at the database layer — even if the application has a bug, data cannot leak between workspaces. RLS policies are applied directly on standard PostgreSQL — no Supabase dependency required.

### 6.2 Full Schema

```sql
-- ============================================================
-- USERS & WORKSPACES
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id     TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free',  -- free|pro|team|enterprise
  storage_used    BIGINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member', -- owner|admin|member|viewer
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ============================================================
-- PROJECTS & FILES
-- ============================================================

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  framework       TEXT NOT NULL DEFAULT 'nextjs',  -- nextjs|vite|remix
  thumbnail_url   TEXT,
  is_public       BOOLEAN DEFAULT FALSE,
  github_repo_url TEXT,
  github_branch   TEXT DEFAULT 'main',
  deploy_url      TEXT,
  deploy_status   TEXT DEFAULT 'none',  -- none|deploying|deployed|failed
  deleted_at      TIMESTAMPTZ,          -- soft delete
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_workspace ON projects(workspace_id)
  WHERE deleted_at IS NULL;

CREATE TABLE project_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path            TEXT NOT NULL,        -- e.g. src/components/Header.tsx
  content         TEXT NOT NULL DEFAULT '',
  size_bytes      INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, path)
);

CREATE INDEX idx_project_files_project ON project_files(project_id);

CREATE TABLE project_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  triggered_by    TEXT NOT NULL,        -- ai|user|deploy
  label           TEXT,                 -- user-named checkpoint label
  description     TEXT,                 -- AI prompt that triggered it
  files_json      JSONB NOT NULL,       -- full snapshot: [{path, content}]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_project ON project_snapshots(project_id, created_at DESC);

-- ============================================================
-- AI CONVERSATIONS
-- ============================================================

CREATE TABLE ai_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id)   -- one conversation per project
);

CREATE TABLE ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,        -- user|assistant
  content         TEXT NOT NULL,
  files_changed   JSONB,                -- [{path, diff}]
  snapshot_id     UUID REFERENCES project_snapshots(id),
  tokens_used     INTEGER,
  model           TEXT,   -- e.g. bedrock:claude-3-5-sonnet | bedrock:nova-pro | gemini-2.0-flash | gpt-4o
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);

-- ============================================================
-- DEPLOYMENTS
-- ============================================================

CREATE TABLE deployments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  triggered_by    UUID REFERENCES users(id),
  provider        TEXT NOT NULL,        -- vercel|netlify|cloudflare-pages (user's chosen target)
  provider_id     TEXT,                 -- external deployment ID
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending|building|deployed|failed
  deploy_url      TEXT,
  build_log       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_deployments_project ON deployments(project_id, created_at DESC);

-- ============================================================
-- TEMPLATES
-- ============================================================

CREATE TABLE templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID REFERENCES users(id),
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,  -- saas|landing|blog|ecommerce|dashboard|api
  preview_url     TEXT,
  thumbnail_url   TEXT,
  files_json      JSONB NOT NULL,
  tags            TEXT[] DEFAULT '{}',
  is_official     BOOLEAN DEFAULT FALSE,
  is_paid         BOOLEAN DEFAULT FALSE,
  price_cents     INTEGER DEFAULT 0,
  use_count       INTEGER DEFAULT 0,
  rating          DECIMAL(3,2),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category) WHERE approved_at IS NOT NULL;
CREATE INDEX idx_templates_search ON templates USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================================
-- BILLING
-- ============================================================

CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            UUID UNIQUE NOT NULL REFERENCES workspaces(id),
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  plan                    TEXT NOT NULL DEFAULT 'free',
  status                  TEXT NOT NULL DEFAULT 'active',  -- active|past_due|canceled|trialing
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- API KEYS & WEBHOOKS
-- ============================================================

CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  key_hash        TEXT UNIQUE NOT NULL,  -- bcrypt hash, never store plaintext
  key_prefix      TEXT NOT NULL,         -- first 8 chars for display: "fai_abc1..."
  scopes          TEXT[] DEFAULT '{}',   -- read:projects|write:projects|deploy
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_endpoints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  events          TEXT[] NOT NULL,  -- deploy.success|build.failed|ai.message
  secret          TEXT NOT NULL,    -- for HMAC signature verification
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status_code     INTEGER,
  response_body   TEXT,
  attempts        INTEGER DEFAULT 0,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 Row-Level Security Policies

```sql
-- Enable RLS on all user-data tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Projects: visible only to workspace members
CREATE POLICY "workspace members can view projects"
  ON projects FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
    OR is_public = TRUE
  );

CREATE POLICY "workspace members can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "only admins and owners can delete projects"
  ON projects FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Project files: same access as parent project
CREATE POLICY "project file access mirrors project access"
  ON project_files FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );
```

### 6.4 Indexing Strategy

```sql
-- High-frequency queries get composite indexes
CREATE INDEX idx_projects_workspace_updated
  ON projects(workspace_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_messages_conversation_recent
  ON ai_messages(conversation_id, created_at DESC);

CREATE INDEX idx_deployments_project_status
  ON deployments(project_id, status, created_at DESC);

-- Partial index: only active subscriptions
CREATE INDEX idx_subscriptions_active
  ON subscriptions(workspace_id, plan)
  WHERE status = 'active';

-- Full-text search on templates
CREATE INDEX idx_templates_fts
  ON templates USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

---

## 7. Infrastructure Architecture

### 7.0 Local Development with Docker Compose

The entire platform runs locally with a single `docker compose up`. No cloud accounts required to develop or test.

```yaml
# docker-compose.yml (root of monorepo)
version: '3.9'

services:

  # ── Reverse Proxy ──────────────────────────────────────────────
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
      - "8080:8080"   # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  # ── Frontend ───────────────────────────────────────────────────
  web:
    build:
      context: ./apps/web
      target: dev
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost/api
      - NEXT_PUBLIC_KEYCLOAK_URL=http://localhost/auth
      - NEXT_PUBLIC_KEYCLOAK_REALM=forge
      - NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=forge-web
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    labels:
      - "traefik.http.routers.web.rule=Host(`localhost`) && PathPrefix(`/`)"
    depends_on:
      - keycloak

  # ── API ────────────────────────────────────────────────────────
  api:
    build:
      context: ./apps/api
      target: dev
    environment:
      - DATABASE_URL=postgres://forge:forge@postgres:5432/forge
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - KEYCLOAK_URL=http://keycloak:8080
      - KEYCLOAK_REALM=forge
      - KEYCLOAK_CLIENT_ID=forge-api
      - KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    labels:
      - "traefik.http.routers.api.rule=Host(`localhost`) && PathPrefix(`/api`)"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      keycloak:
        condition: service_healthy

  # ── PostgreSQL 16 ──────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: forge
      POSTGRES_PASSWORD: forge
      POSTGRES_DB: forge
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U forge"]
      interval: 5s
      retries: 5

  # ── Redis 7 ────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5

  # ── MinIO (S3-compatible object storage) ───────────────────────
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Web console
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      retries: 5

  # ── Keycloak 24 (Identity Provider) ───────────────────────────
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    command: start-dev --import-realm
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: forge
      KC_DB_PASSWORD: forge
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    ports:
      - "8081:8080"
    volumes:
      - ./infra/keycloak/realm-export.json:/opt/keycloak/data/import/realm.json
    labels:
      - "traefik.http.routers.keycloak.rule=Host(`localhost`) && PathPrefix(`/auth`)"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
      interval: 10s
      retries: 10

  # ── pgAdmin (optional DB UI) ───────────────────────────────────
  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@forge.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    profiles:
      - tools   # only starts with: docker compose --profile tools up

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

**Local development commands:**
```bash
# First time setup
cp .env.example .env.local
docker compose up -d           # Start all services
pnpm install                   # Install dependencies
pnpm db:migrate                # Run database migrations
pnpm db:seed                   # Seed development data

# Daily development
pnpm dev                       # Start Next.js + Fastify in watch mode
docker compose logs -f api     # Follow API logs
docker compose restart minio   # Restart a single service

# With optional tools (pgAdmin)
docker compose --profile tools up -d

# Teardown
docker compose down            # Stop services (keep volumes)
docker compose down -v         # Stop + delete all data (clean slate)
```

**Service URLs (local):**
| Service | URL | Credentials |
|---------|-----|-------------|
| Web App | http://localhost | — |
| API | http://localhost/api | — |
| Keycloak Admin | http://localhost:8081 | admin / admin |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| pgAdmin | http://localhost:5050 | admin@forge.local / admin |
| Traefik Dashboard | http://localhost:8080 | — |

---

### 7.1 Environment Strategy

| Environment | Frontend | API | Database | Purpose |
|-------------|----------|-----|----------|---------|
| **Local** | `localhost` (Docker) | `localhost/api` (Docker) | PostgreSQL in Docker | Development |
| **Staging** | Docker image → staging cluster | Docker image → staging cluster | Managed Postgres (RDS/Cloud SQL) | PR review, QA |
| **Production** | Docker image → prod cluster | Docker image → prod cluster | Managed Postgres (RDS/Cloud SQL) | Live traffic |

**All environments use the same Docker images** — the only difference is the environment variables injected at runtime. This ensures "works on my machine" = "works in production".

### 7.2 CI/CD Pipeline

All pipelines use **GitHub Actions**. Docker images are built and pushed to **GHCR (GitHub Container Registry)**. Deployment is cloud-agnostic — the same pipeline can target AWS ECS, GKE, Azure Container Apps, or any Docker-capable platform.

```
                 ┌─────────────────────────────────────────┐
                 │           GitHub Repository              │
                 └─────────────────────┬───────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │ push to PR branch        │ merge to main            │ nightly
            ▼                          ▼                          ▼
   ┌────────────────┐        ┌─────────────────┐       ┌────────────────┐
   │  PR Checks     │        │  Staging Deploy │       │ Nightly Audit  │
   │  (pr.yml)      │        │  (staging.yml)  │       │ (nightly.yml)  │
   └────────────────┘        └────────┬────────┘       └────────────────┘
                                      │ on staging OK
                                      ▼
                             ┌─────────────────┐
                             │  Prod Deploy    │
                             │  (prod.yml)     │
                             │  (manual gate)  │
                             └─────────────────┘
```

```yaml
# .github/workflows/pr.yml  — PR quality gates
name: PR Checks
on:
  pull_request:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: forge, POSTGRES_PASSWORD: forge, POSTGRES_DB: forge_test }
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 5s
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgres://forge:forge@localhost:5432/forge_test
          REDIS_URL: redis://localhost:6379

  docker-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build web image (verify it compiles)
        uses: docker/build-push-action@v5
        with:
          context: ./apps/web
          push: false
          tags: forge-web:pr-${{ github.sha }}
      - name: Build api image (verify it compiles)
        uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          push: false
          tags: forge-api:pr-${{ github.sha }}

---
# .github/workflows/staging.yml  — Build, push, deploy to staging on main merge
name: Staging Deploy
on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository_owner }}/forge

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      sha_tag: ${{ github.sha }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}   # auto-provided, no setup needed

      - name: Build + push web image
        uses: docker/build-push-action@v5
        with:
          context: ./apps/web
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-web:${{ github.sha }}
            ${{ env.IMAGE_PREFIX }}-web:staging-latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build + push api image
        uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-api:${{ github.sha }}
            ${{ env.IMAGE_PREFIX }}-api:staging-latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      # Run DB migrations before deploying new containers
      - name: Run migrations
        run: |
          docker run --rm \
            -e DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }} \
            ${{ env.IMAGE_PREFIX }}-api:${{ github.sha }} \
            pnpm db:migrate

      # Cloud-agnostic: swap this step for your cloud
      # AWS ECS example (also works with GKE, ACA, Fly.io — just change this step):
      - name: Deploy to AWS ECS (staging)
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: infra/ecs/staging-task-def.json
          service: forge-staging
          cluster: forge-staging
          image: ${{ env.IMAGE_PREFIX }}-api:${{ github.sha }}
          wait-for-service-stability: true
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1

      - name: Run smoke tests
        run: pnpm test:smoke --env staging

---
# .github/workflows/prod.yml  — Production deploy (manual approval gate)
name: Production Deploy
on:
  workflow_dispatch:
    inputs:
      sha:
        description: 'Image SHA to deploy (defaults to staging-latest)'
        required: false

jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment: production    # ← GitHub environment with required reviewers
    steps:
      - uses: actions/checkout@v4

      - name: Run migrations
        run: |
          docker run --rm \
            -e DATABASE_URL=${{ secrets.PROD_DATABASE_URL }} \
            ${{ env.IMAGE_PREFIX }}-api:${{ inputs.sha || 'staging-latest' }} \
            pnpm db:migrate

      - name: Deploy to AWS ECS (production)
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: infra/ecs/prod-task-def.json
          service: forge-prod
          cluster: forge-prod
          image: ${{ env.IMAGE_PREFIX }}-api:${{ inputs.sha || 'staging-latest' }}
          wait-for-service-stability: true

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text":"✅ Forge AI deployed to production: ${{ github.sha }}"}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

---
# .github/workflows/nightly.yml  — Security + backup verification
name: Nightly
on:
  schedule:
    - cron: '0 2 * * *'   # 2 AM UTC
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm audit --audit-level=high
      - uses: snyk/actions/node@master
        env: { SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }} }
      - run: pnpm db:backup:verify
        env: { DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }} }
```

**Cloud deployment targets (switch by changing one step):**
| Cloud | Swap the deploy step for | Notes |
|-------|--------------------------|-------|
| **AWS** | `aws-actions/amazon-ecs-deploy-task-definition` | ECS Fargate recommended |
| **GCP** | `google-github-actions/deploy-cloudrun` | Cloud Run for serverless containers |
| **Azure** | `azure/container-apps-deploy-action` | Azure Container Apps |
| **Self-hosted** | `docker/compose-action` + SSH | Compose on any VM |
| **Fly.io** | `superfly/flyctl-actions` | Simple global deployment |

**Multi-arch images** — build for both AMD64 and ARM64 to support Apple Silicon dev and Graviton2 in prod:
```yaml
- uses: docker/setup-buildx-action@v3
  with:
    platforms: linux/amd64,linux/arm64
```

### 7.3 Observability Stack

```
┌─────────────────────────────────────────────────────────────┐
│  OBSERVABILITY                                              │
│                                                             │
│  Logs ──────► Pino (structured JSON) ──► Axiom             │
│                                                             │
│  Errors ────► Sentry (FE + BE) ─────────────────────────┐  │
│                                                          │  │
│  Metrics ───► Prometheus ──► Grafana                     │  │
│                                                          │  │
│  Traces ────► OpenTelemetry ──► Jaeger                   │  │
│                                                          │  │
│  Uptime ────► BetterStack (30s checks, 3 regions)        │  │
│                                                          ▼  │
│  Alerts ────► PagerDuty ──► On-call engineer             │  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Alert Thresholds:**
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API p95 response | > 500ms | > 2s | PagerDuty P1 |
| Error rate | > 0.5% | > 2% | PagerDuty P0 |
| Bedrock errors | > 5% | > 20% | Circuit breaker trips → auto-failover to Anthropic direct |
| Anthropic API errors | > 5% | > 20% | Circuit breaker trips → auto-failover to Gemini 2.0 Flash |
| Gemini API errors | > 5% | > 20% | Circuit breaker trips → auto-failover to GPT-4o |
| All AI providers down | — | any | PagerDuty P0, display maintenance banner |
| DB connections | > 80% pool | > 95% pool | Scale connection pooler |
| Deploy queue depth | > 20 jobs | > 50 jobs | Scale BullMQ workers |

---

## 8. Integration Architecture

### 8.1 Vercel Deploy Integration

```typescript
// services/deploy/vercel.ts
export class VercelDeployService {
  async deploy(params: {
    projectFiles: ProjectFile[]
    envVars: Record<string, string>
    projectName: string
    accessToken: string
  }): Promise<string> {

    // 1. Create deployment
    const deployment = await vercelApi.post('/v13/deployments', {
      name: params.projectName,
      files: params.projectFiles.map(f => ({
        file: f.path,
        data: f.content,
      })),
      env: params.envVars,
      buildCommand: 'npm run build',
      outputDirectory: '.next',
    }, { headers: { Authorization: `Bearer ${params.accessToken}` } })

    // 2. Poll until ready (max 3 minutes)
    const deployUrl = await pollUntilReady(deployment.id, params.accessToken)

    return deployUrl
  }

  private async pollUntilReady(deploymentId: string, token: string): Promise<string> {
    const MAX_WAIT = 180_000
    const INTERVAL = 3_000
    const start = Date.now()

    while (Date.now() - start < MAX_WAIT) {
      const status = await vercelApi.get(`/v13/deployments/${deploymentId}`)
      if (status.readyState === 'READY') return status.url
      if (status.readyState === 'ERROR') throw new Error(status.errorMessage)
      await sleep(INTERVAL)
    }
    throw new Error('Deploy timed out after 3 minutes')
  }
}
```

### 8.2 GitHub Integration

```typescript
// services/github/index.ts — uses isomorphic-git (no git binary needed)
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'

export async function pushToGitHub(params: {
  files: ProjectFile[]
  repoUrl: string
  branch: string
  commitMessage: string
  accessToken: string
}) {
  // In-memory filesystem
  const fs = new MemFS()

  // Write all files to in-memory FS
  await git.init({ fs, dir: '/' })
  for (const file of params.files) {
    await fs.promises.mkdir(path.dirname(file.path), { recursive: true })
    await fs.promises.writeFile(file.path, file.content)
    await git.add({ fs, dir: '/', filepath: file.path })
  }

  await git.commit({
    fs, dir: '/',
    message: params.commitMessage,
    author: { name: 'Forge AI', email: 'git@forge.ai' }
  })

  await git.push({
    fs, http, dir: '/',
    remote: 'origin',
    url: params.repoUrl,
    ref: params.branch,
    onAuth: () => ({ username: 'x-token', password: params.accessToken })
  })
}
```

### 8.3 Stripe Webhook Handling

```typescript
// routes/billing/webhook.ts
fastify.post('/billing/webhook', async (req, reply) => {
  const sig = req.headers['stripe-signature']
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return reply.status(400).send({ error: 'Invalid signature' })
  }

  // Idempotency: skip if already processed
  const processed = await redis.get(`stripe:event:${event.id}`)
  if (processed) return reply.send({ received: true })

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
      break
  }

  await redis.setex(`stripe:event:${event.id}`, 86400, '1')
  reply.send({ received: true })
})
```

---

## 9. Frontend Component Architecture

### 9.1 Workspace Component Tree

```
WorkspacePage (app/workspace/[projectId]/page.tsx)
├── WorkspaceHeader
│   ├── Logo (links to dashboard)
│   ├── ProjectNameEditor (inline edit on click)
│   ├── CollaboratorAvatars (Liveblocks presence)
│   ├── GitHubSyncStatus badge
│   ├── ShareButton (copy preview URL)
│   └── DeployButton → DeployModal
│
├── WorkspaceLayout (resizable three-panel)
│   │
│   ├── [Panel 1] FileTreePanel (min 160px, default 240px, max 400px)
│   │   ├── FileTreeHeader (search input + new file/folder buttons)
│   │   └── FileTree
│   │       └── FileTreeNode (recursive)
│   │           ├── FolderNode (expand/collapse, context menu)
│   │           └── FileNode (click to open, context menu)
│   │
│   ├── [Panel 2] CenterPanel (flexible, min 400px)
│   │   ├── PanelTabBar
│   │   │   ├── Tab: "Editor" (Monaco)
│   │   │   └── Tab: "Chat" (AI)
│   │   │
│   │   ├── [When Editor active] EditorPane
│   │   │   ├── FileTabBar (open files as tabs)
│   │   │   └── MonacoEditor (lazy-loaded)
│   │   │
│   │   └── [When Chat active] ChatPane
│   │       ├── ChatMessageList (virtualized scroll)
│   │       │   ├── UserMessage
│   │       │   └── AssistantMessage
│   │       │       ├── ExplanationText (markdown)
│   │       │       ├── DiffViewer (per changed file)
│   │       │       └── UndoButton
│   │       ├── SuggestedPrompts (3 chips after each response)
│   │       └── ChatInput
│   │           ├── Textarea (auto-resize, @mention support)
│   │           ├── ImageAttachButton
│   │           └── SendButton (Cmd+Enter)
│   │
│   └── [Panel 3] PreviewPanel (min 300px, default 40%)
│       ├── PreviewToolbar
│       │   ├── ViewportToggle (Mobile/Tablet/Desktop)
│       │   ├── RefreshButton
│       │   └── OpenInNewTabButton
│       ├── WebContainerFrame (iframe or loading skeleton)
│       │   └── ErrorOverlay (when runtime error)
│       │       ├── ErrorMessage (file + line)
│       │       └── FixWithAIButton
│       └── ConsolePanel (collapsible bottom drawer)
│           └── ConsoleEntry (log/warn/error entries)
│
└── CommandPalette (Cmd+K, portal rendered at root)
    ├── SearchInput
    └── CommandList
        ├── ProjectCommands (switch project, new project)
        ├── FileCommands (open file, new file)
        └── ActionCommands (deploy, share, settings)
```

### 9.2 Custom Hook Interfaces

```typescript
// hooks/useWebContainer.ts
function useWebContainer(projectId: string) {
  return {
    status: 'idle' | 'booting' | 'installing' | 'running' | 'error',
    serverUrl: string | null,
    consoleLines: ConsoleLine[],
    currentError: RuntimeError | null,
    writeFile: (path: string, content: string) => Promise<void>,
    reboot: () => Promise<void>,
    clearConsole: () => void,
  }
}

// hooks/useAIStream.ts
function useAIStream(projectId: string) {
  return {
    isStreaming: boolean,
    currentTokens: string,      // tokens as they stream in
    messages: AIMessage[],
    sendMessage: (prompt: string, imageUrl?: string) => Promise<void>,
    undoLastChange: () => Promise<void>,
    clearHistory: () => Promise<void>,
  }
}

// hooks/useProject.ts
function useProject(projectId: string) {
  return {
    project: Project | undefined,
    files: ProjectFile[],
    isLoading: boolean,
    updateProject: (data: Partial<Project>) => Promise<void>,
    createFile: (path: string, content?: string) => Promise<void>,
    updateFile: (path: string, content: string) => Promise<void>,
    deleteFile: (path: string) => Promise<void>,
  }
}

// hooks/useDeploy.ts
function useDeploy(projectId: string) {
  return {
    deployments: Deployment[],
    activeDeployment: Deployment | null,
    deploy: (provider: DeployProvider) => Promise<void>,
    rollback: (deploymentId: string) => Promise<void>,
    isDeploying: boolean,
  }
}
```

### 9.3 Design System Tokens

```typescript
// tailwind.config.ts
const colors = {
  // Backgrounds
  'bg-base':        '#0D1117',   // main app background
  'bg-surface':     '#161B22',   // cards, panels
  'bg-overlay':     '#21262D',   // dropdowns, modals
  'bg-hover':       '#30363D',   // hover states

  // Borders
  'border-subtle':  '#21262D',
  'border-default': '#30363D',
  'border-strong':  '#484F58',

  // Text
  'text-primary':   '#F0F6FC',
  'text-secondary': '#8B949E',
  'text-muted':     '#484F58',

  // Accents
  'violet':         '#7C3AED',   // primary brand
  'violet-light':   '#A78BFA',
  'cyan':           '#0EA5E9',   // secondary brand
  'cyan-light':     '#7DD3FC',

  // Semantic
  'success':        '#10B981',
  'warning':        '#F59E0B',
  'error':          '#EF4444',
  'info':           '#3B82F6',
}
```

---

## 10. Security & Compliance

### Authorization Matrix

| Action | Viewer | Member | Admin | Owner |
|--------|--------|--------|-------|-------|
| View project | ✅ | ✅ | ✅ | ✅ |
| Edit files | ❌ | ✅ | ✅ | ✅ |
| Send AI prompt | ❌ | ✅ | ✅ | ✅ |
| Deploy | ❌ | ✅ | ✅ | ✅ |
| Invite members | ❌ | ❌ | ✅ | ✅ |
| Change roles | ❌ | ❌ | ✅ | ✅ |
| Delete project | ❌ | ❌ | ✅ | ✅ |
| Manage billing | ❌ | ❌ | ❌ | ✅ |
| Delete workspace | ❌ | ❌ | ❌ | ✅ |

### OWASP Top 10 Mitigations

| Threat | Mitigation |
|--------|-----------|
| **SQL Injection** | Drizzle ORM parameterized queries everywhere; no raw string concatenation |
| **XSS** | React escapes by default; `dangerouslySetInnerHTML` never used; CSP headers |
| **CSRF** | SameSite=Strict cookies; Keycloak handles session management |
| **Broken Auth** | Keycloak handles MFA, session rotation, brute-force protection; OIDC tokens are short-lived |
| **Sensitive Data Exposure** | TLS 1.3 everywhere; AES-256 at rest (Postgres + MinIO encryption); API keys hashed with bcrypt |
| **Broken Access Control** | PostgreSQL RLS at DB layer + API middleware checks — two independent layers |
| **Security Misconfiguration** | Security headers via Traefik middleware; no default credentials in prod; Keycloak hardened realm settings |
| **Prompt Injection** | AI output sandboxed in WebContainer; no exec() or system calls allowed |
| **Dependency Vulnerabilities** | Snyk in CI + nightly audit; auto-PRs for security patches |
| **Logging Failures** | Pino structured logs for all requests; Sentry for all errors |

---

## 11. Architectural Decision Records (ADRs)

### ADR-001: WebContainers over Server-Side Execution

**Status:** Accepted  
**Context:** We need users to see a live preview of their app. Options: (A) run a container per user on our servers, (B) use WebContainers to run Node.js in the browser.  
**Decision:** Use `@webcontainer/api` for in-browser execution.  
**Consequences:**
- ✅ Zero server compute cost for preview — scales infinitely at zero marginal cost
- ✅ No cold start — browser already running
- ✅ Each user is isolated by browser sandbox
- ⚠️ Requires COOP/COEP headers (can conflict with some third-party scripts)
- ⚠️ Only works in Chromium/Firefox — no Safari < 16.4 support
- ⚠️ Limited to Node.js apps — no Python, Ruby, etc.

---

### ADR-002: Fastify over Express or Hono

**Status:** Accepted  
**Context:** Need an HTTP framework for the API server.  
**Decision:** Fastify  
**Consequences:**
- ✅ 2× throughput vs Express in benchmarks (important for SSE streaming)
- ✅ First-class TypeScript with JSON schema validation built in
- ✅ Plugin ecosystem for Supabase, Redis, Stripe
- ⚠️ Smaller ecosystem than Express (acceptable given our use case)

---

### ADR-003: PostgreSQL + Drizzle ORM over Supabase

**Status:** Accepted  
**Context:** Need database, file storage, and real-time for collaboration. Original plan used Supabase as a managed wrapper around Postgres.  
**Decision:** Standard PostgreSQL 16 with Drizzle ORM, MinIO for file storage, and SSE for real-time (already in the API). No Supabase dependency.  
**Consequences:**
- ✅ Runs identically in Docker locally, on RDS, Cloud SQL, Azure DB, or bare metal — truly cloud-agnostic
- ✅ No vendor SDK lock-in: standard `postgres.js` wire protocol driver works everywhere
- ✅ Drizzle ORM provides type-safe queries, schema-as-code migrations, and zero runtime overhead
- ✅ PostgreSQL RLS works natively without Supabase — same security model, no wrapper needed
- ✅ MinIO provides S3-compatible object storage locally; same SDK (`@aws-sdk/client-s3`) targets AWS S3/GCS/Azure Blob in cloud
- ✅ pgBouncer connection pooler handles connection limits at scale (Docker sidecar locally, RDS Proxy in cloud)
- ⚠️ No Supabase Realtime — real-time collaboration uses Liveblocks (ADR-007) and SSE for AI streaming
- ⚠️ Migration management is manual — solved by Drizzle Kit (`pnpm db:migrate`) in CI before every deploy

---

### ADR-004: AWS Bedrock as Primary AI Provider

**Status:** Accepted  
**Context:** Need an AI provider for code generation. Options: (A) Anthropic direct API only, (B) OpenAI only, (C) AWS Bedrock as primary with multi-provider fallback.  
**Decision:** AWS Bedrock (Claude 3.5 Sonnet v2) as primary → Anthropic direct API (same model) as Fallback 1 → Google Gemini 2.0 Flash (Vertex AI) as Fallback 2 → OpenAI GPT-4o as Fallback 3 (last resort). Different tasks route to different models based on latency/cost/quality requirements (see task-to-model table in §5.5).  
**Consequences:**
- ✅ **Compliance:** Model inference stays within AWS for primary path — no customer code sent to third-party endpoints (critical for Enterprise/SOC 2)
- ✅ **Cost control:** Reserved throughput pricing on Bedrock; Nova Lite/Haiku for cheap tasks cuts AI costs by ~60% vs using Sonnet for everything
- ✅ **Resilience:** Four-provider chain with circuit breaker — effectively zero AI downtime
- ✅ **Vision support:** Claude 3.5 Sonnet v2 on Bedrock fully supports images — no need to leave Bedrock for image-to-UI tasks
- ✅ **Right model for the job:** Haiku/Nova Lite for fast cheap tasks; Sonnet for code gen; Opus for large refactors
- ✅ **Gemini 2.0's 1M context window** exploited for template recommendation (browsing all templates at once)
- ⚠️ Bedrock requires AWS model access approval for Claude models (request in advance)
- ⚠️ Four provider SDKs to maintain (`@aws-sdk/client-bedrock-runtime`, `@anthropic-ai/sdk`, `@google/generative-ai`, `openai`) — all wrapped behind `AIRouter`

---

### ADR-005: Diff-Based AI Responses (not Full File Rewrites)

**Status:** Accepted  
**Context:** AI could respond by returning complete updated files or just the changes (unified diffs).  
**Decision:** Unified diff format  
**Consequences:**
- ✅ 60–80% fewer output tokens → lower cost, faster response
- ✅ User can review exactly what changed (not hunt for changes in a wall of code)
- ✅ Easier to revert (apply reverse diff)
- ⚠️ Diff parsing can fail on complex changes → fallback: request full file if diff fails to apply

---

### ADR-006: Keycloak over Clerk or Custom Auth

**Status:** Accepted  
**Context:** Need auth with social OAuth, MFA, org/workspace model, and future SAML/SSO for enterprise. Options: (A) Clerk (SaaS, $0.02/MAU), (B) custom JWT auth, (C) Keycloak (open source, self-hosted).  
**Decision:** Keycloak 24  
**Consequences:**
- ✅ **Zero vendor lock-in** — open source Apache 2.0, runs in Docker locally and on any cloud
- ✅ **GitHub + Google OAuth** via identity brokering — same UX as Clerk, configured via realm export JSON
- ✅ **MFA, brute-force protection, session management** built in — no custom code
- ✅ **SAML 2.0 and OIDC** natively supported — Enterprise SSO (Google Workspace, Okta, Azure AD) works from day one
- ✅ **OIDC-compliant tokens** — standard JWT, works with any OIDC library (`openid-client` in Node.js)
- ✅ **$0/MAU** — no pricing cliff at 500K users
- ✅ **Realm config as code** — `realm-export.json` in repo, imported at startup in Docker Compose and CI
- ⚠️ We operate the Keycloak instance — need to handle upgrades, backups, and HA in production
  - Mitigation: Keycloak on managed container platform (ECS/GKE), PostgreSQL DB already managed, stateless so easy to scale horizontally
- ⚠️ COOP/COEP headers (required by WebContainers) can break OAuth popup flows
  - Mitigation: Use Keycloak redirect flow (not popup) — fully supported, no workarounds needed

---

### ADR-007: Liveblocks over Custom WebSocket Server

**Status:** Accepted  
**Context:** Need real-time collaboration (multi-cursor, presence) for Team plan.  
**Decision:** Liveblocks  
**Consequences:**
- ✅ Monaco Editor binding available (`@liveblocks/react-lexical` + custom)
- ✅ CRDT-based conflict resolution built in
- ✅ Scales to millions of concurrent users (their infrastructure)
- ✅ 3–4 months of WebSocket infrastructure saved
- ⚠️ Adds $99+/mo cost at scale → still cheaper than maintaining our own infra

---

### ADR-008: Docker-First, Cloud-Agnostic Deployment

**Status:** Accepted  
**Context:** Choose deployment approach: PaaS (Vercel/Railway/Fly.io), serverless (Lambda/Cloud Run), or containerized Docker on any cloud.  
**Decision:** Docker containers, deployed via GitHub Actions to any OCI-compatible runtime. GHCR as container registry.  
**Consequences:**
- ✅ **Local = Production** — same Docker images run in `docker compose up` locally and in ECS/GKE/ACA in cloud
- ✅ **Cloud-agnostic** — swap one step in the GitHub Actions workflow to change cloud provider
- ✅ **GHCR is free** and integrated with GitHub tokens (no registry credentials to manage)
- ✅ **Multi-arch builds** (AMD64 + ARM64) — supports Apple Silicon dev machines and Graviton2/T2A in cloud
- ✅ **Environment variables as the only config** — same image, different env → different behaviour
- ✅ **Deterministic builds** — Docker layer caching in GitHub Actions means fast CI builds
- ✅ **Staging = scaled-down production** — same Compose services, smaller instance sizes
- ⚠️ Need to manage Dockerfiles for web + api — solved by multi-stage builds (dev target + prod target in same file)
- ⚠️ Database migrations must run before new containers start — solved by migration job step in CI before container deploy

---

## 12. Open Questions & Future Considerations

### Unresolved Technical Questions (Sprint 0)
1. **WebContainer + Keycloak redirect:** COOP/COEP headers required by WebContainers — redirect-based Keycloak OIDC flow must be tested in Sprint 1 (popup flow explicitly not used).
2. **Snapshot storage strategy:** `files_json` JSONB in Postgres may become expensive for large projects. Consider moving to MinIO at > 1MB snapshot size (Sprint 13).
3. **WebContainer memory limits:** Chrome caps WASM at 4GB. Large projects with `node_modules` may approach this. Need to measure in Sprint 5.
4. **Diff format failure rate:** Need to measure % of Claude responses that fail diff parsing and design graceful fallback in Sprint 3.

### Scalability at 100K Users
- **Bottleneck 1:** PostgreSQL connection limits → resolved by pgBouncer (Docker sidecar locally, RDS Proxy in cloud)
- **Bottleneck 2:** BullMQ single Redis instance → resolved by Redis Cluster in v2.0
- **Bottleneck 3:** AI cost → $0.003 per 1K output tokens × 50 msgs/day × 100K users = ~$15K/day at full free tier. Must enforce limits aggressively and monetise early.

### Future Architecture Evolutions
| Feature | Architecture Change Needed |
|---------|--------------------------|
| Mobile app | React Native (Web view for preview, native for dashboard) |
| Self-hosted / on-premise | Already possible — ship the Docker Compose bundle. Customer provides Postgres + Redis. |
| Multi-language support | WebContainers only support Node.js. Python/Ruby would require server-side sandboxes (Firecracker microVMs) |
| Custom AI model fine-tuning | Separate ML infra (Modal.com or HuggingFace Inference), routing layer to choose model |
| Database branching | Migrate Postgres to Neon for branching-per-PR (optional — swap connection string in staging workflow) |

---

*This is a living document. Update ADRs when key decisions change. Maintain version history in Git.*
