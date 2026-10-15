# FRELUX — Global Expansion & Platform Architecture Handoff

Last updated: October 15, 2026

> **2026-10-15 completion note (mark-done, history preserved):**
> - **Section 2.C (Structural Methodology & Regional Engineering Presets - DONE):**
>   Eurocode 2 / BS 8110, ACI 318, and IS 456 regional concrete grade standards & presets
>   wired into calculator UI (`StructuralCalculator.tsx`) with transparent formula disclosure.
>   4 AI Foundation adapters (`structural_calculator`, `foundation_calculator`, `sequence_planner`,
>   `timeline_estimator`) registered with strict `marketCode` enforcement (zero silent fallback).
>   265/265 engineering/adapter tests green. (Commit `c73dc5a0`).
> - **Section 2.D (UI/UX Implementation Checklist - DONE & PRUNED):**
>   - *Harmonize Dark Mode*: All hardcoded color utilities replaced with semantic CSS variables
>     across calculator surfaces; static colors preserved strictly in intentional print canvases.
>   - *Reorganize Navigation*: 5 structured pillars (`/tools/`, `/prices/`, `/projects/`, `/network/`,
>     `/learn/`) implemented with backwards-compatible redirects in `src/App.tsx`. 40/40 tests green
>     in `src/lib/navigation-pillars.test.ts`.
> - **Global Operations Engine #7 gap audit:** push notifications, cross-role handoffs, file
>   attachments, exports and offline-conflict handling are all DONE and verified live.
> Authoritative repository: `petertubin-droid/frelux` (branch: `main`)
> Active Supabase Project Ref: `nfgaaohweygwydoelxnf`

---

## 0. STANDING INSTRUCTIONS & NON-NEGOTIABLE CONSTRAINTS

Every agent, developer, and automated pipeline working on FRELUX must strictly obey these hard rules:

1. **Strict Verification & Zero Fabrication**:
   - Never commit or seed prices, material packaging sizes, or construction standards derived from speculation, AI memory, or synthetic data.
   - Every price row must be backed by a named supplier/distributor, physical store survey, official catalog, or government gazette with verifiable date, URL, or physical market location.
   - When real-world market data is not yet verified for a specific country or category, **keep it visibly unpriced and explicitly unverified**. Do not mark a market or category "supported" simply because a placeholder database row exists.
2. **No Silent Nigerian Fallback**:
   - Never silently substitute Nigerian Naira (NGN), Nigerian block dimensions (9-inch hollow sandcrete), or Nigerian voltage/conduit standards when another market (e.g., US, UK, Germany, Kenya, India) is selected.
   - Missing data must trigger clear UI disclosure: _"Price data for this item is not yet verified in [Country]. Please enter your local supplier rate."_
3. **Database Execution & State Integrity**:
   - Supabase project reference is `nfgaaohweygwydoelxnf`.
   - Never commit service keys or secret bearer tokens into the repository.
   - Database writes are executed via Supabase Management API:
     `POST /v1/projects/nfgaaohweygwydoelxnf/database/query`
   - Migrations committed to `supabase/migrations/` are **UNVERIFIED until executed against the live database** and confirmed via follow-up `SELECT` queries.
4. **CI & Supabase Preview Guardrails (The 4 Checks per Commit)**:
   - A commit shows a red X if ANY check fails, not just the CI workflow. There are **FOUR checks per commit**:
     1. `Type Check & Test` (GitHub Actions)
     2. `E2E Smoke Tests` (GitHub Actions)
     3. `Lighthouse Audit` (GitHub Actions)
     4. `Supabase Preview` (Supabase GitHub App)
   - Supabase Preview replays migrations on a persistent preview branch DB and applies only migrations NEW to the branch. Editing an already-applied migration in place has NO effect there. Always fix with a NEW migration that sorts chronologically where needed.
   - Every migration must be valid against a clean replay: no references to missing tables or columns, no duplicate version prefixes, and idempotent guards (`IF NOT EXISTS`).
   - Every commit must pass local verification before pushing:
     `npx tsc --noEmit -p tsconfig.json`
     `npx vitest run src/lib/estimation/__tests__`
     `npm run build`
   - Never push unverified code hoping CI will pass. "CI will catch it" is strictly prohibited.
5. **Concurrent-Editing Precautions**:
   - Always `git fetch origin main` and rebase on `origin/main` before editing.
   - Do not overwrite or revert handoff documentation wholesale.

---

## 1. COMPREHENSIVE UI/UX AUDIT & RECOMMENDED FIXES

### A. Executive Summary & Audit Scope

FRELUX is a comprehensive construction intelligence platform featuring 44 specialized estimation engines, project management workspaces, market intelligence scrapers, contractor directories, and AI tools.
While the calculation core is mathematically robust and feature-rich, the platform's user experience currently suffers from severe interface collisions on mobile devices, fragmented navigation across 222 unorganized routes, accessibility gaps, and legacy regional biases that hinder its credibility as an international enterprise platform.

This audit details every identified usability defect, layout collision, information architecture problem, and localization issue, followed by concrete technical fixes and an enterprise-grade reorganization blueprint adhering to international standards (ISO 3166, ISO 4217, ISO 639, WCAG 2.1 AA).

---

### B. Information Architecture & Navigation Restructuring

#### 1. Flat Namespace Bloat (222 Unorganized Routes)

- **Current Problem**:
  `src/App.tsx` contains 222 declared routes. 44 separate calculation engines and 75 internal admin tools are mounted directly onto the root URL (e.g. `/paint-calculator`, `/doors-windows`, `/electrical`, `/plumbing`, `/foundation`, `/boq-generator`, `/carbon-footprint`, `/heat-comfort`, `/circular-reuse`).
  Users have no intuitive mental model of the platform, search engines struggle with topical authority, and breadcrumbs are fragmented.
- **International Architecture Standard (5 Core Pillars)**:
  Reorganize the public platform into 5 structured pillars with logical URL hierarchies while maintaining root redirects for backwards compatibility:

```
├── 1. TOOLS & ESTIMATORS (/tools/)
│   ├── /tools/finishes/
│   │   ├── paint (/tools/finishes/paint)
│   │   ├── tiles (/tools/finishes/tiles)
│   │   ├── screeding (/tools/finishes/screeding)
│   │   ├── ceiling-pop (/tools/finishes/pop)
│   │   ├── flooring (/tools/finishes/flooring)
│   │   └── waterproofing (/tools/finishes/waterproofing)
│   ├── /tools/structure/
│   │   ├── build-to-roof (/tools/structure/build-to-roof)
│   │   ├── concrete (/tools/structure/concrete)
│   │   ├── foundation (/tools/structure/foundation)
│   │   └── rebar (/tools/structure/rebar)
│   ├── /tools/services/
│   │   ├── electrical (/tools/services/electrical)
│   │   ├── plumbing (/tools/services/plumbing)
│   │   ├── solar-pv (/tools/services/solar)
│   │   └── hvac-comfort (/tools/services/comfort)
│   ├── /tools/components/
│   │   └── doors-windows (/tools/components/doors-windows)
│   ├── /tools/project/
│   │   ├── boq-generator (/tools/project/boq)
│   │   ├── labour-rates (/tools/project/labour)
│   │   ├── margin-calculator (/tools/project/margin)
│   │   ├── timeline (/tools/project/timeline)
│   │   └── cash-flow (/tools/project/cash-flow)
│   └── /tools/ai/
│       ├── photo-estimator (/tools/ai/photo-estimator)
│       ├── color-assistant (/tools/ai/color-assistant)
│       └── defect-diagnosis (/tools/ai/defects)
│
├── 2. PRICES & MARKET INTELLIGENCE (/prices/)
│   ├── /prices (Live material price books by country)
│   ├── /prices/trends (Price movement & historical inflation)
│   └── /prices/regional-indices (City & regional cost indices)
│
├── 3. PROJECT WORKSPACE (/projects/)
│   ├── /projects (Unified dashboard: saved estimates & contractor jobs)
│   ├── /projects/:id (Detailed calculation editor & BOQ manager)
│   └── /projects/templates (Standardized project templates)
│
├── 4. NETWORK & COMMERCE (/network/)
│   ├── /network/pros (Pro Connect directory of verified artisans)
│   └── /network/marketplace (Building materials marketplace)
│
└── 5. KNOWLEDGE & ENTERPRISE (/learn/)
    ├── /learn (Construction guides & building code references)
    ├── /learn/glossary (International construction dictionary)
    ├── /developers (API documentation & SDK keys)
    └── /about /contact /legal (Corporate & compliance)
```

#### 2. Consolidation of Duplicate Tool Interfaces

- **Current Issue**: Multiple competing pages exist for the exact same trade:
  - `/foundation-calculator` vs `/foundation`
  - `/paint-calculator` vs `/painting-estimator` vs `/paint-comparison`
  - `/screeding-calculator` vs `/screeding-cost-estimator`
  - `/tile-calculator` vs `/tile-cost-estimator`
- **Recommended Fix**:
  Unify each trade into a single flagship hub (e.g. `FoundationHub`, `TileHub`, `PaintHub`) featuring two toggleable modes:
  - Mode A: **Quick Quantity Estimator** (for DIYers and homeowners: enter dimensions, get material counts).
  - Mode B: **Contractor BOQ & Cost Analysis** (for builders: add waste factors, labor rates, delivery, margins, and download branded PDF quotes).

#### 3. Unification of Project Workspaces

- **Current Issue**:
  Users currently face two disjointed project destinations: `/my-projects` (local & cloud saved estimates) and `/contractor` / `/project-workspace` (contractor site manager).
- **Recommended Fix**:
  Unify under `/projects` with clear tabbed views:
  - Tab 1: **Saved Estimates & Quotes** (All saved calculator outputs, exportable to PDF/CSV).
  - Tab 2: **Active Job Sites** (Contractor project management, milestones, labor logs, client portal).

---

### C. Internationalization (i18n), Localization (l10n) & Standards

#### 1. (RESOLVED & PRUNED) The Google-Translate-dependency defect was fixed

by the native client-side `src/lib/translate/page-translator.ts` layer (the
Google widget was discontinued 2026-10-01). Measurement-unit defaults are
market-aware via the market/unit context and `UnitToggle`, and currency
display is centralized in `src/lib/international/currency-format.ts`
(`formatByCode`, ISO 4217 decimal digits incl. integer JPY/KRW) — verified
in the repo on 2026-10-14 and pruned.

#### 2. International Contact & Regional Identity

- **Current Issue**:
  A single Nigerian WhatsApp number (`+234 906 361 2439`) is displayed in the footer and help components regardless of which market is selected. International visitors from the US, UK, Germany, or Japan find this jarring and suspect the platform is not intended for their region.
- **Recommended Fix**:
  - Dynamic contact routing in `src/config/site.ts`:
    - Default international contact: Dedicated email ticketing system (`support@frelux.com`) with a 1-business-day response SLA.
    - Regional contacts: Display market-specific contact options, verified local partner links, or regional business hours based on the user's active `marketCode`.

---

### D. Form Design, Inputs & Estimation Ergonomics

#### 1. Input Accessibility (460+ Unlabelled Inputs)

- **Current Issue**:
  Over 460 `<input>` elements throughout calculator forms lack associated `<label htmlFor="...">` tags or `aria-label` attributes, relying on transient placeholders.
- **Recommended Fix**:
  - Standardize all calculator inputs using shadcn `<FormItem>`, `<FormLabel>`, and `<FormControl>` components.
  - Always append the active measurement unit directly into the input container as an inline badge (e.g. `[ m² ]` or `[ sq ft ]`).

#### 2. Cognitive Overload in Multi-Step Calculators (Build-to-Roof 11 Steps)

- **Current Issue**:
  `BuildToRoofEstimator.tsx` forces users through 11 sequential linear steps. If a builder only needs a roof estimate, they must step through dimensions, openings, foundation, blocks, mix, etc.
- **Recommended Fix**:
  - Re-architect into a 4-phase accordion or modular wizard:
    - Phase 1: **Building Footprint & Envelope**
    - Phase 2: **Assemblies** (Modular toggles: Foundation, Walls, Roof — configure only what you need)
    - Phase 3: **Material & Labor Rates** (Pre-filled from country market books)
    - Phase 4: **Summary BOQ & Export**
  - Enable instant direct jump to any section without locking subsequent steps.

#### 3. Form Persistence & Draft Recovery

- **Current Issue**:
  Accidentally clicking an external link, switching tabs, or reloading the browser resets inputs on several calculators, causing loss of user calculations.
- **Recommended Fix**:
  - Introduce an automatic draft saving hook `useEstimatorDraft(formKey, state)` storing active form state into `localStorage`. Show a gentle toast upon return: _"We restored your previous calculation. [Start fresh]"_.

---

### E. Dark Mode, Accessibility (WCAG 2.1 AA) & Performance

#### 1. Dark Mode Contrast Inconsistencies

- **Current Issue**:
  58 detected instances of hardcoded color classes (e.g. `text-black`, `bg-white`, `text-gray-900`) without dark mode counterparts (`dark:text-white`, `dark:bg-card`), causing unreadable low-contrast text on dark backgrounds in `BuildToRoofEstimator`, `CompareColors`, `Rewards`, and `ProductDetail`.
- **Recommended Fix**:
  - Replace all static color utilities with semantic CSS variable tokens: `text-foreground`, `bg-card`, `bg-background`, `border-border`.

#### 2. Branded Vector Export Quality

- **Current Issue**:
  Certain calculator pages use native `window.print()` which cuts off tables, produces broken page breaks, and strips logos.
- **Recommended Fix**:
  - Route all print/export actions through the unified `BrandedPrintView` component with dedicated `@media print` stylesheets that hide navigation bars, inject official letterhead, format tables cleanly, and include verification metadata.

---

## 1A. GLOBAL OPERATIONS ENGINES — VERIFIED GAP AUDIT (2026-10-14)

**Audit basis:** source review at `1e9ee0b3b374941cd46006a8be4f60cb887b5aef` (`main`), especially `docs/ARCHITECTURE.md`, `docs/INTERNATIONAL_20_MARKET_AUDIT.md`, the engine pages/modules named below, and relevant Supabase functions/migrations. This is a repository capability audit, not a live deployment, integration credential, regulatory, or security certification. A route, engine registry row, schema, TODO, or AI claim is not proof of an operational capability. **Status 2026-10-15: 1 of the 12 end-to-end global engines (Workflow & automation) is now COMPLETE and live-verified; the other 11 remain as audited.** Preserve useful partial implementations; do not relabel them as complete without the release gate.

### Evidence-based status by requested engine

| Business function / engine                                 | Status in FRELUX                                                        | Evidence and remaining gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BIM & CAD rendering (3D/4D/5D, clash detection)**        | **PARTIAL: IFC takeoff only**                                           | `src/pages/BimIfcImport.tsx` and `src/lib/estimation/ifc-parser.ts` parse a constrained subset of plain-text IFC/STEP in-browser and report elements and quantities declared by the file. This is not a 3D model viewer, CAD renderer, 4D schedule or 5D cost model, model federation, or clash-detection system. `.ifczip` is not supported. Build a standards-tested IFC import/validation pipeline and interactive model viewer first; add versioned model federation, georeferencing, schedule/cost linking, measurable clash rules, and auditable issue workflows. Never claim model compliance from a takeoff.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Geospatial / GIS**                                       | **NOT FOUND as a GIS engine**                                           | Repository search found browser geolocation/weather-location support, but no operational GIS stack for geospatial project layers, satellite/drone imagery, ArcGIS data, coordinate reference systems, or infrastructure progress mapping. Build project/site maps with explicit coordinate systems and licensed/provider-backed imagery/data connectors; add source/date/coverage and unavailable-data disclosure. Do not infer GIS support from geolocation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Predictive analytics & AI (delay, cost, safety)**        | **PARTIAL: deterministic project signals**                              | `src/lib/predictive-intelligence/` has evidence-backed cost, schedule, market-trend, and procurement analyses/risk register. `price-forecast-engine.ts` fits a least-squares trend to recorded material-price history. These are not a validated historical project-outcome model or safety-risk system; no live wearables/site-camera feed was found. Define outcome labels, assess representative regional data quality/bias, back-test and calibrate forecasts, provide uncertainty and evidence, and keep safety outputs decision-support only until independently validated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Tax & currency conversion**                              | **PARTIAL: display FX and formats, not global tax/settlement**          | `currency-context.tsx` fetches keyless FX rates (12-hour cache) for display, allows admin overrides, and falls back to configured rates / NGN presentation when unavailable; formatting helpers exist. The architecture documents a Stripe path that is unavailable until configured. No end-to-end region-specific VAT/GST/sales-tax determination, tax invoice treatment, real-time settlement conversion, fee handling, or legally validated tax engine was demonstrated. Build separate dated tax-jurisdiction rules and transaction/settlement conversion with provider reconciliation; show rate source/time, fees, rounding, and failure behavior. Never imply display conversion is a payable amount.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Regulatory compliance & standards**                      | **PARTIAL: sourced evidence registry — 15-market coverage LIVE** | UPDATE 2026-10-15: the registry (`construction_standards`) now holds **61 web-verified rows across all 15 owner-mandated markets** (authority, evidence_type, coverage, notes, confidence, verified_date; per-market guard tests in `src/lib/international/__tests__/`; see the 1B rollout summary). The pre-audit evidence — 16 verified entries across 10 markets — was superseded; its description follows: `docs/INTERNATIONAL_20_MARKET_AUDIT.md` documents a construction-standards evidence registry with 16 verified entries across 10 markets, and the repository has localized construction profiles. This is not comprehensive jurisdiction coverage or automated blueprint/model checking for OSHA, Eurocodes, ISO, environmental or local building rules. Build a versioned, jurisdiction-and-project-type scoped rules/evidence catalog with primary-authority source, effective dates, applicability, amendments and expert review; only then add deterministic checks that cite exact provisions and report unknowns. No AI-only compliance certification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Multi-language technical translation**                   | **PARTIAL: translated UI chrome**                                       | `src/lib/i18n.tsx` supports 11 locale routes and translated chrome, with English fallback; its own comments state route content is not fully translated and Google Translate remains a convenience for whole-page translation. No reliable technical-document, blueprint annotation, safety-manual or field-log translation workflow with terminology review/versioning was found. Build terminology-managed, human-reviewable document translation, preserve source and units, handle RTL, and clearly distinguish machine translation from approved safety instructions. Offline operation and protected-data handling need explicit tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Workflow & automation (RFI, submittals, change orders)** | **COMPLETE & LIVE-VERIFIED (2026-10-15); 1 of 12 closed** | Engine #7 gap audit CLOSED. Deterministic state machine (`src/lib/workflow/workflow-engine.ts`; per-type transition tables, invalid transitions refused BEFORE any DB write; RFI draft→open→answered→closed, submittal revise-and-resubmit, change-order open→in_review→approved/rejected) over append-only `workflow_revisions` + immutable `workflow_events`, all 8 tables FORCE-RLS (verified live 2026-10-15). Cross-role handoff: 7 participant policies + SECURITY DEFINER membership helpers + immutable document-field guard trigger; optional actor labels. EMAIL + WEB PUSH live: `workflow-notify`/`workflow-push` edge functions, at-most-once claim/release logs (unique event_id); RFC 8291/8292 push with DB-first VAPID (fresh P-256 pair in `integration_secrets`); honest active/not-configured chips (email dispatch needs admin-pasted Resend key). Share panel (invite/remove + audit trail), attachments (private `workflow-attachments` bucket, signed URLs, sanitization, 15MB cap, orphan cleanup), exports (13-col documents CSV + per-record JSON), offline-conflict honesty (partial-state errors, never silent collisions). Workflow suites 77/77; full suite 7,674/7,674 across 881 files (2026-10-15). Honest non-blocking caveats: dispatch is client-triggered per event (no external scheduler); external (non-app) participant delivery not built. |
| **IoT & telematics**                                       | **NOT FOUND**                                                           | No operational ingestion/adapters for equipment telematics, wearables, site cameras, MQTT/event streams, device identity, or safety monitoring were found. Build a consented and secured device integration layer with identity/provisioning, timestamps, quality/retention controls, alert thresholds, and site/worker privacy safeguards. Do not fabricate sensor states or use unvalidated alerts for safety decisions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Global procurement & logistics**                         | **PARTIAL: marketplace and price intelligence**                         | FRELUX has marketplace listings/orders and supplier/price-intelligence modules, but repository evidence does not establish globally vetted suppliers, inventory/availability, quotes-to-purchase-order fulfillment, customs, shipment tracking, or delivery-to-site chain of custody. Build market-specific supplier verification, comparable spec/units, quote/PO approvals, stock/lead-time evidence, shipment status and exception reconciliation. Clearly separate listed, quoted, ordered, dispatched and delivered states.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Fintech, escrow, lien waivers & AML**                    | **PARTIAL: checkout and milestone planning only**                       | Payment-provider checkout/webhooks and a deterministic milestone schedule exist. `escrow-intelligence.ts` explicitly makes ARCHIE advisory-only and leaves custody/release/refunds to an authorized provider. Stripe is configuration-dependent. No regulated escrow custody, construction milestone fund release, jurisdiction-appropriate lien-waiver lifecycle, or AML/KYC/sanctions screening capability was established. Treat regulated money movement/compliance as an external-provider and legal-partner integration, never a software-only claim; build provider-backed ledger/reconciliation, role approvals, audit/dispute controls, and jurisdiction review before production use.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Sync & offline-first field data**                        | **PARTIAL: local calculator cache and field-capture queue**             | `src/lib/offline-store.ts` caches previously fetched reads and drafts in `localStorage`; `src/lib/estimation/offline-field-engine.ts` queues field captures locally and syncs when connectivity returns. This is useful offline behavior, but not a verified multi-user, multi-device, encrypted offline project-data engine for blueprints, attachments and concurrent edits. Build durable storage, encryption/identity handling, conflict resolution, retry/backoff, sync status/audit, attachment limits, and device-loss/reinstall recovery tests; never promise unsynced data survives browser storage loss.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **RBAC / clearance and region-scoped security**            | **PARTIAL: application auth, roles and database RLS exist**             | Auth, feature access, project roles and numerous RLS policies exist. This audit did not verify that every sensitive route/table/action enforces least-privilege access by project, organizational role, region and clearance, nor independent security testing. Build a permission matrix and threat model; inventory every route, RPC, edge function, table, storage object and integration; enforce and test tenant/project/region/clearance boundaries server-side with audit logging, revocation and negative cross-tenant tests. Do not describe the platform as government/high-assurance compliant without independent evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### Implementation queue and release gates

These are **draft backlog items**, not claims that work has started or that integrations are configured. Keep the partial features above clearly labelled and usable where safe.

1. **Foundation and controls:** establish product scope, target jurisdiction/market and stakeholder roles; map sensitive data, data residency/retention, regulatory owners and threat model. Define capability states (`not available`, `partial`, `configured`, `verified operational`) in product and docs. Add server-side tenancy/region/role authorization tests before exposing sensitive datasets.
2. **Core field/project interoperability:** harden offline capture/sync and add the auditable RFI/submittal/change-order workflow. Add verified supplier quotation-to-fulfillment states and exception reporting. Integrate GIS only against explicitly selected licensed data sources and project coordinate standards.
3. **Model and decision support:** expand IFC beyond takeoff to tested model viewing/versioning, then staged schedule/cost links and explainable clash issues. Expand analytics only when historical outcomes and safety data are representative, consented, source-traceable and independently back-tested.
4. **Jurisdiction services:** create maintained primary-source standards/tax registries with responsible reviewers, effective dates and explicit market coverage; implement transaction-grade currency/tax only through documented provider/legal requirements. Build human-reviewed technical translations and managed construction terminology.
5. **Regulated finance and IoT:** scope authorized payment/escrow, AML/KYC and lien-waiver providers with counsel; integrate sensor/device streams with privacy and safety governance. Do not hold or release funds or issue compliance/safety guarantees through unsupported app logic.

**Operational/accuracy acceptance gate for each engine:** real production integrations and secrets configured server-side; named target markets and authoritative sources; freshness/effective-date and coverage disclosure; tested permission boundaries and failure/offline behavior; reproducible integration and regression tests using representative fixtures; end-to-end user acceptance in each enabled market; operational monitoring, incident/rollback procedures and an accountable owner. For legal, structural, fire, environmental, safety, AML, tax or payment decisions, add qualified local review and any required independent certification. Until every applicable gate is met, label the capability partial/unavailable and do not market it as fully operational.

---

## 1B. FOUR REQUESTED INTERNATIONAL ENGINES — ALL-MARKET READINESS (2026-10-14)

**Scope clarification:** The requested target is every country currently represented in FRELUX, not a single pilot. A country profile, unit display option, climate heuristic, currency quote, credential field, or database schema is not proof that its construction calculations or operational data are market-ready. This source audit does not verify the live Supabase deployment, active credentials, third-party provider configuration, or local professional/legal review.

| Engine                                                 | Current evidence                                                                                                                                                                                                                                                                                                                                         | Operational status and gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estimation & quantities / material standardization** | `src/lib/international/units-display.ts` converts displayed measurements; market-specific material rules can be fetched from `market_material_rules`; price-book material roles resolve through market mappings and effective prices. `market-profiles.test.ts` explicitly treats NG as active and GB/US/CA/AU/ZA/AE as coming soon in its seeded facts. | **PARTIAL; not verified for every represented country.** Display-unit conversion does not itself change calculation formulas, structural standards, product pack sizes, or purchase rounding. Verify each estimator's consumption of market rules, package dimensions, rule provenance/effective dates, missing-rule behavior, and tests by market before enabling a priced/material quantity workflow. No Nigerian standard may be used for another market unless clearly disclosed and accepted as a reference only.                    |
| **Market pricing & valuation**                         | Material prices can carry market, currency, source and effective-date provenance; role-based resolution returns the supplying market. Regional cost adjustments exist as configured factors. `fx-live.ts` fetches NGN-based display FX and caches it for 12 hours; `fx-display.ts` explicitly describes conversion as display-only.                      | **PARTIAL; no verified global valuation/tax engine.** Display FX is not local material valuation, inflation indexing, tax determination, invoice calculation, or settlement. A regional factor is not a source-backed, maintained cost index. No comprehensive country/jurisdiction tax rules and live supplier-index coverage were established. Add only dated and source-attributed local data; provide clear stale/missing/fallback disclosure; require local tax review before any tax output is represented as due.                  |
| **Global workforce compliance / Pro Connect**          | Pro Connect has identity/profile verification and a `pro_credentials` workflow with professional body, credential type, expiry and admin-reviewed verified status.                                                                                                                                                                                       | **PARTIAL; not operationally global.** The generic credential fields do not encode jurisdiction, issuing authority registry, scope/class, good-standing status, insurance policy/coverage, occupational safety training, or renewal and revocation checks. A manually marked verified credential is not proof of regulator validation. Require country-specific authoritative verification sources and auditable human review; do not claim a worker is compliant or licensed in a country until its rules and integrations are verified. |
| **Project timeline & predictive logistics**            | `timeline-estimator.ts` provides deterministic stage-duration heuristics; market-scoped climate profiles change season choices/notes and carry an explicit heuristic disclaimer. `ProjectTimeline.tsx` passes the selected market code. The end-date calculation now counts Monday-Saturday workdays and discloses excluded holidays/logistics.          | **PARTIAL; not a predictive logistics engine.** No shipping/carrier status, customs lead-time source, port/border disruption feed, local public-holiday calendar, or region-level weather/season data integration was established. Season multipliers are planning heuristics, not calibrated measured productivity. The six-day date correction is market-neutral and does not provide country-specific calendars or logistics.                                                                                                          |

### Market-by-market rollout order (owner priority, confirmed 2026-10-14)

Process one country at a time. Complete evidence review, scoped implementation, tests and operational verification for a country; then update both handoff files with its evidence, status, changed capabilities, test results and remaining blockers before beginning the next country. Do not bundle unverified countries or mark a country operational because a previous market passed. Priority sequence: **US → UK (`GB`) → China (`CN`) → Italy (`IT`) → Nigeria (`NG`) → The Gambia (`GM`) → United Arab Emirates (`AE`) → every remaining country currently represented in FRELUX, one at a time.** `GM` is the ISO country code for The Gambia; Germany is `DE` and is not inferred from `GM`. If a country has no authoritative source/provider or accountable local review, document that blocker and keep the affected capability visibly partial/unverified rather than fabricating or skipping the gate.

### Engine 1 market closeouts p1–p21 — ALL 15 OWNER-MANDATED MARKETS COMPLETE (2026-10-15; detail pruned; full evidence preserved in git history and per-market guard tests)

Rolled out strictly one-at-a-time. Each market has its own migration (applied to production and verified live via the Supabase Management API), a guard test in `src/lib/international/__tests__/`, and a dedicated commit. All migrations are registered in `scripts/apply_pending_migrations.py`.

| # | Market | Migration(s) | Outcome (live-verified) |
|---|--------|-------------|------------------------|
| 1 | US | `20261015000000` | IRC/IBC/NEC (medium, jurisdiction adoption caveats) + ASTM C1396 (high); stale "coming soon" test expectation reconciled to live state |
| 2 | GB | `20261015161000` | 5 UK standards: Building Regs AD-A (medium, devolution caveat) + BS EN 13914-1, BS EN 998-1, BS EN 13279, BS 8000-10 (high) |
| 3 | CN | `20261015162000` | GB 50009/GB 50210/GB/T 9775 seeded; **finishing price book remains an honest BLOCKER** (nothing invented) |
| 4 | IT | `20261015162000` + `163000` + `164000` | Fully activated: 8 role pairs wired to verified EUR-priced materials; NTC 2018/UNI standards; engine-id registry fix live-verified |
| 5 | NG | `20261015162000` | National Building Code 2006 + Lagos State regulations documented; NGN behavior untouched (home market) |
| 6 | GM | — | **BLOCKER reconfirmed live** (absent from `market_profiles`); correctly skipped, nothing fabricated |
| 7 | AE | `20261015162000` | Dubai Fire & Life Safety Code + Abu Dhabi i-codes (medium, emirate-level caveats) |
| 8 | GH | `20261015700000` | L.I. 1630 (medium, MMDA caveat; the mis-cited "1633" is excluded by guard) + GSA Act 1078 (high); 8 roles / 33 GHS prices live |
| 9 | KE | `20261015710000` | National Building Code 2024 (LN 47, 2024-03-01, replaces 1968; 47-county caveat) + KS 2647:2016 + KS EAS 18-1 (high) |
| 10 | ZA | `20261015720000` | NBR&BS Act 103/1977 + SANS 10400 (medium, municipal caveat) + SANS 2001-CC1/CC2 + SANS 10109-1/2 (high) |
| 11 | CA | `20261015730000` | NBC 2020 (medium, MODEL code — provincial adoption caveat) + CAN/CSA-A82.31-M91 + CSA A82.30-M (high); stays hidden from picker per audit; placeholder product mappings untouched |
| 12 | AU | `20261015740000` | NCC/BCA (medium, state/territory adoption caveat) + AS/NZS 2589:2017 + AS/NZS 2588 (high); picker hidden per audit |
| 13 | DE | `20261015750000` | Musterbauordnung via 16 Landesbauordnungen (medium) + DIN EN 13914-1:2016 with DIN 18550-2 (high) |
| 14 | IN | `20261015760000` | NBC 2026 SP 7:2026 (medium; NBC 2016 withdrawn; voluntary via state byelaws) + IS 2095-1 gypsum boards (high, mandatory QCO) |
| 15 | JP | `20261015770000` | Building Standards Act 1950 (medium, confirmation caveat) + JIS A 6901:2014 gypsum boards (high, ISO 6308-aligned) |
| 16 | FR | `20261015780000` | NF DTU 25.41 plasterboard works (high, Feb 2022 revision) + NF DTU 26.2 traditional renders (high) |
| 17 | BR | `20261015790000` | ABNT NBR 14715-1:2021 drywall boards (high) + ABNT NBR 15575 performance (medium, municipal caveat) |
| 21 | SA | `20261015800000` | Saudi Building Code 2024 edition (medium, mandatory nationwide 30 June 2025) + SASO gypsum application/finishing (high) |

**Standing rules learned/confirmed in this rollout:**
- Before naming any new migration file, `ls supabase/migrations` AND `git pull` — the parallel session actively consumes version numbers (collisions silently SKIP as "already recorded"; this bit GH twice).
- No coverage rates, no invented standard numbers, no fabricated prices; every standard ref web-verified the same day it was seeded.
- Full test suite stays deferred until every market in the rollout order is confirmed active (owner instruction); targeted guard tests + typecheck run per market before push.
- Honest blockers carried forward: CN finishing price book; GM unsupported (no `market_profiles` row); CA placeholder cement/sand product mapping + picker hidden.

### REMAINING MARKETS ROLLOUT QUEUE (next wave; NOT yet started)

The 15-market Engine-1 rollout is COMPLETE. The following markets remain from the broader 44-market audit, in priority order, each with its audit section below. They follow the same strict one-at-a-time gate (live-state check, web-verified standards, dedicated migration + guard test + handoff entry + commit, apply, live verify) before the next begins. Do not bundle them.

- Indonesia
- Mexico
- South Korea
- Ethiopia
- Egypt
- Tanzania
- Côte d’Ivoire
- Spain
- Netherlands
- Poland
- Sweden
- Switzerland
- Singapore
- Türkiye
- New Zealand
- Ireland
- Norway
- Malaysia
- Philippines
- Pakistan
- Portugal
- Austria
- Belgium
- Denmark
- Finland
- Thailand

### Indonesia market closeout (priority 18; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Indonesia (`ID`) has an active/visible built-in metric, IDR, Bahasa Indonesia profile. Production availability is not verified by a live read. The internal 2026-10-13 snapshot says 8 book rows but **zero role mappings and zero scanner sources**, and explicitly notes that role mappings were pending; later country-specific door/plumbing migrations do not prove those mappings or market activation have been applied.
- **Quantities/standards:** Local SNI/PUIL electrical and plumbing profiles, Indonesian reinforced-concrete typology and stone foundation wall method, plus tropical monsoon heuristic exist. Many finishing calculators are explicitly unimplemented; block, roof, foundation and structural takeoffs are partial, and structural typology calls out high seismicity plus required engineer certification and soil calculations. This is not a verified nationwide quantity/standard system across island, seismic and local authority variations.
- **Pricing/tax:** An IDR reference scanner catalog contains selected cement, skim, plasterboard, tile adhesive and waterproofing references; migrations add Indonesian door and plumbing books and selected electrical source data. The snapshot’s zero role mappings/source coverage and partial catalog mean that broad operations and fresh/deployed values are not verified. Some references are estimates, and the country-specific web listings do not establish broad live supply coverage. No verified province/local tax treatment, continuous cost/inflation index, or FX transaction engine was found.
- **Workforce compliance:** no Indonesian engineer/contractor licensing, construction safety credential, insurance, regulator data integration or expiry/revocation monitoring was verified. The SNI/engineer notes are not a working credential validation workflow.
- **Timeline/logistics:** a tropical monsoon heuristic exists, but not calibrated island/province schedules, public-holiday calendars, inter-island transport/customs lead times or a live predictive supply feed. The shared date function excludes holidays and shipping.
- **Changes made for ID:** none; the inventory documents zero role mappings at its snapshot date, major unimplemented calculator groups and seismic engineering limits. Keep Indonesia partial/unverified until migrations/live mappings, engineering validation and local tax, workforce and timeline evidence pass. Next remaining market: **Mexico (`MX`)**.

### Mexico market closeout (priority 19; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Mexico (`MX`) has a visible, active metric, MXN and Spanish built-in profile, but no live production status was queried.
- **Quantities/standards:** Spanish terminology and NOM-oriented electrical/plumbing profiles, local wall methodology and structural typology are configured. Typology notes seismic-risk regions require review by a registered Director Responsable de Obra; the engine inventory labels block/roof/foundation/structural partial and several finishing tools, doors/windows and Build-to-Roof unimplemented. Code references and heuristics are not a complete federal/state/municipal engineering approval or all-calculator validation.
- **Pricing/tax:** A dedicated MXN reference catalog and country-specific electrical, plumbing, and door/hardware migrations exist. The 2026-10-13 internal snapshot reports 8 book rows, zero role mappings and zero scan sources, noting mappings were pending; later migration files do not establish they applied or that current production has complete mappings. Some costs remain indicative or unpriced. No robust state-specific VAT/IVA tax computation, current live index/inflation or transaction FX engine was demonstrated.
- **Workforce compliance:** no country/state-specific DRO or trade license verification, insurance/safety certification registry, expiry or revocation integration was found.
- **Timeline/logistics:** dry/rainy season is a broad heuristic; no state-specific holidays/work calendars, storm/site productivity data, customs/shipping feed or predictive logistics were verified.
- **Changes made for MX:** none. Keep the market partial/unverified until live role mappings and source-backed calculators, tax, workforce and calendar/logistics functions pass the activation gate. Next remaining market: **South Korea (`KR`)**.

### South Korea market closeout (priority 20; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** South Korea (`KR`) has a visible active metric, KRW, Korean-language market profile, with 40 kg cement and local product conventions. The live production profile and migration application status were not queried.
- **Quantities/standards:** KEC/KS-C electrical and KCS/KS-B plumbing references, Korean RC apartment typology and wall methodology are present. The engine inventory marks structural/foundation/reinforcement/roofing partial, and multiple finish/door/window calculators plus Build-to-Roof unimplemented. Standards references and national typology do not substitute for project-specific engineering review or validation across Korean regions and building types.
- **Pricing/tax:** A dedicated KRW reference catalog and separate electrical, plumbing, and door/hardware price-book migrations cite Korean retailer listings dated 2026-10-14. The dated internal snapshot (2026-10-13) reports 8 price rows, zero material-role mappings, and zero scan sources; later migration files do not prove these books or complete mappings are live. The scanner references are surveys, not a demonstrated live refresh. No operational VAT/tax engine, inflation-index feed or transaction FX workflow was verified.
- **Workforce compliance:** no Korean license/credential verification, regional eligibility, insurance/safety registry, or expiry/revocation integration was demonstrated.
- **Timeline/logistics:** the climate profile only gives broad summer/winter seasons; no public-holiday/site-calendar integration, construction-weather productivity validation, import/customs feed or predictive shipping-delay engine was established.
- **Changes made for KR:** none. Keep market functionality partial until production role mappings, current source-backed prices, regional standards, tax, workforce and timeline/logistics are validated. Next remaining market: **Saudi Arabia (`SA`)**.

### Ethiopia market closeout (priority 22; audit only, 2026-10-14)

- **Operational decision: NOT IMPLEMENTED / NOT VERIFIED.** Ethiopia (`ET`) appears in the country selector list with ETB, but searches found no Ethiopia-specific entry in the market context, price scanner, construction typologies, wall methodology, climate profiles, electrical/plumbing profiles, or market capability inventory. The selector entry alone does not establish a usable localized estimator or active production market.
- **Quantities/standards:** no Ethiopia-specific package/unit/formula catalog or authoritative building-code/structural profile was found. Do not apply Nigerian or other market defaults silently.
- **Pricing/tax:** no Ethiopia-specific price book, retailer source catalog, exchange-rate/FX path or jurisdictional tax handling was found in reviewed files. Do not quote NGN or invent ETB prices/tax rules.
- **Workforce compliance:** no Ethiopian licensing/credential verification, insurance/safety registry, or professional eligibility integration was found.
- **Timeline/logistics:** no region-specific climate/calendar, holidays or customs/shipping/delay integration was found.
- **Changes made:** none. Keep Ethiopia unavailable for operational estimates until source-backed local standards and products, calculator validation, ETB pricing/tax, credentials, and seasonal/logistics rules are implemented and deployed. Next remaining market: **Egypt (`EG`)**.

### Egypt market closeout (priority 23; evidence correction, 2026-10-14)

- **Operational decision: LOCAL DATA FOUNDATION EXISTS; NOT VERIFIED END TO END.** `EG` is in the generic country selector with EGP. The production-catalog and price-seed migrations contain Egypt-specific material records, including selected cement and rebar references and additional largely indicative prices, plus tile adhesive/grout rows. These files do not establish that migrations are applied or the market is active in production.
- **Quantities/standards:** no Egypt-specific market profile, estimator/engineering profile, or source-validated construction/electrical/plumbing code-and-packaging implementation was found. Listed catalog records do not prove working quantity roles or validated takeoffs. No silent Nigeria fallback.
- **Pricing/tax:** EGP records exist, but the current scanner has no Egypt market entry; several migration values are marked indicative/admin-adjustable, and no production read, live price refresh, robust Egypt tax/VAT or FX engine was verified.
- **Workforce compliance / timeline:** no Egyptian professional credentials or safety checks; nor local calendar, climate/logistics integration, or predictive delay engine, was verified.
- **Changes made:** none. Keep Egypt not verified until source-backed local formulas, mapped products/prices, tax and operational integrations are tested in production.

### Tanzania market closeout (priority 24; audit only, 2026-10-14)

- **Operational decision: NOT IMPLEMENTED / NOT VERIFIED.** Tanzania (`TZ`, TZS) appears in the general country selector only. No Tanzania-specific market profile, price-scanner catalog, construction typology, wall/climate method, electrical/plumbing profile or engine-support inventory entry was found in the reviewed sources.
- **Quantities/standards:** no source-backed Tanzania packaging/coverage or structural/building-code formulas are configured. A country selection does not establish local calculation support; no silent Nigeria fallback.
- **Pricing/tax:** no Tanzania product/retailer price book, TZS market references, live exchange/rate workflow, or jurisdiction-specific VAT/tax calculation was verified.
- **Workforce compliance:** no country-specific license, insurance, safety credential or professional registry connection was found.
- **Timeline/logistics:** no regional climate and work-calendar data, public holidays, customs constraints or predictive logistics support was found.
- **Changes made:** none. Do not represent Tanzania as operational until independently sourced local standards, quantities, price and tax data, credentials, and calendar/logistics rules are validated and deployed. Next remaining market: **Côte d’Ivoire (`CI`)**.

### Côte d’Ivoire market closeout (priority 25; audit only, 2026-10-14)

- **Operational decision: NOT IMPLEMENTED / NOT VERIFIED.** Côte d’Ivoire (`CI`, XOF) is in the country selector, but reviewed market-context, price-scanner, construction typology, wall/climate, electrical/plumbing and engine-support catalogs contain no country-specific configuration.
- **Quantities/standards:** no local packaging, quantity formulas, or source-backed building/electrical/plumbing standard profile was located. Do not silently apply NG or another country’s assumptions.
- **Pricing/tax:** no local price catalog or retailer sources, regional XOF pricing evidence, FX workflow, or Côte d’Ivoire tax/VAT rules were found in reviewed files.
- **Workforce compliance:** no verification integration for local contractor/professional licenses, insurance or safety credentials was found.
- **Timeline/logistics:** no local weather/work-season evidence, national/local calendar, customs or route-delay data integration was found.
- **Changes made:** none. CI must remain unavailable for operational local estimates until locally validated standards, supply/pricing/tax, workforce compliance and regional schedule data are implemented and production-tested. Next remaining market: **Spain (`ES`)**.

### Spain market closeout (priority 26; evidence correction, 2026-10-14)

- **Operational decision: LOCAL DATA FOUNDATION EXISTS; NOT VERIFIED END TO END.** `ES` is in the country selector, has a broad Mediterranean climate heuristic and Spanish language/dictionary support. Production-catalog/price migrations include Spanish-localized products with selected retailer-survey prices (including cement, sand, paint, primer, plaster and waterproofing) plus tile adhesive/grout rows; other values are indicative. None proves current production deployment.
- **Quantities/standards:** no Spain-specific market/engineering profile or source-validated national/regional code and complete estimator package was found. Shared Spanish language, EUR, and generic tiling entries do not establish validated Spanish quantity takeoffs; German/local neighbor rules must not be assumed.
- **Pricing/tax:** localized EUR catalog data exists, but no Spain scanner catalog or complete mapped/local price coverage, refresh proof, IVA calculation or FX workflow was verified. Some rows are expressly indicative/admin-adjustable.
- **Workforce compliance / timeline:** no Spain-specific professional-license, insurance or safety checks, local public-holiday/site calendar, validated weather productivity or predictive logistics integration was demonstrated.
- **Changes made:** none. Spain remains partial/unverified until country/regional estimator, tax, compliance and schedule integrations are tested against authoritative local sources and production data.

### Netherlands market closeout (priority 27; evidence correction, 2026-10-14)

- **Operational decision: LOCALIZED CATALOG DATA EXISTS; NOT VERIFIED END TO END.** `NL` is in the generic country selector with EUR. The production-catalog/price migrations include Dutch material rows and a tile adhesive/grout entry. Some prices have retailer-survey provenance (e.g. paint/primer); others are explicitly indicative/admin-adjustable. No current production query was made.
- **Quantities/standards:** no NL-specific market profile, engineering package, or mapped/validated construction, electrical and plumbing takeoffs was found. Catalog rows do not alone establish supported formulas or role mappings.
- **Pricing/tax:** localized EUR records exist, but no NL scanner reference catalog or refresh process, complete verified price coverage, Dutch VAT treatment or transaction FX behavior was verified.
- **Workforce compliance / timeline:** no Netherlands-specific professional credential, insurance/safety registry, public-holiday/site calendar or predictive weather/customs logistics integration was demonstrated.
- **Changes made:** none. Keep NL partial/unverified pending source-backed and deployment-verified quantities, mapped pricing, VAT, compliance and timeline behavior.

### Poland market closeout (priority 28; evidence correction, 2026-10-14)

- **Operational decision: LOCALIZED CATALOG DATA EXISTS; NOT VERIFIED END TO END.** `PL` is in the generic selector with PLN. Price/catalog migrations include Polish material records and tile adhesive/grout entries; selected paint prices cite Castorama surveys, while other entries are indicative/admin-adjustable. No production database status was queried.
- **Quantities/standards:** no PL-specific market/engineering profile or validated complete Polish construction/electrical/plumbing takeoff set was found. Localized names and sample tiling rates are not proof of a fully validated estimating engine.
- **Pricing/tax:** PLN records exist, but no scanner mapping or recurring refresh, complete price-role coverage, Polish VAT treatment or transaction FX engine was demonstrated.
- **Workforce compliance / timeline:** no locally scoped professional/trade credential or safety validation, public-holiday/site calendar, or predictive logistics integration was found.
- **Changes made:** none. Do not call Poland operational until national and regional assumptions, source-backed mapped prices, tax and integration status are verified.

### Sweden market closeout (priority 29; evidence correction, 2026-10-14)

- **Operational decision: LOCALIZED CATALOG DATA EXISTS; NOT VERIFIED END TO END.** `SE` is listed with SEK. Catalog/price migrations contain Swedish materials and tiling entries; selected cement/paint rows cite retailer surveys, while many remain indicative/admin-adjustable. Live production status was not checked.
- **Quantities/standards:** no SE-specific market/engineering profile or complete, locally validated construction/electrical/plumbing quantity methodology was found.
- **Pricing/tax:** SEK rows exist, but no market-specific scanner-reference mapping/refresh, complete source verification, Sweden-specific tax rules or transaction FX workflow was demonstrated.
- **Workforce compliance / timeline:** no Swedish license/insurance/safety checks, local public-holiday/site calendar, validated seasonal productivity, or predictive supply-chain logistics integration was found.
- **Changes made:** none. Keep partial/unverified until local assumptions and mapped source-backed operating data are validated in production.

### Switzerland market closeout (priority 30; evidence correction, 2026-10-14)

- **Operational decision: LOCALIZED CATALOG DATA EXISTS; NOT VERIFIED END TO END.** `CH` is listed with CHF and has German-language locale membership. The catalog/price migrations contain Swiss products and tile adhesive/grout rows; one wall-paint price cites a Hornbach survey, while multiple other entries are indicative/admin-adjustable. No live production read was made.
- **Quantities/standards:** no CH-specific market/engineering profile or validated Swiss code-based quantity package was found. German-language support and German EUR-market behavior are not substitutes for Swiss cantonal requirements or CHF costs.
- **Pricing/tax:** CHF records exist but no scanner catalog/refresh, complete mapped source-backed price coverage, Swiss VAT/cantonal tax logic or FX workflow was demonstrated.
- **Workforce compliance / timeline:** no Swiss-specific professional verification, insurance/safety registry, cantonal work calendar, or predictive logistics integration was demonstrated.
- **Changes made:** none. Keep partial/unverified until Swiss national/cantonal rules and operational product-price mappings are validated.

### Singapore market closeout (priority 31; evidence correction, 2026-10-14)

- **Operational decision: LOCALIZED CATALOG DATA EXISTS; NOT VERIFIED END TO END.** `SG` is in the generic selector with SGD. Price/catalog migrations contain Singapore material rows and tile adhesive/grout entries; a paint row cites a retailer price band, while other rows are indicative/admin-adjustable. Production deployment was not checked.
- **Quantities/standards:** no SG market context or dedicated construction, electrical, plumbing, climate or typology profile was found; local product names do not establish validated local takeoffs.
- **Pricing/tax:** SGD records exist, but no SG scanner references/refresh process, full source verification, GST/tax treatment or FX engine was found.
- **Workforce compliance / timeline:** no Singapore licensing/registration, insurance or workplace-safety integration, holiday/site calendar, or predictive procurement/logistics engine was demonstrated.
- **Changes made:** none. Keep Singapore unverified pending validated local formulas, source-backed mapped price coverage, tax, compliance and schedule functions.

### Türkiye market closeout (priority 32; evidence correction, 2026-10-14)

- **Operational decision: LOCALIZED CATALOG DATA EXISTS; NOT VERIFIED END TO END.** `TR` is in the generic selector with TRY. Localized price/catalog rows and tile adhesive/grout entries exist; a subset of paint prices cite Koçtaş surveys while other material prices are indicative/admin-adjustable. No live production check was made.
- **Quantities/standards:** no Türkiye-specific market profile or validated local construction/electrical/plumbing engine package was found.
- **Pricing/tax:** TRY records exist, but the price scanner has no TR catalog mapping; no current refresh, complete verified material-role coverage, Turkish VAT/tax or FX operation was demonstrated.
- **Workforce compliance / timeline:** no Turkish license/credential/insurance/safety checks, local holiday/site calendar or predictive logistics integration was found.
- **Changes made:** none. Keep unverified until Türkiye-specific formulas, tax, compliance and current mapped pricing are independently validated and deployed.

### New Zealand market closeout (priority 33; evidence correction, 2026-10-14)

- **Operational decision: LOCALIZED CATALOG DATA EXISTS; NOT VERIFIED END TO END.** `NZ` is listed with NZD. Migrations include New Zealand-specific material records and tile adhesive/grout rows; cement and Resene interior paint cite retail surveys while many other prices are indicative/admin-adjustable. A 20 kg cement item uses a `40kg` slug, a concrete pack-size contradiction requiring data review. No live production query was performed.
- **Quantities/standards:** no NZ market profile or complete locally validated construction/electrical/plumbing takeoff package was found; catalog entries and sample tile coverage are insufficient evidence of fully functional NZ standards support.
- **Pricing/tax:** NZD catalog prices exist, but there is no NZ scanner catalog/refresh, complete role mapping and verified price coverage, GST handling or FX engine demonstrated.
- **Workforce compliance / timeline:** no NZ-specific licensing/insurance/safety validation, regional/public holiday work calendar or predictive shipping/logistics engine was found.
- **Changes made:** none. Keep unverified until the pack-size data defect and broader operational validation are resolved.

### Ireland market closeout (priority 34; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `IE` is represented in production-catalog/price-seed migration data using EUR. IE has local product and price rows including Irish Cement 25 kg, Woodies paint/sand surveys and Zinsser primer. No Irish market profile, scanner mapping, native role mappings, or Ireland-specific engineering profiles were found. Some prices are expressly indicative; seeded rows do not prove deployed operation.
- **Quantities/standards:** no dedicated active market profile or complete source-backed local construction/electrical/plumbing takeoff profiles were found in the reviewed application code. Product descriptions and generic tiling rows are not evidence of validated local quantity coverage.
- **Pricing/tax:** seeded market-specific product rows and selected retailer references exist, but the records mix sourced and explicitly indicative prices; no verified scanner integration/refresh, complete product-role mapping, tax/VAT workflow, FX behavior or current production deployment was established.
- **Workforce compliance:** no jurisdiction-specific license, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local holiday/site calendar or validated climate, customs and predictive supply-delay integration was established.
- **Changes made:** none. Keep `IE` out of fully operational coverage until mapped local standards, source-backed current prices, tax, compliance, and calendar/logistics functionality are validated in production. Next market: **Austria**.

### Norway market closeout (priority 35; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `NO` is represented in production-catalog/price-seed migration data using NOK. NO has locally named NOK material rows and a Byggmax paint survey, but no country selector entry, market profile, scanner mapping or country-specific engineering profiles. Other rows are indicative; no native quantity-role mapping or deployed price freshness was verified.
- **Quantities/standards:** no dedicated active market profile or complete source-backed local construction/electrical/plumbing takeoff profiles were found in the reviewed application code. Product descriptions and generic tiling rows are not evidence of validated local quantity coverage.
- **Pricing/tax:** seeded market-specific product rows and selected retailer references exist, but the records mix sourced and explicitly indicative prices; no verified scanner integration/refresh, complete product-role mapping, tax/VAT workflow, FX behavior or current production deployment was established.
- **Workforce compliance:** no jurisdiction-specific license, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local holiday/site calendar or validated climate, customs and predictive supply-delay integration was established.
- **Changes made:** none. Keep `NO` out of fully operational coverage until mapped local standards, source-backed current prices, tax, compliance, and calendar/logistics functionality are validated in production. Next market: **Malaysia**.

### Malaysia market closeout (priority 36; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `MY` is represented in production-catalog/price-seed migration data using MYR. MY has locally named product and MYR price rows, one cement price citing a Lazada survey, plus locally scoped adhesive/grout migration rows. No Malaysia market profile, scanner entry or engineering profiles, nor native estimate role mappings, were found. Most prices are indicative; no production activation evidence.
- **Quantities/standards:** no dedicated active market profile or complete source-backed local construction/electrical/plumbing takeoff profiles were found in the reviewed application code. Product descriptions and generic tiling rows are not evidence of validated local quantity coverage.
- **Pricing/tax:** seeded market-specific product rows and selected retailer references exist, but the records mix sourced and explicitly indicative prices; no verified scanner integration/refresh, complete product-role mapping, tax/VAT workflow, FX behavior or current production deployment was established.
- **Workforce compliance:** no jurisdiction-specific license, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local holiday/site calendar or validated climate, customs and predictive supply-delay integration was established.
- **Changes made:** none. Keep `MY` out of fully operational coverage until mapped local standards, source-backed current prices, tax, compliance, and calendar/logistics functionality are validated in production. Next market: **Philippines**.

### Philippines market closeout (priority 37; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `PH` is represented in production-catalog/price-seed migration data using PHP. PH has locally named PHP materials and some Lazada paint surveys, plus tile-adhesive/grout rows. No Philippines market profile, price scanner catalog, market engineering profiles or native estimate-role mappings were found. Most prices are indicative; this does not establish production operation.
- **Quantities/standards:** no dedicated active market profile or complete source-backed local construction/electrical/plumbing takeoff profiles were found in the reviewed application code. Product descriptions and generic tiling rows are not evidence of validated local quantity coverage.
- **Pricing/tax:** seeded market-specific product rows and selected retailer references exist, but the records mix sourced and explicitly indicative prices; no verified scanner integration/refresh, complete product-role mapping, tax/VAT workflow, FX behavior or current production deployment was established.
- **Workforce compliance:** no jurisdiction-specific license, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local holiday/site calendar or validated climate, customs and predictive supply-delay integration was established.
- **Changes made:** none. Keep `PH` out of fully operational coverage until mapped local standards, source-backed current prices, tax, compliance, and calendar/logistics functionality are validated in production. Next market: **Pakistan**.

### Pakistan market closeout (priority 38; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `PK` is represented in production-catalog/price-seed migration data using PKR. PK has locally named PKR material records, selected cement and emulsion price references, and tile-adhesive/grout rows. No Pakistan market profile, scanner mapping, local engineering profiles or native role mappings were found; other prices are indicative/admin-adjustable. Production status is unverified.
- **Quantities/standards:** no dedicated active market profile or complete source-backed local construction/electrical/plumbing takeoff profiles were found in the reviewed application code. Product descriptions and generic tiling rows are not evidence of validated local quantity coverage.
- **Pricing/tax:** seeded market-specific product rows and selected retailer references exist, but the records mix sourced and explicitly indicative prices; no verified scanner integration/refresh, complete product-role mapping, tax/VAT workflow, FX behavior or current production deployment was established.
- **Workforce compliance:** no jurisdiction-specific license, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local holiday/site calendar or validated climate, customs and predictive supply-delay integration was established.
- **Changes made:** none. Keep `PK` out of fully operational coverage until mapped local standards, source-backed current prices, tax, compliance, and calendar/logistics functionality are validated in production. Next market: **Portugal**.

### Portugal market closeout (priority 39; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** Portugal (`PT`, EUR) has localized price/catalog migration records for cement, sand, paint, primer, filler and waterproofing, plus Portuguese tiling and ceiling products. Some rows cite Leroy Merlin PT price observations; several entries are only indicative/admin-adjustable. One primer slug says 5 L while the product description and cited price refer to 15 L, a pack-size mismatch requiring review. The repository migration is not proof of current production state.
- **Quantities/standards:** a Portuguese putty screed/ceiling/tiling assumption exists in seed data, but no PT market profile or complete validated Portuguese construction/electrical/plumbing engine profiles, role mappings and tests were found.
- **Pricing/tax:** EUR market-scoped rows exist, but no PT price scanner catalog/refresh, fully mapped verified price book, IVA rules or transaction FX operation was established.
- **Workforce compliance / timeline:** no Portuguese licensing/insurance/safety verification, local work-calendar or public-holiday support, or predictive weather/logistics integration was demonstrated.
- **Changes made:** none. Keep PT unverified until pack-size discrepancies, code-based quantities, price provenance/mappings, tax and deployment are tested. Next catalog-only country: **Austria (`AT`)**.

### Austria market closeout (priority 40; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `AT` has country-specific product/price rows in database migrations using EUR. Austria has a local EUR material catalog, two Hornbach price references (including a 20 mm multilayer pipe), plus Austrian-localized putty/tiling material descriptions. No AT market context, scanner catalog, locally scoped electrical/plumbing code profile, or comprehensive role-mapping proof was found. Most material prices are indicative. Migration evidence does not establish the rows are deployed or current in production.
- **Quantities/standards:** localized material or tiling/screed rows are partial evidence only. No complete, source-validated country-specific construction/electrical/plumbing estimating profiles and tested role mappings were verified.
- **Pricing/tax:** local-currency price rows exist, mixing source-cited and indicative/admin-adjustable values. No complete price scanner catalog or refresh process, full price-to-estimate role mapping, validated local VAT treatment, FX workflow or production read was confirmed. Review pack-size contradictions noted above before use.
- **Workforce compliance:** no local professional/trade licensing, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local public-holiday/work calendar, validated seasonal productivity, customs or predictive supply-delay functionality was found.
- **Changes made:** none. Do not represent `AT` as operationally localized until the local standards, role mappings, live source-backed pricing/tax and compliance/schedule integrations are independently verified. Next country: **Belgium**.

### Belgium market closeout (priority 41; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `BE` has country-specific product/price rows in database migrations using EUR. Belgium has local EUR material catalog rows; Gamma Belgium survey prices are cited for wall paint and primer, while other prices are indicative. The repository has a Belgian tile adhesive/grout entry, but no BE market context, scanner catalog, dedicated estimator profiles or verified complete role mapping/deployment evidence. Migration evidence does not establish the rows are deployed or current in production.
- **Quantities/standards:** localized material or tiling/screed rows are partial evidence only. No complete, source-validated country-specific construction/electrical/plumbing estimating profiles and tested role mappings were verified.
- **Pricing/tax:** local-currency price rows exist, mixing source-cited and indicative/admin-adjustable values. No complete price scanner catalog or refresh process, full price-to-estimate role mapping, validated local VAT treatment, FX workflow or production read was confirmed. Review pack-size contradictions noted above before use.
- **Workforce compliance:** no local professional/trade licensing, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local public-holiday/work calendar, validated seasonal productivity, customs or predictive supply-delay functionality was found.
- **Changes made:** none. Do not represent `BE` as operationally localized until the local standards, role mappings, live source-backed pricing/tax and compliance/schedule integrations are independently verified. Next country: **Denmark**.

### Denmark market closeout (priority 42; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `DK` has country-specific product/price rows in database migrations using DKK. Denmark has local DKK catalog rows and BAUHAUS price observations for cement and interior paint (the latter’s product is 9 L but slug says 10 L), plus tile adhesive/grout entries. No DK market profile, price scanner mapping, dedicated local engineering profiles or end-to-end role-mapping verification was found. Migration evidence does not establish the rows are deployed or current in production.
- **Quantities/standards:** localized material or tiling/screed rows are partial evidence only. No complete, source-validated country-specific construction/electrical/plumbing estimating profiles and tested role mappings were verified.
- **Pricing/tax:** local-currency price rows exist, mixing source-cited and indicative/admin-adjustable values. No complete price scanner catalog or refresh process, full price-to-estimate role mapping, validated local VAT treatment, FX workflow or production read was confirmed. Review pack-size contradictions noted above before use.
- **Workforce compliance:** no local professional/trade licensing, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local public-holiday/work calendar, validated seasonal productivity, customs or predictive supply-delay functionality was found.
- **Changes made:** none. Do not represent `DK` as operationally localized until the local standards, role mappings, live source-backed pricing/tax and compliance/schedule integrations are independently verified. Next country: **Finland**.

### Finland market closeout (priority 43; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** `FI` has country-specific product/price rows in database migrations using EUR. Finland has local EUR catalog rows and a Bauhaus price survey for a 10 L interior paint; other rows are indicative. Finnish tile adhesive/grout and screed descriptions appear in migration seeds. No FI market context or scanner mapping; electrical profile has an FI code reference but no complete FI market and estimating package. No production verification. Migration evidence does not establish the rows are deployed or current in production.
- **Quantities/standards:** localized material or tiling/screed rows are partial evidence only. No complete, source-validated country-specific construction/electrical/plumbing estimating profiles and tested role mappings were verified.
- **Pricing/tax:** local-currency price rows exist, mixing source-cited and indicative/admin-adjustable values. No complete price scanner catalog or refresh process, full price-to-estimate role mapping, validated local VAT treatment, FX workflow or production read was confirmed. Review pack-size contradictions noted above before use.
- **Workforce compliance:** no local professional/trade licensing, insurance or safety-credential verification was demonstrated.
- **Timeline/logistics:** no local public-holiday/work calendar, validated seasonal productivity, customs or predictive supply-delay functionality was found.
- **Changes made:** none. Do not represent `FI` as operationally localized until the local standards, role mappings, live source-backed pricing/tax and compliance/schedule integrations are independently verified. Next country: **Ireland**.

### Thailand market closeout (priority 44; audit-only catalog evidence, 2026-10-14)

- **Operational decision: LOCALIZED SEED DATA EXISTS; NOT VERIFIED END TO END.** Thailand (`TH`, THB) has local-material and putty-engine seed rows, including sampled OneStockHome sand and HomePro paint listings, alongside prices explicitly marked indicative/admin-adjustable. A migration containing these records does not prove current production activation.
- **Quantities/standards:** a local skim-putty material description exists, but no TH market profile or complete Thailand building/electrical/plumbing standards and calculation package, verified coverage formulas, or production role mapping was found.
- **Pricing/tax:** THB seed prices exist but the scanner lacks a Thailand market/catalog mapping. At least one paint row has a pack-size conflict: `th-emulsion-4l` cites an 8 L product. No complete sourced/refreshed price book, VAT calculation, FX workflow or live production status was demonstrated.
- **Workforce compliance:** no Thai professional/trade licensing, insurance, or safety credential verification was found.
- **Timeline/logistics:** no Thailand-specific work calendar/holidays, validated weather productivity, shipping/customs feed or predictive supply delay engine was found.
- **Changes made:** none. Keep TH unverified until package mismatches, local standards, price roles/tax, credentials and schedule/logistics functions are validated and deployed. Next market in the remaining seed-catalog review: **Malaysia (`MY`) evidence follow-up**.

### All-market implementation sequence and release gate

The all-country requirement remains open. Do not activate all represented countries merely because a profile or heuristic exists. Build and validate in market waves while keeping unverified country-specific functions unavailable or visibly indicative:

1. **Inventory and gate:** derive the canonical country list/status from the live market registry; reconcile built-in profiles, visible selector options, seeded database states, calculators, price books and tests. Keep coming-soon/unverified markets from appearing operational. Do not infer live production state from source fixtures.
2. **Quantities:** map each calculator to authoritative, jurisdiction-specific formulas, codes and packaging/product sources; track source, revision/effective date, units, rounding and local review. Test representative inputs, boundaries, no-data cases and NG regression per country before activation.
3. **Valuation/tax:** source current supplier/material indexes and FX with timestamps, coverage, provenance and outage/staleness behavior. Separate local material quotes, inflation indices, display FX, transaction conversion and tax computation. Have a qualified local tax reviewer approve each jurisdiction; no tax rate or index is to be generated from assumptions.
4. **Workforce:** define country-specific credential/license/insurance/safety requirements with the relevant authorities and accepted verification methods. Add expiry/revocation monitoring, evidence retention/privacy controls, reviewer audit logs and negative tests. Until then show submitted/verified status precisely, not a blanket compliance badge.
5. **Timeline/logistics:** obtain provider-backed shipping/customs lead-time data and official local holiday calendars, add site-level location and schedule inputs, and reconcile calendar dates with working-day durations. Treat probabilistic forecasts as estimates with data coverage and uncertainty, never guarantees.

**Activation gate for every country and engine:** primary/authoritative source or contracted live provider; accountable local reviewer; market-specific automated tests; visible source, date, coverage, confidence and fallback state; tested outage/stale/offline behavior; integration credentials configured securely where required; end-to-end review; monitoring and rollback owner. Until these checks pass, label the engine **partial/unverified** or the market **coming soon**. No code/data activation was safe to make in this audit without the missing jurisdictions, source datasets, providers and review evidence; only this documented readiness/implementation plan is being added now.

---

## 2. INCOMPLETE, PENDING, PARTIAL & UNVERIFIED WORK (Active Queue)

The following items represent all outstanding, in-progress, or unverified work on the platform. All completed and verified past batches (including mobile viewport collisions, sticky stepper offsets, search-bounded market selector, CI migration deduplication, ESLint explicit-any cleanups, plumbing fittings, doors/windows price books, AI credit wallet hardening, **Section 2.C Structural Methodology & Engineering Adapters**, and **Section 2.D UI/UX Dark Mode & 5-Pillar Navigation Reorganization**) have been pruned.

### A. Rebar Books Expansion (PARTIAL / INCOMPLETE)

- **Status**: PARTIAL (verified live 2026-10-14: US, NG, DE/AT, AU,
  GB, and CA 10M/15M/20M (CSA G30.18) all have live market prices —
  GB/CA pruned from outstanding).
  - Outstanding:
    - **GB**: mill/trade bundle price ratios pending.
    - **Top-30 Expansion Markets**: France, Italy, Spain, Japan, South Korea,
      China, Indonesia, Mexico, Brazil, India, South Africa, Ghana, Kenya,
      Egypt, Saudi Arabia, UAE require verified rebar price books backed by
      named distributor catalogs / physical store surveys (no migrations exist yet — checked 2026-10-14).
      *Constraint*: Do not seed prices from AI memory or synthetic guesses.

### B. Price Campaign Remainder (176 Low-Confidence Rows, live count 2026-10-14) (PENDING)

- **Status**: PENDING (Requires Live Production Supabase Access)
- **Goal**: Audit all rows in `estimation_prices` where `scan_confidence = 'low'` or `price_source` lacks an attributable URL/survey.
- **Action Required**:
  - Replace estimated numbers with verified distributor prices.
  - Upgrade confidence to `scan_confidence = 'manual'` and record verifiable provenance.
  - *Constraint*: Cannot be executed without Supabase Management API access to project `nfgaaohweygwydoelxnf`.

## I. Phase 1 Save → Share → Pro Connect Journey (PLANNED)

See [`docs/phase1-save-share-pro-connect-roadmap.md`](docs/phase1-save-share-pro-connect-roadmap.md) for this journey’s implementation sequence and acceptance gates, and [`roadmap.md`](roadmap.md) for the broader global-operations engines backlog. Existing foundations include anonymous calculator use/device saves, Google sign-in, calculator-to-contractor-project saves, share-link records/shared routes, and Pro Connect profiles. The remaining work is end-to-end integration and verification, not a claim that these foundations are missing.

- [ ] Keep calculating/exporting free and anonymous; make cloud save an optional sign-in gate that resumes the intended save after Google OAuth. Keep local/device saves clearly distinguished; do not silently upload them.
- [ ] Enable phone sign-in only after production SMS provider, country coverage, abuse protection, delivery, and redirect configuration are verified. Pro Connect phone confirmation alone is not general app phone authentication.
- [ ] Reconcile saved calculator records (`contractor_projects`/project calculations) with the existing `/shared/:id` path that reads `user_projects` before shipping “Share Live Project Link.” Build a read-only, least-data public view with owner preview, explicit consent, revocation/expiry, and tested anonymous access; never expose addresses, contacts, private notes or unrelated project records by default.
- [ ] Add a contextual screeder discovery card only for screeding work and actual trade/service-area matches. Do not hard-code a result count or say “near you,” “vetted,” “verified,” or “available” beyond what current matching evidence supports; ask for an appropriate location when missing and keep project data private.
- [ ] Verify auth-resume, save-once, owner isolation/RLS, share privacy/revocation, Pro Connect match/empty/stale states, mobile accessibility, migration replay, production build and deployed behavior before marking this journey operational.

## 3. VERIFICATION COMMANDS & RUNTIME ENVIRONMENT

Before committing any change to the repository, run these exact verification commands:

```bash
# 1. Strict TypeScript type check (must produce zero errors)
npx tsc --noEmit -p tsconfig.json

# 2. Run unit & estimation tests
npx vitest run src/lib/estimation/__tests__

# 3. Production Vite build check
npm run build
```

### Database Verification Queries (Supabase Management API)

Verify live price book counts after migration runs:

```sql
-- Check active prices by market
SELECT market, count(*)
FROM estimation_prices
WHERE is_active = true
GROUP BY market
ORDER BY count(*) DESC;

-- Check confidence breakdown
SELECT scan_confidence, count(*)
FROM estimation_prices
GROUP BY scan_confidence;
```
