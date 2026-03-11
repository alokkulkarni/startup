# Forge AI — Product Requirements Document

**Version:** 1.0  
**Status:** Draft — Ready for Engineering  
**Date:** March 2026  
**Author:** Forge AI Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Personas](#2-user-personas)
3. [User Journey Flows](#3-user-journey-flows)
4. [Functional Requirements (EPICs)](#4-functional-requirements-epics)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [UI/UX Requirements](#9-uiux-requirements)
10. [Milestones & Release Plan](#10-milestones--release-plan)
11. [Success Metrics](#11-success-metrics)
12. [Out of Scope (v1.0)](#12-out-of-scope-v10)

---

## 1. Executive Summary

### Vision Statement
Forge AI is the fastest way to turn an idea into a production-ready web application. By combining natural language understanding with a full-stack code generation engine, Forge AI eliminates the gap between "I have an idea" and "it's live on the internet" — reducing that journey from weeks to minutes.

### Problem Being Solved
Building a web application today requires:
- **Hiring costs**: $80K–$150K/yr for a developer, or $5K–$30K for a freelancer per project
- **Time costs**: 4–12 weeks minimum for a competent MVP
- **Skill barriers**: 71% of startup ideas never get built because the founder can't code
- **No-code ceiling**: Existing no-code tools (Webflow, Bubble) hit walls quickly when customization is needed

The result: billions of dollars in economic value never created because the tools don't meet people where they are.

### Solution Overview
Forge AI provides a three-panel workspace (File Explorer | AI Chat + Code Editor | Live Preview) where users describe what they want in plain English and receive a full working React/Next.js application in real time. The platform handles:
- AI-powered code generation (Claude 3.5 Sonnet)
- In-browser execution (WebContainers — zero latency, no server)
- One-click deployment to Vercel/Netlify/Cloudflare
- GitHub sync, custom domains, team collaboration

### Success Metrics (KPIs)
| Metric | 6-Month Target | 12-Month Target |
|--------|---------------|-----------------|
| Monthly Active Users | 10,000 | 50,000 |
| Paying Customers | 500 | 2,500 |
| MRR | $15,000 | $100,000 |
| Activation Rate (first app built) | 40% | 55% |
| Day-7 Retention | 25% | 35% |
| NPS Score | 45 | 60 |
| AI Message → Deploy Rate | 8% | 15% |

---

## 2. User Personas

### Persona 1: "The Non-Technical Founder" — Maya

**Role:** First-time startup founder, ex-marketer  
**Age:** 32  
**Tech Level:** Beginner (can use Notion, Figma, but no code)  
**Goals:**
- Validate her SaaS idea with a real working prototype, not a mockup
- Get something in front of investors without spending $30K on a dev agency
- Retain full product ownership and be able to iterate herself

**Frustrations:**
- Webflow/Bubble felt like "toys" — couldn't build the logic she needed
- Hired a freelancer who disappeared after taking deposit
- Every "no-code" tool eventually says "you need a developer for that"

**Jobs-to-be-Done:**
1. Build a working MVP in a weekend
2. Show a live, deployed URL to investors
3. Iterate on feedback without depending on anyone else

**Key Quote:** *"I just want to describe what I want and have it work. I don't care about the code."*

---

### Persona 2: "The Indie Hacker" — Dev Patel

**Role:** Solo developer, building side projects in evenings  
**Age:** 28  
**Tech Level:** Advanced (full-stack JS/TS, knows React, Node, Postgres)  
**Goals:**
- Ship 10x more projects in the same time
- Spend 0 time on boilerplate (auth, payments, CRUD)
- Maintain full control of the codebase — can export and own the code

**Frustrations:**
- Setting up auth + Stripe + DB takes 3 days every new project
- AI coding tools (Copilot, Cursor) still require knowing what to write
- Vercel/Netlify deployments are manual and fiddly

**Jobs-to-be-Done:**
1. Go from idea to deployed app in < 2 hours
2. Generate boilerplate (auth, DB schema, API routes) in one prompt
3. Export clean code to GitHub for long-term ownership

**Key Quote:** *"I want Forge to do the boring 80% so I can focus on the 20% that makes my product unique."*

---

### Persona 3: "The Product Manager" — Sarah Chen

**Role:** Senior PM at a Series B SaaS company  
**Age:** 35  
**Tech Level:** Intermediate (can read code, has built things with Retool/Airtable)  
**Goals:**
- Create interactive prototypes for stakeholder reviews — not static Figma mocks
- Validate UX hypotheses without waiting 2 sprints for engineering
- Bridge the gap between design and engineering in her team

**Frustrations:**
- "Engineering is too busy" — she waits weeks to see ideas implemented
- Figma prototypes don't capture real UX (can't test actual form validation, loading states)
- No-code tools produce something that looks different from the final product

**Jobs-to-be-Done:**
1. Build a clickable, functional prototype in 1 day
2. Share a live URL with stakeholders for real feedback
3. Hand the prototype to engineering as a reference implementation

**Key Quote:** *"I want to show, not tell. A live working prototype changes every conversation."*

---

### Persona 4: "The Agency Developer" — Tom Krasner

**Role:** Freelance developer, runs a 5-person web agency  
**Age:** 41  
**Tech Level:** Expert (10+ years, multiple frameworks, DevOps experience)  
**Goals:**
- Deliver client projects in half the time to increase margin
- Standardize project scaffolding and templates across clients
- Offer clients a live preview environment during development

**Frustrations:**
- 60% of project time is setup, boilerplate, and integration work
- Client revision cycles are slow — hard to show live changes
- Junior developers on his team can't scaffold complex features independently

**Jobs-to-be-Done:**
1. Start new client projects from pre-built, battle-tested templates
2. Let clients view and comment on a live preview without a staging server
3. Empower junior devs to implement features via AI prompts

**Key Quote:** *"If Forge can do the first week of every project for me, I can take on twice as many clients."*

---

## 3. User Journey Flows

### Flow 1: Onboarding (New User → First App Built)

```
Landing Page
    ↓
[CTA: "Start Building Free"]
    ↓
Sign Up (GitHub OAuth / Google OAuth / Email)
    ↓
Email Verification (if email signup)
    ↓
Onboarding Wizard — Step 1: "What do you want to build?"
    • I have an idea (describe it)
    • Start from a template
    • Import from GitHub
    ↓
[If template] → Template Gallery → Select → Clone → Project opens
[If idea]     → AI pre-fills first prompt → Project opens with generated app
[If GitHub]   → OAuth connect → Repo select → Import → Project opens
    ↓
Three-Panel Workspace loads
    • File tree (left)
    • AI Chat + Code Editor (center)
    • Live Preview (right)
    ↓
Tooltip overlay: "Type what you want to change →"
    ↓
User sends first prompt
    ↓
AI streams response + code updates
    ↓
Preview auto-refreshes
    ↓
✅ ACTIVATION EVENT: First app running in preview
    ↓
[Banner]: "Ready to share? Deploy in one click →"
```

**Target time from signup to activation:** < 5 minutes  
**Activation event definition:** User sees their app running in the live preview pane

---

### Flow 2: Core Iteration Loop

```
User in Workspace
    ↓
Types prompt in AI Chat: "Add a dark mode toggle to the header"
    ↓
Forge AI processes:
    1. Reads current file tree + recent conversation context
    2. Identifies affected files (Header.tsx, globals.css, theme store)
    3. Generates diff-based changes (not full rewrites)
    4. Streams response with explanation + inline code blocks
    ↓
Files update in editor (highlighted diff view)
    ↓
Preview hot-reloads (< 500ms)
    ↓
User reviews change in preview
    ↓
[If happy]   → Continue with next prompt
[If unhappy] → "Revert this change" button → snapshot restored
[If broken]  → Error overlay → "Fix this error" button → AI self-heals
    ↓
Repeat until app is complete
    ↓
[Deploy CTA] → One-click deploy → Live URL returned
```

---

### Flow 3: Team Collaboration

```
Project Owner in workspace
    ↓
Settings → Team → "Invite Member"
    ↓
Enter email + select role (Admin / Member / Viewer)
    ↓
Invite email sent
    ↓
Invitee clicks link → Signs up / logs in → Joins workspace
    ↓
Both users open same project
    ↓
Real-time indicators: "Sarah is editing Header.tsx"
    ↓
Multi-cursor visible in editor
    ↓
Either user can send AI prompts (chat history shared)
    ↓
Comment thread: Highlight code → "Add comment" → Thread created
    ↓
Activity feed shows all actions (deploys, AI prompts, file edits)
```

---

### Flow 4: Billing Upgrade

```
Free User hits limit: "You've used 50/50 AI messages today"
    ↓
Modal: "Upgrade to Pro for unlimited messages"
    ↓
Pricing page (inline modal or full page)
    ↓
User selects Pro ($29/mo) or Team ($79/seat/mo)
    ↓
Stripe Checkout (hosted or embedded)
    ↓
Payment confirmed → Subscription activated immediately
    ↓
User returned to workspace — limits removed
    ↓
Email: "Welcome to Pro — here's what's unlocked"
    ↓
[Monthly] Stripe invoice sent automatically
    ↓
[If payment fails] → Email warning → 3-day grace period → Downgrade to free
```

---

## 4. Functional Requirements (EPICs)

---

### EPIC 1: Authentication & Onboarding

**Priority:** P0 — Must have at launch

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| AUTH-01 | As a user, I can sign up with GitHub | OAuth flow completes, account created, session established |
| AUTH-02 | As a user, I can sign up with Google | OAuth flow completes, account created, session established |
| AUTH-03 | As a user, I can sign up with email + password | Email verified before access granted |
| AUTH-04 | As a user, I can log in with magic link | Link emailed, expires in 15 minutes, single-use |
| AUTH-05 | As a user, I can reset my password | Reset email sent, new password set within 30 min |
| AUTH-06 | As a user, I complete an onboarding wizard | 3-step wizard: use case → template/blank → first prompt |
| AUTH-07 | As a user, I can update my profile (name, avatar, email) | Changes saved, avatar accepts JPG/PNG up to 2MB |
| AUTH-08 | As a user, I can delete my account | Confirmation required, all data deleted within 30 days |

**Technical Notes:**
- Use Clerk for auth orchestration (handles MFA, session management, social providers)
- On first login, create a default personal workspace
- Store user preferences in Supabase `users` table

---

### EPIC 2: Project Management

**Priority:** P0 — Must have at launch

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| PROJ-01 | As a user, I can create a new project | Project created with name, blank or from template, opens in workspace |
| PROJ-02 | As a user, I can see all my projects in a dashboard | Grid view with preview thumbnail, last edited date, deploy status |
| PROJ-03 | As a user, I can rename a project | Inline rename, max 60 characters |
| PROJ-04 | As a user, I can delete a project | Confirmation modal, soft-delete with 30-day recovery |
| PROJ-05 | As a user, I can duplicate a project | New project created with all files copied, "(copy)" appended to name |
| PROJ-06 | As a user, I can view version history | Timeline of AI-generated snapshots, restore any snapshot |
| PROJ-07 | As a user, I can import a GitHub repo | OAuth connect GitHub, repo browser, import creates project with all files |
| PROJ-08 | As a user, I can export my project as a ZIP | All source files included, no Forge-specific lock-in artifacts |

**Technical Notes:**
- Snapshots auto-created before every AI change (keep last 50 per project)
- Project thumbnails generated by headless screenshot of live preview
- Storage limit: Free = 500MB total, Pro = 5GB, Team = 20GB

---

### EPIC 3: AI Chat Interface

**Priority:** P0 — Core differentiator

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| AI-01 | As a user, I can type a natural language prompt | Input box with 4000 char limit, send on Enter or button |
| AI-02 | As a user, I see AI response streamed in real time | Token-by-token streaming, typing indicator visible immediately |
| AI-03 | As a user, I can see what files the AI changed | Inline diff shown in chat bubble (green additions, red deletions) |
| AI-04 | As a user, I can revert the last AI change | "Undo" button restores previous snapshot, one-click |
| AI-05 | As a user, I can revert to any prior version | Version history panel, click snapshot → restore |
| AI-06 | As a user, AI understands context from prior messages | Last 20 messages + full file tree included in context |
| AI-07 | As a user, I see suggested follow-up prompts | 3 contextual suggestions shown after each AI response |
| AI-08 | As a user, AI self-heals runtime errors | Error detected → AI automatically attempts fix (up to 3 retries) |
| AI-09 | As a user, I can reference specific files in my prompt | "@filename" mention resolves to file content in context |
| AI-10 | As a user, I can attach an image for UI reference | Image uploaded, sent to vision model, UI generated to match |

**AI Prompt System Design:**
```
System Prompt Structure:
1. Role: "You are an expert full-stack developer..."
2. Stack context: Framework, dependencies, conventions
3. File tree: Current project structure
4. Conversation history: Last 20 messages
5. Current file: Active file content (if < 2000 tokens)
6. Task: User's current prompt

Response Format:
- Explanation (1-3 sentences in plain English)
- File changes in diff format:
  --- a/src/components/Header.tsx
  +++ b/src/components/Header.tsx
  @@ -12,6 +12,8 @@
```

**Context Window Management:**
- Max context: 180K tokens (Claude 3.5 Sonnet)
- File tree: ~2K tokens
- Conversation history: ~8K tokens (last 20 msgs)
- Current file: up to 8K tokens
- Remaining: available for generation

---

### EPIC 4: Code Editor

**Priority:** P0 — Must have at launch

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| EDIT-01 | As a user, I see a file tree of my project | Collapsible folders, file icons by type, right-click context menu |
| EDIT-02 | As a user, I can open and edit any file | Monaco editor loads file, syntax highlighting correct |
| EDIT-03 | As a user, I can create new files and folders | Right-click → New File/Folder, or keyboard shortcut |
| EDIT-04 | As a user, I can rename files and folders | F2 to rename inline |
| EDIT-05 | As a user, I can delete files | Right-click → Delete, confirmation for non-empty folders |
| EDIT-06 | As a user, I can open multiple files in tabs | Tab bar, close with ×, unsaved changes indicator |
| EDIT-07 | As a user, I have inline AI suggestions | Copilot-style ghost text, Tab to accept |
| EDIT-08 | As a user, I can search across all files | Ctrl+Shift+F opens global search panel |
| EDIT-09 | As a user, changes auto-save | Debounced 500ms auto-save, no manual save required |
| EDIT-10 | As a user, I can use find & replace | Ctrl+H, supports regex, replace all |

**Supported Languages:** JavaScript, TypeScript, JSX, TSX, CSS, SCSS, JSON, Markdown, YAML, HTML, ENV files

---

### EPIC 5: Live Preview

**Priority:** P0 — Core differentiator

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| PREV-01 | As a user, I see my app running in a preview pane | WebContainer boots within 10s of project open, app renders |
| PREV-02 | As a user, changes reflect in preview automatically | Hot reload triggered within 500ms of file save |
| PREV-03 | As a user, I can toggle mobile/tablet/desktop viewports | Three preset sizes: 375px, 768px, 1280px + custom |
| PREV-04 | As a user, I can open preview in a new tab | Preview URL shareable (auth-gated for private projects) |
| PREV-05 | As a user, I can see console output | Console panel at bottom of preview, color-coded log levels |
| PREV-06 | As a user, I see build/runtime errors clearly | Red error overlay with file + line number, "Fix with AI" button |
| PREV-07 | As a user, I can refresh the preview manually | Refresh button, or Ctrl+Shift+R |
| PREV-08 | As a user, I can interact with my app in the preview | Full click/type/scroll interactivity — not an iframe of a screenshot |

**Technical Notes:**
- Uses `@webcontainer/api` — entire Node.js environment runs in browser
- No backend compute required for preview — 100% client-side
- WebContainer boots: Next.js dev server ~8–12s, Vite ~4–6s
- Hot reload via Vite HMR or Next.js Fast Refresh

---

### EPIC 6: Deployment & Hosting

**Priority:** P1 — Required for public launch

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| DEPLOY-01 | As a user, I can deploy to Vercel in one click | OAuth connect, project linked, deploy triggered, URL returned in < 60s |
| DEPLOY-02 | As a user, I can deploy to Netlify in one click | Same as above |
| DEPLOY-03 | As a user, I can deploy to Cloudflare Pages | Same as above |
| DEPLOY-04 | As a user, I can see deployment history | List of deploys with timestamp, status, URL, who triggered |
| DEPLOY-05 | As a user, I can roll back to a prior deployment | One-click rollback to any previous deploy |
| DEPLOY-06 | As a user, I can add a custom domain | Domain settings panel, DNS instructions, SSL auto-provisioned |
| DEPLOY-07 | As a user, I can manage environment variables | Secure key/value store, injected at build time, never exposed in UI |
| DEPLOY-08 | As a user, I get a shareable preview URL instantly | `preview.forge.ai/p/{projectId}` — live before any deploy |

---

### EPIC 7: GitHub Integration

**Priority:** P1 — Required for public launch

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| GH-01 | As a user, I can connect my GitHub account | OAuth flow, scopes: repo, read:user |
| GH-02 | As a user, I can push my project to a new GitHub repo | Creates repo, initial commit with all project files |
| GH-03 | As a user, I can push changes to an existing repo | Commit with AI-generated message, pushes to selected branch |
| GH-04 | As a user, I can pull changes from GitHub | Detects remote changes, pull with merge conflict resolution |
| GH-05 | As a user, I can create a pull request from Forge | Branch → PR to main, with description auto-generated by AI |
| GH-06 | As a user, I can see the sync status | Badge showing "In sync" / "N changes ahead" / "Behind remote" |

---

### EPIC 8: Template Marketplace

**Priority:** P1 — Required for public launch

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| TMPL-01 | As a user, I can browse curated templates | Gallery with categories, search, filter by tech stack |
| TMPL-02 | As a user, I can preview a template before cloning | Live preview in modal, no account required |
| TMPL-03 | As a user, I can clone a template to start a project | One click, project created with all template files |
| TMPL-04 | As a creator, I can submit a template | Upload ZIP or connect GitHub repo, add description + tags |
| TMPL-05 | As a user, I can see template ratings and usage | Star rating, "Used N times" counter |
| TMPL-06 | As a creator, I earn revenue share on paid templates | 70% revenue share, monthly Stripe payouts |

**Launch Templates (Curated by Forge Team):**
- SaaS Starter (Next.js + Supabase + Stripe + Clerk)
- Landing Page (Next.js + Tailwind + Framer Motion)
- Blog (Next.js + MDX + Tailwind)
- E-commerce (Next.js + Shopify API)
- Dashboard (Next.js + Recharts + shadcn/ui)
- REST API (Fastify + Prisma + Postgres)
- Mobile App Preview (React Native Web)

---

### EPIC 9: Collaboration

**Priority:** P1 — Team plan feature

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| COLLAB-01 | As an owner, I can invite team members by email | Invite email sent, role assigned (Admin/Member/Viewer) |
| COLLAB-02 | As a user, I can see who else is in the project | Presence avatars in top bar, tooltip with name |
| COLLAB-03 | As a user, I can see real-time cursor positions | Multi-cursor in Monaco editor via Liveblocks |
| COLLAB-04 | As a user, I can add comments on code | Select text → right-click → Add comment → thread created |
| COLLAB-05 | As a user, I can see an activity feed | Right panel: AI prompts, deploys, file edits, comments |
| COLLAB-06 | As an admin, I can manage roles and access | Settings → Team → change roles, remove members |
| COLLAB-07 | As a viewer, I can see but not edit | Preview and download only, no editor access |

---

### EPIC 10: Billing & Subscriptions

**Priority:** P0 — Required for monetization

| Tier | Price | Limits | Features |
|------|-------|--------|----------|
| **Free** | $0 | 3 projects, 50 AI msgs/day, 500MB storage | Preview, 1 deploy/mo, community support |
| **Pro** | $29/mo | Unlimited projects, 500 AI msgs/day, 5GB storage | All deploy targets, custom domains, GitHub sync, priority support |
| **Team** | $79/seat/mo | Unlimited projects, 1000 AI msgs/day/seat, 20GB storage | All Pro + collaboration, SSO (Okta/Google), audit logs, SLA |
| **Enterprise** | Custom | Unlimited | All Team + white-label, on-prem option, custom AI models, dedicated CSM |

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| BILL-01 | As a user, I can upgrade from free to Pro | Stripe Checkout, immediate activation, pro-rated billing |
| BILL-02 | As a user, I can downgrade my plan | Downgrade effective at period end, data retained for 90 days |
| BILL-03 | As a user, I see my current usage | Dashboard widget: messages used today, storage used, projects count |
| BILL-04 | As a user, I receive invoice emails | Stripe sends invoice on charge, accessible in billing portal |
| BILL-05 | As a user, I can manage payment methods | Stripe Customer Portal, add/remove cards |
| BILL-06 | As a user, I see a clear upgrade prompt when hitting limits | Modal with plan comparison, not a hard block |

---

### EPIC 11: Analytics & Observability

**Priority:** P1 — Internal tooling + user-facing usage

**User-facing:**
- Messages used today / this month (with visual bar)
- Storage used (with breakdown by project)
- Deploy count this month
- Project activity timeline

**Admin Dashboard (Internal):**
- MAU / DAU / WAU charts
- MRR, churn rate, new subscriptions (by plan)
- Top 20 templates by usage
- AI cost per user (Claude API cost tracking)
- Error rates by feature area
- P50/P95/P99 response times

**Integrations:**
- Sentry (error tracking, frontend + backend)
- PostHog (product analytics, feature flags, session replay)
- Stripe Dashboard (revenue metrics)
- Uptime monitoring via BetterStack

---

### EPIC 12: API & Webhooks

**Priority:** P2 — Post-launch, Team/Enterprise only

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| API-01 | As a developer, I can create projects via REST API | POST /v1/projects with API key auth |
| API-02 | As a developer, I can trigger deploys via API | POST /v1/projects/{id}/deploy |
| API-03 | As a developer, I can receive webhook events | Register webhook URL, events: deploy.success, build.failed, ai.message |
| API-04 | As a developer, I can embed Forge in my product | `<iframe>` embed with white-label option (Enterprise) |
| API-05 | As a developer, I can use the Forge JS SDK | npm install @forge-ai/sdk, TypeScript types included |

---

## 5. Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| Page load (dashboard) | < 2 seconds (LCP) |
| Workspace initial load | < 3 seconds |
| WebContainer boot (Vite) | < 6 seconds |
| WebContainer boot (Next.js) | < 12 seconds |
| AI first token latency | < 1 second |
| Hot reload after file save | < 500ms |
| Deploy trigger to live URL | < 90 seconds |
| API p95 response time | < 200ms |

### Availability & Reliability
- **SLA:** 99.9% uptime (< 8.7 hours downtime/year)
- **RTO:** < 1 hour (Recovery Time Objective)
- **RPO:** < 5 minutes (Recovery Point Objective)
- Multi-region deployment (US-East, EU-West, AP-Southeast)
- Automatic failover via Cloudflare routing

### Security
- All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- API keys hashed with bcrypt, never stored in plaintext
- RBAC enforced at database row level (Supabase RLS policies)
- OWASP Top 10 mitigations in place
- SOC 2 Type II audit roadmap (Year 2)
- GDPR-compliant data handling (data residency options for EU)
- Dependency scanning via Snyk in CI/CD pipeline
- Penetration test before public launch

### Scalability
- Frontend: Vercel Edge Network — infinite horizontal scale
- API: Horizontal pod autoscaling on Railway/Fly.io
- WebContainers: Client-side (no server compute) — scales to any number of users
- Database: Neon serverless Postgres — auto-scales to 1M connections
- Target: Support 100,000 concurrent active workspace sessions

### Accessibility
- WCAG 2.1 AA compliance for all marketing pages and dashboard
- Keyboard navigation for all interactive elements
- Screen reader compatible (ARIA labels on all custom components)
- Color contrast ratio ≥ 4.5:1 for all text
- Focus indicators visible on all focusable elements

---

## 6. Technical Architecture

### Frontend Stack
```
Next.js 14 (App Router)     — React framework, SSR/RSC
TypeScript 5.x              — Type safety
Tailwind CSS 3.x            — Utility-first styling
shadcn/ui                   — Component library (Radix UI primitives)
Monaco Editor               — VSCode-grade code editor
@webcontainer/api           — In-browser Node.js execution
Zustand                     — Client state management
TanStack Query              — Server state, caching, mutations
Liveblocks                  — Real-time collaboration
Framer Motion               — Animations
```

### Backend Stack
```
Fastify (Node.js 20)        — HTTP API server (2x faster than Express)
TypeScript                  — Type safety end-to-end
Supabase                    — Postgres DB + Auth + Storage + Realtime
Redis (Upstash)             — Session cache, rate limiting, pub/sub
BullMQ                      — Background job queue (deploys, snapshots)
Clerk                       — Auth orchestration, session management
Stripe                      — Billing, subscriptions, webhooks
Resend                      — Transactional emails
```

### AI Layer
```
Anthropic Claude 3.5 Sonnet  — Primary code generation model
OpenAI GPT-4o               — Fallback + vision (image-to-UI)
Custom Prompt System:
  - System prompts by framework (Next.js, Vite, etc.)
  - Context window manager (file tree + conversation)
  - Diff-based response parser
  - Self-healing error loop (up to 3 auto-retry attempts)
  - Streaming via Anthropic streaming API
```

### Infrastructure
```
Vercel                      — Frontend hosting + Edge Functions
Railway / Fly.io            — API server hosting (Docker)
Cloudflare R2               — Object storage (project files, assets)
Neon                        — Serverless Postgres (auto-scale)
Upstash Redis               — Serverless Redis
Cloudflare                  — CDN, DDoS protection, DNS
GitHub Actions              — CI/CD pipelines
Docker                      — Containerized API server
```

### Architecture Diagram (Text)
```
User Browser
│
├── Next.js App (Vercel Edge)
│   ├── Dashboard / Marketing pages (SSR)
│   ├── Workspace (CSR — heavy client)
│   │   ├── Monaco Editor
│   │   ├── WebContainer (in-browser Node.js)
│   │   └── Liveblocks (real-time sync)
│   └── API Routes (Edge Functions for streaming)
│
├── Forge API (Fastify on Railway)
│   ├── Auth middleware (Clerk JWT validation)
│   ├── Project CRUD
│   ├── AI orchestration (prompt → Claude → diff → apply)
│   ├── Deploy orchestration (trigger Vercel/Netlify APIs)
│   └── BullMQ workers (async jobs)
│
├── Supabase (Managed Postgres)
│   ├── RLS policies for multi-tenant isolation
│   ├── Realtime subscriptions (presence, activity feed)
│   └── Storage (project file backups)
│
└── External APIs
    ├── Anthropic API (Claude 3.5 Sonnet)
    ├── Vercel API (deployments)
    ├── GitHub API (repo sync)
    └── Stripe API (billing)
```

---

## 7. Database Schema

### `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT UNIQUE NOT NULL,        -- Clerk user ID
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  plan          TEXT DEFAULT 'free',         -- free | pro | team | enterprise
  ai_msgs_today INTEGER DEFAULT 0,
  ai_msgs_reset TIMESTAMPTZ,                 -- daily reset timestamp
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `workspaces`
```sql
CREATE TABLE workspaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,        -- URL-safe identifier
  plan          TEXT DEFAULT 'free',
  storage_used  BIGINT DEFAULT 0,            -- bytes
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `workspace_members`
```sql
CREATE TABLE workspace_members (
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member', -- owner | admin | member | viewer
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);
```

### `projects`
```sql
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  framework     TEXT DEFAULT 'nextjs',       -- nextjs | vite | remix
  thumbnail_url TEXT,
  is_public     BOOLEAN DEFAULT FALSE,
  github_repo   TEXT,                        -- connected GitHub repo URL
  deploy_url    TEXT,                        -- last successful deploy URL
  deploy_status TEXT DEFAULT 'none',         -- none | deploying | deployed | failed
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `project_files`
```sql
CREATE TABLE project_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  path          TEXT NOT NULL,               -- e.g. "src/components/Header.tsx"
  content       TEXT,
  size_bytes    INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, path)
);
```

### `project_snapshots`
```sql
CREATE TABLE project_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  triggered_by  TEXT NOT NULL,               -- 'ai' | 'user' | 'deploy'
  description   TEXT,                        -- AI prompt that triggered it
  files_json    JSONB NOT NULL,              -- snapshot of all files at time of creation
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `ai_conversations`
```sql
CREATE TABLE ai_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `ai_messages`
```sql
CREATE TABLE ai_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,               -- 'user' | 'assistant'
  content       TEXT NOT NULL,
  files_changed JSONB,                       -- array of {path, diff} objects
  tokens_used   INTEGER,
  model         TEXT,                        -- claude-3-5-sonnet | gpt-4o
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `deployments`
```sql
CREATE TABLE deployments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  triggered_by  UUID REFERENCES users(id),
  provider      TEXT NOT NULL,               -- vercel | netlify | cloudflare
  status        TEXT DEFAULT 'pending',      -- pending | building | deployed | failed
  deploy_url    TEXT,
  build_log     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);
```

### `templates`
```sql
CREATE TABLE templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID REFERENCES users(id),
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT,                        -- saas | landing | blog | ecommerce | dashboard | api
  preview_url   TEXT,
  thumbnail_url TEXT,
  files_json    JSONB NOT NULL,
  tags          TEXT[],
  is_official   BOOLEAN DEFAULT FALSE,
  is_paid       BOOLEAN DEFAULT FALSE,
  price_cents   INTEGER DEFAULT 0,
  use_count     INTEGER DEFAULT 0,
  rating        DECIMAL(3,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `subscriptions`
```sql
CREATE TABLE subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id   TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                 TEXT NOT NULL,        -- free | pro | team | enterprise
  status               TEXT NOT NULL,        -- active | past_due | canceled | trialing
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. API Endpoints

**Base URL:** `https://api.forge.ai/v1`  
**Auth:** Bearer token (Clerk JWT) in `Authorization` header  
**Rate Limiting:** Free: 60 req/min, Pro: 300 req/min, Team: 1000 req/min

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/me` | Get current user profile |
| `PATCH` | `/auth/me` | Update user profile (name, avatar) |
| `DELETE` | `/auth/me` | Delete account (queues deletion job) |

### Projects
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects` | Required | List all projects for current user |
| `POST` | `/projects` | Required | Create new project |
| `GET` | `/projects/:id` | Required | Get project details |
| `PATCH` | `/projects/:id` | Required | Update project (name, description) |
| `DELETE` | `/projects/:id` | Required | Delete project |
| `POST` | `/projects/:id/duplicate` | Required | Clone project |
| `GET` | `/projects/:id/snapshots` | Required | List version snapshots |
| `POST` | `/projects/:id/snapshots/:snapshotId/restore` | Required | Restore snapshot |
| `GET` | `/projects/:id/export` | Required | Download project as ZIP |

### Files
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects/:id/files` | Required | Get full file tree |
| `GET` | `/projects/:id/files/*path` | Required | Get single file content |
| `PUT` | `/projects/:id/files/*path` | Required | Create or update file |
| `DELETE` | `/projects/:id/files/*path` | Required | Delete file |

### AI
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/projects/:id/ai/chat` | Required | Send AI prompt (streaming SSE response) |
| `GET` | `/projects/:id/ai/history` | Required | Get conversation history |
| `DELETE` | `/projects/:id/ai/history` | Required | Clear conversation history |

### Deployments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects/:id/deployments` | Required | List deployment history |
| `POST` | `/projects/:id/deployments` | Required | Trigger new deployment |
| `GET` | `/projects/:id/deployments/:deployId` | Required | Get deployment status |
| `POST` | `/projects/:id/deployments/:deployId/rollback` | Required | Rollback to deployment |

### Templates
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/templates` | Optional | List templates (public) |
| `GET` | `/templates/:id` | Optional | Get template details |
| `POST` | `/templates/:id/clone` | Required | Clone template to new project |
| `POST` | `/templates` | Required | Submit new template |

### Billing
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/billing/subscription` | Required | Get current subscription |
| `POST` | `/billing/checkout` | Required | Create Stripe checkout session |
| `POST` | `/billing/portal` | Required | Get Stripe customer portal URL |
| `GET` | `/billing/usage` | Required | Get current usage stats |
| `POST` | `/billing/webhook` | None (Stripe sig) | Handle Stripe webhook events |

---

## 9. UI/UX Requirements

### Design System
- **Mode:** Dark-first (system preference respected)
- **Primary palette:**
  - Background: `#0D1117` (near-black)
  - Surface: `#161B22` (card backgrounds)
  - Border: `#30363D` (dividers)
  - Accent violet: `#7C3AED`
  - Accent cyan: `#0EA5E9`
  - Success green: `#10B981`
  - Warning amber: `#F59E0B`
  - Error red: `#EF4444`
  - Text primary: `#F0F6FC`
  - Text secondary: `#8B949E`
- **Typography:** Inter (UI) + JetBrains Mono (code)
- **Border radius:** 8px standard, 12px for cards, 4px for badges
- **Spacing scale:** 4px base unit (4, 8, 12, 16, 24, 32, 48, 64)

### Workspace Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Project name | Share | Deploy | User menu   │
├───────────────┬──────────────────────┬──────────────────────┤
│               │                      │                      │
│  File Tree    │   Code Editor /      │   Live Preview       │
│  (240px)      │   AI Chat            │   (flexible)         │
│               │   (flexible)         │                      │
│  + New File   │                      │  [ Desktop ▾ ]       │
│  + New Folder │  [Tab: Editor]       │  [ ↗ Open ]          │
│               │  [Tab: Chat]         │                      │
│               │                      │  ─────────────────── │
│               │                      │  Console             │
│               │                      │  (120px collapsed)   │
└───────────────┴──────────────────────┴──────────────────────┘
```

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + Enter` | Send AI prompt |
| `Cmd/Ctrl + Z` | Undo last AI change |
| `Cmd/Ctrl + Shift + F` | Global search |
| `Cmd/Ctrl + B` | Toggle file tree |
| `Cmd/Ctrl + J` | Toggle console panel |
| `Cmd/Ctrl + Shift + P` | Open preview in new tab |
| `Cmd/Ctrl + D` | Deploy current project |
| `F2` | Rename selected file |
| `Cmd/Ctrl + \`` | Focus AI chat input |
| `Escape` | Close current modal/panel |
| `Cmd/Ctrl + S` | Force save (auto-save is always on) |

### Empty States
Every main view must have a designed empty state (not just "No items"):
- **Dashboard (no projects):** "Your first app is one idea away" + [Start Building] + [Browse Templates]
- **File tree (new project):** Skeleton of a typical project structure with tooltip "AI will fill this in"
- **Chat (new conversation):** Suggested starter prompts grid (6 prompts)
- **Deployment history (none):** "You haven't deployed yet" + [Deploy Now] button
- **Template gallery (no results):** "Nothing matches — try different filters" + [Clear Filters]

### Loading States
- Dashboard cards: skeleton shimmer (gray animated boxes)
- File tree: skeleton rows
- AI response: animated dots → streaming text (no spinner)
- Preview: "Starting your app..." with progress bar
- Deploy: live progress log tail

### Notifications (Toast)
All async actions show a toast:
- ✅ Success: green left border, 3s auto-dismiss
- ❌ Error: red left border, 5s auto-dismiss + "View details" link
- 🔄 In-progress: spinner icon, no auto-dismiss until complete
- ℹ️ Info: blue left border, 3s auto-dismiss

---

## 10. Milestones & Release Plan

### Alpha (Month 1–3) — Internal Beta
**Goal:** Core loop working end-to-end for 100 internal users

**Deliverables:**
- [ ] Auth (Clerk) + user accounts
- [ ] Project create/list/delete
- [ ] AI chat with streaming (Claude 3.5 Sonnet)
- [ ] Monaco editor + file tree
- [ ] WebContainer live preview
- [ ] Basic version snapshots
- [ ] Free tier limits enforced

**Success Criteria:**
- 100 internal beta users onboarded
- Activation rate ≥ 30% (user builds first app in session)
- No P0 bugs in 7-day period

---

### Beta (Month 4–6) — Waitlist Launch
**Goal:** Full feature set working for 1,000 waitlist users

**Deliverables:**
- [ ] One-click deploy (Vercel + Netlify)
- [ ] GitHub sync (push/pull)
- [ ] Template marketplace (7 official templates)
- [ ] Billing via Stripe (Free + Pro)
- [ ] Custom domains
- [ ] Shareable preview URLs
- [ ] PostHog analytics integration
- [ ] Sentry error tracking

**Success Criteria:**
- 1,000 waitlist signups
- 200 active beta users (used in last 7 days)
- Day-7 retention ≥ 20%
- MRR ≥ $2,000 (early adopter conversions)

---

### v1.0 Public Launch (Month 7–9)
**Goal:** Public launch with paying customers

**Deliverables:**
- [ ] All Alpha + Beta features polished
- [ ] Team plan + collaboration (Liveblocks)
- [ ] Template marketplace with community submissions
- [ ] Mobile-responsive dashboard
- [ ] Help docs + onboarding video tour
- [ ] Email sequences (onboarding, retention, upgrade)
- [ ] WCAG 2.1 AA audit complete

**Success Criteria:**
- 500 paying customers
- $15,000 MRR
- NPS ≥ 40
- < 2% monthly churn

---

### v2.0 (Month 10–12) — Scale
**Goal:** Team and Enterprise readiness

**Deliverables:**
- [ ] REST API (full CRUD + deploy trigger)
- [ ] Webhooks
- [ ] JS/TS SDK
- [ ] White-label embed mode (Enterprise)
- [ ] SSO (Okta, Google Workspace)
- [ ] Audit logs
- [ ] SLA dashboard
- [ ] Advanced analytics for users

**Success Criteria:**
- 2,000 paying customers
- $80,000 MRR
- First Enterprise contract signed
- SOC 2 audit initiated

---

## 11. Success Metrics

### Activation
- **Definition:** User sees their app running in the preview pane during the same session they signed up
- **Target (Month 6):** 40%
- **Target (Month 12):** 55%
- **Measurement:** PostHog event `preview.first_render` fired within 30 minutes of `user.signed_up`

### Retention
- **Day-1 retention target:** 45%
- **Day-7 retention target:** 25%
- **Day-30 retention target:** 15%
- **Measurement:** PostHog cohort analysis on weekly active users

### Conversion (Free → Paid)
- **Free → Pro conversion target:** 5% within 30 days
- **Trigger:** User hits daily message limit 2+ times
- **Measurement:** Stripe + PostHog funnel

### AI Quality
- **AI message → "change accepted" rate:** ≥ 75% (user doesn't immediately revert)
- **Error auto-heal success rate:** ≥ 60% (AI fixes its own errors)
- **Measurement:** Track `snapshot.restored` events vs `ai.message` events

### Business
- **LTV:CAC ratio target:** ≥ 10:1
- **Gross margin target:** ≥ 70%
- **NPS target:** ≥ 50 by Month 12
- **Support ticket rate:** < 3% of MAU per month

### Engagement
- **Average AI messages per active user per day:** ≥ 15
- **Average projects per paying user:** ≥ 3
- **Deploy rate (% of projects deployed):** ≥ 25%

---

## 12. Out of Scope (v1.0)

The following are explicitly **not** in scope for v1.0 and are deferred to future versions:

| Feature | Rationale | Target Version |
|---------|-----------|----------------|
| Mobile app (iOS/Android) | Workspace requires desktop; mobile dashboard only | v3.0 |
| Backend hosting (databases, APIs) | Deployment targets handle this; in-scope is frontend + API routes | v2.0 |
| Native desktop app (Electron) | Web-first; desktop adds maintenance overhead | v3.0 |
| On-premises / self-hosted version | Enterprise feature requiring significant infra work | v3.0 |
| Multiple AI model choice (user-selectable) | Internal model routing only; users don't choose | v2.0 |
| Video/audio generation | Out of core product scope | Backlog |
| Figma plugin | Useful but not core — import from image covers key use case | v2.0 |
| Multi-language support (i18n) | English-first; expand to Spanish, French, Japanese in v2 | v2.0 |
| Custom AI model fine-tuning | Requires significant ML infrastructure | v3.0 |
| CI/CD pipeline builder | Advanced use case; standard deploy flow covers 80% | v2.0 |
| Database GUI (internal) | Out of editor scope; link to Supabase/PlanetScale UI | Backlog |
| Real-time multi-player game features | Liveblocks covers collaboration; game engine out of scope | Never |

---

*This PRD is a living document. All requirements subject to change based on user feedback and market conditions. Version history tracked in GitHub.*
