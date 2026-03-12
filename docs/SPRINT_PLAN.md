# Forge AI — Agile Sprint Development Plan

**Version:** 1.0  
**Total Duration:** 40 weeks (20 sprints × 2 weeks)  
**Team Size:** 4 engineers (1 FE, 1 BE, 1 AI/Full-stack, 1 Infra/DevOps)  
**Velocity:** 40 story points per sprint  
**Sprint Length:** 2 weeks  

---

## Team Structure

| Role | Responsibilities |
|------|-----------------|
| **Frontend Engineer (FE)** | Next.js, React, Monaco Editor, UI components, WebContainer integration |
| **Backend Engineer (BE)** | Fastify API, PostgreSQL, Redis, BullMQ, REST endpoints |
| **AI / Full-stack Engineer (AI)** | Claude integration, prompt engineering, streaming, diff system, full-stack features |
| **Infra / DevOps (Infra)** | CI/CD, Docker, GitHub Actions, GHCR, cloud deployments, monitoring, security |

## Ceremonies

| Ceremony | Frequency | Duration | Who |
|----------|-----------|----------|-----|
| Daily Standup | Daily | 15 min | Full team |
| Sprint Planning | Sprint start | 2 hours | Full team |
| Sprint Review / Demo | Sprint end | 1 hour | Full team + stakeholders |
| Retrospective | Sprint end | 45 min | Full team |
| Backlog Refinement | Mid-sprint | 1 hour | PM + Tech leads |

## Definition of Ready (story enters sprint)
- [ ] Acceptance criteria written and understood by team
- [ ] Design mockup exists (for UI stories)
- [ ] Dependencies identified and resolved
- [ ] Story pointed by team consensus
- [ ] No blockers identified

## Definition of Done (story is complete)
- [ ] Code implemented and peer-reviewed (PR approved)
- [ ] Unit tests written (>80% coverage for new code)
- [ ] Integration tests pass in CI
- [ ] Deployed to staging and smoke-tested
- [ ] Acceptance criteria verified
- [ ] No new P0/P1 bugs introduced

---

## Story Point Scale
| Points | Time | Complexity |
|--------|------|------------|
| 1 | 2–4 hrs | Trivial — config change, copy edit |
| 2 | 4–8 hrs | Simple — straightforward implementation |
| 3 | 1 day | Moderate — some complexity or unknowns |
| 5 | 2–3 days | Complex — multiple components or integrations |
| 8 | 4–5 days | Very complex — should consider splitting |

---

## Phase 1: Alpha (Sprints 0–6) — Weeks 1–14
**Goal:** Core loop working end-to-end. Users can describe → generate → see running app.

---

### Sprint 0 — Project Foundation
**Duration:** Week 0 (pre-sprint setup)  
**Sprint Goal:** Every engineer can commit, test, and deploy on day 1.  
**Value Delivered:** Zero-friction development environment for the whole team. Full local stack runs with one command.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S0-01 | Set up monorepo (Turborepo) with `apps/web`, `apps/api`, `packages/shared` | 3 | Infra | `pnpm dev` starts all services locally |
| S0-02 | Configure Next.js 14 app with TypeScript + Tailwind + shadcn/ui | 2 | FE | `localhost/` renders a blank page with correct styling |
| S0-03 | Configure Fastify API with TypeScript, Zod validation, Pino logging | 2 | BE | `localhost/api/health` returns `{ status: "ok" }` |
| S0-04 | Write `docker-compose.yml` with PostgreSQL 16, Redis 7, MinIO, Keycloak 24, Traefik | 5 | Infra | `docker compose up` starts all services; health checks pass for all containers |
| S0-05 | Write multi-stage Dockerfiles for `apps/web` and `apps/api` (dev + prod targets) | 3 | Infra | `docker build --target dev` and `--target prod` both succeed; prod image < 200MB |
| S0-06 | Configure Keycloak realm: create `forge` realm, `forge-web` + `forge-api` clients, enable GitHub + Google identity brokering | 5 | BE+Infra | Export `infra/keycloak/realm-export.json`; `docker compose up` auto-imports realm; GitHub OAuth login works locally |
| S0-07 | Set up PostgreSQL schema with Drizzle ORM: initial migration, RLS policies enabled | 3 | BE | `pnpm db:migrate` runs cleanly; tables created; `pnpm db:seed` populates test data |
| S0-08 | Integrate MinIO: create buckets (`avatars`, `snapshots`, `assets`), configure SDK in API | 2 | BE | Upload test file via `@aws-sdk/client-s3` pointing at MinIO; file retrievable via presigned URL |
| S0-09 | GitHub Actions: `pr.yml` — lint + typecheck + unit tests + docker build check | 3 | Infra | PR check runs in < 4 min; runs Postgres + Redis as service containers; fails on type errors |
| S0-10 | GitHub Actions: `staging.yml` — build images → push to GHCR → deploy to staging | 3 | Infra | Push to `main` builds multi-arch images, pushes to `ghcr.io/org/forge-web` and `forge-api`, deploys to staging environment |
| S0-11 | Set up Sentry (FE + BE) and PostHog (FE) | 2 | Infra | Errors appear in Sentry dashboard, pageviews in PostHog |
| S0-12 | Create shared TypeScript types package (`packages/shared`) | 2 | AI | API request/response types imported correctly in both apps |
| S0-13 | Write team README: local setup (docker compose), env vars, deploy process | 1 | Infra | Any engineer can set up from scratch in < 30 min using only Docker + pnpm |
| **Total** | | **36** | | |

**Definition of Done:** Every engineer has run `docker compose up && pnpm install && pnpm dev`, seen all services healthy, and made a PR that passed CI.  
**Demo:** Walk through `docker compose up` from scratch → show Traefik dashboard → Keycloak admin → MinIO console → pgAdmin → hot reload in web app.

---

### Sprint 1 — Authentication & User Accounts
**Duration:** Weeks 1–2  
**Sprint Goal:** Users can sign up, log in, and have a personal workspace.  
**Value Delivered:** First users can create accounts — onboarding funnel is open.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S1-01 | GitHub OAuth login via Keycloak identity brokering | 3 | FE+BE | User clicks "Continue with GitHub" → Keycloak redirect → authenticates → lands on dashboard with OIDC session |
| S1-02 | Google OAuth login via Keycloak identity brokering | 2 | FE+BE | Same as above for Google; both providers configured in realm-export.json |
| S1-03 | Email + password signup with email verification | 3 | FE+BE | Keycloak sends verification email (via Resend SMTP); account unlocked after clicking link |
| S1-04 | Magic link / passwordless login | 2 | FE+BE | Keycloak "email OTP" flow; link logs user in, expires in 15 min |
| S1-05 | OIDC callback → create `users` + `workspaces` record in PostgreSQL | 3 | BE | On first successful Keycloak login, `POST /v1/auth/sync` creates user + personal workspace; idempotent |
| S1-06 | Auth middleware: Keycloak OIDC token validation for all `/dashboard` routes | 2 | FE+BE | Expired/invalid tokens return 401; unauthenticated users redirected to `/login` |
| S1-07 | User profile page (name, avatar, email display) | 2 | FE | Profile page renders user data from PostgreSQL |
| S1-08 | Avatar upload (to MinIO `avatars` bucket, update PostgreSQL `users.avatar_url`) | 3 | FE+BE | User uploads JPG/PNG < 2MB, presigned URL returned, new avatar shown immediately |
| S1-09 | Password reset flow (via Keycloak) | 2 | FE | Reset email sent via Keycloak; new password set; user logged in |
| S1-10 | Account deletion (soft delete, schedule cleanup job) | 3 | BE | Confirmation modal; account inaccessible immediately; data deleted in 30 days via BullMQ job |
| S1-11 | Logout (clear OIDC session in Keycloak + client-side) | 1 | FE | Session cleared in Keycloak + browser; redirected to `/`; can't access dashboard |
| S1-12 | `/login` and `/signup` page UI (polished, branded) | 3 | FE | Matches design spec, mobile-responsive, no layout issues |
| **Total** | | **29** | | |

**Definition of Done:** A new user can sign up with GitHub, see their profile, and log out.  
**Demo:** Live signup → profile → logout → login with magic link.  
**Risks:** Keycloak OIDC redirect must work under COOP/COEP headers (WebContainer requirement) — redirect flow (not popup) is used, which is compatible. Verify in this sprint.

---

### Sprint 2 — Project Dashboard & CRUD
**Duration:** Weeks 3–4  
**Sprint Goal:** Users can create, view, and manage projects from a dashboard.  
**Value Delivered:** Users have a home base — the foundation everything else builds on.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S2-01 | Dashboard page `/dashboard` — project grid with empty state | 3 | FE | Empty state with "Create your first project" CTA shown when 0 projects |
| S2-02 | `POST /v1/projects` — create project API | 3 | BE | Project created in DB, returns project object with ID |
| S2-03 | "New Project" modal (name input + blank/template selector placeholder) | 2 | FE | Modal opens, user enters name, project created, redirected to workspace |
| S2-04 | Project card component (name, last edited, deploy status badge, thumbnail placeholder) | 2 | FE | Cards render in grid, responsive at all breakpoints |
| S2-05 | `GET /v1/projects` — list projects for current user | 2 | BE | Returns paginated list, sorted by updated_at desc |
| S2-06 | `DELETE /v1/projects/:id` — soft delete project | 2 | BE | Project hidden from list, `deleted_at` set, recoverable for 30 days |
| S2-07 | Delete project with confirmation modal | 2 | FE | "Type project name to confirm" pattern, delete triggers toast |
| S2-08 | `PATCH /v1/projects/:id` — rename project | 1 | BE | Name updated, timestamp refreshed |
| S2-09 | Inline rename on project card (click → editable input → blur saves) | 2 | FE | F2 or double-click activates rename, Enter/Escape to confirm/cancel |
| S2-10 | `POST /v1/projects/:id/duplicate` — clone project | 3 | BE | New project created with all files copied, "(copy)" appended to name |
| S2-11 | Duplicate from project card context menu (right-click) | 2 | FE | Context menu appears, duplicate triggers toast with link to new project |
| S2-12 | Dashboard header with user avatar, workspace name, settings link | 2 | FE | Header renders, avatar shows, settings navigation works |
| S2-13 | Seed initial project files on create (Next.js starter template) | 3 | BE | New project has `package.json`, `src/app/page.tsx`, `tailwind.config.ts` |
| **Total** | | **29** | | |

**Definition of Done:** User can create 3 projects, rename them, delete one, duplicate another, and see them in a grid.  
**Demo:** Create project → dashboard grid → rename → duplicate → delete with confirmation.  
**Risks:** File seeding could be slow for large templates (mitigation: pre-bake snapshots in DB rather than copying files on demand).

---

### Sprint 3 — AI Chat Foundation
**Duration:** Weeks 5–6  
**Sprint Goal:** Users can send a natural language prompt and receive AI-generated code changes.  
**Value Delivered:** The core magic — this is the "wow" moment of the product.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S3-01 | `POST /v1/projects/:id/ai/chat` — streaming AI endpoint (SSE) | 5 | AI | Sends prompt to Claude 3.5 Sonnet, streams response tokens back to client |
| S3-02 | Context assembly: file tree + last 20 messages + user prompt | 5 | AI | System prompt includes full file tree summary and conversation history |
| S3-03 | AI response parser: extract diff blocks + explanation text | 5 | AI | Diff blocks parsed into `{ path, diff }` objects, explanation text separated |
| S3-04 | Diff applier: apply unified diffs to project files in PostgreSQL | 5 | AI | Files updated correctly, no corruption on edge cases (new file, deleted file) |
| S3-05 | Chat UI component: message list with user/assistant bubbles | 3 | FE | Messages scroll correctly, auto-scroll to latest, timestamps shown |
| S3-06 | Streaming text display: token-by-token render with cursor animation | 3 | FE | Text appears smoothly during stream, no layout jumps |
| S3-07 | Diff viewer component: show changed lines (green/red) in chat bubble | 5 | FE | Unified diff rendered with syntax highlighting, file name shown |
| S3-08 | Chat input: textarea with send button, Cmd+Enter shortcut | 2 | FE | Input expands to 5 lines max, sends on Cmd+Enter, clears after send |
| S3-09 | Loading state during AI generation (typing indicator dots) | 1 | FE | Three animated dots visible while streaming, disappear on completion |
| S3-10 | `GET /v1/projects/:id/ai/history` — fetch conversation history | 2 | BE | Returns all messages for project, sorted by created_at |
| S3-11 | Rate limiting: 50 AI messages/day for free users (Redis counter) | 3 | BE | 429 returned after limit, `X-RateLimit-Remaining` header on every response |
| **Total** | | **39** | | |

**Definition of Done:** User types "Add a blue header with the text Hello World" → AI streams back response → diff shown → files updated in DB.  
**Demo:** Live prompt → streaming response → diff shown in chat → inspect PostgreSQL to see updated file.  
**Risks:** Claude API latency (mitigation: stream first token immediately, show typing indicator at < 500ms). Diff parsing edge cases (mitigation: dedicate 1 day to diff format testing with 20 edge cases).

---

### Sprint 4 — Code Editor & File System
**Duration:** Weeks 7–8  
**Sprint Goal:** Users can browse their project files and edit code in a Monaco editor.  
**Value Delivered:** Users can see and tweak the code the AI generates — full transparency.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S4-01 | Three-panel workspace layout (resizable panels with drag handles) | 5 | FE | All three panels visible, drag handle resizes smoothly, sizes persist in localStorage |
| S4-02 | File tree component (recursive folder/file tree from project files) | 5 | FE | Tree renders correctly, folders expand/collapse, file icons by type |
| S4-03 | Monaco Editor integration (lazy-loaded, language detection by extension) | 5 | FE | Editor loads for `.tsx`, `.ts`, `.css`, `.json` with correct syntax highlighting |
| S4-04 | File open (click file → loads in editor, tab created) | 3 | FE | Click file in tree → editor loads content, tab appears in tab bar |
| S4-05 | Multi-tab support (open multiple files, close tabs with ×) | 3 | FE | Multiple tabs, active tab highlighted, unsaved changes dot shown |
| S4-06 | Auto-save (debounced 500ms → `PUT /v1/projects/:id/files/*path`) | 3 | FE+BE | Edit in editor → file saved to PostgreSQL within 1s, no manual save needed |
| S4-07 | `PUT /v1/projects/:id/files/*path` — create or update file API | 2 | BE | File upserted in `project_files`, size calculated |
| S4-08 | `DELETE /v1/projects/:id/files/*path` — delete file API | 1 | BE | File removed from DB |
| S4-09 | Create new file (right-click in tree → New File → name input) | 2 | FE | New file created in tree, editor opens to empty file, saved immediately |
| S4-10 | Create new folder | 2 | FE | Folder node added to tree, no DB record needed (virtual until file added) |
| S4-11 | Delete file with confirmation | 2 | FE | Right-click → Delete → confirm → file removed from tree and DB |
| S4-12 | Rename file (F2 to inline edit) | 2 | FE | F2 activates rename input, Enter confirms, old path deleted + new path created |
| S4-13 | Dark theme for Monaco matching app design palette | 1 | FE | Editor background matches `#0D1117`, correct accent colors |
| **Total** | | **36** | | |

**Definition of Done:** User can open a project, see file tree, click a file, edit it in Monaco, and see the change persist after refresh.  
**Demo:** Open project → expand file tree → click `page.tsx` → edit text in Monaco → refresh page → change persisted.  
**Risks:** Monaco is a large bundle (~2MB). Mitigation: lazy load with dynamic import, show skeleton while loading.

---

### Sprint 5 — Live Preview (WebContainers)
**Duration:** Weeks 9–10  
**Sprint Goal:** Users can see their app running live in the browser, updating as they edit.  
**Value Delivered:** The complete core loop — describe → AI builds → see it running. This is the product.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S5-01 | WebContainer bootstrap (install `@webcontainer/api`, configure COOP/COEP headers) | 3 | FE+Infra | WebContainer boots without errors, Vercel headers configured |
| S5-02 | Mount project files into WebContainer on workspace load | 5 | FE | All `project_files` from PostgreSQL loaded into WebContainer FS on open |
| S5-03 | Run `npm install` + `npm run dev` inside WebContainer on boot | 3 | FE | Vite dev server starts inside WebContainer, terminal output shown |
| S5-04 | Preview iframe: render WebContainer server URL in iframe | 3 | FE | App renders in preview pane, interactive (click, type, scroll all work) |
| S5-05 | File sync: editor save → WebContainer FS update → HMR triggers | 5 | FE | Edit file in Monaco → preview updates within 500ms (Vite HMR) |
| S5-06 | AI diff apply → sync to WebContainer FS (same sync pipeline) | 3 | AI+FE | AI changes auto-appear in preview without manual refresh |
| S5-07 | Viewport toggle (Desktop 1280 / Tablet 768 / Mobile 375) | 2 | FE | Clicking viewport icon resizes iframe width, label shows current size |
| S5-08 | Console panel: capture WebContainer stdout/stderr, display in pane | 3 | FE | `console.log` in app code appears in console panel with timestamp |
| S5-09 | Error overlay: detect runtime errors, show file + line, "Fix with AI" button | 5 | FE+AI | Runtime error → red overlay with error message → "Fix with AI" → sends error as prompt |
| S5-10 | Preview loading state (progress bar while WebContainer boots) | 2 | FE | Animated progress bar shown during boot, disappears when iframe renders |
| S5-11 | "Open in new tab" button for preview | 1 | FE | Clicking opens `preview.forge.ai/p/{projectId}` in new browser tab |
| S5-12 | Refresh preview button (Ctrl+Shift+R) | 1 | FE | Button and keyboard shortcut reload the WebContainer iframe |
| **Total** | | **36** | | |

**Definition of Done:** User opens a project, sees "Starting your app…" progress bar, app appears in preview pane within 10s, edits a heading in Monaco and sees it update in preview within 500ms.  
**Demo:** Open workspace → wait for preview boot → type in app (input field) → edit text in Monaco → preview hot-reloads → trigger a runtime error → click "Fix with AI" → AI fixes it.  
**Risks:** WebContainer requires cross-origin isolation headers (COOP/COEP) which can break third-party scripts. Mitigation: test with Keycloak redirect flow (confirmed COOP/COEP compatible — no popup), PostHog, Stripe.js early. WebContainer only works in Chrome/Edge/Firefox (not Safari < 16.4).

---

### Sprint 6 — Version History & AI Self-Healing
**Duration:** Weeks 11–12  
**Sprint Goal:** Users can safely iterate without fear of breaking things.  
**Value Delivered:** Confidence to experiment freely — removes the biggest psychological barrier to using AI-generated code.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S6-01 | Auto-snapshot before every AI change (save `files_json` to `project_snapshots`) | 5 | BE | Every AI chat response triggers snapshot creation before applying diffs |
| S6-02 | `GET /v1/projects/:id/snapshots` — list snapshots | 2 | BE | Returns list with ID, created_at, triggered_by, description (AI prompt) |
| S6-03 | Version history panel UI (timeline of snapshots in sidebar) | 3 | FE | Scrollable list, each entry shows timestamp + truncated prompt, "Restore" button |
| S6-04 | `POST /v1/projects/:id/snapshots/:id/restore` — restore snapshot | 3 | BE | All files replaced with snapshot JSON, new snapshot created before restore |
| S6-05 | "Undo last change" button (one-click restore previous snapshot) | 2 | FE | Cmd+Z in chat context restores last snapshot, toast confirms |
| S6-06 | AI self-healing loop (error detected → auto-retry up to 3x) | 5 | AI | Runtime error in WebContainer → AI auto-sends fix prompt → checks if error clears → retries up to 3 times |
| S6-07 | Suggested follow-up prompts (3 contextual suggestions after each AI response) | 3 | AI | After AI response, 3 gray suggestion chips appear below message |
| S6-08 | Snapshot cleanup job (BullMQ): keep only last 50 snapshots per project | 2 | BE | BullMQ job runs after every snapshot creation, deletes oldest if > 50 |
| S6-09 | Manual snapshot ("Save checkpoint" button) | 2 | FE+BE | User can name and save a checkpoint, shown with star icon in history |
| S6-10 | `@filename` mention in prompt (resolves file content into context) | 3 | AI | Typing `@Header.tsx` in prompt includes that file's content in AI context |
| **Total** | | **30** | | |

**Definition of Done:** User triggers a bad AI change → clicks "Undo" → previous state restored in < 2s. Runtime error appears → AI auto-heals it within 3 retries.  
**Demo:** Break the app with a bad prompt → show error overlay → AI self-heals → manually trigger undo to go back further → restore from version history panel.  
**Dependencies:** Sprint 3 (AI chat), Sprint 5 (WebContainer error capture).

---

## Phase 2: Beta (Sprints 7–12) — Weeks 13–24
**Goal:** Deployable product with billing, templates, and GitHub. Ready for 1,000 waitlist users.

---

### Sprint 7 — One-Click Deployment
**Duration:** Weeks 13–14  
**Sprint Goal:** Users can deploy their app to the internet in < 90 seconds.  
**Value Delivered:** Real apps on real URLs — the moment the product becomes truly valuable.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S7-01 | Vercel OAuth connect (store token encrypted in Supabase) | 3 | BE | User connects Vercel account, token stored, connection shown in settings |
| S7-02 | `POST /v1/projects/:id/deployments` — trigger Vercel deploy | 5 | BE | BullMQ job created, Vercel API called, deployment record created with `pending` status |
| S7-03 | DeployJob worker: upload files to Vercel, poll for ready, update DB | 5 | BE | Job completes, `deployments.status = 'deployed'`, `deploy_url` populated |
| S7-04 | Deploy button in workspace header + progress indicator | 3 | FE | Button triggers deploy, shows spinner + "Deploying…" → "Live ↗" with URL on success |
| S7-05 | Deploy history panel: list of past deployments with status + URL | 3 | FE | Deployments listed chronologically, each shows timestamp, status badge, URL link |
| S7-06 | Netlify OAuth connect + deploy (same pattern as Vercel) | 5 | BE+FE | User connects Netlify, can deploy to Netlify as alternative |
| S7-07 | Cloudflare Pages deploy | 3 | BE | Cloudflare Pages API integration, deploy to CF Pages |
| S7-08 | Rollback to previous deployment | 2 | BE+FE | Click "Rollback" on a past deployment → Vercel/Netlify rollback API called |
| S7-09 | Shareable preview URL (`preview.forge.ai/p/{id}`) | 3 | FE+Infra | WebContainer preview accessible via public URL for logged-out users (if project is public) |
| S7-10 | Environment variable management UI (add/edit/delete key-value pairs) | 3 | FE+BE | Env vars stored encrypted in PostgreSQL, injected into user's deploy as provider env vars |
| **Total** | | **35** | | |

**Definition of Done:** User clicks Deploy → selects Vercel → sees progress → live URL appears within 90s → clicking URL shows the deployed app.  
**Demo:** Full deploy flow live — watch deployment progress, copy URL, open in new tab, show deployed app.  
**Risks:** Vercel API rate limits. Mitigation: queue all deploys through BullMQ, retry with backoff.

---

### Sprint 8 — GitHub Integration
**Duration:** Weeks 15–16  
**Sprint Goal:** Users can sync their project with a GitHub repository.  
**Value Delivered:** Developers can own and version their code outside Forge — removes lock-in concern.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S8-01 | GitHub OAuth connect (store token, scopes: `repo`, `read:user`) | 3 | BE | User connects GitHub, token stored, shows connected account in settings |
| S8-02 | `POST /v1/projects/:id/github/push` — push to new GitHub repo | 5 | BE | New repo created on GitHub, all project files committed, repo URL saved to project |
| S8-03 | Push to existing repo (select from repo browser, select branch) | 5 | BE | User picks existing repo + branch, files committed with AI-generated commit message |
| S8-04 | GitHub connect UI in workspace (sidebar section or header button) | 3 | FE | "Connect GitHub" button → OAuth → repo selection modal |
| S8-05 | Sync status indicator ("In sync" / "N changes ahead" / "N behind") | 3 | FE+BE | Badge in workspace header shows current sync status, refreshes on file save |
| S8-06 | Pull changes from remote | 3 | BE | Pulls latest commits, applies diffs to project files, creates snapshot before merge |
| S8-07 | Create PR from Forge | 3 | BE+FE | "Create PR" button → AI generates PR description → PR created on GitHub → link shown |
| S8-08 | Import existing GitHub repo to new project | 5 | BE+FE | "Import from GitHub" flow: OAuth → repo picker → branch selector → imports all files to new project |
| **Total** | | **30** | | |

**Definition of Done:** User connects GitHub → pushes project to new repo → sees commit on GitHub → makes a change in Forge → pushes again → sees diff in GitHub commit history.

---

### Sprint 9 — Template Marketplace
**Duration:** Weeks 17–18  
**Sprint Goal:** Users can start from curated templates instead of a blank project.  
**Value Delivered:** Cuts time-to-first-app from 5 minutes to 30 seconds — dramatically improves activation.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S9-01 | Seed 7 official templates in DB (SaaS, Landing, Blog, E-commerce, Dashboard, API, Mobile Preview) | 5 | BE | Templates exist in DB with full `files_json`, thumbnail, description |
| S9-02 | Template gallery page (`/templates`) — grid with category filters | 3 | FE | Gallery shows all templates, filters by category, search by name |
| S9-03 | Template card component (thumbnail, name, category badge, use count) | 2 | FE | Cards render correctly, hover state shows preview button |
| S9-04 | Template preview modal (live WebContainer preview before clone) | 5 | FE | Clicking "Preview" spins up a read-only WebContainer with template files |
| S9-05 | `POST /v1/templates/:id/clone` — clone template to new project | 3 | BE | New project created with all template files copied, user redirected to workspace |
| S9-06 | Template selection in "New Project" modal (update Sprint 2 modal) | 2 | FE | New Project modal now shows template grid as default, "Blank" is one option |
| S9-07 | `GET /v1/templates` — public endpoint (no auth required) | 1 | BE | Returns template list, usable on marketing pages before signup |
| S9-08 | Onboarding wizard update: "What do you want to build?" → template suggestions | 3 | FE+AI | First-time users see AI-suggested templates based on their description |
| S9-09 | Template ratings (5-star, simple schema) | 3 | FE+BE | Logged-in users can rate templates, average shown on card |
| S9-10 | Usage counter: increment `templates.use_count` on clone | 1 | BE | Counter increments on every clone |
| **Total** | | **28** | | |

**Definition of Done:** New user clicks "SaaS Starter" template → previews it → clones it → workspace opens with full SaaS starter code → app boots in preview within 15s.

---

### Sprint 10 — Billing & Subscriptions
**Duration:** Weeks 19–20  
**Sprint Goal:** Users can upgrade to Pro and pay with a credit card.  
**Value Delivered:** Revenue — first dollar earned. Product is now a business.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S10-01 | Stripe products + prices setup (Free, Pro $29/mo, Team $79/seat/mo) | 2 | BE | Stripe products created, price IDs stored in env vars |
| S10-02 | `POST /v1/billing/checkout` — create Stripe Checkout session | 3 | BE | Checkout URL returned, user redirected to Stripe-hosted page |
| S10-03 | Stripe webhook handler (`/v1/billing/webhook`) — handle subscription events | 5 | BE | `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed` all handled correctly |
| S10-04 | Update `subscriptions` table on webhook events | 3 | BE | Plan, status, period dates all updated on webhook receipt |
| S10-05 | Pricing page UI (`/pricing`) — three-column plan comparison | 3 | FE | Free/Pro/Team columns with feature list, highlighted recommended plan, CTA buttons |
| S10-06 | Upgrade prompt modal when hitting free tier limits | 3 | FE | When AI message limit hit, modal shows plan comparison with upgrade CTA |
| S10-07 | `POST /v1/billing/portal` — Stripe Customer Portal link | 2 | BE | Portal URL returned, user can manage payment methods + cancel |
| S10-08 | Usage dashboard widget (messages used today / storage used) | 3 | FE+BE | Widget in sidebar shows current usage with visual bar |
| S10-09 | Plan badge in user menu (shows "Free", "Pro", "Team") | 1 | FE | Badge visible in nav, links to billing page |
| S10-10 | Enforce plan limits across all features (projects, messages, storage) | 5 | BE | Free: 3 projects max, 50 AI msgs/day, 500MB. Pro: unlimited projects, 500 msgs/day |
| S10-11 | Downgrade to free (end of period, data retained 90 days) | 2 | BE | Stripe subscription canceled, plan set to free at period end, no immediate data loss |
| **Total** | | **32** | | |

**Definition of Done:** User on free tier hits message limit → sees upgrade prompt → completes Stripe checkout → plan immediately upgrades → limit removed.  
**Demo:** Hit message limit → upgrade to Pro → watch Stripe webhook fire → plan updated in real time.  
**Risks:** Stripe webhook delivery can be delayed or fail. Mitigation: idempotency keys, webhook event deduplication.

---

### Sprint 11 — Team Collaboration
**Duration:** Weeks 21–22  
**Sprint Goal:** Multiple users can work together on a project in real time.  
**Value Delivered:** Team plan unlocked — higher ACV, enterprise pipeline starts.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S11-01 | Workspace members schema + API (invite, accept, role management) | 3 | BE | `workspace_members` table, invite email sent via Resend |
| S11-02 | Liveblocks setup: room per project, presence + storage | 3 | FE+Infra | Liveblocks room active when workspace opens, multiple users see each other |
| S11-03 | Collaborator avatars in workspace header (who's currently online) | 3 | FE | Avatar stack shows online users, tooltip with name on hover |
| S11-04 | Multi-cursor in Monaco (Liveblocks binding for cursor positions) | 5 | FE | Two users open same project → each sees the other's cursor with name label |
| S11-05 | Team settings page (invite by email, see members, change roles, remove) | 3 | FE+BE | Owner can invite, change roles, remove members |
| S11-06 | Role-based access: Viewer role (read-only, no editor/chat access) | 2 | FE+BE | Viewer can open workspace but editor and chat input are disabled |
| S11-07 | Code comments (highlight code → right-click → Add Comment → thread) | 5 | FE+BE | Comment stored in DB, shown as annotation in Monaco gutter, resolvable |
| S11-08 | Activity feed panel (right sidebar: AI prompts, deploys, file edits) | 3 | FE+BE | Feed shows last 50 events per project, real-time updates via SSE (PostgreSQL LISTEN/NOTIFY → SSE stream) |
| S11-09 | Team plan enforcement (collaboration features gated to Team tier) | 2 | BE | API returns 403 for collaboration endpoints if workspace is not on Team plan |
| **Total** | | **29** | | |

**Definition of Done:** Two users open the same project → see each other's avatars → both move cursors → see each other's cursors → one sends AI prompt → both see the response and preview update.

---

### Sprint 12 — Alpha Polish & Beta Readiness
**Duration:** Weeks 23–24  
**Sprint Goal:** Performance, stability, and onboarding polish — product is ready for public beta.  
**Value Delivered:** Product that doesn't embarrass you in front of 1,000 new users.

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| S12-01 | Loading skeletons for dashboard project cards | 1 | FE | Shimmer skeleton shown during data fetch, no layout shift |
| S12-02 | Loading skeleton for workspace file tree | 1 | FE | Skeleton rows shown while files load |
| S12-03 | Error boundaries: all major views have fallback UI | 3 | FE | Unhandled error shows friendly message + "Reload" button, not white screen |
| S12-04 | Toast notification system (success, error, warning, info) | 2 | FE | All async actions trigger appropriate toasts, auto-dismiss in 3–5s |
| S12-05 | Command palette (Cmd+K) — search projects, files, actions | 5 | FE | Opens instantly, fuzzy search across projects and files, keyboard navigable |
| S12-06 | Keyboard shortcuts implementation (all 12 from PRD) | 3 | FE | All shortcuts documented in app, functional and non-conflicting |
| S12-07 | Mobile-responsive dashboard (not editor — that's desktop only) | 3 | FE | Dashboard usable on 375px mobile, no horizontal scroll, touch targets ≥ 44px |
| S12-08 | Performance audit: Core Web Vitals (LCP < 2.5s, CLS < 0.1, FID < 100ms) | 3 | FE+Infra | Lighthouse score ≥ 80 on dashboard, ≥ 70 on workspace |
| S12-09 | API response time audit: p95 < 200ms for all endpoints | 2 | BE+Infra | Load test with k6, identify and fix slow queries |
| S12-10 | Database index audit: add missing indexes from query analysis | 2 | BE | EXPLAIN ANALYZE on top 10 queries, indexes added where seq scan found |
| S12-11 | Help documentation site (Mintlify or Docusaurus) — 10 core guides | 3 | AI | Docs deployed at `docs.forge.ai`, covers: signup, first project, deploy, GitHub, billing |
| S12-12 | Onboarding email sequence (Resend): Day 0, Day 1, Day 3, Day 7 | 2 | BE | Emails triggered on user creation, send at correct intervals |
| S12-13 | WCAG 2.1 AA audit (keyboard nav, contrast, ARIA labels) | 3 | FE | All interactive elements keyboard accessible, no contrast failures |
| **Total** | | **33** | | |

**Definition of Done:** Product passes manual QA checklist of 50 scenarios with zero P0 bugs. Performance targets met. Docs site live.

---

## Phase 3: v1.0 Launch (Sprints 13–16) — Weeks 25–32

### Sprint 13 — Analytics & Admin Dashboard
**Duration:** Weeks 25–26  
**Sprint Goal:** Team has full visibility into product usage, errors, and revenue.  

| ID | Story | Points | Owner |
|----|-------|--------|-------|
| S13-01 | PostHog event tracking on all key actions (signup, first app, deploy, upgrade) | 3 | FE |
| S13-02 | PostHog funnels: signup → activation, free → paid | 2 | AI |
| S13-03 | Sentry error alerting rules (P0 = page error, P1 = API 5xx > 1%) | 2 | Infra |
| S13-04 | Internal admin dashboard (`/admin`): MAU, MRR, churn, top templates | 5 | FE+BE |
| S13-05 | AI cost tracking per user (Claude API tokens → stored in `ai_messages.tokens_used`) | 3 | AI |
| S13-06 | User-facing usage page: messages today, storage, deploy count | 3 | FE+BE |
| S13-07 | BetterStack uptime monitors (all critical endpoints, 30s interval) | 1 | Infra |
| S13-08 | PagerDuty on-call rotation setup | 1 | Infra |
| **Total** | | **20** | |

---

### Sprint 14 — Advanced AI Features
**Duration:** Weeks 27–28  
**Sprint Goal:** AI quality improvements that delight power users.

| ID | Story | Points | Owner |
|----|-------|--------|-------|
| S14-01 | Image-to-UI: upload screenshot → GPT-4o Vision → generate matching UI | 8 | AI+FE |
| S14-02 | Inline AI suggestions in Monaco (ghost text, Tab to accept) | 5 | FE+AI |
| S14-03 | AI generates commit messages for GitHub pushes | 2 | AI |
| S14-04 | AI generates PR descriptions | 2 | AI |
| S14-05 | Prompt history (user can re-run any past prompt) | 3 | FE |
| S14-06 | AI context: user can pin specific files to always include in context | 3 | FE+AI |
| **Total** | | **23** | |

---

### Sprint 15 — Custom Domains & Advanced Hosting
**Duration:** Weeks 29–30  
**Sprint Goal:** Pro users can put their deployed apps on custom domains.

| ID | Story | Points | Owner |
|----|-------|--------|-------|
| S15-01 | Custom domain UI (add domain → DNS instructions → verify) | 5 | FE+BE |
| S15-02 | Vercel custom domain API integration | 5 | BE |
| S15-03 | SSL auto-provisioning via Vercel (automatic via Vercel's Let's Encrypt) | 2 | BE |
| S15-04 | Domain status polling (checking DNS propagation) | 3 | BE |
| S15-05 | Deploy preview URLs per branch (for GitHub-connected projects) | 5 | BE |
| S15-06 | `POST /v1/projects/:id/export` — download all files as ZIP | 3 | BE |
| **Total** | | **23** | |

---

### Sprint 16 — Progressive Onboarding & Growth
**Duration:** Weeks 31–32  
**Sprint Goal:** Improve activation rate from 40% to 55%.

| ID | Story | Points | Owner |
|----|-------|--------|-------|
| S16-01 | In-app onboarding checklist (5 steps with progress tracker) | 3 | FE |
| S16-02 | Interactive tooltip tour for first-time workspace users | 3 | FE |
| S16-03 | "Share your project" referral flow (share URL → referral tracking) | 3 | FE+BE |
| S16-04 | Empty state prompts: suggested first prompts based on template used | 2 | FE+AI |
| S16-05 | Product Hunt launch preparation (landing page updates, screenshots) | 3 | FE |
| S16-06 | SEO: meta tags, OG images, sitemap for marketing pages | 2 | FE |
| S16-07 | A/B test: onboarding flow variant (PostHog feature flags) | 3 | FE+AI |
| **Total** | | **19** | |

---

## Phase 4: v2.0 Enterprise (Sprints 17–20) — Weeks 33–40

### Sprint 17 — Community Templates & Marketplace
**Duration:** Weeks 33–34

| ID | Story | Points | Owner |
|----|-------|--------|-------|
| S17-01 | Community template submission form (upload ZIP or link GitHub repo) | 5 | FE+BE |
| S17-02 | Template review queue for admin (approve/reject with notes) | 3 | BE+FE |
| S17-03 | Paid templates (Stripe payment on clone, 70% revenue share to creator) | 8 | BE |
| S17-04 | Template creator dashboard (earnings, downloads, ratings) | 5 | FE+BE |
| S17-05 | Featured templates (admin-curated, shown on homepage) | 2 | FE+BE |
| **Total** | | **23** | |

---

### Sprint 18 — REST API & Webhooks
**Duration:** Weeks 35–36

| ID | Story | Points | Owner |
|----|-------|--------|-------|
| S18-01 | API key management (generate, name, scope, revoke) | 3 | FE+BE |
| S18-02 | API key auth middleware (Bearer token → hash lookup → user context) | 3 | BE |
| S18-03 | Public REST API (projects, files, deployments endpoints) | 5 | BE |
| S18-04 | Webhook endpoint management (add URL, select events, test) | 3 | FE+BE |
| S18-05 | Webhook delivery system (BullMQ, retry 3x with exponential backoff) | 5 | BE |
| S18-06 | JS/TS SDK (`@forge-ai/sdk`) — npm package | 5 | AI |
| S18-07 | API documentation (OpenAPI spec → Mintlify rendering) | 3 | AI |
| **Total** | | **27** | |

---

### Sprint 19 — Enterprise Features
**Duration:** Weeks 37–38

| ID | Story | Points | Owner |
|----|-------|--------|-------|
| S19-01 | SSO: SAML 2.0 via Keycloak (Google Workspace, Okta, Azure AD) — Keycloak supports SAML natively | 3 | BE+Infra |
| S19-02 | Audit log (all admin actions stored in `audit_log` table, exportable as CSV) | 5 | BE+FE |
| S19-03 | Enterprise billing (custom contract flow, invoice billing via Stripe) | 3 | BE |
| S19-04 | SLA dashboard (uptime % over last 30/90/365 days) | 3 | FE+BE |
| S19-05 | White-label embed (`<iframe>` with custom branding, Enterprise only) | 8 | FE+BE |
| **Total** | | **24** | |

---

### Sprint 20 — Scale, Security & SOC 2 Prep
**Duration:** Weeks 39–40

| ID | Story | Points | Owner |
|----|-------|--------|-------|
| S20-01 | Penetration test (external vendor) + remediation | 5 | Infra |
| S20-02 | SOC 2 Type II readiness: evidence collection, policy documents | 3 | Infra |
| S20-03 | Load test: 10,000 concurrent users (k6 + Grafana) | 3 | Infra |
| S20-04 | Database query optimization pass (post-scale analysis) | 3 | BE |
| S20-05 | CDN cache tuning for static assets and API responses | 2 | Infra |
| S20-06 | Dependency security audit (Snyk full scan, update all critical CVEs) | 2 | Infra |
| S20-07 | Disaster recovery drill (simulate DB failure, measure RTO/RPO) | 3 | Infra |
| **Total** | | **21** | |

---

## Technical Debt Register

| Debt Item | Introduced In | Pay-Back Sprint | Notes |
|-----------|---------------|-----------------|-------|
| No pagination on file tree (load all files) | Sprint 4 | Sprint 12 | Fine for < 200 files, needs virtualization at scale |
| Snapshot `files_json` stored in Postgres | Sprint 6 | Sprint 13 | Large snapshots will inflate DB. Move to MinIO at > 1MB snapshot size in Sprint 13 |
| WebContainer boots fresh each workspace open | Sprint 5 | Sprint 16 | No caching between sessions. Investigate FS persistence |
| No AI response caching (same prompt → full new call) | Sprint 3 | Sprint 14 | Add prompt hash cache in Redis with 1h TTL |
| Template previews are live WebContainers (expensive) | Sprint 9 | Sprint 17 | Pre-render screenshots for template gallery |
| Collaborator cursors only in Monaco (not file tree/chat) | Sprint 11 | Sprint 19 | Good enough for v1.0 |
| Single BullMQ instance (not clustered) | Sprint 7 | Sprint 20 | Fine to ~50K users, needs Redis cluster after |

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Anthropic/Bedrock API rate limits or outage | M | H | Multi-provider circuit breaker (Bedrock → Anthropic → Gemini → GPT-4o); effectively zero AI downtime |
| 2 | WebContainer incompatibility (Safari) | H | M | Show "Use Chrome/Firefox" banner, track % Safari users |
| 3 | COOP/COEP header conflicts with third-party scripts | M | H | Keycloak uses redirect flow (COOP/COEP compatible). Test PostHog, Stripe.js in Sprint 5 |
| 4 | PostgreSQL RLS policy bug → data leak between users | L | H | Automated RLS integration tests, regular audit, separate staging tenant |
| 5 | Stripe webhook replay → double-charge | L | H | Idempotency keys on all Stripe calls, event deduplication table |
| 6 | WebContainer memory leak in long sessions | M | M | Implement session timeout warning + soft reload at 4 hours |
| 7 | AI generates malicious code (prompt injection) | L | H | Output sandboxed in WebContainer; no exec() or system calls; content moderation layer |
| 8 | Competitor (Lovable/Bolt) adds same features faster | H | M | Differentiate on quality + GitHub integration + pricing |
| 9 | Key engineer leaves in early stage | M | H | Document all systems, cross-train, pair programming culture |
| 10 | AI costs exceed revenue at scale | M | H | Per-user cost tracking from Sprint 10, aggressive caching, task-based model routing |
| 11 | Keycloak upgrade breaking changes | L | M | Pin Keycloak version in Docker Compose; test upgrades in staging first; realm-export.json in version control |
| 12 | Docker image size slows CI builds | M | L | Multi-stage builds, Docker layer cache in GitHub Actions (cache-from: type=gha) |

---

## Key Metrics Per Phase

### Phase 1 (Sprint 0–6): Alpha Metrics
- Activation rate: % of signups who see app in preview pane (target: ≥ 30%)
- AI error rate: % of AI responses that fail to parse or apply (target: < 5%)
- WebContainer boot time: p50 < 8s, p95 < 15s

### Phase 2 (Sprint 7–12): Beta Metrics
- Week-1 retention (target: ≥ 20%)
- Deploy success rate (target: ≥ 95%)
- Free → Pro conversion within 30 days (target: ≥ 5%)
- NPS (target: ≥ 35)

### Phase 3 (v1.0): Growth Metrics
- MRR (target: $15K)
- Monthly churn (target: < 3%)
- AI message → deploy rate (target: ≥ 8%)
- Support ticket rate (target: < 3% of MAU/month)

### Phase 4 (v2.0): Scale Metrics
- MRR (target: $80K)
- Enterprise pipeline (target: 5 qualified leads)
- API adoption (target: 100 active API keys)
- SOC 2 audit initiated

---

*This plan is a living document. Adjust story assignments and velocity based on actual team capacity after Sprint 1.*
