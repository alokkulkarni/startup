---
description: "Full test suite audit using the automation-tester skill. Detects coverage gaps, duplicate tests, obsolete tests, and flaky patterns across the entire monorepo."
argument-hint: "Optional scope — e.g. 'apps/api only', 'web unit tests', or leave blank for full monorepo audit"
mode: "agent"
---

Use the `automation-tester` skill to perform a full test suite audit for this monorepo.

**Scope**: ${input:Full monorepo (apps/api + apps/web)}

## Project Context

TypeScript pnpm monorepo with:
- `apps/api`: Fastify API — Vitest unit + integration, Cucumber.js BDD
- `apps/web`: Next.js 14 — Vitest unit, Playwright E2E
- Coverage tool: `@vitest/coverage-v8`
- Minimum threshold: **≥80% lines and branches per module**

## Audit Checklist

Following the automation-tester skill (Phases 1, 4, and 5):

### 1. Discovery Pass
- Map all source files in `src/` for each app
- Map all existing test files (`*.test.ts`, `*.test.tsx`, `*.integration.test.ts`, `features/*.feature`)
- Build a source-to-test gap matrix

### 2. Coverage Analysis
- Run: `pnpm --filter @forge/api test:unit -- --coverage`
- Run: `pnpm --filter @forge/web test:unit -- --coverage`
- List every module below 80% with specific uncovered lines/branches

### 3. Duplicate Test Detection
- Find tests asserting identical behavior across files
- Identify structural clones (same pattern, different variable names)

### 4. Obsolete Test Detection
- Tests importing deleted/renamed modules (TypeScript compile errors)
- Tests for removed endpoints, functions, or feature flags
- Skipped tests (`it.skip`, `test.skip`) without a dated justification comment

### 5. Flaky Test Patterns
- Fixed delays (`setTimeout`, `sleep`) instead of proper waits
- Tests that share or mutate global state
- Network calls without mocks in unit tests

## Output

Produce the full **Test Report** from the skill including:
- Coverage table (per module, before/after)
- Issues found (duplicates, obsoletes, flaky patterns)
- Prioritised list of next actions to reach 100% green health score
