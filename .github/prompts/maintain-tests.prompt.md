---
description: "Maintain and refactor the test suite after source code changes using the automation-tester skill. Updates tests for changed code, removes tests for deleted code, and re-validates coverage."
argument-hint: "What changed — e.g. 'renamed createSession to initSession in auth', 'removed legacyParser module', or 'post-sprint cleanup'"
mode: "agent"
---

Use the `automation-tester` skill (Phase 6 — Continuous Maintenance) to maintain the test suite after the following change:

**Change description**: $input

## Project Context

TypeScript pnpm monorepo:
- `apps/api`: Fastify — Vitest unit + integration, Cucumber.js BDD
- `apps/web`: Next.js 14 — Vitest unit, Playwright E2E
- Run all tests: `pnpm test` (Turborepo)
- Run API tests: `pnpm --filter @forge/api test`
- Run web tests: `pnpm --filter @forge/web test`

## Maintenance Workflow

### 1. Diff Detection
- Identify which source files changed (use git diff or the change description above)
- List all test files that import or exercise those source files

### 2. Impact Analysis
For each changed source file:
- What tests break? (type errors, failing assertions, import mismatches)
- What logic changed that requires new tests?
- What code was deleted that makes existing tests obsolete?

### 3. Update Tests
- **Renamed symbol**: Update all call sites in test files
- **Changed behavior**: Update assertions to match new expected output
- **New logic added**: Write new tests for the new code path
- **Bug fix**: Add a regression test that would have caught the bug

### 4. Delete Orphaned Tests
- Remove test files for deleted modules
- Remove individual `it` blocks for removed functions/endpoints
- Remove BDD scenarios for removed features
- **Do not leave broken or skipped tests** — fix or delete

### 5. Re-validate
- Run full test suite: `pnpm test`
- Run coverage: `pnpm --filter @forge/api test:unit -- --coverage`
- Confirm: all tests green, coverage ≥80% per module

### 6. Report
Produce the maintenance report from the automation-tester skill:
- Tests updated / added / deleted
- Coverage before and after (per affected module)
- Any remaining issues or follow-up actions needed
