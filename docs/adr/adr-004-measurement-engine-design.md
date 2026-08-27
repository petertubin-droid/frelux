# ADR-004: Measurement & Cost Engine Architecture

**Status:** Accepted  
**Date:** 2026-08-10

## Context

Frelux's core value is construction measurement and cost estimation. Calculations span paint, screeding, roofing, tiling, labour, and material pricing — each with distinct formulas, waste factors, and regional pricing. The engine needed to be unit-agnostic (metric/imperial), configurable without code changes, and testable in isolation.

## Decision

Build a **layered calculation engine** with clear separation:

1. **Measurement layer** (`src/lib/measurement/`) — surface area, volume, and quantity calculations. Pure functions, no I/O.
2. **Material layer** (`src/lib/materials/`) — material specs (coverage, waste, packaging) stored as data, not hardcoded.
3. **Pricing layer** (`src/lib/pricing/`) — regional material prices sourced from Supabase, with fallback defaults.
4. **Labour layer** (`src/lib/labour.ts`) — labour cost estimation with configurable rates and pricing methods.
5. **Roof layer** (`src/lib/roof/`) — roof geometry and material engine, separated due to complexity.
6. **Space engine** (`src/lib/measurement/space-engine.ts`) — project → section → space hierarchy for multi-room estimation.

All layers are pure TypeScript modules with no React dependencies. This enables 2,897 unit tests that run without a DOM.

## Consequences

- **Positive:** Every calculation is independently testable. Material specs and pricing are data-driven (Supabase tables), so new materials or price changes don't require deploys. The unit system is configurable at the project level.
- **Negative:** The layered approach means tracing a full estimation requires reading through 4-5 modules. The space engine's project hierarchy adds complexity for simple single-room calculations.
- **Test strategy:** Pure functions → exhaustive unit tests. React hooks → manual/integration testing (low ROI for automated tests).

## Alternatives Considered

- **Monolithic calculator:** One function per calculation type. Simpler to trace but impossible to test in isolation and prone to duplication.
- **Rule engine (JSON config):** Declarative formulas in config. More flexible but harder to debug and type-check. TypeScript functions give us compile-time safety.
- **Server-side calculations (edge functions):** Centralized logic but adds latency and limits offline PWA usage. Client-side is better for interactive estimation.
