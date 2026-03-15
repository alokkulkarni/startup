---
description: "Write new tests for a feature or module using the automation-tester skill. Covers unit, integration, E2E (Playwright), and BDD (Cucumber) layers for this monorepo."
argument-hint: "What to test — e.g. 'auth login flow', 'billing webhook handler', 'user profile page'"
mode: "agent"
---

Use the `automation-tester` skill to write tests for the following target in this monorepo:

**Target**: $input

## Project Context

This is a TypeScript pnpm monorepo with two apps:

### `apps/api` — Fastify REST API
- **Unit tests**: Vitest (`src/**/*.test.ts`) — run with `pnpm --filter @forge/api test:unit`
- **Integration tests**: Vitest separate config (`src/**/*.integration.test.ts`) — run with `pnpm --filter @forge/api test:integration`
- **BDD tests**: Cucumber.js (`features/*.feature` + `features/step-definitions/`) — run with `pnpm --filter @forge/api test:bdd`
- **Coverage**: `@vitest/coverage-v8`, reports to `coverage/`
- **DB**: Drizzle ORM + PostgreSQL; use test DB or in-memory for unit tests
- **Auth**: Keycloak / openid-client; mock in unit/integration tests

### `apps/web` — Next.js 14 App Router
- **Unit tests**: Vitest + `@testing-library/react` (`**/*.test.tsx`) — run with `pnpm --filter @forge/web test:unit`
- **E2E tests**: Playwright — run with `pnpm --filter @forge/web test:e2e`
- **Coverage**: `@vitest/coverage-v8`
- **Components**: Tailwind CSS, `clsx`, `class-variance-authority`

### Shared
- **Monorepo root test**: `pnpm test` (runs all unit + integration via Turborepo)
- **Coverage threshold**: ≥80% lines + branches per module

## Instructions

Following the automation-tester skill phases:

1. **Discover** — Read the source file(s) for the target. Check if tests already exist for it.
2. **Decide layer** — Choose the appropriate test layer (unit / integration / E2E / BDD) for the target based on its nature.
3. **Write tests** — Follow the existing patterns in this repo:
   - Match import style, assertion style, and test structure of existing tests
   - Unit/integration: Vitest with `describe`/`it`/`expect`
   - BDD: Gherkin feature file in `features/` + step definitions in `features/step-definitions/`
   - E2E: Playwright with Page Object Model in `e2e/pages/`
4. **Run & validate** — Execute tests and confirm all pass
5. **Check coverage** — Run coverage report; if the target module is below 80%, add tests to close the gap
6. **Report** — Summarise tests added, test commands used, and final coverage
