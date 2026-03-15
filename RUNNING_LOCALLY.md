# Running Forge AI Locally

Complete guide to running the full Forge AI stack on your machine.

> **Current build:** Sprints 0–12 complete. Covers auth, projects, AI chat, code editor, live preview (WebContainers), version history, one-click deployment to Vercel / Netlify / Cloudflare Pages, full GitHub integration (push, pull, PR, import), Template Marketplace with Onboarding Wizard, Billing & Subscriptions (Stripe, plan tiers, usage limits), Collaboration & Teams (RBAC, workspace invitations, real-time presence), and Analytics & Observability Dashboard.

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

> **AWS Bedrock (primary AI):** Uses **IAM role assumption** — no hardcoded keys required.
> - **Production (EC2/ECS/EKS):** Attach `ForgeAIBedrockRole` as the instance/task/pod role — no env vars needed.
> - **Explicit role assumption:** Set `AWS_ROLE_ARN` — the SDK calls `sts:AssumeRole` automatically.
> - **Local dev:** Use `AWS_PROFILE` (named profile in `~/.aws/config`) or `AWS_ACCESS_KEY_ID`/`SECRET` as a last resort.
> - See `infra/aws/README.md` for full IAM setup (policy + trust policy + AWS CLI commands).

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
| `GITHUB_CLIENT_ID` | [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App | Enables GitHub push/pull/import (Sprint 8) |
| `GITHUB_CLIENT_SECRET` | Same OAuth App page → Generate client secret | Required with `GITHUB_CLIENT_ID` |
| `STRIPE_*` | `sk_test_...` | Leave blank — billing UI hidden without valid keys |
| `SENTRY_DSN` | _(empty)_ | Leave blank for local dev |
| `RESEND_API_KEY` | _(empty)_ | Email features disabled without this |
| `GOOGLE_CLIENT_ID/SECRET` | _(empty)_ | Social login optional |

> ⚠️ **Two different GitHub OAuth Apps** are needed if you want both features:
> - **GitHub Integration** (Sprint 8 — push/pull/import code): callback = `http://localhost/api/v1/github/callback` — use `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `apps/api/.env`
> - **GitHub Social Login** (Keycloak broker — sign in with GitHub): callback = `http://localhost:8081/realms/forge/broker/github/endpoint` — configured separately in Keycloak Admin Console
>
> You can use the **same** OAuth App for both if you register both callback URLs in GitHub's "Authorization callback URL" field (separate with a newline).

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
# Bedrock uses IAM role assumption — see infra/aws/README.md for full setup.
#
# OPTION A (production): attach ForgeAIBedrockRole as instance/task role — no vars needed
# OPTION B (explicit role assumption):
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/ForgeAIBedrockRole
AWS_ROLE_SESSION_NAME=forge-bedrock-session   # optional
# OPTION C (local dev — named AWS profile, no plaintext keys):
# AWS_PROFILE=forge-dev
# OPTION D (local dev — static keys, last resort, never commit):
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=...
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

# ── GitHub Integration (Sprint 8 — enables push/pull/import) ────
# Create at: https://github.com/settings/developers → New OAuth App
# App name: Forge AI (Local Dev)
# Homepage URL: http://localhost
# Authorization callback URL: http://localhost/api/v1/github/callback
GITHUB_CLIENT_ID=                 # your GitHub OAuth App client ID
GITHUB_CLIENT_SECRET=             # your GitHub OAuth App client secret

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

There are 10 migrations covering all sprints:

| Migration | Sprint | What it adds |
|-----------|--------|-------------|
| `0000_initial` | 0 | users, workspaces, workspace_members |
| `0001_projects_expand` | 2 | projects, project_files, ai_conversations, ai_messages |
| `0002_ai_indexes` | 3 | performance indexes for AI routes |
| `0003_snapshots` | 6 | project_snapshots (version history) |
| `0004_deployments` | 7 | deployments, project_env_vars |
| `0005_github` | 8 | github_connections + 5 GitHub columns on projects |
| `0006_templates` | 9 | templates, template_ratings + onboarding columns on users |
| `0007_billing` | 10 | Stripe columns on subscriptions (planTier, stripeCustomerId, periodEnd, etc.) |
| `0008_collaboration` | 11 | workspace_invitations, presence_sessions |
| `0009_analytics` | 12 | analytics_events (eventType, metadata jsonb, workspaceId, projectId, userId) |

```bash
cd apps/api
pnpm db:migrate    # applies all 10 pending Drizzle migrations
```

Verify migrations applied:
```bash
docker compose exec postgres psql -U forge -d forge -c "\dt"
# Should list: users, workspaces, workspace_members, projects, project_files,
#              ai_conversations, ai_messages, project_snapshots,
#              deployments, project_env_vars, subscriptions, github_connections,
#              templates, template_ratings, workspace_invitations, presence_sessions,
#              analytics_events
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

### GitHub Social Login via Keycloak (optional — sign in with GitHub)

> This allows users to log into Forge AI **using** their GitHub account. It is separate from the Sprint 8 GitHub Integration (push/pull code).

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Fill in:
   - **App name:** `Forge AI Keycloak (Local)`
   - **Homepage URL:** `http://localhost`
   - **Authorization callback URL:** `http://localhost:8081/realms/forge/broker/github/endpoint`
3. Note the **Client ID** and generate a **Client Secret**
4. In Keycloak Admin (`http://localhost:8081/admin`):
   - Go to `forge` realm → **Identity Providers** → **Add provider → GitHub**
   - Enter the Client ID and Secret
   - Save
5. Users will now see a "Login with GitHub" button on the Keycloak login page

### Google Social Login via Keycloak (optional)
1. Create credentials at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID
2. Set **Authorised redirect URI:** `http://localhost:8081/realms/forge/broker/google/endpoint`
3. In Keycloak Admin → `forge` realm → **Identity Providers** → **Add provider → Google**
4. Enter the Client ID and Secret → Save

---

## 7b. GitHub Integration Setup (Sprint 8)

> This allows users to **push, pull, and import code** between Forge AI projects and GitHub repositories. Required if you want to test Sprint 8 features.

### Step 1 — Create a GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Fill in:
   - **App name:** `Forge AI Integration (Local Dev)`
   - **Homepage URL:** `http://localhost`
   - **Authorization callback URL:** `http://localhost/api/v1/github/callback`
3. Click **Register application**
4. On the next page, click **Generate a new client secret**
5. Copy both the **Client ID** and **Client Secret**

### Step 2 — Add to `apps/api/.env`

```bash
GITHUB_CLIENT_ID=Ov23li...        # from Step 1
GITHUB_CLIENT_SECRET=abc123...    # from Step 1
```

### Step 3 — Restart the API server

```bash
# If running with pnpm dev, just save the .env file — Fastify restarts automatically
# If using Docker full stack:
docker compose --profile full restart api
```

### Step 4 — Test the integration

1. Open `http://localhost` → log in → open any project workspace
2. Click the **GitHub** button in the workspace header
3. The panel shows "Connect GitHub" → click it
4. You'll be redirected to GitHub's OAuth consent page
5. Approve → redirected back to dashboard with `?github=connected`
6. Reopen the workspace → GitHub panel now shows your username

### Verifying GitHub OAuth works end-to-end
```bash
# After connecting, check the DB for the stored (encrypted) token
docker compose exec postgres psql -U forge -d forge \
  -c "SELECT github_login, github_name, token_scope, connected_at FROM github_connections;"
```

> **Security note:** The GitHub access token is encrypted at rest using AES-256-GCM with your `FORGE_ENCRYPTION_KEY`. Never share your `FORGE_ENCRYPTION_KEY` or let it default to the dev placeholder in production.

---

## 7c. AWS Bedrock Setup (IAM Role Assumption)

Forge AI uses AWS Bedrock (Claude 3.5 Sonnet) as its **primary AI provider**. It authenticates via **IAM role assumption** — no hardcoded credentials. Choose the option that fits your environment:

---

### Option A — Local dev with a named AWS profile (recommended)

No plaintext keys needed. Uses `~/.aws/config` with SSO or a standard profile.

**1. Configure a profile** (if you haven't already):
```bash
# SSO-based (for organisations using AWS Identity Center)
aws configure sso --profile forge-dev

# OR standard key-based profile (developer IAM user)
aws configure --profile forge-dev
# Enter: Access Key ID, Secret Access Key, region (us-east-1), output format (json)
```

**2. Attach the Bedrock policy to your developer user/role:**
```bash
# Create the policy
aws iam create-policy \
  --policy-name ForgeAIBedrockPolicy \
  --policy-document file://infra/aws/bedrock-policy.json

# Attach to your IAM user
aws iam attach-user-policy \
  --user-name YOUR_IAM_USERNAME \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/ForgeAIBedrockPolicy
```

**3. Add to `apps/api/.env`:**
```bash
AWS_REGION=us-east-1
AWS_PROFILE=forge-dev
# No keys needed — SDK reads from ~/.aws/config
```

---

### Option B — Explicit role assumption (cross-account or least-privilege)

**1. Create the IAM role:**
```bash
# Edit infra/aws/bedrock-role-trust-policy.json — replace ACCOUNT_ID and REGION

aws iam create-role \
  --role-name ForgeAIBedrockRole \
  --assume-role-policy-document file://infra/aws/bedrock-role-trust-policy.json

aws iam attach-role-policy \
  --role-name ForgeAIBedrockRole \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/ForgeAIBedrockPolicy
```

**2. Add to `apps/api/.env`:**
```bash
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/ForgeAIBedrockRole
AWS_ROLE_SESSION_NAME=forge-bedrock-session   # optional, defaults to this value
```
The SDK will call `sts:AssumeRole` on every Bedrock request and auto-refresh the 1h temporary credentials.

---

### Option C — Production on EC2 / ECS / EKS (zero config)

Attach `ForgeAIBedrockRole` directly as the **instance profile** (EC2), **task role** (ECS), or **service account annotation** (EKS IRSA). No env vars needed — the SDK discovers the role via the instance metadata service automatically.

```bash
# EC2: attach instance profile
aws iam create-instance-profile --instance-profile-name ForgeAIBedrockProfile
aws iam add-role-to-instance-profile \
  --instance-profile-name ForgeAIBedrockProfile \
  --role-name ForgeAIBedrockRole

# ECS: in your task definition JSON
# "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ForgeAIBedrockRole"
```

---

### Step: Enable Bedrock model access in AWS Console

> **Required once per AWS account** before the first Bedrock call.

1. Open [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/) → **Model access**
2. Click **Manage model access**
3. Enable: **Anthropic Claude 3.5 Sonnet v2**, **Claude 3 Sonnet**, **Claude 3 Haiku**
4. Submit — access is usually granted within seconds

---

### Verify Bedrock is working locally

```bash
# Send a test AI request (replace TOKEN with a valid Keycloak JWT)
curl -X POST http://localhost/api/v1/projects/PROJECT_ID/ai/chat \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello in one sentence"}' \
  --no-buffer

# Expected: streaming SSE response starting with data: {"type":"text","text":"Hello..."}
# Check API logs for which provider was used:
docker compose logs api | grep "\[AI\] Trying provider"
# Should show: [AI] Trying provider: bedrock  → [AI] Provider bedrock succeeded
```

> **Fallback chain:** If Bedrock fails (no credentials, model not enabled, region not supported), the API automatically falls back to **Anthropic API → Gemini → GPT-4o**. The fallback is seamless — no user-visible error unless all providers fail.

> **Full IAM reference:** See `infra/aws/README.md` for the complete guide including the policy JSON, trust policy, and all AWS CLI commands.

---

## 8. Running Tests

### Current test counts (Sprints 0–10)

| Package | Test files | Tests | Command |
|---------|-----------|-------|---------|
| `@forge/api` | 10 | **124** | `pnpm --filter @forge/api test:unit` |
| `@forge/web` | 23 | **108** | `pnpm --filter @forge/web test:unit` |
| **Total** | **33** | **232** | `pnpm test` |

### Unit tests (fast, no Docker needed)
```bash
pnpm test                              # all packages
pnpm --filter @forge/api test:unit     # API only (124 tests, ~600ms)
pnpm --filter @forge/web test:unit     # Web only (108 tests, ~2s)
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

### ✅ Sprint 8 — GitHub Integration
> Requires `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` in `apps/api/.env`. See **Section 7b** for full setup.

#### Connect GitHub
1. Open a project workspace → click the **GitHub** button in the header
2. GitHubPanel slides in → click **"Connect GitHub"**
3. GitHub OAuth consent page → click **Authorize**
4. Redirected back to dashboard with `?github=connected` in URL
5. Reopen workspace → panel shows your GitHub username + green connected dot

#### Sync status badge
- Header shows **"✓ In sync"** (green) when local matches remote
- Shows **"↑ N ahead"** (orange) after local changes not yet pushed
- Shows **"↓ N behind"** (blue) when remote has commits you haven't pulled

#### Push to a new GitHub repo
1. In GitHubPanel → click **Push** → **New Repository** tab
2. Enter a repo name (e.g. `my-forge-app`) → optionally tick **Private**
3. Click **Push** → wait ~5s → GitHub repo created
4. Visit `https://github.com/YOUR_USERNAME/my-forge-app` — all project files committed

#### Push to an existing repo
1. **Push** → **Existing Repository** tab
2. Search for a repo in the browser → select it → pick a branch
3. Enter a commit message (or leave blank for auto-generated)
4. Click **Push** → commit appears in GitHub

#### Pull from GitHub
1. Make a commit directly on GitHub.com (edit any file)
2. In GitHubPanel → sync badge shows **"↓ 1 behind"**
3. Click **Pull** → confirm → files updated in Monaco + snapshot created automatically
4. Check History panel — new snapshot entry labelled "Before GitHub pull"

#### Create a Pull Request
1. After pushing changes to a branch (e.g. `feature-branch`)
2. In GitHubPanel → click **Create PR**
3. Set **from** = `feature-branch`, **into** = `main`
4. AI-suggested title and description are pre-filled (editable)
5. Click **Create PR** → link shown → click to view on GitHub

#### Import from GitHub
1. On the **Dashboard** → click **Import from GitHub**
2. If not connected, connect first (follows same OAuth flow)
3. Search for and select any of your GitHub repos
4. Select a branch → optionally rename the project
5. Click **Import** → redirected to new workspace with all repo files loaded
6. Verify all files appear in the FileTree

#### Verify GitHub data in database
```bash
docker compose exec postgres psql -U forge -d forge

-- Check connection stored
SELECT github_login, github_name, token_scope FROM github_connections;

-- Check project has repo info after push
SELECT name, github_repo_owner, github_repo_name, github_default_branch, github_last_pushed_sha
FROM projects WHERE github_repo_owner IS NOT NULL;

\q
```

### ✅ Sprint 9 — Template Marketplace & Onboarding

> **Setup required first:** Run `pnpm db:seed` to populate the 10 starter templates.

```bash
cd apps/api
pnpm db:seed   # seeds 10 templates into the templates table
```

#### Onboarding Wizard (first-time users)
1. Log in with a **brand new user account** (register fresh in Keycloak)
2. After first login → dashboard loads with the **Onboarding Wizard overlay** (z-index overlay, dark backdrop)
3. **Step 0 — Welcome:** "Welcome to Forge AI!" → click **Get Started**
4. **Step 1 — Describe your project:** Type "I want to build a SaaS dashboard" → click **Find Templates**
   - 3 template suggestions appear below the input
5. **Step 2 — Select template:** Click a template card to select it (purple border highlights it)
6. **Confirm:** Click **Create Project** → wizard closes → redirected to new workspace pre-loaded with template files
7. Test **Skip:** Click the skip button on any step → wizard closes, onboarding marked complete

#### Template Gallery Page
1. Navigate to `http://localhost/templates`
2. You should see a **3-column grid** of 10 template cards
3. Each card shows: gradient thumbnail, name, description, framework badge (colour-coded), stats
4. **Category filter:** Click "SaaS" pill → grid filters to SaaS templates only
5. **Search:** Type "todo" in the search bar → React Todo template appears
6. **Sort:** Change dropdown to "Top Rated" → templates reorder by avg_rating
7. Click **Preview** on any card → `TemplatePreviewModal` opens with file tree on the right panel
8. Click stars (1–5) in the modal to rate the template
9. Click **Use This Template** → cloned project created → redirect to workspace

#### New Project from Template (in dashboard)
1. On Dashboard → click **New Project**
2. Modal opens showing **"From Template" tab** (default, not blank)
3. Template grid shows available templates (searchable)
4. Click a template card to select (purple border)
5. Project name auto-fills from template name (editable)
6. Click **Create Project** → workspace opens with all template files pre-populated
7. Switch to **"Blank Project" tab** → original form (name + framework dropdown) still works

#### Templates navigation link
1. Check dashboard header — **"Templates"** link should appear next to other nav items
2. Clicking it navigates to `/templates` gallery page

#### Verify templates data in database
```bash
docker compose exec postgres psql -U forge -d forge

-- Check 10 templates seeded
SELECT slug, category, framework, use_count, avg_rating FROM templates ORDER BY slug;

-- Check ratings after rating a template
SELECT t.slug, tr.rating, tr.user_id FROM template_ratings tr JOIN templates t ON t.id = tr.template_id;

-- Check onboarding state per user
SELECT email, onboarding_completed, onboarding_step FROM users;

\q
```

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
SELECT key FROM project_env_vars;        -- values are encrypted, keys shown
SELECT github_login FROM github_connections;  -- Sprint 8: connected accounts

# Check project GitHub linkage (Sprint 8)
SELECT name, github_repo_owner, github_repo_name FROM projects WHERE github_repo_owner IS NOT NULL;

# Check templates were seeded (Sprint 9)
SELECT slug, category, framework, use_count FROM templates ORDER BY use_count DESC;

# Check user onboarding state (Sprint 9)
SELECT email, onboarding_completed, onboarding_step FROM users;

# Check billing subscription (Sprint 10)
SELECT u.email, s.plan_tier, s.status, s.stripe_customer_id, s.period_end
FROM subscriptions s JOIN users u ON u.id = s.user_id;

# Exit
\q
```

### ✅ Sprint 10 — Billing & Subscriptions

> **Stripe keys required for full testing.** Without keys the billing UI is hidden but the app still works.

#### Set up Stripe test keys
1. Create a free account at [dashboard.stripe.com](https://dashboard.stripe.com)
2. Go to **Developers → API Keys** → copy the **Secret key** (`sk_test_...`)
3. Add to `apps/api/.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # set up in next step
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_...
STRIPE_TEAM_YEARLY_PRICE_ID=price_...
```
4. Create products in Stripe Dashboard: **Pro Monthly ($19)**, **Pro Yearly ($15×12)**, **Team Monthly ($49)**, **Team Yearly ($39×12)**
5. For webhook: install Stripe CLI → `stripe listen --forward-to localhost/api/v1/billing/webhook` → copy the `whsec_...` key

#### Pricing page
1. Navigate to `http://localhost/pricing`
2. You should see **3 plan cards**: Free, Pro (highlighted "Most Popular"), Team
3. Toggle **Monthly / Yearly** — prices update (Pro: $19/mo or $15/mo, Team: $49/mo or $39/mo)
4. Click **Upgrade to Pro** → redirected to Stripe Checkout (requires real Stripe keys)

#### Plan badge in dashboard
1. Log in → dashboard header shows **Free** badge (grey pill)
2. After upgrading: badge shows **⚡ Pro** (violet) or **🚀 Team** (amber)

#### Usage bar
1. In dashboard → click **Account / Billing** → `BillingPanel` shows AI usage progress bar
2. Shows: `23 / 50 AI requests today` for free tier
3. When ≥90% used: bar turns orange with `⚠️ Nearing limit`
4. When 100%: shows `Limit reached — upgrade for more`

#### Upgrade prompts
1. **Rate limit prompt**: Send 50+ AI requests in a day (free tier) → after the 429 response, an upgrade banner appears in the workspace chat
2. **Project limit prompt**: Try to create a 4th project on free tier → upgrade modal appears before the create dialog

#### Billing portal (paid users only)
1. After upgrading to Pro → dashboard shows **Manage Billing** button
2. Clicking it redirects to Stripe Customer Portal to manage subscription, download invoices, cancel

#### Verify billing data in database
```bash
docker compose exec postgres psql -U forge -d forge

-- Check subscription tiers
SELECT u.email, s.plan_tier, s.status, s.stripe_customer_id, s.cancel_at_period_end
FROM subscriptions s JOIN users u ON u.id = s.user_id;

-- Check AI rate limit key in Redis
\q
```
```bash
docker compose exec redis redis-cli
KEYS ratelimit:ai:*       -- shows per-user rate limit keys
GET ratelimit:ai:<userId> -- current count for a user
exit
```

### 🔍 Verifying Redis State
```bash
docker compose exec redis redis-cli

# Check rate limit keys
KEYS ratelimit:*

# Check BullMQ job queues
KEYS bull:*

# Check presence sessions (Sprint 11)
KEYS presence:*

# Exit
exit
```

---

### ✅ Sprint 11 — Collaboration & Teams

Sprint 11 adds workspace invitations, role-based access control (RBAC), and real-time presence via WebSocket.

#### Role hierarchy
Forge AI uses three workspace roles, in descending permission order:

| Role | Can do |
|------|--------|
| **owner** | All actions: invite, remove members, change roles, manage workspace |
| **editor** | View members list, view pending invitations, edit projects |
| **viewer** | View workspace content; read-only access to projects |

#### Manage team members
1. Navigate to `http://localhost/settings/members`
2. You'll see a list of current members with their role badges (purple=owner, blue=editor, grey=viewer)
3. As **owner**: use the **Invite member** form at the top — enter an email and select role (editor or viewer)
4. As **owner**: use the role dropdown next to each member to change their role
5. As **owner**: click **Remove** to remove a member from the workspace

#### Send & accept an invitation
```bash
# 1. Send an invite (as owner) via API:
curl -X POST http://localhost/api/v1/workspaces/<workspaceId>/invitations \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"email":"colleague@example.com","role":"editor"}'
# Returns: { invitation: { id, email, role, expiresAt } }

# 2. The invitation token is logged to the API console (email sending is async / Resend-backed):
# Look for: "Invitation created" in docker compose logs api

# 3. Accepting the invite (as the invited user, must be logged in):
curl -X POST http://localhost/api/v1/invitations/<token>/accept \
  -b "session=..."
# Returns: { workspaceId, role }
```

> **Note:** Real email sending requires a `RESEND_API_KEY` (see Optional features table). Without it, the invitation token is visible in the API logs for manual testing.

#### Workspace switcher
1. Log in → the dashboard top-left now shows a **workspace switcher** dropdown
2. Click it to see all workspaces you belong to with your role
3. Click **+ Create workspace** to create a new one (name → auto-generates slug)
4. Switching workspace refreshes your active context

#### Real-time presence
1. Open `http://localhost` in **two different browser windows** (logged in as different users)
2. Both users join the same project — you'll see the **avatar stack** in the dashboard header showing online collaborators (e.g. `JD TU +1  3 online`)
3. Avatars use initials from email + deterministic colour
4. Presence uses WebSocket (`WS /api/v1/ws/presence/:workspaceId`) with a 30-second ping keepalive; sessions expire after 60s without a ping

#### Test presence via Redis
```bash
docker compose exec redis redis-cli

# List online users in a workspace
SMEMBERS presence:ws:<workspaceId>

# Inspect a specific user's presence data
GET presence:user:<workspaceId>:<userId>

exit
```

#### Verify collaboration data in database
```bash
docker compose exec postgres psql -U forge -d forge

-- List workspace members and roles
SELECT u.email, wm.role, wm.joined_at
FROM workspace_members wm
JOIN users u ON u.id = wm.user_id
WHERE wm.workspace_id = '<your-workspace-id>';

-- List pending invitations
SELECT email, role, status, expires_at
FROM workspace_invitations
WHERE workspace_id = '<your-workspace-id>' AND status = 'pending';

\q
```

#### RBAC enforcement (API-level)
All collaboration endpoints enforce RBAC automatically:
```bash
# As editor (not owner) — should return 403:
curl -X DELETE http://localhost/api/v1/workspaces/<id>/members/<userId> \
  -b "session=..." 
# → {"error":"Only owners can remove members"}

# As viewer — list members (allowed):
curl http://localhost/api/v1/workspaces/<id>/members \
  -b "session=..."
# → {"members":[...]}
```

#### Optional: Configure email sending for invitations (Resend)
Add to `apps/api/.env`:
```
RESEND_API_KEY=re_...           # get from resend.com (free tier: 3,000 emails/month)
RESEND_FROM_EMAIL=noreply@yourdomain.com
```
> Without this, invitations still work — the token is logged to the console and can be manually shared.

---

### ✅ Sprint 12 — Analytics & Observability Dashboard

Sprint 12 adds a full analytics dashboard with event tracking, AI usage charts, deployment metrics, and a real-time activity feed.

#### Access the analytics dashboard
1. Log in and click **📊 Analytics** in the dashboard sidebar
2. You'll see the analytics page at `http://localhost/analytics`
3. It shows:
   - **4 stat cards**: AI Requests (30d), Deployments (30d), Active Projects, Active Members
   - **AI Requests chart**: SVG line chart — last 30 days of AI request volume
   - **Usage breakdown**: horizontal bar gauges for Projects Created, Templates Cloned, Deployments
   - **Recent Activity feed**: last 20 events with icons, user, project name, time-ago

#### Event types tracked automatically
Analytics events are recorded automatically (fire-and-forget) whenever users take action:

| Event type | Triggered by |
|------------|-------------|
| `ai_request` | Every AI chat message sent |
| `deployment_created` | Every one-click deploy to Vercel/Netlify/Cloudflare |
| `project_created` | New project creation |
| `template_cloned` | Cloning a template from marketplace |
| `member_invited` | Sending a workspace invitation |
| `file_saved` | Auto-save in code editor |
| `snapshot_created` | Creating a version snapshot |
| `github_push` | Pushing to GitHub |

#### Test analytics via API
```bash
# Get workspace overview (last 30 days)
curl http://localhost/api/v1/analytics/overview \
  -b "session=..."
# → { aiRequests: 42, deployments: 5, activeProjects: 3, activeMembers: 2, ... }

# Get AI usage time series (30 data points)
curl http://localhost/api/v1/analytics/ai-usage \
  -b "session=..."
# → { series: [{ date: "2026-02-10", requests: 3 }, ...] }

# Get per-project stats
curl http://localhost/api/v1/analytics/projects/<projectId> \
  -b "session=..."
# → { projectName: "My App", aiRequests: 12, deployments: 2, aiSeries: [...] }

# Recent activity feed
curl "http://localhost/api/v1/analytics/activity?page=1&limit=20" \
  -b "session=..."
# → { events: [{ eventType, userEmail, projectName, createdAt, metadata }], ... }

# Record a custom event
curl -X POST http://localhost/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"eventType":"file_saved","projectId":"<id>","metadata":{"filename":"App.tsx"}}'
```

#### Verify analytics data in database
```bash
docker compose exec postgres psql -U forge -d forge

-- Event count by type (last 30 days)
SELECT event_type, COUNT(*) as total
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY total DESC;

-- Most active projects
SELECT p.name, COUNT(ae.id) as events
FROM analytics_events ae
JOIN projects p ON p.id = ae.project_id
WHERE ae.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.name
ORDER BY events DESC
LIMIT 10;

-- Daily AI requests
SELECT DATE(created_at) as day, COUNT(*) as requests
FROM analytics_events
WHERE event_type = 'ai_request'
GROUP BY day
ORDER BY day DESC
LIMIT 30;

\q
```

#### Charts auto-refresh
The analytics page automatically refreshes data every **30 seconds** in the background — no page reload needed. Open browser DevTools → Network tab to observe the polling requests.

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

# Seed templates (optional — run after migrations)
docker compose exec api pnpm db:seed
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

## 13. Troubleshooting

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

### GitHub integration not working (Sprint 8)

**"Connect GitHub" does nothing / redirect fails:**
- Verify `GITHUB_CLIENT_ID` is set in `apps/api/.env` (not empty)
- Verify the OAuth App callback URL is exactly: `http://localhost/api/v1/github/callback`
- Check API logs: `docker compose logs api | grep -i github`

**"GitHub not connected" error after OAuth:**
- The callback goes to `http://localhost/api/v1/github/callback` — Traefik must be running
- Check Traefik is routing correctly: `curl -v http://localhost/api/v1/health`
- If running `pnpm dev` without Docker for API, the callback URL won't reach it — use `http://localhost:3001` as `APP_URL` in `.env` and update your GitHub OAuth App accordingly

**"Octokit" / GitHub API errors:**
- Token may have expired — disconnect and reconnect: click GitHub panel → Disconnect → Connect again
- Verify the OAuth App has `repo` and `read:user` scopes enabled
- Check the GitHub App is not suspended at [github.com/settings/developers](https://github.com/settings/developers)

**Push fails with "Repository already exists":**
- The repo name is taken on your GitHub account — use a different name in the Push modal

**Pull creates no snapshot / files not updated:**
- Ensure the project has a linked repo (`github_repo_owner` set in DB)
- Check MinIO `snapshots` bucket exists: `docker compose exec minio mc ls local/`

**"Import from GitHub" stuck loading repos:**
- GitHub OAuth token may not have `repo` scope — disconnect and reconnect
- Verify `GITHUB_CLIENT_ID` scope in `.env` (must be `repo read:user` in the OAuth URL)

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

## 14. VS Code Recommended Extensions

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

# 4. Migrate DB (applies all 10 migrations)
pnpm --filter @forge/api db:migrate

# 5. Seed templates (optional — populates 10 starter templates)
pnpm --filter @forge/api db:seed

# 6. Start dev servers
pnpm dev

# 7. Open browser
open http://localhost
```

**What you get after the above:**
- Forge AI app at `http://localhost`
- AI-powered code editor (Sprints 1–4)
- Live preview with WebContainers (Sprint 5, Chrome/Edge/Firefox only)
- Version history + undo (Sprint 6)
- One-click deploy to Vercel/Netlify/Cloudflare (Sprint 7, needs provider API key)
- GitHub push/pull/PR/import (Sprint 8, needs GitHub OAuth App — see Section 7b)
- Template Marketplace with 10 starter templates + Onboarding Wizard (Sprint 9)
- Billing & Subscriptions with Stripe (Sprint 10, needs Stripe keys for checkout)
- Collaboration & Teams: RBAC, workspace invitations, real-time presence (Sprint 11)
- Analytics & Observability: usage dashboard, event tracking, AI usage charts (Sprint 12)
- 406 unit tests passing across API + web

**Optional features and what they need:**

| Feature | Extra config required |
|---------|----------------------|
| Template Marketplace | `pnpm db:seed` to populate templates |
| Billing & Subscriptions | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + price IDs — see **Section 9 Sprint 10** |
| Team Collaboration (RBAC + invites) | Works out of the box; email delivery needs `RESEND_API_KEY` — see **Section 9 Sprint 11** |
| Analytics Dashboard | Works out of the box — no extra config; events recorded automatically |
| GitHub push / pull / import | `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` — see **Section 7b** |
| Deploy to Vercel | `FORGE_VERCEL_API_KEY` |
| Deploy to Netlify | `FORGE_NETLIFY_API_KEY` |
| Deploy to Cloudflare Pages | `FORGE_CF_API_TOKEN` + `FORGE_CF_ACCOUNT_ID` |
| AWS Bedrock AI (primary) | IAM role assumption — set `AWS_ROLE_ARN` or attach instance/task role. See `infra/aws/README.md` |
| Sign in with GitHub | GitHub OAuth App with Keycloak callback (Section 7) |
| Email notifications | `RESEND_API_KEY` |
| Error monitoring | `SENTRY_DSN` |
