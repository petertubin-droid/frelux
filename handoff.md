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
