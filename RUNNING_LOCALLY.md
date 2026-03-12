# Running Forge AI Locally

Complete guide to running the full Forge AI stack on your machine.

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

> **AWS Bedrock (primary AI):** If you have AWS credentials with Bedrock access, fill in `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`. Otherwise, the system falls back to Anthropic automatically.

#### 🟡 OPTIONAL for local dev (defaults work out of the box)

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgres://forge:forge@localhost:5432/forge` | Provided by Docker Compose |
| `REDIS_URL` | `redis://localhost:6379` | Provided by Docker Compose |
| `MINIO_*` | `minioadmin` / `localhost:9000` | Auto-configured by Docker Compose |
| `KEYCLOAK_*` | `http://localhost:8081` / `forge` realm | Auto-imported via realm-export.json |
| `STRIPE_*` | `sk_test_...` | Leave blank — billing UI is hidden without valid keys |
| `SENTRY_DSN` | _(empty)_ | Leave blank for local dev |
| `RESEND_API_KEY` | _(empty)_ | Email features disabled without this |
| `GITHUB_CLIENT_ID/SECRET` | _(empty)_ | Social login optional — email/password works without it |
| `GOOGLE_CLIENT_ID/SECRET` | _(empty)_ | Social login optional |

### Create `apps/api/.env` (API server env)
```bash
cat > apps/api/.env << 'EOF'
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://forge:forge@localhost:5432/forge
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_AVATARS=avatars
MINIO_BUCKET_SNAPSHOTS=snapshots
MINIO_BUCKET_ASSETS=assets
KEYCLOAK_URL=http://localhost:8081
KEYCLOAK_REALM=forge
KEYCLOAK_CLIENT_ID=forge-api
KEYCLOAK_CLIENT_SECRET=forge-api-secret
APP_URL=http://localhost
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-secret-here
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
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

```bash
cd apps/api
pnpm db:migrate    # applies all pending Drizzle migrations
```

This runs all SQL files in `apps/api/drizzle/` against the local PostgreSQL instance.

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

### Unit tests (fast, no Docker needed)
```bash
pnpm test              # all packages
pnpm --filter @forge/api test:unit
pnpm --filter @forge/web test:unit
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

### All tests + typecheck
```bash
pnpm typecheck && pnpm test
```

---

## 9. Running Everything in Docker (Full Stack)

To run the entire stack including API and web in Docker (mirrors production):

```bash
docker compose --profile full up -d
```

> Note: This builds the API and web Docker images locally, which takes 2–3 minutes on first run.

---

## 10. Useful Commands

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

## 11. Port Reference

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

### WebContainer preview not working
- Requires **Chrome, Edge, or Firefox** (not Safari < 16.4)
- Must be served over `localhost` (not a remote IP)
- COOP/COEP headers are already set in `next.config.mjs`

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
# Edit both files — add ANTHROPIC_API_KEY at minimum

# 3. Start infrastructure
docker compose up -d
# Wait ~60s for Keycloak

# 4. Migrate DB
pnpm --filter @forge/api db:migrate

# 5. Start dev servers
pnpm dev

# 6. Open browser
open http://localhost
```
