# Changelog

All notable changes to FRELUX are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project does not yet follow strict semantic version tags (see `package.json`); entries are grouped by date instead until versioned releases begin.

## [Unreleased]

### Added

- CI/CD: Codecov coverage reporting on every CI run
- CI/CD: staging deploy pipeline (Netlify, gated on `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` secrets)
- Husky pre-push hook (typecheck + full test suite) alongside the existing pre-commit lint-staged hook
- `SECURITY.md` — vulnerability reporting process and accepted-risk notes
- `CHANGELOG.md` (this file)
- Edge Functions reference section in `docs/API.md`

## 2026-08-26 — Test Coverage Expansion & Rate Limiting

### Added

- Rate limiting on all AI and credit-spending Edge Functions
- Health check endpoint (`supabase/functions/health`), Docker deployment support
- Large-scale test coverage expansion across roof engine, measurement, market intelligence, credits, marketplace, CRM, and international modules (2,300+ tests added across dozens of suites)

### Fixed

- Eliminated all remaining ESLint warnings and unused imports

## 2026-08-25 — Roof Engine, Docs & CI Foundations

### Added

- Roof estimation engine, built additively feature-by-feature:
  - Roof View provider interface + `RoofViewPanel`
  - Editable SVG-based roof tracing (multi-section, polygon area calculation)
  - Roof Facet/Section model (area, pitch, material per section)
  - Per-section pitch input with pitch-adjusted surface area pipeline
  - Pitch-adjusted roof area pipeline (plan area → sloped area → cutouts → waste → order quantity)
  - Roof edge classification (ridge/hip/valley/eave/rake/parapet) with user correction and linear quantities
  - Roof cutouts/penetrations management (skylights, courtyards, equipment, openings)
  - Plan scanner (PDF/PNG/JPG/WEBP import) and scale calibration
  - Roof review screen with readiness scoring and issue tracking
  - Source tracking, audit trail, and rule versioning for full estimate traceability
- `LICENSE` (proprietary), `CONTRIBUTING.md`, initial `docs/API.md`
- GitHub Actions CI workflow (typecheck, unit tests, build, E2E smoke tests, Lighthouse audit)
- Husky pre-commit hook with `lint-staged`
- `.env.staging.example` for staging environment configuration

### Fixed

- Resolved all TypeScript compilation errors across the codebase
- Removed explicit `any` casts from production code; replaced TODOs with real integrations
- Resolved all ESLint errors

### Changed

- Premium calculator UI upgrades (calc-card, btn-glow, select-card, input-field) across all calculators
- Tiered AI credit pricing; AI credits surfaced in profile and hamburger menu
- Premium profile dropdown redesign; fixed hero flash on reload
- Premium legal pages; AdSense readiness upgrades

## Earlier

Prior history predates this changelog. See `git log` for the full commit history, including the initial build of the paint/tile/screeding/POP-ceiling calculators, marketplace, Pro Connect, AI Studio, market intelligence crawlers, and the credits/rewards system.
