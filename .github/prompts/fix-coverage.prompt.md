---
description: "Fix test coverage below 80% for a specific module or across the whole project using the automation-tester skill."
argument-hint: "Module path or area — e.g. 'src/routes/billing.ts', 'src/auth/', or 'all modules below threshold'"
mode: "agent"
---

Use the `automation-tester` skill to bring test coverage to ≥80% for the following target:

**Target**: $input

## Project Context

TypeScript pnpm monorepo:
- `apps/api`: Vitest + `@vitest/coverage-v8`; run with `pnpm --filter @forge/api test:unit -- --coverage`
- `apps/web`: Vitest + `@vitest/coverage-v8`; run with `pnpm --filter @forge/web test:unit -- --coverage`
- Threshold config is in each app's `vitest.config.ts` — thresholds should be set to `80` for lines and branches

## Steps (automation-tester Phase 4.2 → 3 → 4.3)

### Step 1: Generate Coverage Report
Run coverage for the target app and capture the output. Identify:
- Current line coverage %
- Current branch coverage %
- Exact line ranges and branch paths that are uncovered

### Step 2: Classify Uncovered Code
For each uncovered region, determine:
- **Error/edge-case branches** → write negative-path tests
- **Dead code** → confirm with code history; remove if genuinely unused
- **Boilerplate/generated** (DB schema, DTOs) → add to coverage excludes in `vitest.config.ts`

### Step 3: Write Gap-Filling Tests
- Write the minimum tests needed to hit ≥80%
- Focus on branches, not just lines — branch coverage is the harder metric
- Follow existing test patterns (see `src/**/*.test.ts` for style reference)
- Do NOT write meaningless tests just to inflate numbers — each test must assert real behavior

### Step 4: Validate
- Re-run coverage and confirm ≥80% for lines and branches
- Confirm all new tests pass cleanly

### Step 5: Update Coverage Thresholds (if not already set)
If `vitest.config.ts` does not yet enforce thresholds, add:
```ts
coverage: {
  thresholds: {
    lines: 80,
    branches: 80,
    functions: 80,
    statements: 80,
  },
}
```

Report coverage before and after per module.
