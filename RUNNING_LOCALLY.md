# Running Forge AI Locally

Complete guide to running the full Forge AI stack on your machine.

> **Current build:** Sprints 0–7 complete. Covers auth, projects, AI chat, code editor, live preview (WebContainers), version history, and one-click deployment to Vercel / Netlify / Cloudflare Pages.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 20.x LTS | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| **pnpm** | 9.x | `npm install -g pnpm@9` |
| **Docker Desktop** | 4.x+ | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Git** | any | pre-installed on macOS / `apt install git` |

Verify your setup:
```bash
node -v       # v20.x.x
pnpm -v       # 9.x.x
docker -v     # Docker version 24+
docker compose version  # Docker Compose version v2+
```

---

## 1. Clone & Install Dependencies

```bash
git clone https://github.com/alokkulkarni/startup.git forge-ai
cd forge-ai
pnpm install          # installs all workspaces (api, web, shared)
```

---

## 2. Environment Configuration

### Copy the example env file
```bash
cp .env.example .env.local
```

### Required vs Optional values

#### ✅ REQUIRED for local dev (must fill in)

| Variable | Where to get it | Example |
|----------|----------------|---------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | `sk-ant-api03-...` |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `AIzaSy...` |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `sk-proj-...` |
| `FORGE_ENCRYPTION_KEY` | Generate locally (see below) | 32-char random string |

> **AWS Bedrock (primary AI):** If you have AWS credentials with Bedrock access, fill in `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`. Otherwise the system auto-falls back to Anthropic → Gemini → GPT-4o.

> **Generate encryption key:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

#### 🟡 OPTIONAL for local dev (defaults work out of the box)

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgres://forge:forge@localhost:5432/forge` | Provided by Docker Compose |
| `REDIS_URL` | `redis://localhost:6379` | Provided by Docker Compose |
| `MINIO_*` | `minioadmin` / `localhost:9000` | Auto-configured by Docker Compose |
| `KEYCLOAK_*` | `http://localhost:8081` / `forge` realm | Auto-imported via realm-export.json |
| `FORGE_VERCEL_API_KEY` | [vercel.com/account/tokens](https://vercel.com/account/tokens) | Enables Deploy → Vercel |
| `FORGE_NETLIFY_API_KEY` | [app.netlify.com/user/applications](https://app.netlify.com/user/applications) | Enables Deploy → Netlify |
| `FORGE_CF_API_TOKEN` | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) | Enables Deploy → Cloudflare Pages |
| `FORGE_CF_ACCOUNT_ID` | Cloudflare dashboard → right sidebar | Required with CF token |
| `STRIPE_*` | `sk_test_...` | Leave blank — billing UI hidden without valid keys |
| `SENTRY_DSN` | _(empty)_ | Leave blank for local dev |
| `RESEND_API_KEY` | _(empty)_ | Email features disabled without this |
| `GITHUB_CLIENT_ID/SECRET` | _(empty)_ | Social login optional — email/password works without it |
| `GOOGLE_CLIENT_ID/SECRET` | _(empty)_ | Social login optional |

### Create `apps/api/.env` (API server env)
```bash
cat > apps/api/.env << 'EOF'
NODE_ENV=development
PORT=3001

# ── Database ────────────────────────────────────────────────────
DATABASE_URL=postgres://forge:forge@localhost:5432/forge

# ── Redis ───────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── MinIO ───────────────────────────────────────────────────────
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_AVATARS=avatars
MINIO_BUCKET_SNAPSHOTS=snapshots
MINIO_BUCKET_ASSETS=assets

# ── Keycloak ────────────────────────────────────────────────────
KEYCLOAK_URL=http://localhost:8081
KEYCLOAK_REALM=forge
KEYCLOAK_CLIENT_ID=forge-api
KEYCLOAK_CLIENT_SECRET=forge-api-secret
APP_URL=http://localhost

# ── AI Providers (primary: Bedrock → Anthropic → Gemini → OpenAI)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-here          # optional — leave blank to skip Bedrock
AWS_SECRET_ACCESS_KEY=your-secret-here  # optional — leave blank to skip Bedrock
ANTHROPIC_API_KEY=sk-ant-...            # REQUIRED — primary fallback
GEMINI_API_KEY=AIza...                  # REQUIRED — secondary fallback
OPENAI_API_KEY=sk-...                   # REQUIRED — tertiary fallback

# ── Security ────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
FORGE_ENCRYPTION_KEY=change-me-to-a-64-char-hex-string

# ── Deployment providers (all optional — enables Deploy button) ─
FORGE_VERCEL_API_KEY=             # get from vercel.com/account/tokens
FORGE_NETLIFY_API_KEY=            # get from app.netlify.com/user/applications
FORGE_CF_API_TOKEN=               # get from dash.cloudflare.com/profile/api-tokens
FORGE_CF_ACCOUNT_ID=              # found in Cloudflare dashboard right sidebar

# ── Stripe (optional — billing UI hidden without these) ─────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Email (optional) ────────────────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@forge.local
EOF
```

### Create `apps/web/.env.local` (Next.js env)
```bash
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8081
NEXT_PUBLIC_KEYCLOAK_REALM=forge
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=forge-web
EOF
```

---

## 3. Start Infrastructure Services (Docker)

The Docker Compose stack provides: PostgreSQL, Redis, MinIO, Keycloak, and Traefik.

```bash
# Start all infrastructure services
docker compose up -d

# Watch startup logs (Keycloak takes ~60 seconds to boot)
docker compose logs -f keycloak
```

### Service startup order & expected wait times

| Service | Port | Ready when | Wait |
|---------|------|-----------|------|
| **PostgreSQL** | 5432 | `pg_isready` passes | ~5s |
| **Redis** | 6379 | `redis-cli ping` → PONG | ~3s |
| **MinIO** | 9000, 9001 | healthcheck passes | ~10s |
| **MinIO init** | — | creates buckets, exits | ~15s |
| **Keycloak** | 8081 | `/health/ready` → 200 | **~60s** |
| **Traefik** | 80, 8080 | ping passes | ~5s |

### Verify all services are healthy
```bash
docker compose ps
# All services should show "healthy" or "exited 0" (minio-init)
```

### Check individual services
```bash
# PostgreSQL
psql postgres://forge:forge@localhost:5432/forge -c "SELECT 1"

# Redis
redis-cli ping   # → PONG

# Keycloak
curl http://localhost:8081/health/ready   # → {"status":"UP"}

# MinIO Console
open http://localhost:9001   # login: minioadmin / minioadmin

# Traefik Dashboard
open http://localhost:8080
```

---

## 4. Run Database Migrations

There are 5 migrations covering all sprints:

| Migration | Sprint | What it adds |
|-----------|--------|-------------|
| `0000_initial` | 0 | users, workspaces, workspace_members |
| `0001_projects_expand` | 2 | projects, project_files, ai_conversations, ai_messages |
| `0002_ai_indexes` | 3 | performance indexes for AI routes |
| `0003_snapshots` | 6 | project_snapshots (version history) |
| `0004_deployments` | 7 | deployments, project_env_vars |

```bash
cd apps/api
pnpm db:migrate    # applies all 5 pending Drizzle migrations
```

Verify migrations applied:
```bash
docker compose exec postgres psql -U forge -d forge -c "\dt"
# Should list: users, workspaces, workspace_members, projects, project_files,
#              ai_conversations, ai_messages, project_snapshots,
#              deployments, project_env_vars, subscriptions
```

To inspect your database schema:
```bash
# Start pgAdmin (optional)
docker compose --profile tools up -d pgadmin
open http://localhost:5050
# Login: admin@forge.local / admin
# Add server: postgres:5432, user: forge, password: forge
```

---

## 5. Start Development Servers

Open **two terminals**:

### Terminal 1 — API Server (Fastify)
```bash
pnpm --filter @forge/api dev
# Starts on http://localhost:3001
# API available at http://localhost/api (via Traefik)
```

### Terminal 2 — Web Server (Next.js)
```bash
pnpm --filter @forge/web dev
# Starts on http://localhost:3000
# Available at http://localhost (via Traefik)
```

Or run both with Turborepo:
```bash
pnpm dev    # runs api + web concurrently via turbo
```

---

## 6. Verify the Full Stack

```bash
# Health check
curl http://localhost/api/v1/health
# Expected: {"status":"ok","services":{"postgres":"ok","redis":"ok","storage":"ok"}}

# Open the app
open http://localhost
```

---

## 7. First-Time Login

Keycloak is pre-configured with the `forge` realm and two clients (`forge-web`, `forge-api`). The realm is auto-imported from `infra/keycloak/realm-export.json` on first boot.

### Register a new account
1. Open `http://localhost`
2. Click **Get Started** or **Login**
3. On the Keycloak login page, click **Register**
4. Fill in your details — this creates your local account
5. You'll be redirected back to the Forge AI dashboard

### Keycloak Admin Console
```
URL:      http://localhost:8081/admin
Username: admin
Password: admin
Realm:    forge
```

Use the admin console to:
- View/manage users
- Configure social login (GitHub, Google)
- Reset passwords
- Manage client secrets

### GitHub Social Login (optional)
1. Create a GitHub OAuth app at `https://github.com/settings/developers`
2. Set callback URL: `http://localhost:8081/realms/forge/broker/github/endpoint`
3. Add to `apps/api/.env`:
   ```
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```
4. Restart Keycloak: `docker compose restart keycloak`

### Google Social Login (optional)
1. Create credentials at [console.cloud.google.com](https://console.cloud.google.com)
2. Set redirect URI: `http://localhost:8081/realms/forge/broker/google/endpoint`
3. Add to `apps/api/.env`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```
4. Restart Keycloak

---

## 8. Running Tests

### Current test counts (Sprints 0–7)

| Package | Test files | Tests | Command |
|---------|-----------|-------|---------|
| `@forge/api` | 7 | **30** | `pnpm --filter @forge/api test:unit` |
| `@forge/web` | 8 | **25** | `pnpm --filter @forge/web test:unit` |
| **Total** | **15** | **55** | `pnpm test` |

### Unit tests (fast, no Docker needed)
```bash
pnpm test                              # all packages
pnpm --filter @forge/api test:unit     # API only (30 tests, ~600ms)
pnpm --filter @forge/web test:unit     # Web only (25 tests, ~900ms)
```

### Typecheck
```bash
pnpm typecheck                         # both packages
pnpm --filter @forge/api typecheck
pnpm --filter @forge/web typecheck
```

### BDD feature tests
```bash
pnpm --filter @forge/api test:bdd
```

### E2E / Playwright tests (requires running stack)
```bash
pnpm --filter @forge/web test:e2e
# Or with UI:
pnpm --filter @forge/web test:e2e --ui
```

### All tests + typecheck (CI equivalent)
```bash
pnpm typecheck && pnpm test
```

---

## 9. End-to-End Feature Testing Guide

After the stack is running (`docker compose up -d && pnpm dev`), test each sprint's features manually:

### ✅ Sprint 1 — Authentication & Profiles
1. Open `http://localhost` — you should see the Forge AI landing page
2. Click **Get Started** → redirected to Keycloak login
3. Click **Register** → fill in name, email, password → submit
4. You're redirected back to the dashboard — workspace is auto-created
5. Click your avatar → **Profile** → update your name → save
6. Upload an avatar (PNG/JPG < 2MB) → it stores in MinIO
7. Verify: `open http://localhost:9001` → buckets → avatars → your file

### ✅ Sprint 2 — Projects Dashboard
1. On the dashboard, click **New Project**
2. Name it "My Todo App", select **React + Vite** framework → Create
3. The project card appears with framework badge
4. Click the ⋯ menu → **Duplicate** → a copy appears
5. Click **Delete** → confirm → project disappears
6. Search bar filters projects by name

### ✅ Sprint 3 — AI Chat
> Requires at least one AI API key in `apps/api/.env`

1. Open a project → workspace loads (FileTree + Chat + Editor)
2. In the chat panel, type: **"Create a simple counter app with a button"**
3. Watch the AI stream a response with code changes
4. Files appear in the FileTree panel on the left
5. Monaco editor shows the generated code
6. Rate limit: free tier allows 50 AI requests/day per user
7. Test rate limit header: `curl -H "Authorization: Bearer <token>" http://localhost/api/v1/projects/<id>/ai/chat -d '{"prompt":"test"}'` → check `X-RateLimit-Remaining`

### ✅ Sprint 4 — Code Editor
1. In the workspace, click any file in the FileTree
2. Monaco editor opens with syntax highlighting
3. Edit code → auto-saves after 500ms (status bar shows "✓ Auto-saved")
4. Right-click a file → rename / delete
5. Click **+** icon → create a new file with path `src/components/Button.tsx`
6. Multiple tabs: open several files, switch between them

### ✅ Sprint 5 — Live Preview (WebContainers)
> **Requires Chrome, Edge, or Firefox** — not Safari < 16.4

1. Open a project with generated React code
2. The 4th panel (Preview) shows **"Booting WebContainer…"** with a progress bar
3. Wait ~10–30s → npm install runs → Vite dev server starts
4. The preview iframe shows your running app (interactive — click buttons, type in inputs)
5. Edit a component in Monaco → save → preview hot-reloads within 500ms
6. Viewport buttons: Desktop (1280px) / Tablet (768px) / Mobile (375px)
7. **Console panel**: click the console toggle → see Vite output logs
8. **Error test**: introduce a syntax error in Monaco → red error overlay appears → click **"Fix with AI"** → error is pre-filled in chat
9. **AI sync**: send a chat prompt to change something → diff applied → preview updates automatically

### ✅ Sprint 6 — Version History & AI Self-Healing
1. Make several AI changes to a project (each creates a snapshot automatically)
2. Click **🕐 History** in the workspace header → version history panel slides in
3. Timeline shows each AI change with timestamp and prompt description
4. Click **Restore** on any snapshot → all files revert to that state
5. **Undo**: click **↩ Undo** (or press `Cmd+Z` / `Ctrl+Z`) → last AI change is reverted
6. Click **Save Checkpoint** → enter a label → starred entry appears in history
7. **Self-healing**: introduce a runtime error → AI auto-sends up to 3 fix attempts
8. **Suggestion chips**: after any AI response, 3 contextual follow-up suggestions appear
9. **@mention**: type `@App.tsx` in the chat input → dropdown shows matching files → select to reference

### ✅ Sprint 7 — One-Click Deployment
> Requires at least one deployment API key in `apps/api/.env`

1. **Env vars**: click **🔧 Env** in the workspace header → add `VITE_APP_TITLE` = `My App` → Save
2. **Deploy**: click **Deploy ▾** → select **Vercel** (or Netlify / Cloudflare Pages)
3. Header shows spinner + **"Deploying…"**
4. Wait 30–90s → header shows **"Live ↗"** green button
5. Click **"Live ↗"** → your app opens in a new tab at `xxx.vercel.app`
6. **Deploy history**: click **📋 Deploys** → panel shows deployment with status badge + URL
7. **Rollback**: make a change + redeploy → in history panel, click **Rollback** on the previous deploy → files restore + new deploy triggers

### 🔍 Verifying the Database State
```bash
# Connect to postgres
docker compose exec postgres psql -U forge -d forge

# Check tables have data
SELECT count(*) FROM users;
SELECT count(*) FROM projects;
SELECT count(*) FROM project_files;
SELECT count(*) FROM project_snapshots;
SELECT count(*) FROM deployments;
SELECT key FROM project_env_vars;  -- values are encrypted, keys shown

# Exit
\q
```

### 🔍 Verifying Redis State
```bash
docker compose exec redis redis-cli

# Check rate limit keys
KEYS ratelimit:*

# Check BullMQ job queues
KEYS bull:*

# Exit
exit
```

---

## 10. Running Everything in Docker (Full Stack)

To run the entire stack including API and web in Docker (mirrors production):

```bash
docker compose --profile full up -d
```

> Note: This builds the API and web Docker images locally, which takes 2–3 minutes on first run.

---

## 11. Useful Commands

```bash
# View logs for a specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f keycloak

# Restart a single service
docker compose restart api

# Stop everything
docker compose down

# Stop + remove volumes (DESTROYS all data)
docker compose down -v

# Rebuild images after Dockerfile changes
docker compose build api web

# Open a psql shell
docker compose exec postgres psql -U forge -d forge

# Open a Redis CLI
docker compose exec redis redis-cli

# Run DB migrations inside Docker
docker compose exec api pnpm db:migrate
```

---

## 12. Port Reference

| Port | Service | URL |
|------|---------|-----|
| **80** | Traefik → web + API routing | `http://localhost` |
| **3000** | Next.js (direct) | `http://localhost:3000` |
| **3001** | Fastify API (direct) | `http://localhost:3001` |
| **5432** | PostgreSQL | `postgres://forge:forge@localhost:5432/forge` |
| **6379** | Redis | `redis://localhost:6379` |
| **8080** | Traefik dashboard | `http://localhost:8080` |
| **8081** | Keycloak | `http://localhost:8081` |
| **9000** | MinIO API | `http://localhost:9000` |
| **9001** | MinIO Console | `http://localhost:9001` |
| **5050** | pgAdmin (tools profile) | `http://localhost:5050` |

---

## 12. Troubleshooting

### Keycloak won't start
```bash
# Check if postgres is healthy first
docker compose ps postgres
# Keycloak needs ~60 seconds — wait and retry
docker compose logs keycloak | tail -20
```

### "Invalid token" / 401 errors from API
```bash
# Keycloak JWKS endpoint must be reachable from API
curl http://localhost:8081/realms/forge/protocol/openid-connect/certs
# If it fails, restart keycloak
docker compose restart keycloak
```

### AI not responding / rate limit hit
- Verify `ANTHROPIC_API_KEY` is set in `apps/api/.env`
- Check Redis rate limit key: `docker compose exec redis redis-cli GET "ratelimit:ai:<userId>"`
- Free tier: 50 requests/24h. Reset: `docker compose exec redis redis-cli DEL "ratelimit:ai:<userId>"`

### WebContainer preview not loading (Sprint 5)
- Must use **Chrome, Edge, or Firefox** (not Safari < 16.4)
- Must be served over `localhost` (not a remote IP)
- COOP/COEP headers are already set in `next.config.mjs`
- Check DevTools console for COOP/COEP header errors
- Console panel toggle at bottom of preview panel shows Vite output

### Deployment fails (Sprint 7)
- Verify the provider API key is set in `apps/api/.env`
- Check BullMQ worker logs: `docker compose logs api | grep -i deploy`
- Check deploy status in the Deploys panel — error shown in red
- Vercel: token needs `deployments:write` scope
- Cloudflare: token needs `Cloudflare Pages:Edit` + `FORGE_CF_ACCOUNT_ID` set
- Netlify: if 422 on site create, name collision — retries with unique name automatically

### Env vars not saving (Sprint 7)
- `FORGE_ENCRYPTION_KEY` must be set in `apps/api/.env`
- Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Snapshots not creating (Sprint 6)
- Snapshots auto-create before every AI diff apply
- Check `project_snapshots` table: `docker compose exec postgres psql -U forge -d forge -c "SELECT count(*) FROM project_snapshots;"`
- MinIO bucket `snapshots` must exist: `docker compose exec minio mc mb local/snapshots`

### Port already in use
```bash
# Find what's using a port
lsof -i :5432   # or :6379, :8081, :9000 etc.
kill -9 <PID>
```

### MinIO buckets not created
```bash
# Re-run the init container
docker compose run --rm minio-init
```

### Database migration fails
```bash
# Check postgres is running
docker compose ps postgres
# Run migration manually
cd apps/api && pnpm db:migrate
# Or reset completely (DESTROYS data)
docker compose down -v && docker compose up -d
```

### `pnpm install` fails
```bash
# Clear pnpm cache and retry
pnpm store prune
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

---

## 13. VS Code Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "mtxr.sqltools",
    "mtxr.sqltools-driver-pg"
  ]
}
```

---

## Quick Start Summary

```bash
# 1. Install
pnpm install

# 2. Configure (fill in AI API keys)
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Edit apps/api/.env — minimum required:
#   ANTHROPIC_API_KEY=sk-ant-...
#   FORGE_ENCRYPTION_KEY=<64-char hex>  (generate with command below)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Start infrastructure
docker compose up -d
# Wait ~60s for Keycloak to boot

# 4. Migrate DB (applies all 5 migrations)
pnpm --filter @forge/api db:migrate

# 5. Start dev servers
pnpm dev

# 6. Open browser
open http://localhost
```

**What you get after the above:**
- Forge AI app at `http://localhost`
- AI-powered code editor (Sprint 1–4)
- Live preview with WebContainers (Sprint 5, Chrome/Edge/Firefox only)
- Version history + undo (Sprint 6)
- One-click deploy to Vercel/Netlify/Cloudflare (Sprint 7, needs API key)
- 55 unit tests passing across API + web
