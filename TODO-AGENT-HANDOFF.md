# FRELUX — Global Expansion & Platform Architecture Handoff
Last updated: October 2026
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
   - Missing data must trigger clear UI disclosure: *"Price data for this item is not yet verified in [Country]. Please enter your local supplier rate."*
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
    className="sticky bottom-16 md:bottom-0 z-30 ..."
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
      <input type="text" placeholder="Search country or currency..." className="..." />
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
    export function formatMarketCurrency(amount: number, market: MarketProfile): string {
      return new Intl.NumberFormat(market.locale, {
        style: 'currency',
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
  - Introduce an automatic draft saving hook `useEstimatorDraft(formKey, state)` storing active form state into `localStorage`. Show a gentle toast upon return: *"We restored your previous calculation. [Start fresh]"*.

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

## 2. INCOMPLETE, PENDING, PARTIAL & UNVERIFIED WORK (Active Queue)
### A0. Verified-complete (Solas, 2026-10-14)
- [x] ELECTRICAL BOOKS ALL 20 MARKETS: live-verified via direct SELECT —
      11/11 slugs per market, all scan_confidence='manual', all sourced,
      local currencies (NG anchored on Konga/Coleman single-core + Bricmax
      conduit listings). This queue item is CLOSED.
- [x] DOORS/WINDOWS BOOK NG, APPLIED LIVE (2026-10-14, migration
      20261015120000, commit pending): 4 rows manual — flush NGN 85,000
      (Jiji Mushin HDF leaf), panel NGN 65,000 (Konga 5277134 SET incl.
      4-inch frame), hinge NGN 3,000 (Jiji PH 4-inch), lockset NGN 15,500
      (Konga Mission Door Lock). door-frame INTENTIONALLY UNPRICED:
      verified market structure — all 156 Jiji frame-category listings
      are bundled door sets; no standalone frame retail listing exists in
      NG (Konga/Jiji surveyed). Never substitute; panel row is a set price
      so panel-door estimates complete without a frame line.
      GOTCHA: version prefix 20261014110000 was ALREADY TAKEN by
      price_intel_pipeline — migration was silently skipped as "already
      recorded". Always check schema_migrations for the exact version int
      before naming a migration; renamed to 20261015120000.
      Remaining doors books: NONE — ALL 20 MARKETS COMPLETE
      (Solas batch 2026-10-14, migrations 20261015140000-210000, commits
      through this push): BR 5 (LM Brasil: flush folha lisa 330.26, panel
      frisada 552.72, frame batente Artens 189.90, hinge Vonder 3.5pc 16.30,
      lockset Pado 195.90), SA 3 (OpenSooq Riyadh WPC 750 + Amazon.sa hinge
      29.38/lockset 114.17; panel/frame quote-based), AE 4 (Desertcart
      flush 1193/panel 1948 + Amazon.ae hinge 24/lockset 35.99), MX 5
      (HD Mexico: tambor MUVA 997, semisolida 1769, marco Rosi 595,
      bisagra 145, chapa MercadoLibre 278), JP 4 (kakaku 19,800 / LIXIL
      36,200 / Kohnan hinge 1,064 / Rakuten latch 2,200), ID 5 (Tokopedia:
      mahoni leaf 350k, Belanda panel 1.2M, kusen 500k, engsel 35k, gagang
      set 125k), KR 3 (Coupang: ABS leaf+frame+install 200,000, hinge
      15,900, lockset 30,530), CN 4 (TATA set 1,099 / Mexin 3,500 /
      Taobao hinge 22.80 / GUTE lockset 76.00). FRAME METHODOLOGY NOTE:
      NG/JP/CN/KR door-frame lines stay intentionally unpriced — those
      markets sell frames bundled in door sets (verified: Jiji 156
      listings, JP ドアセット standard, CN 套装门 standard, KR install
      services); flush/panel rows there are SET prices already including
      the frame. Never substitute.
- [x] DOORS/WINDOWS BOOK IT, APPLIED LIVE (2026-10-14, migration
      20261015130000): 6 rows manual, all Leroy Merlin Italia live
      listings incl IVA — flush EUR 199.90 (Cadrel 90741797), panel
      EUR 159.90 (Winter pine 82860760), frame EUR 17.90 (telaio
      L12 86329072), hinge EUR 7.40 (3-set 22.19, 72868177), lockset
      EUR 22.12 (BRICARD mortaise asse 40), security EUR 399.90
      (porta blindata MASTER Easy 92007081). Windows left unpriced
      (Italian serramenti are made-to-measure per opening).


The following items represent all outstanding, in-progress, or unverified work on the platform. Completed past batches have been pruned.

### A. Live Supabase Database Migration Execution (PENDING / UNVERIFIED)
- **Status**: SUPERSEDED (live-verified 2026-10-14 by Velo): 15 pending migrations WERE executed
  against production `nfgaaohweygwydoelxnf` via scripts/apply_pending_migrations.py (electrical books,
  wall_finishing_project_type, engine_capability_registry, construction_standards_evidence,
  comprehensive_engine_inventory, reconcile CHECK, doors books US/GB/DE/CA/ZA/FR/KE/AU/IN/GH), each
  recorded in supabase_migrations.schema_migrations. No token blocker exists; the Management API works.
  Only genuinely-new migrations need this section going forward.
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
- **Status**: GB/AT/DE COMPLETE (live-verified 2026-10-14 by Velo; see P2 batch 16 entry)
  - Completed: US (PVC DWV + PEX-A/B + copper); GB 5/5, AT 5/5, DE 5/5 (migration 20261013170000, live).
    Live data reality: GB union is GBP 4.04 Screwfix (not the GBP 2.25 quoted in the older batch-16 writeup).
  - Outstanding:
    - **Other Markets**: Plumbing fittings and shut-off valves pending across non-EU/US markets.

### D. Doors & Windows Books for Remaining 12 Markets (PARTIAL / INCOMPLETE)
- **Status**: PARTIAL
  - Completed (live-verified 2026-10-14/15): US 6, GB 4, DE 4, CA 6, ZA 6, FR 4, KE 5, AU 6, IN 5, GH 5 rows.
  - Outstanding:
    - Brazil, Saudi Arabia, UAE, Italy, Mexico, Japan, China, Indonesia, South Korea, Nigeria require verified entry door, interior door, and standard window price books.
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

### G. Cross-Agent Audit Reconciliation (Velo review of the Lovable audit, 2026-10-14)

The Lovable audit above was independently verified line-by-line against main before
endorsement. Evidence level for each statement below: "code-verified" (read in repo)
or "live-verified" (queried live DB/deployment).

**Verified and endorsed (code-verified):**
- StickyActionBar (`sticky bottom-0 z-30`) vs MobileBottomNav (`fixed bottom-0 z-30
  md:hidden`) collision: real, identical z and bottom coordinates on mobile.
- Sticky sub-headers sliding behind the fixed `h-16` navbar: real
  (BuildToRoofEstimator.tsx:674 `sticky top-0 z-30`, ProjectDetail.tsx:247 `sticky top-0 z-10`).
- MarketSelector unconstrained dropdown (absolute, no max-h/overflow): real; 39+ markets
  overflow any laptop viewport. Searchable combobox fix is right.
- MaterialPrices.tsx:287 wraps its table in `overflow-hidden` with no `overflow-x-auto`:
  real. Build-to-Roof STEPS array confirmed at 11 labels. Unlabelled-input scale confirmed
  (322 `type="number"` inputs across 96 pages, 28 `inputMode` total).

**Corrections to the Lovable audit (do NOT act on the original wording):**
1. EntryExperience is NOT a blocking modal and does NOT affect SEO. Code-verified: it is
   a once-only overlay (localStorage `frelux_entry_seen_v1`), rendered on top of the
   fully-mounted homepage, absent from prerendered HTML, Esc-dismissible, with no content
   gating. The real issue is first-visit interruption only. Do not "retire" it: cap it
   <2.5s and honor prefers-reduced-motion.
2. Hardcoded dark-mode color count: only 6 instances found in the three named files
   (BuildToRoofEstimator, CompareColors, Rewards); ProductDetail shows 0. The "58
   instances" figure is unverified; re-count before fixing.
3. Single-country contact (+234 906 361 2439) lives in `src/pages/legal/About.tsx` and is
   hardcoded into BOQ export letterhead (`boq-engine.ts`), NOT in the footer. Fix both
   spots; market-aware contact routing recommendation stands.
4. Exec summary says "44 estimation engines"; the live engine_capabilities registry has
   54 rows (live-verified 2026-10-14). Use 54.

**Findings the Lovable audit missed (add to scope, priority order):**
1. STALE DEPLOYMENT (highest impact): Netlify auto-deploy is disabled (AdSense pending,
   owner decision). NONE of the UI/UX work above is visible to users until a manual
   redeploy of latest main. Every fix should be batched toward that redeploy.
2. Numeric keyboards: 322 `type="number"` inputs vs 28 `inputMode` in 96 estimator
   pages. Android users get a text keyboard in the core product. Add
   `inputMode="decimal"` everywhere, and parse comma decimals ("3,5") for EU markets.
3. Locale URLs promise languages they don't deliver: /es/ /fr/ etc. render English page
   content with only translated chrome (code-verified in i18n.tsx; deliberately noindexed
   after the 1,871-duplicate-pages GSC incident). Until real dictionaries exist
   (Lovable's D.1 recommendation), hide the language picker or route it to the Translate
   widget. Do NOT add locale URLs to the sitemap/hreflang before content is translated.
4. Market selection is not shareable: market lives in context, not the URL. A GB
   estimate cannot be sent as a link that opens in GB. Put market in the query string;
   Lovable's ISO 4217 `formatMarketCurrency` helper aligns and should land with it.
5. AdSense placement policy: the global footer ad slot can render on auth/admin/billing
   routes (Credits, ContractorCredit, Pricing). Exclude those routes from ad slots
   BEFORE re-enabling auto-deploy, or approval is at risk.
6. Canonical domain is `freluxtools.netlify.app` (index.html): all canonical/OG URLs
   point at a Netlify subdomain. International credibility needs a custom domain,
   updated in canonical + OG + sitemap + robots in one commit.
7. Silent error swallowing in calculators: `catch(() => {})` (e.g. TileCalculator.tsx:348)
   hides price-fetch failures; a wrong price is worse than an error. Unified toast + retry.
8. Mega-menu keyboard model: dropdowns open on hover/focus only; 3 aria-expanded in the
   950-line Navbar. Full arrow-key/Escape menu model + axe in CI for WCAG 2.1 AA.
9. App.tsx is 1,712 lines with 222 routes: split route groups by domain when doing the
   5-pillar reorganization so the reorg does not make it worse.
10. Command palette: with 44+ tools one searchable palette (Cmd+K) serves power users
    better than any mega-menu arrangement; complements the pillar reorg.

### H. UI/UX Implementation Checklist (INCOMPLETE)
- [ ] **Fix Mobile Collision**: Add `bottom-16 md:bottom-0` to `StickyActionBar.tsx`.
- [ ] **Fix Sticky Steppers**: Change `sticky top-0` to `sticky top-16` on `BuildToRoofEstimator.tsx` and `ProjectDetail.tsx`.
- [ ] **Modernize Market Selector**: Add search input, continental grouping, and `max-h-72 overflow-y-auto` to `MarketSelector.tsx`.
- [ ] **De-interstitial Homepage**: Replace blocking `EntryExperience.tsx` splash with non-blocking hero interaction.
- [ ] **Wrap Tables**: Add horizontal overflow scrolling wrapper to `MaterialPrices.tsx`.
- [ ] **Harmonize Dark Mode**: Audit and eliminate 58 hardcoded `text-black` / `bg-white` classes.
- [ ] **Reorganize Navigation**: Transition from 222 flat routes to the 5 structured pillars (`/tools/`, `/prices/`, `/projects/`, `/network/`, `/learn/`); split App.tsx route groups by domain during the move; add a Cmd+K tool palette.
- [ ] **Numeric Keyboards (Velo)**: Add `inputMode="decimal"` (+ comma-decimal parsing) to all 322 `type="number"` estimator inputs.
- [ ] **Shareable Market Links (Velo)**: Market in URL query param + `formatMarketCurrency` (ISO 4217) helper.
- [ ] **Ad Route Exclusions (Velo)**: Suppress ad slots on auth/admin/billing routes before auto-deploy is re-enabled.
- [ ] **Custom Domain (Velo)**: Replace netlify.app canonical/OG/sitemap domain when the domain is chosen.
- [ ] **Error Toasts (Velo)**: Replace `catch(() => {})` price-fetch swallowing with retryable toasts.
- [ ] **Keyboard Nav + axe CI (Velo)**: Full keyboard model for Navbar dropdowns/drawer; add axe checks to CI.
- [ ] **EntryExperience (Velo correction)**: Keep the splash; cap <2.5s and honor prefers-reduced-motion (do NOT retire).
- [ ] **Redeploy (Velo)**: Manual Netlify deploy of latest main once UI fixes are batched, so any of this reaches users.

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
