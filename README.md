# Forge AI

> AI-powered full-stack web application builder — describe it, build it, ship it.

## Quick Start (Local Dev)

### Prerequisites
- Docker Desktop ≥ 4.x
- Node.js ≥ 20
- pnpm ≥ 9

```bash
# 1. Clone and install
git clone <repo>
cd startup
cp .env.example .env.local
pnpm install

# 2. Start all infrastructure
docker compose up -d postgres redis minio keycloak

# 3. Run DB migrations
pnpm db:migrate

# 4. Start dev servers
pnpm dev
```

### Local URLs

| Service | URL |
|---------|-----|
| App | http://localhost |
| API | http://localhost/api |
| API Docs (Swagger) | http://localhost/api/docs |
| Keycloak Admin | http://localhost:8081 (admin/admin) |
| MinIO Console | http://localhost:9001 (minioadmin/minioadmin) |
| Traefik Dashboard | http://localhost:8080 |
| pgAdmin | `docker compose --profile tools up pgadmin` → http://localhost:5050 |

## Project Structure

```
startup/
├── apps/
│   ├── api/          # Fastify API (Node.js)
│   └── web/          # Next.js 14 frontend
├── packages/
│   └── shared/       # Shared TypeScript types & constants
├── infra/
│   ├── keycloak/     # Realm config
│   ├── traefik/      # Reverse proxy config
│   ├── postgres/     # DB init scripts
│   ├── minio/        # Bucket init script
│   └── redis/        # Redis config
├── docs/             # Architecture, PRD, Sprint Plan
└── .github/
    └── workflows/    # CI, CD staging, CD prod, nightly
```

## Development Commands

```bash
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm test             # Run all tests
pnpm test:unit        # Unit tests (Vitest)
pnpm test:bdd         # BDD tests (Cucumber)
pnpm test:e2e         # E2E tests (Playwright)
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed test data
pnpm db:studio        # Open Drizzle Studio
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | Fastify 4, TypeScript, Node.js 20 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache / Queue | Redis 7 + BullMQ |
| Storage | MinIO (S3-compatible) |
| Auth | Keycloak 24 (OIDC/PKCE) |
| Reverse Proxy | Traefik v3 |
| AI (Primary) | AWS Bedrock — Claude 3.5 Sonnet v2 |
| AI (Fallback 1) | Anthropic direct API |
| AI (Fallback 2) | Google Gemini 2.0 Flash |
| AI (Fallback 3) | OpenAI GPT-4o |
| CI/CD | GitHub Actions + GHCR |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Sprint Plan](docs/SPRINT_PLAN.md)
- [PRD](docs/PRD.md)
- [Business Plan](docs/business_plan.md)
