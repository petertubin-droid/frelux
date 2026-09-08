# FRELUX System / Website Guide (Private)

Technical guide for the FRELUX platform. Internal use. No credentials or secrets are included; refer to the deployment environment for actual values.
Last reviewed: 2026-09-08. Reflects the implemented production system.

---

## 1. Application

### 1.1 Stack

React + TypeScript SPA built with Vite, Tailwind-based UI, Supabase backend, deployed on Netlify. Tests: Vitest/Jest DOM suite (~5,400 tests) plus Playwright e2e. CI: GitHub Actions with a pre-push fast gate (related tests) and full suite on push.

### 1.2 Routes and Pages

Routing lives in `src/App.tsx`. Key public routes:

- Home `/`, About, Contact, Legal pages (`/privacy-policy`, `/terms`, `/disclaimer`, `/cookie-policy`, `/ai-disclaimer`)
- Calculators: `/paint-calculator`, `/painting-estimator`, `/paint-comparison`, `/screeding-calculator`, `/screeding-cost-estimator`, `/tile-calculator`, `/tile-cost-estimator`, `/pop-ceiling-calculator`, `/pop-ceiling-cost-estimator`, `/finish-estimator`, `/tyrolene-estimator`, `/cost-estimator`, `/foundation-calculator`, `/structural-calculator`, `/build-to-roof-estimator`, `/smart-calculator`, `/construction-sequence`, `/project-timeline`
- AI: `/image-estimator`, `/ai-color-assistant`, `/color-preview`
- Content: `/learn`, `/colors`, `/gallery`, `/marketplace`, `/material-prices`, `/brand-studio`
- User: `/login`, `/onboarding`, `/dashboard`, `/profile`, `/my-projects`, `/project-workspace`, `/properties`, `/clients`, `/messages`, `/templates`, `/my-templates`, `/achievements`, `/rewards`, `/credits`, `/pricing`, `/worker-channels`, `/pro-connect`, `/start-building`
- Admin: `/admin` with sub-pages (see section 6)

81 routes are prerendered at build time; the sitemap is generated per build.

### 1.3 Major Feature Modules

- `src/pages/*` all route pages; `src/components/*` shared UI
- `src/lib/calc.ts` classic authoritative calculators (paint, screeding, cost)
- `src/lib/pop-tile-calc.ts` POP and tile calculators
- `src/lib/finish-calc.ts` Grafitex finish calculator
- `src/lib/estimation/paint-engine.ts` central estimation engine (paint engine bridge in `paint-engine-bridge.ts`, queries in `estimation/queries.ts`)
- `src/lib/ai-foundation/` engine registry (`engines-registry.ts`, `engines-phase2.ts`), orchestrator, types
- `src/lib/plan-vision/` floor-plan extraction, per-room takeoff planning and execution
- `src/lib/project-agent/` project agent tools (quantity takeoff, timeline, project data), certification suite
- `src/lib/market-intelligence/` price resolver, approved prices, providers, crawl logs
- `src/lib/predictive-intelligence/` project snapshot and analysis
- `src/lib/construction-intelligence/` discipline classification for takeoff summaries
- `src/lib/measurement/timeline-engine.ts` project timeline
- `src/lib/ai-image/` AI Image Estimator pipeline
- `src/lib/pdf.ts`, `pdf-export.ts`, `pdf-branding.ts`, `export-utils.ts` PDF and export paths
- `src/lib/crm.ts` estimate history and client records
- `src/lib/local-projects.ts` local (offline) project storage
- Monetization: `ad-config.ts`, `ad-providers.ts`, `adsense-rewarded.ts`, `subscription.ts`, `premium-access.ts`, `ai-credit-gate.ts`, `credits-context.tsx`, `token-purchase.ts`, `paystack.ts`

### 1.4 Responsive and PWA

Mobile-first styling throughout; navigation adapts to a phone menu. The build generates a service worker that precaches the app shell and static assets (about 395 files), enabling offline app loading and stale-while-revalidate updates. Calculation results can be cached locally (`local-projects.ts`, localStorage) so users can work with poor connectivity; anything needing live data (auth, market prices, saves) requires connectivity and reports errors honestly when offline.

## 2. Backend

### 2.1 Supabase

PostgreSQL database with REST and auth. Client access goes through PostgREST with Row Level Security; service-side operations run via Edge Functions.

### 2.2 Important Tables (grouped)

- **Auth/users**: `profiles` and user tables, paid status, credits
- **Calculators/config**: `paint_types`, `paint_colors`, `estimation_calc_rules`, `screeding_system_config`, `pop_materials`, `tile_materials`, `tyrolene_config`, `surface_conditions`, `colour_conditions`, labour settings, timeline templates, engine config
- **Market intelligence**: `mi_approved_prices`, `mi_price_observations`, `mi_providers`, `mi_sources`, `mi_product_aliases`, `mi_crawl_logs`, `mi_anomaly_flags`, `mi_provider_usage`
- **Projects**: `plan_documents`, `plan_extractions`, `project_calculations` (snapshot results), projects, properties, clients
- **Monetization**: subscriptions/paid status, token purchases, rewarded access records, ads config
- **Content**: articles, FAQs, inserts, gallery, templates, SEO settings, branding

213 migrations exist in `supabase/migrations`, applied in sequence. Migrations are idempotent where possible and applied via the migration history process.

### 2.3 Relationships

A user owns projects; a project owns plan documents; a plan document owns extraction versions (JSONB extraction per version); a project stores calculations (`project_calculations`) as immutable snapshots with `result_summary` recorded verbatim at save time. Market intelligence links canonical products to approved prices per market (unique on market + product + package).

### 2.4 RLS and Authorization

Row Level Security isolates per-user data (projects, saves, clients, messages): users read and write their own rows. Admin pages are gated by an admin role; admin tables are protected accordingly. The agent/tools layer is read-scoped to a project owner, and writes (saves) record who created them.

### 2.5 Edge Functions

`supabase/functions/`: `ai-copilot`, `ai-construction-extraction`, `ai-building-estimation`, `ai-color-consult`, `ai-color-preview`, `ai-learn-assistant`, `ai-livechat`, `ai-logo-generation`, `ai-admin-assistant`, `ai-studio`, `paystack-checkout`, `paystack-verify`, and shared helpers. Edge Functions hold provider secrets server-side; the browser never sees provider API keys.

### 2.6 External Integrations

- Google Gemini and OpenAI for AI features (server-side, routed per feature)
- Paystack for payments (checkout and verify via Edge Functions)
- Google AdSense / ad providers for ads and rewarded access
- Netlify hosting; GitHub for source and CI

## 3. Calculation Architecture

### 3.1 Single Source of Truth Rule

Every deterministic calculation lives in exactly one library function. Pages, the engine registry, the plan-vision takeoff and the project agent all call the SAME functions; none reimplements math. The engine registry descriptors in `engines-registry.ts` (build_to_roof, roof_geometry, painting_wall_area, tyrolene_partition_area) and `engines-phase2.ts` (painting_project, tile_estimate, pop_ceiling, screeding_system) wrap the authoritative calculators with "no new math".

### 3.2 Engine Contracts

Each registered engine documents its input contract and validates with `requireFiniteNumbers`; invalid or missing input returns `ok: false` with an honest error and empty quantities. Outputs use `EngineQuantityLine` (label, quantity, unit) and optional `EngineCostSummary` (total, currency, lines, regionalDataAvailable flag). Engines pass inputs through without unit conversion; each engine's own `unit` convention converts internally.

### 3.3 Configuration Sources (authoritative)

- Screeding: `screeding_system_config` (admin managed), read fresh per calculation via `fetchScreedingSystemConfig`
- POP: `pop_materials` via `fetchPopMaterials`
- Tile: user-selected tile size and price (never invented); tile admin materials for defaults
- Paint: `paint_types` (coverage, container sizes), `estimation_calc_rules` (coat count, pack size, rounding, height and opening rules), estimation products/qualities/prices
- Tyrolene: `tyrolene_config` (admin)
- Grafitex: `finish-calc.ts` defaults with `dbToFinishMaterialConfig` DB config
- Market prices: `mi_approved_prices` scoped by `market_code`

Admin changes propagate to every consumer (pages, AI copilot, agent, takeoff) because all fetch configuration fresh at calculation time. This propagation is protected by the certification suite (see section 6.4).

### 3.4 Cost Engines

- Manual cost estimators: `calculateEstimatedTotal` (paint cost page), screeding/tile/POP cost estimator pages
- AI cost path: cost integration consumes material engine outputs with explicit `quantitySource` and price resolution through market intelligence
- The agent records caller-supplied cost data verbatim and never recomputes costs for quotation previews

### 3.5 Quantity Takeoff Flow

Plan document upload → extraction (AI `ai-construction-extraction`) → versioned `plan_extractions` → room verification (confidence levels, user confirms) → takeoff planning (`plan-vision/takeoff.ts`) maps each room/kind to its registered engine (`TAKEOFF_ENGINE_IDS`; no other path) → execution runs the engine with per-kind documented input contracts → results recorded verbatim per item. Missing inputs (tile selection, configuration) block that item honestly with a `missingData` entry.

### 3.6 AI Agent to Engine Flow

The project agent tools (`project-agent/tools.ts`) never calculate. They plan, call registered engines, and return engine output verbatim with engine attribution. The certification suite (`project-agent/certification.test.ts`, 26 tests) certifies agent equals engine equals independent arithmetic, verbatim recorded data, project scoping, honest missing data handling, market scoping and admin change propagation.

## 4. AI

### 4.1 AI Image Estimator

`/image-estimator`: upload a plan image → edge function extraction → rooms, dimensions, openings with confidence → user confirmation flow → calculators/takeoff on confirmed geometry. Unconfirmed low-confidence values are requested, never assumed.

### 4.2 Provider Routing

Gemini and OpenAI are both integrated server-side (Edge Functions). Routing per feature: copilot, color consult/preview, extraction, learn assistant, livechat, logo, studio, admin assistant. Keys are environment secrets on the server; the browser only calls FRELUX edge functions.

### 4.3 Agent and Tool Architecture

The project agent exposes typed tools (quantity takeoff, timeline, project data reads, calculations listing). Tools are deterministic: LLM intent selects tools; results come from certified engines and recorded data. Tool outputs carry provenance and engine attribution.

### 4.4 Learning, Verification and Knowledge Scopes

AI learning modules (learn assistant, admin AI assistant, estimation audit) assist content and configuration work, but nothing enters trusted calculation rules without explicit admin configuration. Knowledge scopes separate verified market data from estimates: market intelligence marks price freshness (fresh, recent, stale, expired) and approved prices are the only trusted price source. The planned "Help FRELUX Learn This Region" submission flow is NOT implemented; regional data acquisition today is admin-driven (crawls, observations, approvals).

### 4.5 Safety Boundaries

- The AI never invents prices, tile data or structural values.
- High-risk domains (structural, foundation, roof) carry engineer-review notices and the `has_engineer_schedule` structural flag; the agent surfaces, but never overrides, engineer sign-off.
- AI input is sanitized; prompt injection surfaces are limited by keeping the LLM out of the calculation path.

## 5. Monetization

- **Plans/subscriptions**: `subscription.ts` defines plans, `PAID_FEATURES` and feature gating (`planHasFeature`, `getFeatureMinPlan`); `premium-access.ts` gates premium surfaces with cache invalidation.
- **Payments**: Paystack checkout and verification Edge Functions; webhook-driven status updates; token purchases (`token-purchase.ts`) for AI usage.
- **Credits**: `ai-credit-gate.ts` and `credits-context.tsx` meter AI usage; rewarded access (`adsense-rewarded.ts`, `AdminRewardedAccess`) lets free users unlock usage by watching ads.
- **Ads**: ad providers and formats configured via admin (AdminAds, ad providers/formats libs); placements are config-driven.
- **Revenue data**: subscription and purchase status tables feed analytics dashboards (AdminAnalytics).

## 6. Admin

57 admin pages under `/admin`. What each important control changes, end to end (Admin → DB → engine → consumers):

| Admin page                                                      | Authoritative table                    | Affects                                                 | Consumers reached                                                                      |
| --------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| AdminScreedingMaterials                                         | `screeding_system_config`              | screeding quantities and costs                          | Screeding Calculator, Screeding Cost Estimator, screeding_system engine, agent takeoff |
| AdminPopMaterials                                               | `pop_materials`                        | POP materials                                           | POP calculators, pop_ceiling engine, agent takeoff                                     |
| AdminTileMaterials                                              | `tile_materials`                       | tile defaults                                           | Tile calculators, tile_estimate engine                                                 |
| AdminEstimationConfig / AdminEngineConfig                       | `estimation_calc_rules`                | coat counts, pack sizes, rounding, height/opening rules | Paint calculators, estimation paint engine, painting_project engine                    |
| AdminEstimationProducts / Materials / Pricing                   | estimation products, qualities, prices | central paint engine pricing                            | Paint Calculator central path                                                          |
| AdminTyroleneConfig                                             | `tyrolene_config`                      | tyrolene materials                                      | Tyrolene estimator                                                                     |
| AdminLabourSettings                                             | labour settings                        | labour cost line items                                  | cost estimators                                                                        |
| AdminEstimationAudit                                            | audit records                          | review of AI/estimation outcomes                        | quality loop                                                                           |
| AdminImageEstimation                                            | image estimation config                | extraction settings                                     | Image Estimator                                                                        |
| AdminAiSettings / AdminAiMonetization                           | AI settings, credit config             | provider routing, credits                               | AI features                                                                            |
| AdminAds / AdminCreditsAds / AdminRewardedAccess / AdminRewards | ad and reward config                   | placements, rewarded unlocks                            | monetization surfaces                                                                  |
| AdminBranding / AdminColors / AdminTypography / AdminTemplates  | branding tables                        | site branding                                           | public pages, PDF branding                                                             |
| AdminSeo / AdminSeoLocation                                     | SEO settings                           | metadata, sitemap                                       | public pages                                                                           |
| AdminUsers / AdminContactMessages / AdminErrors / SystemHealth  | user and ops tables                    | administration                                          | admin only                                                                             |

Governance rule: admin controls change DATA (prices, coverage, materials, rules). Formulas and methodology are code-only and change only through the high-risk process in the Logic and Rules Registry. Admin propagation is regression-tested (certification suite section 11).

## 7. Public API (FRELUX AI API)

- Edge Function `frelix-api` (no verify-JWT; authenticated by FRELUX API keys) serves `/v1`: capabilities, plans, calculators, chat, market, regions, feedback, usage, key management. Deployment and docs: `docs/API.md`, user-facing docs at `/developers`, key admin at `/admin/api-keys`.
- Tables: `frelux_api_keys` (hashed keys, owner + admin RLS), `frelux_api_usage` (per-request metering), `frelux_api_plans`.
- The deterministic engines are bundled to `supabase/functions/frelix-api/_engines.bundle.js` via `npm run build:api-engines` (generated file — never edit; regenerate after touching `src/lib/frelix-api/server-engines.ts` or any engine it imports).
- Gateway enforces status/expiry, rate limits, quotas, capability and region entitlements before any business logic; API feedback enters the Phase 6.5 learning pipeline as USER_PROVIDED CANDIDATE.

## 8. Deployment and Operations

- **Source**: GitHub repository, main branch protected by CI.
- **CI**: GitHub Actions runs typecheck (`tsc --noEmit -p tsconfig.app.json`), the full Vitest suite and build. Local pre-push runs a fast related-tests gate.
- **Hosting**: Netlify auto-deploys main after CI; 81 routes prerendered; service worker generated at build.
- **Environment**: VITE_ variables for public config (10 in `.env.example`); server secrets (AI keys, Paystack, Supabase service role) live in Edge Function environment config, never in the repo.
- **Migrations**: applied via the migration history process (Management API SQL or CLI), idempotent patterns, verified before application.
- **Rollback**: Netlify deploy rollback to a previous deploy; migrations forward-only with documented downgrade notes; git revert for code.
- **Testing**: Vitest unit and component suite (~5,443 tests) including per-calculator, engine, takeoff, agent certification, market intelligence and propagation suites; Playwright e2e (default config excludes live-debug specs; live specs run against deployed site via `playwright-live.config.ts`).
- **Monitoring**: `supabase-monitor.ts`, admin SystemHealth page, error logging (AdminErrors), analytics events (`analytics.ts`, calculator monitor `calculator-monitor.ts`).

## 9. Security

- **Authentication**: Supabase Auth (email, OAuth options as configured).
- **Authorization**: RLS per table; admin role gating on admin routes and tables.
- **API secrets**: server-side only (Edge Functions); the client uses anon key with RLS.
- **Admin protection**: role checks server-side and route guards client-side.
- **AI input protection**: extraction and copilot validate and size-limit inputs; the LLM never writes directly to trusted config.
- **Data isolation**: projects, saves and messages are row-scoped to their owner; agent tools scope reads to the requesting project owner.
- **Abuse prevention**: rate limits on AI credits, ad-based rewarded gating, error monitoring.
