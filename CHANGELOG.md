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

## 2026-09-09 — ARCHIE PWA: Admin Continuity, Full Test Coverage & Premium Display

### Added

- ARCHIE PWA admin continuity: five new owner sections (Migration, Training, Evolution, Terminology/TerminoBook, Voice) plus an Evolution settings editor with language registry
- Test coverage for all 13 previously untested ARCHIE pages (36 new tests) — every ARCHIE page now has a hermetic test file (6,081 tests total)
- Premium display for the ARCHIE PWA: shared design layer `src/styles/archie-premium.css` (deep-space aurora backdrop, glassmorphic panels, gradient amber→gold headlines, glow inputs/buttons, reduced-motion safe) and kit `src/components/archie/premium.tsx` (ArchiePage/ArchiePanel/ArchieStat/ArchieButton/ArchieBadge), applied across all 15 pages and the shell; Chat gains amber-glow owner bubbles and frosted ARCHIE bubbles

### Fixed

- ArchiePeople page migrated off the light-theme tokens onto the dark ARCHIE language and given the standard page shell padding it was missing
- Anon table-privilege cleanup with per-table verification; missing `region` column added to `frelux_learning_records`; all 21 ESLint errors resolved; CI type-check failures in the migration system fixed

## 2026-08-27 — Production Hardening Sprint

### Added

- AdSense compliance pass: ad labels, visual separation, removal from low-content pages, `app-ads.txt`
- Learn content: articles across DIY tutorials, FAQs, case studies, color psychology, industry news and buying guides

### Changed

- Build toolchain upgraded Vite 5 → Vite 8 (Rolldown + Oxc)

### Fixed

- Comprehensive dark-mode safety net (global overrides for hardcoded neutral/gray utilities, sticky-header/overlay opacity variants)
- Paint engine pricing bug (price multiplied by bucket count instead of litres); rewards redemption now actually grants benefits; nav dropdown hover/click conflict with keyboard support; AdBlockNotice overlap with mobile nav

## 2026-08-18 — Contractor Experience (Phase 5)

### Added

- Contractor project management: 11 new database tables, contractor library with waste-factor intelligence and quotation generation
- Professional PDF generation for branded quotations (jspdf, qrcode, date-fns)
- Smart Project Wizard, Project Dashboard (7 tabs), Room Builder, Contractor Projects List
- Admin pages: Material Catalog, Timeline Templates, Quotation Settings (17 files, ~9,100 insertions; zero TS/ESLint/build errors, 183-test suite green at the time)

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
