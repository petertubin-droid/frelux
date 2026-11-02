# Changelog

All notable changes to FRELUX are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project does not yet follow strict semantic version tags (see `package.json`); entries are grouped by date instead until versioned releases begin.

## [Unreleased]

### Performance & Capability — ARCHIE Native Engine (2026-09-11 optimization pass)

- **Memory-retrieval hot path 3.7× faster:** `FactStore.rank` now scores through a fused cosine (per-query idf memo, zero per-candidate weight-map allocations), generation-cached document norms (recomputed lazily per doc only after corpus mutations), and streaming top-k selection (provably identical output to collect+stable-sort+slice). Measured `store-rank@10k` p50 **15.32 → 3.79 ms (−75%)**; scoring arithmetic is bit-for-bit identical to the original — equivalence pinned by the new `knowledge-index.test.ts` (140-query legacy equivalence across corpus build + write churn, k-cap, empty-store/empty-query, determinism). Recorded as Entry 7 in `docs/archie-performance-ledger.md`.
- **Negated memory directives correctly classified (lu-3 fixed):** "do not remember the gate code" is no longer misclassified as teaching by the public NLU layer — new `memory_exclusion` intent (deterministic rule ahead of the teaching pattern, corpus agreement, engine defense-in-depth refusal-to-store handler, cognitive-orchestrator case). Benchmark overall **0.962 → 0.981**, language-understanding **0.75 → 1.0**. Entry 8 in the performance ledger.
- Baseline/post benchmark JSON records added under `benchmarks/` for the evidence trail.
- Known-by-design miss kept honest (audit G-1): bare `ContextMemory.retrieve()` does not mint turn text into `salientFacts` — facts enter the store only through the validated teaching/research/inference gates; reported as an architectural integrity constraint, not patched for score.

### Security (audit 2026-09-10 remediation)

- **H1 — Paystack subscription payment bypass closed:** subscription checkout is now priced server-side from a new `subscription_plan_prices` table (migration `20260911090000`, RLS on, service-role only); the client-supplied amount is advisory only and `paystack-verify` / `paystack-webhook` activate a subscription ONLY when the caller identity matches `metadata.user_id` and the paid amount exactly equals the canonical price (kobo-precise). Constant-time webhook signature comparison (L7). Shared guard module `supabase/functions/_shared/subscription-pricing.ts` with 14 unit tests (including the ₦1 tamper attack). Verified against the live endpoint: tamper attempts now return `Unauthorized`.
- **M1 — legacy wide-open `public_read_ai_learn_chat` policy dropped** from the live database (migration `20260911091000`); only the session-scoped read policy remains.
- **M2 — analytics injection hardening:** GA measurement IDs and Meta Pixel IDs from site settings are strictly format-validated before interpolation into inline scripts; a compromised settings row can no longer smuggle script content through the ID fields.

### Fixed

- **M5:** ARCHIE `RequireOwner` redirected unauthenticated family members to nonexistent `/signin` — now `/login`.
- **L6:** broken `/auth` CTAs in Gallery and Marketplace ListingDetail — now `/login`.

### Removed

- **L8 (reverted same day):** the `sitemap` edge function was retired as a duplicate, then restored — it is NOT a duplicate. It generates a dynamic sitemap with live DB content (paint colors, palettes, articles, pro profiles, marketplace listings) and is a registered ARCHIE execution-engine production action (`sitemap-regenerate`) plus the `sleep` subsystem's anatomy binding. The build-time `public/sitemap.xml` remains the canonical static sitemap; the edge function remains the on-demand dynamic regenerator. Both live.

### Changed

- **OpenAI Separation Rule (owner-directed):** ARCHIE is a fully independent intelligence system — OpenAI has been removed from ARCHIE's voice pipeline entirely and the rule is now encoded as a permanent ARCHIE core principle (`openai_separation`, seed migration, integrity-checked and statically enforced by tests). Speech understanding runs on NATIVE on-device recognition (browser/OS engine — no cloud provider, no API key); `archie-ears` is now an owner-gated, rate-limited, audited intake for native transcripts (no transcription, no provider key); replies are spoken through the owner's voice bank (`frelux_archie_voice_samples`, deterministic pitch/pace math) and every utterance gets an honest voice-print check against the bank profile. OpenAI remains ONLY in the FRELUX application layer as an explicitly-authorized fallback (same boundary as Gemini). Anatomy ears purpose/bindings updated to the native description (migration `20260913120000`); 28 Ears engine tests + provider-independence OpenAI enforcement lock the zero-wiring invariants.

### Added

- **Connected Device, Household & Account Intelligence (owner directive, "connective-tissue" subsystem #23):** ARCHIE now connects real external hardware and accounts through explicit, authorized pairing only — real Web Bluetooth / WebUSB / network transports in the PWA (the browser's own permission prompt is the pairing requirement), a deterministic pairing state machine (DISCOVERED → PAIRING → PAIRED ⇄ CONNECTED, SUSPENDED/REVOKED; REVOKED is terminal), permission-scoped control over the canonical 8 capabilities (power, media, volume, settings, routines, automation, monitoring, maintenance), explicit access scopes with time windows, an honest maintenance gate (never installs unverified/incompatible/malicious/unauthorized updates; rollback permitted under a maintenance grant) and a full audit trail (success, failure AND denial) per connection. Identity chain is explicit: IDENTITY → DEVICE → ACCOUNT → PERMISSIONS → ACCESS SCOPE → AUDIT HISTORY; family members never inherit Owner privileges (RLS-enforced read-only visibility through the person link). Three permanent principles seeded into ARCHIE's core principles: `connected_device_authority` (connectivity is never authorization; no fake integrations), `learning_authority` (broad learning rights, never production-modification rights) and `code_production_authority` (ANALYZE → PROPOSE → OWNER APPROVAL → STAGE → TEST → VERIFY → OWNER APPROVAL → PRODUCTION). Migration `20260913130000` (4 new tables + anatomy registration); core engine `native-engine/connections.ts`; client runtime `src/lib/archie/connections.ts`; Devices PWA page gains the "Connected hardware & accounts" section with honest capability reporting. 38 engine tests + 5 anatomy/registry tests + 4 new Devices-page tests lock the invariants (anatomy now 23 subsystems); full regression 6,578/6,578 green.
- CI/CD: Codecov coverage reporting on every CI run
- CI/CD: staging deploy pipeline (Netlify, gated on `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` secrets)
- Husky pre-push hook (typecheck + full test suite) alongside the existing pre-commit lint-staged hook
- `SECURITY.md` — vulnerability reporting process and accepted-risk notes
- `CHANGELOG.md` (this file)
- Edge Functions reference section in `docs/API.md`

## 2026-09-10 — ARCHIE Ears: Audio Intelligence

### Added

- ARCHIE Ears / Audio Intelligence subsystem — real speech perception wired into the cognitive pipeline: `archie-ears` owner-only edge function (OpenAI Whisper STT, language detection, conversation-context biasing, rate-limited, fully audited) and the client Ears engine `src/lib/archie/ears.ts` (explicit owner-initiated mic capture, format negotiation, 30s cap, typed honest failures)
- Chat voice notes are now transcribed: the transcript lands in the draft so spoken commands flow through the normal cognitive pipeline (owner reviews before sending; the audio stays attached)
- Voice page "Talk to ARCHIE": hands-free voice interaction — speech → real transcription → archie-core pipeline (session history preserved) → reply spoken with the owner's voice-bank profile
- Status Center reports an honest Ears tile (OPERATIONAL only when the provider is configured AND a real transcription has succeeded); 14 new Ears engine tests + 2 Voice page tests lock in the never-fabricate invariants (6,097 total)

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
