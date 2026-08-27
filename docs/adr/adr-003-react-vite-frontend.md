# ADR-003: React + Vite Frontend Stack

**Status:** Accepted  
**Date:** 2026-08-01

## Context

Frelux is a measurement-heavy web application with interactive calculators, real-time cost estimation, 3D-ish visualizations, and PWA support. The team needed a fast dev server, excellent TypeScript support, and a mature component ecosystem.

## Decision

Use **React 18 + Vite** as the frontend build tool, with:

- Tailwind CSS for styling (utility-first, no CSS-in-JS runtime overhead)
- shadcn/ui component patterns (owned, customizable components)
- Vitest + Testing Library for unit/integration tests
- PWA via vite-plugin-pwa for offline support

## Consequences

- **Positive:** Sub-second HMR during development. Tree-shaking keeps the gzipped entry chunk at ~102 KB. Vitest shares Vite's config, so test setup mirrors production transforms. PWA enables offline calculator usage.
- **Negative:** Vite's esbuild dependency has dev-only vulnerabilities that don't affect production bundles. Upgrading to Vite 8.x has breaking changes — deferred until ecosystem stabilizes.
- **Build output:** Netlify deployment via `netlify.toml` with separate staging and production contexts.

## Alternatives Considered

- **Next.js:** SSR would add complexity for an app that's primarily client-side calculations. PWA support is less straightforward.
- **SvelteKit:** Smaller bundle sizes but smaller ecosystem and fewer component libraries. Team familiarity favored React.
- **Angular:** Heavier framework overhead for what is largely a calculator SPA. Steeper learning curve for contributors.
