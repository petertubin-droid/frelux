# FRELUX — Global Expansion & Platform Architecture Handoff

Last updated: October 14, 2026
Authoritative repository: `petertubin-droid/frelux` (branch: `main`)
Active Supabase Project Ref: `nfgaaohweygwydoelxnf`

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

### B. Severe Usability Defects & Viewport Collisions

#### 1. Sticky Action Bar Overlapping Mobile Bottom Navigation

- **Affected Files**: `src/components/ui/StickyActionBar.tsx`, `src/components/ui/MobileBottomNav.tsx`
- **Observed Defect**:
  - `StickyActionBar` is styled with `sticky bottom-0 z-30`.
  - On mobile viewports (`md:hidden`), `MobileBottomNav` is styled with `fixed inset-x-0 bottom-0 z-30`.
  - On mobile devices, both bars occupy the exact same viewport coordinates (`bottom: 0px`, `z-index: 30`). When users scroll through any estimator (Paint, Tile, Screeding, Build-to-Roof, BOQ), the primary action bar (Save, Export, Share, Recalculate) directly collides with and obscures the 5 bottom navigation tabs (Home, Tools, Market, Projects, Rewards). Buttons become unclickable or trigger the wrong action.
- **Recommended Fix**:
  - Update `StickyActionBar.tsx` to offset for the mobile navigation height:
    ```tsx
    // Add bottom offset on mobile, reset on md screens
    className = "sticky bottom-16 md:bottom-0 z-30 ...";
    ```
  - Alternatively, dynamically compute padding with CSS safe-area variables:
    `bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0`.

#### 2. Fixed Navbar Obscuring In-Page Sticky Steppers & Subheaders

- **Affected Files**:
  - `src/pages/BuildToRoofEstimator.tsx:674` (`sticky top-0 z-30`)
  - `src/pages/ProjectDetail.tsx:247` (`sticky top-0 z-10`)
  - `src/pages/contractor/ProjectDashboard.tsx:852` (`sticky top-0 z-20`)
- **Observed Defect**:
  - The global `Navbar` (`src/components/layout/Navbar.tsx`) is declared as `fixed top-0 z-40 w-full` with a fixed height of `h-16` (64px).
  - Multi-step estimators and sub-dashboards declare internal steppers with `sticky top-0`.
  - As the user scrolls down, these subheaders stick at `0px` from the top of the viewport—slipping completely behind the 64px fixed Navbar. Stepper progress bars, step labels, and sub-tab controls become invisible or impossible to tap.
- **Recommended Fix**:
  - Change all in-page sticky sub-bars to `sticky top-16` (64px offset) so they dock flush directly beneath the main navbar:
    ```tsx
    <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur-lg ...">
    ```

#### 3. Market / Country Selector Dropdown Viewport Overflow

- **Affected File**: `src/components/ui/MarketSelector.tsx`
- **Observed Defect**:
  - In desktop dropdown mode, `MarketSelector` renders all active markets using an unconstrained `absolute` dropdown container without `max-h` or `overflow-y-auto`.
  - With 20 active markets (and expanding toward 39+), 39 items at 42px each equals 1,638px tall. On standard laptop screens (1080p, 768p, 900p), the dropdown falls far below the bottom edge of the monitor. Half the countries cannot be seen or clicked.
  - In mobile drawer mode (`inline`), expanding Market renders 39 stacked full-width buttons, pushing all other navigation links completely out of view.
  - There is no search filter, forcing users to scan through dozens of unsorted items.
- **Recommended Fix**:
  - Replace the flat list with a searchable combobox/popover:
    ```tsx
    <div className="max-h-72 overflow-y-auto divide-y divide-border/20 ...">
      <input
        type="text"
        placeholder="Search country or currency..."
        className="..."
      />
      {/* Grouped by Continental Region: Americas, Europe, Africa, Asia-Pacific */}
    </div>
    ```

#### 4. Intrusive First-Visit Splash Interruption (`EntryExperience.tsx`)

- **Affected File**: `src/components/entry/EntryExperience.tsx`
- **Observed Defect**:
  - First-time visitors are presented with a full-screen blocking modal overlay ("FRELUX Smart Calc") that prevents them from seeing the homepage content until they click "Explore FRELUX" or press Escape.
  - This increases initial bounce rates, disrupts SEO spiders, and annoys users who arrive looking for an immediate calculation.
- **Recommended Fix**:
  - Retire the blocking full-screen overlay in favor of an inline, interactive hero section with immediate interactive inputs, or a non-blocking onboarding banner.

#### 5. Tables Overflowing Viewports on Mobile Screens

- **Affected Files**: `src/pages/MaterialPrices.tsx`, `src/pages/Printables.tsx`, `src/components/brand-studio/BrandPreview.tsx`
- **Observed Defect**:
  - The live price table on `MaterialPrices.tsx` is wrapped in an `overflow-hidden` container lacking `overflow-x-auto`.
  - On mobile screens (375px–414px), multi-column tables with material name, pack size, price, source, and date exceed screen width, clipping the price and source columns.
- **Recommended Fix**:
  - Always wrap tabular output in `<div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">` with responsive card-view alternatives on mobile viewports.

---

### C. Information Architecture & Navigation Restructuring

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

### D. Internationalization (i18n), Localization (l10n) & Standards

#### 1. Native Internationalization vs Google Translate Dependency

- **Current Issue**:
  FRELUX currently relies on the Google Translate script for whole-page body translations. In regions where Google APIs are blocked or restricted (notably Mainland China `CN`, an active target market), or when visitors use ad-blockers/privacy shields, the translation widget fails completely.
- **Recommended Fix**:
  - Implement native, typed dictionary translation (`src/lib/i18n/locales/*.json`) for all core UI chrome, navigation items, calculator labels, and error messages.
  - Retain Google Translate strictly as an optional on-the-fly translation tool for long-form Learn Hub articles.

#### 2. International Contact & Regional Identity

- **Current Issue**:
  A single Nigerian WhatsApp number (`+234 906 361 2439`) is displayed in the footer and help components regardless of which market is selected. International visitors from the US, UK, Germany, or Japan find this jarring and suspect the platform is not intended for their region.
- **Recommended Fix**:
  - Dynamic contact routing in `src/config/site.ts`:
    - Default international contact: Dedicated email ticketing system (`support@frelux.com`) with a 1-business-day response SLA.
    - Regional contacts: Display market-specific contact options, verified local partner links, or regional business hours based on the user's active `marketCode`.

#### 3. Measurement Units (Imperial vs Metric)

- **Current Issue**:
  Some estimators support imperial/metric toggling via `UnitToggle`, while others enforce metric meters/millimeters or fail to adapt default standard dimensions (e.g. US drywall standard is 4×8 ft, UK block standard is 440×215 mm).
- **Recommended Fix**:
  - Enforce a centralized `useUnit()` context that synchronizes with `useMarket()`:
    - US market automatically defaults to Imperial (`ft`, `in`, `sq ft`, `lbs`).
    - European and African markets automatically default to Metric (`m`, `mm`, `m²`, `kg`).
  - Provide a one-click persistent toggle on every calculator header that recalculates and updates input fields without resetting user entries.

#### 4. Currency Formatting & Decimal Rules (ISO 4217)

- **Current Issue**:
  Certain currencies are displayed with improper decimals (e.g. Japanese Yen `JPY` and South Korean Won `KRW` do not utilize cents/subunits, whereas `USD` and `EUR` require 2 decimal places).
- **Recommended Fix**:
  - Centralize currency formatting through a standardized helper utilizing `Intl.NumberFormat`:
    ```ts
    export function formatMarketCurrency(
      amount: number,
      market: MarketProfile,
    ): string {
      return new Intl.NumberFormat(market.locale, {
        style: "currency",
        currency: market.currency_code,
        minimumFractionDigits: market.decimal_digits ?? 2,
        maximumFractionDigits: market.decimal_digits ?? 2,
      }).format(amount);
    }
    ```

---

### E. Form Design, Inputs & Estimation Ergonomics

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

### F. Dark Mode, Accessibility (WCAG 2.1 AA) & Performance

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

**Audit basis:** source review at `1e9ee0b3b374941cd46006a8be4f60cb887b5aef` (`main`), especially `docs/ARCHITECTURE.md`, `docs/INTERNATIONAL_20_MARKET_AUDIT.md`, the engine pages/modules named below, and relevant Supabase functions/migrations. This is a repository capability audit, not a live deployment, integration credential, regulatory, or security certification. A route, engine registry row, schema, TODO, or AI claim is not proof of an operational capability. **None of the 12 end-to-end global engines below is verified as complete against the requested production standard.** Preserve useful partial implementations; do not relabel them as complete.

### Evidence-based status by requested engine

| Business function / engine | Status in FRELUX | Evidence and remaining gap |
| --- | --- | --- |
| **BIM & CAD rendering (3D/4D/5D, clash detection)** | **PARTIAL: IFC takeoff only** | `src/pages/BimIfcImport.tsx` and `src/lib/estimation/ifc-parser.ts` parse a constrained subset of plain-text IFC/STEP in-browser and report elements and quantities declared by the file. This is not a 3D model viewer, CAD renderer, 4D schedule or 5D cost model, model federation, or clash-detection system. `.ifczip` is not supported. Build a standards-tested IFC import/validation pipeline and interactive model viewer first; add versioned model federation, georeferencing, schedule/cost linking, measurable clash rules, and auditable issue workflows. Never claim model compliance from a takeoff. |
| **Geospatial / GIS** | **NOT FOUND as a GIS engine** | Repository search found browser geolocation/weather-location support, but no operational GIS stack for geospatial project layers, satellite/drone imagery, ArcGIS data, coordinate reference systems, or infrastructure progress mapping. Build project/site maps with explicit coordinate systems and licensed/provider-backed imagery/data connectors; add source/date/coverage and unavailable-data disclosure. Do not infer GIS support from geolocation. |
| **Predictive analytics & AI (delay, cost, safety)** | **PARTIAL: deterministic project signals** | `src/lib/predictive-intelligence/` has evidence-backed cost, schedule, market-trend, and procurement analyses/risk register. `price-forecast-engine.ts` fits a least-squares trend to recorded material-price history. These are not a validated historical project-outcome model or safety-risk system; no live wearables/site-camera feed was found. Define outcome labels, assess representative regional data quality/bias, back-test and calibrate forecasts, provide uncertainty and evidence, and keep safety outputs decision-support only until independently validated. |
| **Tax & currency conversion** | **PARTIAL: display FX and formats, not global tax/settlement** | `currency-context.tsx` fetches keyless FX rates (12-hour cache) for display, allows admin overrides, and falls back to configured rates / NGN presentation when unavailable; formatting helpers exist. The architecture documents a Stripe path that is unavailable until configured. No end-to-end region-specific VAT/GST/sales-tax determination, tax invoice treatment, real-time settlement conversion, fee handling, or legally validated tax engine was demonstrated. Build separate dated tax-jurisdiction rules and transaction/settlement conversion with provider reconciliation; show rate source/time, fees, rounding, and failure behavior. Never imply display conversion is a payable amount. |
| **Regulatory compliance & standards** | **PARTIAL: sourced evidence registry** | `docs/INTERNATIONAL_20_MARKET_AUDIT.md` documents a construction-standards evidence registry with 16 verified entries across 10 markets, and the repository has localized construction profiles. This is not comprehensive jurisdiction coverage or automated blueprint/model checking for OSHA, Eurocodes, ISO, environmental or local building rules. Build a versioned, jurisdiction-and-project-type scoped rules/evidence catalog with primary-authority source, effective dates, applicability, amendments and expert review; only then add deterministic checks that cite exact provisions and report unknowns. No AI-only compliance certification. |
| **Multi-language technical translation** | **PARTIAL: translated UI chrome** | `src/lib/i18n.tsx` supports 11 locale routes and translated chrome, with English fallback; its own comments state route content is not fully translated and Google Translate remains a convenience for whole-page translation. No reliable technical-document, blueprint annotation, safety-manual or field-log translation workflow with terminology review/versioning was found. Build terminology-managed, human-reviewable document translation, preserve source and units, handle RTL, and clearly distinguish machine translation from approved safety instructions. Offline operation and protected-data handling need explicit tests. |
| **Workflow & automation (RFI, submittals, change orders)** | **PARTIAL: selected approvals, not construction control plane** | Estimate approval/client review, marketplace order milestones, and admin approval flows exist. No end-to-end, auditable RFI/submittal/change-order pipeline was demonstrated across owner, GC, subcontractor and region. Build configurable states, assignees, due dates, permissions, attachments/revisions, notifications, immutable audit history, escalation, and export/API integrations; test cross-role handoffs and offline conflicts. |
| **IoT & telematics** | **NOT FOUND** | No operational ingestion/adapters for equipment telematics, wearables, site cameras, MQTT/event streams, device identity, or safety monitoring were found. Build a consented and secured device integration layer with identity/provisioning, timestamps, quality/retention controls, alert thresholds, and site/worker privacy safeguards. Do not fabricate sensor states or use unvalidated alerts for safety decisions. |
| **Global procurement & logistics** | **PARTIAL: marketplace and price intelligence** | FRELUX has marketplace listings/orders and supplier/price-intelligence modules, but repository evidence does not establish globally vetted suppliers, inventory/availability, quotes-to-purchase-order fulfillment, customs, shipment tracking, or delivery-to-site chain of custody. Build market-specific supplier verification, comparable spec/units, quote/PO approvals, stock/lead-time evidence, shipment status and exception reconciliation. Clearly separate listed, quoted, ordered, dispatched and delivered states. |
| **Fintech, escrow, lien waivers & AML** | **PARTIAL: checkout and milestone planning only** | Payment-provider checkout/webhooks and a deterministic milestone schedule exist. `escrow-intelligence.ts` explicitly makes ARCHIE advisory-only and leaves custody/release/refunds to an authorized provider. Stripe is configuration-dependent. No regulated escrow custody, construction milestone fund release, jurisdiction-appropriate lien-waiver lifecycle, or AML/KYC/sanctions screening capability was established. Treat regulated money movement/compliance as an external-provider and legal-partner integration, never a software-only claim; build provider-backed ledger/reconciliation, role approvals, audit/dispute controls, and jurisdiction review before production use. |
| **Sync & offline-first field data** | **PARTIAL: local calculator cache and field-capture queue** | `src/lib/offline-store.ts` caches previously fetched reads and drafts in `localStorage`; `src/lib/estimation/offline-field-engine.ts` queues field captures locally and syncs when connectivity returns. This is useful offline behavior, but not a verified multi-user, multi-device, encrypted offline project-data engine for blueprints, attachments and concurrent edits. Build durable storage, encryption/identity handling, conflict resolution, retry/backoff, sync status/audit, attachment limits, and device-loss/reinstall recovery tests; never promise unsynced data survives browser storage loss. |
| **RBAC / clearance and region-scoped security** | **PARTIAL: application auth, roles and database RLS exist** | Auth, feature access, project roles and numerous RLS policies exist. This audit did not verify that every sensitive route/table/action enforces least-privilege access by project, organizational role, region and clearance, nor independent security testing. Build a permission matrix and threat model; inventory every route, RPC, edge function, table, storage object and integration; enforce and test tenant/project/region/clearance boundaries server-side with audit logging, revocation and negative cross-tenant tests. Do not describe the platform as government/high-assurance compliant without independent evidence. |

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

| Engine | Current evidence | Operational status and gap |
| --- | --- | --- |
| **Estimation & quantities / material standardization** | `src/lib/international/units-display.ts` converts displayed measurements; market-specific material rules can be fetched from `market_material_rules`; price-book material roles resolve through market mappings and effective prices. `market-profiles.test.ts` explicitly treats NG as active and GB/US/CA/AU/ZA/AE as coming soon in its seeded facts. | **PARTIAL; not verified for every represented country.** Display-unit conversion does not itself change calculation formulas, structural standards, product pack sizes, or purchase rounding. Verify each estimator's consumption of market rules, package dimensions, rule provenance/effective dates, missing-rule behavior, and tests by market before enabling a priced/material quantity workflow. No Nigerian standard may be used for another market unless clearly disclosed and accepted as a reference only. |
| **Market pricing & valuation** | Material prices can carry market, currency, source and effective-date provenance; role-based resolution returns the supplying market. Regional cost adjustments exist as configured factors. `fx-live.ts` fetches NGN-based display FX and caches it for 12 hours; `fx-display.ts` explicitly describes conversion as display-only. | **PARTIAL; no verified global valuation/tax engine.** Display FX is not local material valuation, inflation indexing, tax determination, invoice calculation, or settlement. A regional factor is not a source-backed, maintained cost index. No comprehensive country/jurisdiction tax rules and live supplier-index coverage were established. Add only dated and source-attributed local data; provide clear stale/missing/fallback disclosure; require local tax review before any tax output is represented as due. |
| **Global workforce compliance / Pro Connect** | Pro Connect has identity/profile verification and a `pro_credentials` workflow with professional body, credential type, expiry and admin-reviewed verified status. | **PARTIAL; not operationally global.** The generic credential fields do not encode jurisdiction, issuing authority registry, scope/class, good-standing status, insurance policy/coverage, occupational safety training, or renewal and revocation checks. A manually marked verified credential is not proof of regulator validation. Require country-specific authoritative verification sources and auditable human review; do not claim a worker is compliant or licensed in a country until its rules and integrations are verified. |
| **Project timeline & predictive logistics** | `timeline-estimator.ts` provides deterministic stage-duration heuristics; market-scoped climate profiles change season choices/notes and carry an explicit heuristic disclaimer. `ProjectTimeline.tsx` passes the selected market code. The end-date calculation now counts Monday-Saturday workdays and discloses excluded holidays/logistics. | **PARTIAL; not a predictive logistics engine.** No shipping/carrier status, customs lead-time source, port/border disruption feed, local public-holiday calendar, or region-level weather/season data integration was established. Season multipliers are planning heuristics, not calibrated measured productivity. The six-day date correction is market-neutral and does not provide country-specific calendars or logistics. |

### Market-by-market rollout order (owner priority, confirmed 2026-10-14)

Process one country at a time. Complete evidence review, scoped implementation, tests and operational verification for a country; then update both handoff files with its evidence, status, changed capabilities, test results and remaining blockers before beginning the next country. Do not bundle unverified countries or mark a country operational because a previous market passed. Priority sequence: **US → UK (`GB`) → China (`CN`) → Italy (`IT`) → Nigeria (`NG`) → The Gambia (`GM`) → United Arab Emirates (`AE`) → every remaining country currently represented in FRELUX, one at a time.** `GM` is the ISO country code for The Gambia; Germany is `DE` and is not inferred from `GM`. If a country has no authoritative source/provider or accountable local review, document that blocker and keep the affected capability visibly partial/unverified rather than fabricating or skipping the gate.

### US market closeout (priority 1; audit only, 2026-10-14)

- **Operational decision: NOT VERIFIED END TO END; runtime activation is inconsistent/unconfirmed.** The built-in profile in `src/lib/international/market-context.tsx` labels US active/visible, while `src/lib/international/market-profiles.test.ts` records the seeded US market as `coming_soon`, hidden, and unsupported for priced calculations. The provider initially exposes built-ins and only replaces them with visible database rows; failed/empty profile queries can leave the active built-in profile in effect. Without a live registry read, we cannot say US is inactive in production. Reconcile the fallback/seed state and capability gating before any claim of operational coverage.
- **Quantities/standards:** US customary display units and local terminology exist, but they do not establish US-specific formulas, package sizes, jurisdiction-adopted building codes, or calculation engine integration. No national/local code review or source-backed package rules were verified.
- **Pricing/tax:** USD profile and general FX display conversion exist; no verified US market price book, current local materials index/inflation feed, sales/use tax calculation by jurisdiction, or live supplier coverage was established. FX display conversion is not local pricing or tax computation.
- **Workforce compliance:** generic document/credential submission and admin review exist; no US state/local license-board, insurance, or safety-certification verification workflow was verified.
- **Timeline/logistics:** a six-day-week end-date correction is now tested and published; no US federal/state/local holiday calendar, site-specific weather feed, carrier/customs/logistics integration, or calibrated US productivity model was verified.
- **Changes made for US:** none. No jurisdiction data, provider or local reviewer evidence was available to safely change US market behavior. US engine readiness remains unverified; runtime may still advertise it as active. Reconcile that behavior and pass the per-engine activation gate below before claiming operational coverage. Next priority is **UK (`GB`)**, after this US closeout.

### UK market closeout (priority 2; audit only, 2026-10-14)

- **Operational decision: PARTIAL; end-to-end active status is NOT VERIFIED.** Built-in profile `GB` is marked active/visible and sets GBP/metric defaults. The seeded-facts test still expects GB `coming_soon` and hidden, while source includes GB pricing and UK-specific configurations. `market-context.tsx` merges profiles from the live database over built-ins; a source checkout alone cannot establish the production registry row or what a user currently sees. Resolve this contradictory availability state against the live registry before claiming global engine activation.
- **Quantities/standards:** code has GB wall assemblies/methodology and UK construction nomenclature; migrations include specific material products/sizes and references to BS-based electrical, drainage and reinforcement practice. That is evidence of scoped GB capabilities, not proof that every estimator uses authoritative formulas, that all regional building-control/code variations are covered, or that package/rounding rules are validated end to end. The 2026-10-14 comprehensive engine inventory makes broad `verified` declarations, but those declarations alone do not establish operational acceptance evidence for each calculation.
- **Pricing/tax:** GB GBP material price rows and source notes exist for finishing, plumbing, electrical, reinforcement and doors/windows. Some price notes are estimates, derived values, pending scan approval or dated web listings; they are not a live supplier index or inflation feed. Retail listings include VAT in some cases, but no verified jurisdiction/site-sensitive VAT engine, transaction tax handling, or robust current price refresh/outage process was established. FX display conversion remains distinct.
- **Workforce compliance:** generic Pro Connect document/credential review exists; no UK regulator register or trade-specific competency, insurance and safety evidence integration was verified.
- **Timeline/logistics:** stage heuristics and a broad climate profile exist; no UK bank/public-holiday calendar, construction-site region scheduling, measured GB productivity calibration, port/carrier/customs data or logistics forecast integration was verified.
- **Changes made for GB:** none. Existing source-backed UK-specific catalogs/configurations are acknowledged, but no additional market behavior was safe to activate without resolving profile state and verifying engine integration/data freshness. GB remains **partially configured, not fully operational across the four target engines**. Next priority: **China (`CN`)**.

### China market closeout (priority 3; audit only, 2026-10-14)

- **Operational decision: PARTIAL / NOT VERIFIED END TO END.** The built-in `CN` profile is active and visible with metric units, CNY and Chinese language defaults. The profile-registration migration describes the row as profile-only and says local products/prices were not validated for calculator use. The ranking snapshot from 2026-10-13 reports zero price-book rows, role mappings and scan sources, but is stale relative to newer country-specific migrations; no live database query was available to establish current applied rows or effective production gating. Do not treat either source snapshot as a live operational check.
- **Quantities/standards:** local terminology and selected CN typology/wall, plumbing and electrical profiles exist; electrical/plumbing code references and some quantity configurations are present. These do not establish code-adopted region-specific structural calculations or end-to-end quantity and package coverage for the full estimator suite. The comprehensive inventory marks several CN structural engines partially verified and finishing engines as requiring verification; that conflicts with broader generic inventory declarations and must be reconciled against tested executable paths.
- **Pricing/tax:** repository has recent scoped CN electrical and doors/windows price-book migrations, with prices/currency and source notes. Existing scanner reference prices and market-profile terminology are not equivalent to deployed current supplier quotes. Source migrations postdate the ranking snapshot; active deployment, role mappings, coverage breadth, freshness, sales/VAT handling and regional delivery costs have not been confirmed. No live local cost index/inflation or tax engine was verified.
- **Workforce compliance:** no China-specific issuing-authority license/insurance/safety verification workflow was found; generic manual credential review is insufficient to claim compliance.
- **Timeline/logistics:** CN climate/season and heuristic timeline configuration exist but are not region-calibrated productivity or date data. No China national/provincial holiday calendar, local work-rest calendar, customs/shipping or carrier integration was verified.
- **Changes made for CN:** none; no live deployment verification, local reviewer or authoritative full-engine evidence was available. Market profile is active/visible in code, but full accuracy and operational coverage are not established. Existing profile notes include “GB standards” in a China admin note; treat this as a suspected metadata error to correct only against approved China-specific sources. Next priority: **Italy (`IT`)**.

### Italy market closeout (priority 4; audit only, 2026-10-14)

- **Operational decision: PARTIAL / NOT VERIFIED END TO END.** The built-in `IT` profile is active/visible, metric/EUR/Italian-language, and inherits unspecified values from Germany (`DE`). The country-registration migration explicitly calls itself profile-only and says Italy-specific prices/product specifications are not validated; inheritance is not evidence of Italian operational coverage. The ranking snapshot reports 8 price rows, 0 role mappings, 0 scan sources and low coverage, but it is a 2026-10-13 snapshot that predates some repository migrations. No live registry or deployed migration query was available; do not claim the rows are live or current.
- **Quantities/standards:** Italian-language and metric settings, a typology, climate heuristic, and dedicated electrical/plumbing profiles are in source. Repository migrations contain Italian electrical and doors/windows books and an Italy-specific plumbing book with source notes and national/European standard references. The inventory records finishing calculators as requiring verification, structural estimates as partial and selected MEP as verified. Those declarations do not replace tests against local building-code applicability, regional rules, package sizes and end-to-end calculators. No full Italy quantity/material standards review is evidenced.
- **Pricing/tax:** Italy-specific catalog/price rows exist in repository migrations, including retail listings whose notes say IVA-inclusive. This is a bounded reference book, not a live nationwide price index, verified inflation feed, regional delivery valuation or tax engine; migration execution, source availability/freshness, coverage and VAT treatment across estimates remain unconfirmed. The `IT` profile inheriting `DE` makes unchecked German fallbacks a particular risk; preserve null/unavailable behavior absent an explicit Italian mapping.
- **Workforce compliance:** no Italy-specific professional register, trade qualification, insurance or safety credential verification workflow was found; generic manual review cannot establish compliance.
- **Timeline/logistics:** Mediterranean/alpine season options are heuristics, not validated regional weather/productivity data. No Italian regional public-holiday/work calendar, carrier/customs data or logistics forecast integration was verified.
- **Changes made for IT:** none; local review, live deployment evidence and verified full-engine coverage are missing. Keep the market visibly indicative/limited and prevent German inherited data from being represented as Italian-verified. Next priority: **Nigeria (`NG`)**.

### Nigeria market closeout (priority 5; audit only, 2026-10-14)

- **Operational decision: ACTIVE BASE MARKET; NOT VERIFIED FOR COMPLETE ACCURACY ACROSS THE FOUR ENGINES.** `NG` is the default active/visible profile and the `market-profiles.test.ts` seeded-facts fixture confirms it as active. The internal 2026-10-13 ranking snapshot reports high coverage (34 price rows, 16 role mappings, 4 scan sources), and newer source migrations add bounded Nigerian electrical/door price books. This is materially more evidence than expansion markets, but snapshots and migrations are not live production proof; the coverage count is not full-market price coverage.
- **Quantities/standards:** NG terminology, mixed customary/metric defaults and dedicated Nigerian electrical, plumbing, typology and wall-methodology profiles exist; the engine inventory marks many Nigerian calculators verified. This establishes an active, localized foundation, not third-party sign-off of every formula, package size, quantity, or code application. Verify each operational calculator and source/effective dates before calling all quantity paths accurate.
- **Pricing/tax:** NGN price books, mapped roles, four scan sources and source-dated catalog examples exist. Missing and explicitly unpriced roles remain (including several custom fabricated/bundled door and window items); some catalog prices are survey estimates or pending scan. Do not present them as universal live market rates. No comprehensive live inflation/index engine or Nigerian tax determination workflow was verified. Maintain provenance, coverage and stale/missing disclosures.
- **Workforce compliance:** Pro Connect identity and credential submission/admin review are implemented as a generic workflow. A national, trade-specific regulator verification, insurance, safety training, expiry/revocation integration was not established; the baseline does not justify a blanket compliance claim even in NG.
- **Timeline/logistics:** base stage durations are explicitly described as Nigerian construction labour productivity heuristics; NG has a tropical wet/dry profile and rainy-season notes. The published six-day workweek date correction is tested, but not a measured NG regional productivity model or official holiday/site calendar; no supplier availability, transport or delivery-delay feed was verified. Heuristics must remain disclosed planning estimates.
- **Changes made for NG:** none. Active home-market foundation confirmed; end-to-end accuracy, live database freshness, workforce compliance and predictive logistics remain unverified. Next priority: **The Gambia (`GM`)**.

### The Gambia market closeout (priority 6; unsupported / audit only, 2026-10-14)

- **Operational decision: NOT REPRESENTED / NOT OPERATIONAL.** The canonical country selector `src/lib/international/countries.ts`, built-in market profiles, market-specific engineering/estimation profiles, ranking snapshots and country-specific migrations contain no `GM`/Gambia entry. `GM` appears only in this rollout instruction. Germany is `DE`; it is not a substitute.
- **Quantities/standards:** no Gambia-local construction, packaging, quantity or code profile was found. NG regional defaults or Ghana/UK/Africa profiles are not verified Gambian standards and must not be silently applied.
- **Pricing/tax:** no Gambian Dalasi (GMD) market price book, local suppliers/index, tax regime, FX valuation or tax calculation is configured. Do not convert NG prices and present them as Gambian.
- **Workforce compliance:** no country-specific professional/trade licensing, insurance, regulator or safety verification configuration was found.
- **Timeline/logistics:** no Gambian work calendar, weather/productivity calibration, customs/carrier feed or logistics profile was found.
- **Changes made for GM:** none; this requested country is not currently represented by the market implementation. Add it only after approved country data, authoritative/local reviewers and a full country activation gate are available. Next priority: **United Arab Emirates (`AE`)**.

### United Arab Emirates market closeout (priority 7; scoped safety fix, 2026-10-14)

- **Operational decision: PARTIAL / NOT VERIFIED END TO END.** Built-in `AE` profile is active/visible with AED, metric defaults and Saudi/GCC inheritance. `market-profiles.test.ts` records AE as `coming_soon`, hidden and unsupported for priced calculations. The database override/fallback behavior means neither code nor test fixtures establish what production users currently see; resolve the availability discrepancy before any activation claim.
- **Quantities/standards:** UAE-specific wall/masonry, typology, climate, electrical and plumbing profiles exist. Source migrations include UAE role mappings, selected finish systems, construction-standard evidence, and specific UAE electrical material and doors/windows prices. This is meaningful scoped implementation, not proof that all quantity methods and emirate/authority-specific codes are validated end to end. Role mapping source itself contains an interior-paint product/pack mismatch marked admin review pending.
- **Pricing/tax:** AED pricing rows for selected UAE electrical and door materials and a ranking snapshot (8 book rows, 7 roles, 0 scan sources as of 2026-10-13) exist in repository sources. They are limited, migration/live-application state unverified, and not a maintained current supplier index, inflation feed, tax/VAT engine or proof of broad regional coverage. **Safety fix this closeout:** `price-scanner.ts` incorrectly mapped UAE (`AE`) to the US reference catalog while labelling reports AED. Replaced this with an explicitly empty AE reference catalog and regression test, so unsupported reference items are not presented as UAE prices. The separate UAE-specific SQL catalogs remain available to their configured database pathways; this change does not verify deployment or current quotes.
- **Workforce compliance:** no UAE emirate-specific contractor/trade licensing, insurance, safety certification registry integration or renewal/revocation check was established.
- **Timeline/logistics:** hot-desert climate and seasonal timeline heuristics exist, but are not calibrated emirate/site productivity data. No UAE-specific holiday/weekend calendar, border/customs/carrier lead time or logistics feed was verified.
- **Changes made for AE:** removed the US-reference-price alias, added an empty-catalog regression test, updated the catalog-coverage test. Focused `src/lib/estimation/price-scanner.test.ts`: 17 tests passed; `npx tsc --noEmit -p tsconfig.app.json` and `git diff --check` passed. No full suite/build was run for this narrow fix. Remaining operations and four-engine verification are partial/unconfirmed. Next: continue through the remaining represented markets one by one.

### Ghana market closeout (priority 8; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Ghana (`GH`) appears in the country selector and built-in profile as active/visible, metric, GHS, with Ghana-specific terminology. However, `src/lib/international/market-profiles.test.ts`'s seeded-state fixture asserts only Nigeria active and all other markets `coming_soon`; there is no live production query in this audit to resolve the mismatch. Do not claim Ghana is fully operational from profile code or migration files alone.
- **Quantities/standards:** Ghana-specific typology, electrical/plumbing profiles, wall-finishing and selected packaging/material mappings exist. Several engine inventory rows label selected categories verified, but structural/roofing/foundation and other engines are partial. The internal Ghana putty coverage is described as a planning default requiring product-sheet verification. A role mapping has a concrete slug/product-size inconsistency: `gh-emulsion-4l` is documented as 20 L and 295 GHS, with admin review pending. These facts do not validate all takeoff formulas, packs, or Ghanaian/National Building Regulations applications across all engines.
- **Pricing/tax:** Source files describe selected Ghana-specific GHS price books and supplier observations for electrical materials, plumbing, doors/windows, finishes, and construction labor; an internal snapshot (2026-10-13) reported 8 book rows, 8 mappings and 0 scan sources. That snapshot is not a live database check and predates later price-book migrations. The retail catalog also labels several figures indicative/admin-adjustable, and some lack a verified source. The reference scanner has no GH market entry (`ReferenceMarket`, `MARKET_CATALOGS`, or `MARKET_DEFAULTS`); do not route Ghana through another country's scanner references. No verified live comprehensive supplier-index, inflation, FX transaction or Ghana tax/VAT calculation was established.
- **Workforce compliance:** no Ghana regulator-backed trade-license, insurance, safety-certification verification, expiration/revocation monitoring, or national workforce registry integration was verified. Generic Pro Connect identity/document review is not equivalent.
- **Timeline/logistics:** no verified Ghana-specific official working-day/public-holiday calendar, measured local productivity dataset, carrier/customs feed or predictive delay engine was found. West African climate or baseline duration heuristics do not establish this coverage.
- **Changes made for GH:** none; the available evidence is fragmented and includes explicit review-pending product mapping and planning-default quantities. No code or data activation is safe without a live-state check and local technical/product review. Evidence, availability discrepancy and blockers are recorded here; Ghana is **not** certified as fully operational/accurate. Next priority: **Kenya (`KE`)**.

### Kenya market closeout (priority 9; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Kenya (`KE`) is present in the country selector and built-in profile as active/visible, metric and KES. The seeded market test asserts that only NG is active and every non-NG market is `coming_soon`; it does not include KE in its seven-country fixture. No live production-state query was made, so this runtime availability discrepancy remains unresolved.
- **Quantities/standards:** Kenyan typology and machine-cut-stone methodology, electrical profile referencing EPRA/KS IEC 60364, plumbing profile referencing KS 06-149/BS EN 12056, and selected wall-finishing/packaging rules exist. The comprehensive engine inventory marks selected finishing and MEP entries verified but many items partial and several inappropriate/unimplemented; masonry, roofing, foundation and structural takeoffs remain partial. Selected putty/screed coverage is planning guidance subject to product data-sheet validation. A material-role entry has a known identifier/pack mismatch: `ke-emulsion-4l` refers to Crown 20 L at KSh 13,150 and is explicitly pending admin review. This is not blanket Kenya-code or quantity-engine sign-off.
- **Pricing/tax:** Kenyan KES observations/books exist in repository migrations: electrical materials, plumbing, doors/windows and selected finishing items, with local merchants and source notes. The internal 2026-10-13 snapshot reported 8 book rows, 8 role mappings and zero scan sources; later migrations add books, so counts are stale. Many general catalog entries are explicitly indicative/admin-adjustable, and custom fabricated windows/security items are unpriced. Kenya has no dedicated entry in the scanner’s `ReferenceMarket`/catalog/default tables. No verified live comprehensive regional price index, tax/VAT workflow or current FX-transaction operation was established.
- **Workforce compliance:** no Kenyan regulator-backed worker/license/insurance/safety registry integration or expiry/revocation monitoring was verified.
- **Timeline/logistics:** built-in tropical highland/wet-dry profile is a heuristic; no validated county-level productivity dataset, official holiday/work-calendar integration, customs/carrier feed, or predictive logistics operation was verified.
- **Changes made for KE:** none. Source files and selected tests demonstrate localized components, but no live state, exhaustive calculator validation, tax, licensing, and logistics gate. Keep Kenya classified as partial/unverified until those checks pass; next priority: **South Africa (`ZA`)**.

### South Africa market closeout (priority 10; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** South Africa (`ZA`) is a country option and has a built-in active/visible, metric, ZAR profile. However, the seeded profile facts test explicitly marks ZA `coming_soon` and hidden; there is no live production-state evidence here to resolve that conflict. Do not treat migrations or profile code as proof of availability.
- **Quantities/standards:** local SANS/electrical and plumbing profiles, double-skin cavity masonry typology, climate heuristic, wall methodology and RhinoLite finish support exist. Inventory marks some finishing and MEP entries verified, while structural/roof/foundation remain partial and several method-specific tools are explicitly unimplemented. More importantly, the native role-mapping migration records a sand pack mismatch (`za-sand-25kg` slug vs 40 kg product name) and says admin review pending. This does not amount to complete, locally reviewed quantity/code accuracy.
- **Pricing/tax:** Selected ZAR source-dated electrical, plumbing, doors/windows, finishing and labor entries exist in migration files, including locally named merchants. The 2026-10-13 internal snapshot reported 8 prices, 10 roles, 0 scan sources and is stale to later books; several entries are estimates/indicative and some categories are custom/unpriced. The price scanner lacks a South Africa (`ZA`) entry; its `SA` market is Saudi Arabia, and neither market may be substituted for the other. No comprehensive live price-index, tax/VAT workflow, or transaction-FX operation was verified.
- **Workforce compliance:** no South African registration-board/trade-license, insurance, safety credential, expiration/revocation or registry verification integration was established.
- **Timeline/logistics:** climate profile and stage durations are heuristics. No validated province-specific productivity, public-holiday/work calendar or customs/carrier logistics feed was found.
- **Changes made for ZA:** none. Key blockers include profile activation conflict, open product mapping review and missing verified market scanner, broad pricing/tax, workforce and logistics coverage. Keep ZA partial/unverified; next priority: **United States (`US`)** in remaining-market pass (priority countries were previously handled in the user-specified order).

### Canada market closeout (priority 11; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Canada (`CA`) is a country option and built-in active/visible profile, but the seeded profile fixture lists CA as `coming_soon` and hidden, and tests explicitly gate non-NG priced calculations. No live production-state query was made, so the profile/test conflict remains unresolved; do not claim public operational availability.
- **Quantities/standards:** Canadian electrical/plumbing profiles (CEC/CSA and National Plumbing Code), cold-climate/light-frame typology, wall methodology and imperial/mixed measurements are configured. They are selected components, not end-to-end verification across provinces/territories, provincial code adoption, climate zones or all construction engines. Generic structural coverage and site/design-specific engineering remain unverified.
- **Pricing/tax:** Limited Canadian CAD references exist in `price-scanner.ts` for local drywall compound and tape; migration sources add electrical, plumbing, rebar and door/window rows. However, the Canadian role mappings and scan-source migration explicitly show **German cement/sand placeholder slugs** pending a Canadian scan, and some Canadian wall finishing mappings use US product slugs at CAD price. The 2026-10-13 ranking snapshot reported only 2 book rows, 8 roles and 5 scan sources; it predates subsequent migrations and is not live verification. Do not represent those placeholders as validated local products. No provincial/territorial sales-tax determination, current comprehensive construction cost index or FX transaction engine was verified.
- **Workforce compliance:** no province/trade-specific license registry, insurance, safety-training verification, renewals or revocation integration was found.
- **Timeline/logistics:** cold-climate typology is configured, but no province-specific productivity calibration, official holiday/working-day calendar, customs or carrier data, or predictive delivery-delay feed was verified.
- **Changes made for CA:** none. Correcting the explicit cement/sand placeholders requires authoritative local product mappings and reviewing whether current deployed resolver behavior exposes inherited/placeholder values; production migration state and availability are not proven here. Keep CA partial/unverified. Next remaining market: **Australia (`AU`)**.

### Australia market closeout (priority 12; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Australia (`AU`) is a built-in active/visible, metric, AUD profile and country option. Yet seeded market facts/tests mark AU coming-soon and hidden, and priced calculations are gated; no live database read was performed to reconcile the state. Do not assert live AU availability from source configuration.
- **Quantities/standards:** Australian metric terminology, local light-frame/typology and wall methodology, electrical profile (AS/NZS 3000) and plumbing profile (AS/NZS 3500) exist. The engine inventory marks some finishing, masonry/roofing and selected MEP capability, but marks many finish methods (including doors/windows and waterproofing) not implemented, and other engines partial or requiring verification. These are not a complete state/territory/code-specific quantity suite.
- **Pricing/tax:** Selected AUD source-dated books exist for local electrical, plumbing and finishing; role/pricing mappings include Australian products. But joint tape mapping still points to a GB product slug, sandpaper is unpriced, and the 2026-10-13 ranking snapshot (7 prices, 5 mappings, 4 scan sources) is stale and does not establish current live deployment. A door/window migration explicitly says an Australian price capture was blocked and deliberately did not seed prices. Do not fill it from UK/American products. The scanner has a bounded AU retail catalog, not a continuous live market index. No state/territory GST treatment, comprehensive inflation/cost index or FX transaction evidence was verified; generic inventory “GST” labels are not proof of working AU tax calculation.
- **Workforce compliance:** no Australian state/territory-specific contractor/trade registration, insurance, safety credential verification, expiry or revocation integration was established.
- **Timeline/logistics:** broad climate/season heuristics exist, but do not cover state-specific public holidays, measured site productivity, remote-region supply lead times, customs/carrier feeds or predictive delay operation.
- **Changes made for AU:** none. The live/fixture availability discrepancy, unimplemented/partial calculators, borrowed tape mapping and unavailable window/door prices block an accurate operational claim. Keep the market partial/unverified; next remaining market: **Germany (`DE`)**.

### Germany market closeout (priority 13; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Germany (`DE`) has a built-in active/visible metric EUR profile with German terminology, and a dedicated reference price catalog. The seeded fixture does not cover DE, and this review did not query live production availability. Its apparent `active` setting is not evidence that every service is deployed or fully operational.
- **Quantities/standards:** German-language product context, typology, DIN-oriented electrical and plumbing profiles, wall methodology and selected DIN/Eurocode construction assumptions are configured. The engine inventory explicitly marks several finishing methods (tyrolene, grafitex, mineral stone, stucco, flooring, waterproofing, doors/windows) and Build-to-Roof as not implemented; some other engine inventory entries are broad verified assertions rather than proof of source-backed, jurisdictional end-to-end tests. Local state/building requirements and project-specific structural design still require professionals.
- **Pricing/tax:** source files contain a German EUR reference catalog and selected local plumbing, electrical, door/window and finishing prices. Internal 2026-10-13 snapshot lists 14 prices, 8 roles and 7 scan sources, but is not live and predates changes. France (`FR`) is currently mapped to Germany’s reference catalog in `price-scanner.ts`, so the reference scanner can present German products under French market/currency context; this is a concrete cross-market accuracy issue that remains open for FR’s own closeout. No comprehensive German supplier index/inflation system, VAT determination for individual transactions or real-time FX settlement was demonstrated.
- **Workforce compliance:** no German trade-chamber registration/licensing, insurance, safety qualification verification, expiry or revocation integration was established.
- **Timeline/logistics:** continental climate and seasonal heuristics exist, but the shared timeline excludes public holidays/customs/shipping and no German state-specific working calendar or supply-chain feed was verified.
- **Changes made for DE:** none. Outstanding items include incomplete calculator coverage, no live-service verification, uncertain transaction-tax/pricing coverage, missing regulated workforce checks, and the FR-to-DE scanner alias. Keep DE classified partial/unverified for the requested global engines. Next remaining market: **India (`IN`)**.

### India market closeout (priority 14; audit only, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** India (`IN`) appears as active/visible, metric, INR in the built-in profile and country list. The seeded availability fixture does not include IN, and no live production query was made; the profile declaration is not evidence that all Indian services are actually deployed or enabled.
- **Quantities/standards:** Indian profiles include IS/NBC electrical, plumbing, structural typology and wall/finish assumptions, along with Indian terminology and 40/50 kg pack references. The engine inventory explicitly marks a number of finish methods (including flooring, waterproofing, doors/windows) and Build-to-Roof not implemented, while other entries are broad verified claims that require their own source-backed tests. India-specific state/municipal variations and complete package/product coverage were not demonstrated.
- **Pricing/tax:** The scanner has a dedicated INR catalog for selected cement, paint, primer, putty and waterproofing references. Local source migrations also add Indian electrical, plumbing and selected doors/windows records. The 2026-10-13 internal snapshot reports 12 price rows, 9 mappings, 7 scan sources but is a dated repository snapshot, not live verification. The cement mapping is explicitly price-pending approval; the doors/windows source leaves custom security and fabricated window/louver items unpriced. No end-to-end current supplier index, inflation tracker, state-specific GST computation or transaction FX operation was verified.
- **Workforce compliance:** no India-wide/state/trade-specific license, insurance, safety credential, regulator verification, expiration or revocation integration was established.
- **Timeline/logistics:** a monsoon-influenced climate heuristic and a rain-delay caution exist. The date estimator skips Sundays only; it does not account for Indian state holidays, regional monsoon timing, customs, carrier routes or live supply delays. No predictive logistics engine is established.
- **Changes made for IN:** none. Partial country-specific profiles/catalogs do not satisfy the user's fully functional and accurate standard; keep the market classified partial/unverified until live availability, source-backed calculations, taxes, workforce credentials and calendars/logistics pass an end-to-end review. Next remaining market: **Japan (`JP`)**.

### Japan market closeout (priority 15; scoped scanner safety fix, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Japan (`JP`) is in the country selector and built-in profile as active/visible, metric, JPY; no corresponding JP case exists in the seeded availability fixture and no live production-state query was run. This leaves active service availability unverified.
- **Quantities/standards:** Japanese profile context includes local gypsum/plasterboard formats and warnings that tatami area varies regionally, plus JIS-oriented electrical/plumbing configurations, seasonal climate heuristic and selected typology/wall-methodology logic. Engine inventory marks electrical/plumbing and finishing subsets verified but several finishes/doors-windows and Build-to-Roof not implemented; structural categories remain partial. This does not demonstrate exhaustive Japanese building-law, regional seismic, fire, packaging or quantity-method review.
- **Pricing/tax:** Source migrations include Japanese plumbing and selected door/hardware prices in JPY; custom fabricated windows/louvers are not priced. The 2026-10-13 ranking snapshot reports 8 book rows, 8 role mappings and zero scanner sources, predating later migrations and not live proof. The reference scanner had mapped `JP` to `CA_REFERENCE_PRICES`, so it could compare Canadian products/amounts while labelling the report JPY. **Scoped safety fix:** introduced an empty `JP_REFERENCE_PRICES` catalog rather than expose that false comparison; added a regression test. This scanner change is separate from the JP-specific SQL price books and does not prove their production deployment. No nationwide live supplier index, inflation tracking, consumption-tax treatment for transactions or real-time FX settlement was verified.
- **Workforce compliance:** no Japanese trade qualification/permit, insurance, safety credential, regulator verification or expiry/revocation integration was established.
- **Timeline/logistics:** four-season climate notes are heuristics, not prefecture/site-calibrated work schedules. The date estimator excludes public holidays and customs/shipping; no national/prefecture holiday calendar or carrier/import lead-time feed was verified.
- **Changes made for JP:** removed the Canada-catalog alias, added an empty catalog and regression test. Focused `src/lib/estimation/price-scanner.test.ts`: 18 tests passed; TypeScript and `git diff --check` passed. No full test suite/build was run for this narrow fix. Japan remains partial/unverified for full operational accuracy. Next remaining market: **France (`FR`)**; note its separate DE-reference alias for its upcoming market closeout.

### France market closeout (priority 16; scoped scanner safety fix, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** France (`FR`) has a built-in active/visible metric, French-language/EUR profile, but inherits unspecified context from Germany (`DE`). No live production-state check was performed. Inherited German defaults cannot be presented as French-validated without review.
- **Quantities/standards:** French typology/wall methodology, climate heuristic, electrical/plumbing profiles and local finish terminology exist. Selected masonry/roof/foundation and several finish methods are partial; the inventory explicitly marks multiple finishing categories (including doors/windows, flooring, waterproofing and Build-to-Roof) not implemented. Generic EU inheritance is not verification of French codes, local/regional methods or every calculator.
- **Pricing/tax:** FR-specific EUR references and source-dated material books exist for selected local products, plumbing, doors/hardware, finish and labor. However, the scanner had been mapping France to Germany's `DE_REFERENCE_PRICES`, a country mismatch; **scoped fix** replaces it with an empty `FR_REFERENCE_PRICES` until France has a verified scanner dataset, and tests that no German references are emitted under France. Product-mapping migration flags explicit unresolved pack mismatches (`fr-enduit-5kg` describes 15 kg, `fr-hydrofuge-5l` describes 10 L, and `fr-sable-25kg` describes 35 kg), each pending admin review. The 2026-10-13 snapshot reported 8 prices, 9 mappings, zero scanner sources but is stale and not live verification. No live inflation/material index, transaction-level French VAT calculation or FX settlement was confirmed.
- **Workforce compliance:** no French trade credential/insurance/safety registry verification, renewal or revocation monitoring was verified.
- **Timeline/logistics:** Mediterranean/temperate climate is a broad heuristic; the shared calendar skips Sundays, not French public holidays. No French holiday, carrier/customs or predictive logistics feed was established.
- **Changes made for FR:** removed German scanner-price alias, added an empty French scanner catalog and regression test. Focused scanner tests: 19 passed; TypeScript and `git diff --check` passed. No full suite/build run for this narrow fix. France remains partial/unverified against the fully operational accuracy bar. Next remaining market: **Brazil (`BR`)**.

### Brazil market closeout (priority 17; scoped scanner safety fix, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Brazil (`BR`) appears in the selector and built-in profile as active/visible, metric, BRL, Portuguese. No live production-state check was performed; this does not prove all market calculators and data are currently deployed.
- **Quantities/standards:** Brazilian terminology and selected ABNT/NBR-oriented electrical, plumbing, masonry/typology and wall-methodology profiles exist. The inventory marks several broader finishing categories as verified, but explicitly marks several methods (including flooring, waterproofing, doors/windows and Build-to-Roof) not implemented; masonry, roofing, foundation, structural and reinforcement takeoffs are partial. Local/state/city code and project-specific engineering are not comprehensively validated.
- **Pricing/tax:** Repository sources include selected BRL material, electrical, plumbing and door/hardware prices with local retailers/products. The 2026-10-13 internal snapshot reports 8 price rows, 9 mappings and zero scan sources, but is stale and not live verification. Some categories remain indicative or unpriced. The scanner mapped Brazil to Mexico’s MX reference catalog, which could present Mexican products/amounts as Brazilian currency. **Scoped safety fix:** added an empty `BR_REFERENCE_PRICES` catalog and test instead of re-labeling those Mexican references as BRL. This does not affect separate Brazil-specific database books or establish their deployment. No broad current market index, inflation tracking, transaction FX or verified tax regime computation was found.
- **Workforce compliance:** no CREA/CAU professional-registration check, trade credential/insurance/safety verification, expiration/revocation integration was confirmed. The structural typology itself notes ART/CREA and geotechnical engineer requirements; a code note is not a working credentials engine.
- **Timeline/logistics:** tropical/temperate rainy-season heuristics are not region/site calibrated. The shared date estimate omits local holidays, customs/shipping and location-specific work calendars; no Brazil-specific carrier/logistics feed was found.
- **Changes made for BR:** removed the Mexico reference catalog alias, added empty BR catalog and regression test. Focused scanner suite: 20 tests passed; TypeScript and `git diff --check` passed. No full suite/build run for this narrow correction. Brazil remains partial/unverified against the operational accuracy requirement. Next remaining market: **Indonesia (`ID`)**.

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

### Saudi Arabia market closeout (priority 21; audit and scanner safety fix, 2026-10-14)

- **Operational decision: LOCALIZED PARTIAL FOUNDATION; NOT VERIFIED END TO END.** Saudi Arabia (`SA`) has an active visible metric, SAR, Arabic-language profile and local terminology. No live production status query was made.
- **Quantities/standards:** Local Saudi Building Code/SASO typology and SBC 401 electrical/SBC 701 plumbing profiles are present; the construction note requires geotechnical investigation for sabkha soils and stamped review by a Saudi Council of Engineers-registered bureau. Inventory shows several finish/door/window calculators and Build-to-Roof not implemented; structural, roofing, foundation and reinforcement remain preliminary/partial.
- **Pricing/tax:** A dedicated Saudi profile has some local references: an internal 2026-10-13 snapshot reports 8 price rows and 7 role mappings, with MP75 deliberately unmapped, and zero retailer scan sources. Saudi-specific electrical, door/window and plumbing price-book migrations exist; repo evidence does not prove migration application/current live prices or full quantity role coverage. No current live refresh, regional cost index, or Saudi-specific VAT/tax calculation was verified.
- **Cross-market safety fix:** Price scanner incorrectly mapped `SA` to US reference prices while formatting results as SAR. Replaced the alias with an empty typed Saudi catalog until Saudi references are verified, and added a regression ensuring no USD references appear as SAR. Focused scanner tests: 21 passed; TypeScript and `git diff --check` passed.
- **Workforce compliance:** no Saudi Council of Engineers/license registry, contractor insurance/safety credential validation, expiry or revocation integration was demonstrated.
- **Timeline/logistics:** broad hot-desert seasonal heuristics only; no region-specific heat productivity, public-holiday/site calendar, procurement lead-time/customs or predictive international logistics engine was verified.
- **Remaining operational gate:** confirm deployed mapping/prices, complete source-backed regional packages, tax, licensed-professional and calendar/logistics integrations before describing this market as verified. Next remaining market: **Ethiopia (`ET`)**.

### Ethiopia market closeout (priority 22; audit only, 2026-10-14)

- **Operational decision: NOT IMPLEMENTED / NOT VERIFIED.** Ethiopia (`ET`) appears in the country selector list with ETB, but searches found no Ethiopia-specific entry in the market context, price scanner, construction typologies, wall methodology, climate profiles, electrical/plumbing profiles, or market capability inventory. The selector entry alone does not establish a usable localized estimator or active production market.
- **Quantities/standards:** no Ethiopia-specific package/unit/formula catalog or authoritative building-code/structural profile was found. Do not apply Nigerian or other market defaults silently.
- **Pricing/tax:** no Ethiopia-specific price book, retailer source catalog, exchange-rate/FX path or jurisdictional tax handling was found in reviewed files. Do not quote NGN or invent ETB prices/tax rules.
- **Workforce compliance:** no Ethiopian licensing/credential verification, insurance/safety registry, or professional eligibility integration was found.
- **Timeline/logistics:** no region-specific climate/calendar, holidays or customs/shipping/delay integration was found.
- **Changes made:** none. Keep Ethiopia unavailable for operational estimates until source-backed local standards and products, calculator validation, ETB pricing/tax, credentials, and seasonal/logistics rules are implemented and deployed. Next remaining market: **Egypt (`EG`)**.

### Egypt market closeout (priority 23; audit only, 2026-10-14)

- **Operational decision: NOT IMPLEMENTED / NOT VERIFIED.** Egypt (`EG`) appears in the country selector with EGP, but no Egypt-specific market context, price scanner, construction typology, wall methodology, climate, electrical/plumbing profile or market capability inventory entry was found. Listing Egypt as a selectable country is not evidence of a live localized estimator.
- **Quantities/standards:** no Egypt-specific packaging, material coverage formulas or source-backed national/local structural and construction-code profile was found. Never fall back silently to Nigeria or another market.
- **Pricing/tax:** no Egypt-specific price books, retailer scanner sources, EGP exchange conversion or Egypt jurisdictional tax/VAT implementation was found in the reviewed sources.
- **Workforce compliance:** no Egyptian trade/professional license, insurance or safety-credential verification integration was found.
- **Timeline/logistics:** no local public-holiday/site calendar, climate-driven production data, customs data or predictive shipping integration was found.
- **Changes made:** none. Keep Egypt out of operational localized estimates until the local standards, source-backed materials/prices/tax, qualified workforce checks and season/logistics behavior are implemented, tested and deployed. Next remaining market: **Tanzania (`TZ`)**.

### All-market implementation sequence and release gate

The all-country requirement remains open. Do not activate all represented countries merely because a profile or heuristic exists. Build and validate in market waves while keeping unverified country-specific functions unavailable or visibly indicative:

1. **Inventory and gate:** derive the canonical country list/status from the live market registry; reconcile built-in profiles, visible selector options, seeded database states, calculators, price books and tests. Keep coming-soon/unverified markets from appearing operational. Do not infer live production state from source fixtures.
2. **Quantities:** map each calculator to authoritative, jurisdiction-specific formulas, codes and packaging/product sources; track source, revision/effective date, units, rounding and local review. Test representative inputs, boundaries, no-data cases and NG regression per country before activation.
3. **Valuation/tax:** source current supplier/material indexes and FX with timestamps, coverage, provenance and outage/staleness behavior. Separate local material quotes, inflation indices, display FX, transaction conversion and tax computation. Have a qualified local tax reviewer approve each jurisdiction; no tax rate or index is to be generated from assumptions.
4. **Workforce:** define country-specific credential/license/insurance/safety requirements with the relevant authorities and accepted verification methods. Add expiry/revocation monitoring, evidence retention/privacy controls, reviewer audit logs and negative tests. Until then show submitted/verified status precisely, not a blanket compliance badge.
5. **Timeline/logistics:** obtain provider-backed shipping/customs lead-time data and official local holiday calendars, add site-level location and schedule inputs, and reconcile calendar dates with working-day durations. Treat probabilistic forecasts as estimates with data coverage and uncertainty, never guarantees.

**Activation gate for every country and engine:** primary/authoritative source or contracted live provider; accountable local reviewer; market-specific automated tests; visible source, date, coverage, confidence and fallback state; tested outage/stale/offline behavior; integration credentials configured securely where required; end-to-end review; monitoring and rollback owner. Until these checks pass, label the engine **partial/unverified** or the market **coming soon**. No code/data activation was safe to make in this audit without the missing jurisdictions, source datasets, providers and review evidence; only this documented readiness/implementation plan is being added now.

---



**Completed 2026-10-14 (market-neutral timeline date correction):** The project timeline's stage durations are workdays under a six-day week, but its estimated completion date previously added them as uninterrupted calendar days. `timeline-estimator.ts` now counts Monday-Saturday as workdays and skips Sunday, with tests for week boundaries and Sunday starts. The result explicitly excludes public holidays, customs/shipping delays, and location-specific non-working days until verified calendars and logistics sources exist. This does not make the logistics engine operational.

## 2. INCOMPLETE, PENDING, PARTIAL & UNVERIFIED WORK (Active Queue)

The following items represent all outstanding, in-progress, or unverified work on the platform. Completed past batches have been pruned.

### A. Live Supabase Database Migration Execution (PENDING / UNVERIFIED)

- **Status**: UNVERIFIED — Migration files are committed in `supabase/migrations/`, but have NOT yet been executed against the production database `nfgaaohweygwydoelxnf`.
- **Blocker**: Session environment lacks `SUPA_TOKEN` / Supabase Management API bearer token.
- **Action Required**:
  - Obtain the bearer token from the workspace owner.
  - Run `scripts/apply_pending_migrations.py` via Management API endpoint:
    `POST https://api.supabase.com/v1/projects/nfgaaohweygwydoelxnf/database/query`
  - Verify execution with live SQL count queries across `market_profiles`, `estimation_materials`, and `estimation_prices`.

### B. Rebar Books Expansion (PARTIAL / INCOMPLETE)

- **Status**: PARTIAL
  - Completed: US (imperial #3-#8), NG, DE/AT (metric B500B), AU (indicative).
  - Outstanding:
    - **GB**: Retail stick prices verified (Next Day Steel), but mill/trade bundle price ratios pending.
    - **CA**: Rebar ties priced; bar sizes (10M, 15M, 20M CSA G30.18) pending Canadian distributor verification.
    - **Top-30 Expansion Markets**: France, Italy, Spain, Japan, South Korea, China, Indonesia, Mexico, Brazil, India, South Africa, Ghana, Kenya, Egypt, Saudi Arabia, UAE require verified rebar price books.

### C. Plumbing Fittings & Valves Expansion (PARTIAL / INCOMPLETE)

- **Status**: PARTIAL
  - Completed: US (PVC DWV + PEX-A/B + copper), DE/GB (copper, pushfit, drainage).
  - Outstanding:
    - **GB**: Straight union (`gb-union`) needs verification.
    - **AT**: Austrian fittings (`at-elbow`, `at-union`, `at-valve`) pending verification on Hornbach.at.
    - **Other Markets**: Plumbing fittings and shut-off valves pending across non-EU/US markets.

### D. Doors & Windows Books for Remaining 12 Markets (PARTIAL / INCOMPLETE)

- **Status**: PARTIAL
  - Completed: GH, KE, US, CA, AU, IN, GB, DE.
  - Outstanding:
    - France, Brazil, Saudi Arabia, UAE, Italy, Mexico, Japan, China, Indonesia, South Korea, South Africa, Nigeria require verified entry door, interior door, and standard window price books.
    - High-variability components (custom aluminium sliding windows, structural louvers, bulletproof security doors) must remain visibly unpriced with manual rate entry prompts.

### E. Price Campaign Remainder (~174 Low-Confidence Rows) (PENDING)

- **Status**: PENDING
- **Goal**: Audit all rows in `estimation_prices` where `scan_confidence = 'low'` or `price_source` lacks an attributable URL/survey.
- **Action Required**:
  - Replace estimated numbers with verified distributor prices.
  - Upgrade confidence to `scan_confidence = 'manual'` and record verifiable provenance.

### F. Structural Methodology & Engineering Profiles (P2 Research Arc - INCOMPLETE)

- **Status**: INCOMPLETE
- **Goal**: Disentangle legacy Nigerian construction assumptions from international engines:
  - Remove hardcoded 9-inch (225mm) sandcrete block assumptions from `src/lib/engineering/sequence-planner.ts` and `wall-methodology.ts`.
  - Implement regional block/wall modules:
    - US: 8×8×16 inch CMU (hollow concrete masonry unit).
    - UK: Cavity wall construction (100mm outer brick + 50-100mm cavity/insulation + 100mm inner aerated block).
    - France/EU: Parpaing creux 20×20×50 cm and Monomur clay blocks.
    - India: 230mm / 115mm clay brick and AAC blocks.
  - Regional concrete mix designs (ACI 318 vs Eurocode 2 vs IS 456).

### G. AI Credit Economy & Monetization Security (PARTIAL / UNVERIFIED)

- **Status**: PARTIAL / UNVERIFIED
- **Issues to resolve**:
  - Rewarded ad completion relies on client-side event attestations without server-side verification from advertising networks (AdMob / Adsterra).
  - Guest AI reservation atomicity and daily resets need strict edge function enforcement to prevent race conditions.
  - Task completion RPC currently accepts unverified client completion claims.

### H. UI/UX Implementation Checklist (INCOMPLETE)

- [x] **Fix Mobile Collision**: Offset `StickyActionBar.tsx` above the mobile bottom nav, including the device safe-area inset; reset at `md` and above. Covered by a component test.
- [x] **Fix Sticky Steppers**: Offset sticky headers to `top-16` beneath the fixed navbar in `BuildToRoofEstimator.tsx`, `ProjectDetail.tsx`, and the contractor `ProjectDashboard.tsx`.
- [x] **Modernize Market Selector**: Add searchable country/currency options, region grouping, and a scroll-limited menu to `MarketSelector.tsx`.
- [x] **Verify First-Visit Welcome**: Code review confirmed `EntryExperience.tsx` overlays the already-mounted homepage without gating its content or SEO; preserve it rather than retiring it based on the stale audit claim.
- [x] **Wrap Tables**: Keep `MaterialPrices.tsx`, all three printable template tables, and the Brand Studio PDF line-item preview in keyboard-focusable horizontal scroll regions on narrow screens; print templates return to natural width when printed.
- [ ] **Harmonize Dark Mode**: Continue the broad audit of hardcoded color classes; scoped theme-aware surface batches completed 2026-10-14 (see log below). Preserve intentional print canvases.
- [ ] **Reorganize Navigation**: Continue the transition from 222 flat routes to the 5 structured pillars (`/tools/`, `/prices/`, `/projects/`, `/network/`, `/learn/`); first tools-library category routes completed 2026-10-14 (see log below).

**Completed 2026-10-14 (mobile navigation clearance):** Quick-action bars now sit above the fixed mobile bottom navigation using a 3.5rem offset plus `safe-area-inset-bottom`, returning to the bottom edge at `md`. Sticky estimator/project headers now dock below the 64px fixed navbar. Verification passed: `npx tsc --noEmit -p tsconfig.json`; `npx vitest run src/lib/estimation/__tests__` (19 files, 311 tests); `npx vitest run src/components/ui/StickyActionBar.test.tsx` (10 tests); `npm run build`; and `git diff --check`.

**Completed 2026-10-14 (market selector):** Added search across country name/code, currency name/code/symbol, and region; markets are grouped by their profile region into Americas, Europe, Africa, Middle East, Asia & Oceania, and Other. Both selector layouts have a max-height, vertically scrollable list, empty-search feedback, Escape dismissal, and reset search state on close. Added regression coverage for filtering, grouping, and list scrolling. Remaining UI/UX checklist items above are still open. Targeted selector/navigation tests (18 tests), TypeScript, full `npm test`, `npm run build`, and `git diff --check` passed.

**Completed 2026-10-14 (material price table on mobile):** The material-price grid now remains a four-column table at a readable minimum width inside a horizontally scrollable, keyboard-focusable region. Source and effective date are no longer hidden on smaller breakpoints, so mobile users can reach the full price provenance by horizontal scrolling. Added regression coverage for scroll-region accessibility and the source/effective columns. Targeted page tests (4 tests), TypeScript, full `npm test` (835 files, 7,231 tests), `npm run build`, and `git diff --check` passed. The stale first-visit splash recommendation was also reconciled with the code-verified handoff finding: preserve the existing welcome experience.

**Completed 2026-10-14 (remaining mobile table overflow slice):** Added keyboard-focusable, labelled horizontal scroll regions to the quote-comparison, paint-schedule, and material-checklist tables on `/printables`, plus the Brand Studio PDF line-item preview. Printable sheets retain normal-width table sizing in print. Added regression assertions for all four regions. Verification passed: focused template tests (5), `npx tsc --noEmit -p tsconfig.json`, estimation tests (19 files / 311 tests), `npm run build`, and `git diff --check`.

**Dark-mode audit batch (theme-aware surfaces):** Replaced forced white surfaces on Gallery hover controls, ColorDetail and CompareColors palette strips, the CompareColors remove button, and the sticky Build-to-Roof and contractor project headers with theme tokens. Gallery controls now use a theme-aware card surface in both themes; palette strips and sticky headers follow the active background token. Added a rendered Gallery regression assertion for the dark variant. This is a scoped batch only: the broader hardcoded-color audit remains open, and intentional white print canvases are not to be changed. Focused page tests passed (4 tests); `npx tsc --noEmit -p tsconfig.json` passed; estimation suite passed (19 files, 311 tests); `npm run build` and `git diff --check` passed. Published to `main` in commit `3c34695d7cc9338aedea4916a48e264b7ae1c99a` (parent `1ac2634702b573edbfd27a2264e40e7a82c9309d`); verified that current `main` at `44fb6f32c3d701977c5a379facebc1997865be10` descends from that commit. The broader hardcoded-color audit remains open.

**Completed 2026-10-14 (theme-aware contractor overlay and tools-library IA slice):** Changed the contractor project action busy overlay from a forced-white surface to semantic theme tokens and exposed its busy status accessibly. Added canonical category landing routes at `/tools/{finishes,structure,services,components,project,ai,pro}` backed by the existing searchable/paginated tool directory; category chips use these routes, query state is preserved, and all prior calculator paths and the `/construction-tools` directory remain available. Added route/overlay regression tests and registered landing pages in prerender metadata, static SEO content, and the sitemap. This is an initial IA slice, not completion of the full five-pillar route reorganization. Verification passed: focused tests (11 tests); `npx tsc --noEmit -p tsconfig.json`; `npx vitest run src/lib/estimation/__tests__` (19 files, 311 tests); `npm run build`; and `git diff --check`. Published to `main` in commit `57e19a4854dd33f331e576b3dfea23183628f205`; subsequent main commits for GH/KE/ZA plumbing books retained it in their ancestry (main was `fba057a1296fa684f50ef5c276252852aeb1b9ce` when this note was prepared).

---

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
