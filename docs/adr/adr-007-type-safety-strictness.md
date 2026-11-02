# ADR-007: Strict TypeScript & Zero `any` Policy

**Status:** Accepted  
**Date:** 2026-08-27

## Context

The Frelux codebase grew rapidly through 40+ migration phases. Early test files used `as any` casts and file-level `eslint-disable @typescript-eslint/no-explicit-any` comments to accelerate development. As the codebase approached commercial release, these shortcuts became a maintenance liability — type safety holes that could mask runtime errors in production.

## Decision

Enforce a **zero `any` policy** across all source and test files:

- No `as any` casts — use proper type assertions (`Pick<T, ...>`, `Record<string, unknown>`, typed mock interfaces)
- No `: any` annotations — use `unknown` with type narrowing or specific interfaces
- No file-level `eslint-disable @typescript-eslint/no-explicit-any` comments
- TypeScript `strict: true` in `tsconfig.json` (already enabled)
- Pre-commit hooks run type checking and linting on all changes

## Consequences

- **Positive:** Compile-time catches bugs that would otherwise surface at runtime. Test mocks are typed, so refactoring a function signature immediately breaks tests that use the old shape. IDE autocomplete and go-to-definition work reliably.
- **Negative:** Writing typed mocks is more verbose than `as any`. Some edge cases require `Record<string, unknown>` with manual narrowing, which is less ergonomic.
- **Enforcement:** 2,897 unit tests pass with zero `as any` casts and zero eslint-disable comments. The pre-commit hook rejects any new violations.

## Alternatives Considered

- **Pragmatic `any` (allow in tests only):** Faster to write but creates a two-tier codebase where test types don't reflect production types. Refactoring becomes risky.
- **Gradual migration:** Allows `any` in legacy files while new files are strict. Rejected because the codebase is pre-commercial — the cost of a clean sweep is lower now than post-launch.
- **Full strict mode + `noImplicitAny`**: Already enabled. This ADR extends the policy to test files and removes all escape hatches.
