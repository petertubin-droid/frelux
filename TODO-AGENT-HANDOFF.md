# FRELUX — Global Expansion TODO / Agent Handoff

Living handoff for the Frelux market-expansion work. **Status markers:** ✅ DONE,
🟡 PARTIAL (has verified data, gaps remain), ❌ NOT STARTED. Any agent
continuing cold: read section 2 (WHERE TO START), verify state with the
commands in section 6, then work top-to-bottom through section 4 (REMAINING
WORK). Update this file with every batch you complete — including flipping
status markers and adding the commit hash.

Last updated: 2026-10-13 (P2 batch 1 COMPLETE: sequence-planner + structural-calculator + timeline-estimator all market-scoped)

---

## 0. MASTER MANDATE — COMPLETE GLOBAL INTERNATIONALIZATION (active)

Owner directive (2026-10-13): internationalize EVERY real engine, calculator,
estimator, sub-engine, AI pathway and calculation in the repo across all 20
markets (NG US GB CA AU DE IN GH KE ZA JP FR BR SA AE CN ID MX KR IT).
Not just the 34 registry entries. Discover, audit, classify, test,
internationalize. No subagents. No duplicate architecture. Preserve correct
NG methods. Browse the web to fill prices, market finishing types, standards.

### Phase plan (owner's P0-P4)

- **P0 Discovery & correctness** — IN PROGRESS
  - [x] Source audit: 375 non-test TS modules in src/lib; 54 real engines
        identified (comprehensive_engine_inventory, DB table, 20261014150000).
        Engine count 54 is separate from module count 375; several engines
        share files (engines-expanded.ts) and some modules are presentation
        layers, not engines.
  - [x] Registry reconciliation: canonical registry had 34; the 20 missing
        (regional_cost cash_flow contractor_credit circular_reuse
        embodied_carbon estimate_refresh maintenance price_forecast
        warranty_dispute fence roof_geometry roof_plan_scanner
        space_measurement measurement_confidence measurement_explanation
        quotation_generator offline_field learning_engine price_validator
        market_crawler) added to capability-registry.ts 2026-10-13, NG-verified
        only, honest unverifiedReason each; DB CHECK widened to 54
        (20261014160000, EXECUTED live).
  - [x] Honest-status fix: 386 boilerplate "verified" matrix rows downgraded
        to requires_verification (no per-market evidence); fence matrix rows
        kept (differentiated evidence).
  - [x] Full dependency graph generated: docs/engine-dependency-graph.md
        (all 54 engines mapped to importers + key page/component consumers;
        zero orphan engines; barrel-consumed engines matched by symbol
        fallback: fence/confidence/explanation/plan-scanner are consumed
        via src/lib/measurement + roof barrels, not direct page imports).
        Key dirs audited: src/lib/estimation (37 modules), measurement (31),
        roof (18), wallfinishing, engineering (4), netlify/functions,
        learning, market-intelligence, plan-vision, predictive-intelligence.
  - [x] AI routing audit: ai-foundation actually routes 13 engines
        (registry 4: build_to_roof roof_geometry painting_wall_area
        tyrolene_partition_area; expanded 4: electrical plumbing
        regional_cost margin_calculator; phase2 5: painting_project
        tile_estimate pop_ceiling screeding_system tyrolene_system).
        DUPLICATE AI route roof_geometry_calculation (inline math,
        boundary violation) removed. 41 canonical engines still have no
        executeEngine route — extend family-by-family in P2 with real
        adapters (see engine-duplicate-audit.md).
  - [x] Duplicate-engine audit COMPLETE: docs/engine-duplicate-audit.md.
        ZERO duplicate engines remain (roof_geometry_calculation AI duplicate
        removed; foundation design-vs-cost pair verified complementary —
        BS 8004 universal soil mechanics, custom bearing override, page
        uses useMarket; timeline/paint pairs are layered sub-engines).
        Remaining sweep items: reword NG-framed comments in engineering/
        foundation-calculator.ts (cosmetic), per-market climate inputs for
        timeline-estimator (dry/rainy is NG-only).
  - [x] Hardcoded-NG sweep DISCOVERED (P0). Cosmetic fixed: engineering/
        foundation-calculator.ts header comments reworded to global framing
        (BS 8004 values are universal; zero behavior change). BEHAVIORAL
        NG assumptions catalogued for the P2 structural batch:
        1) engineering/sequence-planner.ts: hard-mandates 9-inch (225mm)
           hollow sandcrete foundation walls + 6-inch partitions and words
           them as 'the standard' — wrong for poured-concrete/timber markets
           (US GB DE CA AU JP FR...). Needs market-scoped wall-methodology
           rules (blockwork vs CMU vs poured concrete).
        2) engineering/structural-calculator.ts: beams assumed b=225mm
           (9-inch block width) + 'Nigerian construction practice' framing
           (concrete grade 20-30 MPa presets). Needs market-scoped member
           sizing rules per regional methodology.
        3) engineering/timeline-estimator.ts: Season='dry'|'rainy' with
           rainy=1.2 productivity penalty — NG/tropical climate model.
           Needs per-market workability inputs (winter shutdown CA/GB/DE,
           monsoon IN/ID, heat restrictions SA/AE).
        These three modules serve FoundationCalculator/ProjectTimeline/
        ProjectSequence pages; non-NG visitors currently get NG
        methodology — fix via market-scoped rule modules in P2 (mirror the
        resolveStructuralMarketPricing pattern already used by the
        structural estimator pages).        typical defaults in engines) — feed P1.
- **P1 Shared international infrastructure** — contracts, unit conversion,
  material roles, price provenance, saved-calc reproducibility.
- **P2 Engine-by-engine implementation** — all families: finishing (A),
  structural (B), electrical/plumbing (C), costing/commercial (D),
  AI/measurement/intelligence (E). Workstream 3/4 items below fold into here.
- **P3 Database, Admin, exports** — capability sync, pricebooks, admin views.
- **P4 Verification** — full 20-market matrix, regression suite, deployment
  report. Acceptance: no engine left unexamined; unverifiable things are
  disclosed, not greenwashed.

### Non-negotiables from the mandate

- Never mark a market supported because a profile/currency/row exists.
- Never invent prices, formulas, standards, soil/seismic/safety values.
- Unpriced items stay visibly unpriced; no zero-cost totals.
- AI never invents quantities/prices — routes to deterministic engines only.
- Saved estimates must remain reproducible (engine+profile versions stored).
- Admin interface must show truthful capability/verification state.
- Distinguish preliminary estimation from engineering design compliance.

## P2 Batch 1 — engineering module market-scoping (IN PROGRESS)

  - [x] engineering/wall-methodology.ts: market-scoped wall profiles with
        provenance + confidence. VERIFIED (web-sourced): NG (sandcrete
        baseline), US (8in CMU, bartleby/up.codes), GB (cavity 102.5mm
        brick + 100mm block, MPA/Kingspan), DE (17.5/24cm Poroton,
        Schlagmann/ETA-25/0604), IN (230mm brick, BIS/WeHouse), AU (brick
        veneer over frame), JP (RC + ALC, industry_standard), BR (9x19x29
        ceramic block, Sodimac), ZA (140mm concrete masonry, Topblock).
        UNVERIFIED-DISCLOSED (no silent NG fallback): CA FR IT SA AE CN ID
        MX KR GH KE -> generic profile with explicit 'not yet verified'
        note surfaced to users.
  - [x] sequence-planner.ts: NG blockwork strings replaced with token
        substitution driven by the market profile; generateSequencePlan
        gains optional marketCode param (NG default preserved exactly);
        SequencePlan gains methodology_note (verified provenance or
        explicit unverified disclosure). 67 engineering tests green
        incl. NG-output-unchanged regression.
  - [x] ConstructionSequence page: useMarket wiring + methodology note
        rendered.
  - [x] structural-calculator.ts market-scoped: new engineering/
        member-sizing.ts — beam widths match each verified market's
        standard wall unit (US 203, GB 100, DE 175, IN 230, BR 90, ZA 140,
        NG 225 unchanged); frame markets (AU/JP) disclose
        engineer-determined; unprofiled markets get a generic 200mm WITH
        explicit unverified warning — never silent NG. designBeam/designColumn
        gain market_code; NG ground-beam 450mm + lintel 225x225 + column
        225mm warnings preserved for NG, generic code-check notes
        elsewhere; StructuralCalculator page passes market.marketCode.
  - [x] timeline-estimator.ts climate model: new engineering/
        climate-profile.ts — 20 market climate profiles (NG/GH/KE tropical
        dry-rainy unchanged; GB/DE/FR/IT/JP/KR summer-winter; CA severe
        winter 1.35; IN/ID monsoon; ZA/BR/MX dry-rainy; US/AU/CN mixed).
        Season union extended with winter/summer/monsoon + heuristic
        multipliers (disclosed as planning heuristics, not data);
        ProjectTimeline page offers market-appropriate seasons, snaps
        default on market change, renders climate disclosure.
  - [ ] Remaining 11 wall profiles need web verification (CA FR IT SA AE
        CN ID MX KR GH KE) — 1-2 searches per market.

## 1. CONTEXT (read first)

Frelux is a construction cost calculator SaaS (Vite + React + TS + Tailwind +
Supabase) expanding from a Nigerian-only tool to a worldwide product where
every market gets verified, country-specific pricing and methodology.

### Hard rules (owner's standing instructions — never break)

1. Never break calculator functionality, DB connections, auth, Supabase.
2. Never invent prices. Every price web-verified from a supplier listing or
   authoritative market assessment; source stored in
   `estimation_prices.price_source`; `scan_confidence='manual'` = verified,
   `'low'` = indicative band (text must say "admin-adjustable").
3. No silent NG fallbacks. Missing data → UI says "unpriced"/"not covered".
   `market_profiles.inherits_from` chains are allowed and disclosed.
4. Premium Nigerian construction branding stays.
5. No invented testimonials, user counts, or claims.
6. All public routes prerendered, SEO-friendly, crawlable.
7. Unit conversions must be deterministic and disclosed in provenance text.
8. No sub-agents for this work.
9. Push to `main` after each verified batch; `git pull --rebase origin main`
   first (remote moves). Netlify deploys on push; manual "Trigger deploy" in
   the Netlify dashboard if a build must go out immediately.

### Repo & environment

- Repo: `petertubin-droid/frelux` on GitHub.
- Supabase project ref: `nfgaaohweygwydoelxnf`. DB write pattern: Supabase
  Management API `POST /v1/projects/nfgaaohweygwydoelxnf/database/query`
  with a management bearer token (in session env / ask the owner — NEVER
  commit it).
- Price verification tools: `web_search` for supplier listings;
  `browserbase` for JS-rendered retailer pages (Wickes, Home Depot category
  pages, Drainfast price extraction all worked this way — see section 5).

---

## 2. WHERE TO START (if you are a fresh agent)

Work this list in order. Each item's status is current as of the last update.

1. ❌ **US/GB/DE/AT plumbing fittings + valves** (section 4B) — highest-value
   next batch; the pages already render pipe prices, fittings still fall back
   to disclosed-NG.
2. 🟡 **DE + GB rebar books** (section 4A) — need merchant-level anchors; all
   leads and gotchas documented.
3. ❌ **Electrical cable/conduit books** (section 4C) — resolver pattern is
   proven; needs price verification only.
4. ❌ **Doors/windows books + BTR trade prefills** (section 4D).
5. 🟡 **Price campaign remainder (~174 'low' rows)** (section 4E) — sweep by
   region; EG/SA paint in English sources, TR via Trendyol.
6. ❌ **Structural methodology profiles** (section 4F) — the long arc;
   research-heavy, do after the price trades.

---

## 3. STATUS BOARD (workstreams)

| # | Workstream | Status | Detail |
|---|------------|--------|--------|
| 1 | 39-market price books (8 core rows + finish engines) | ✅ | All 39 markets in `market_profiles` active with books; ~182/356 rows verified |
| 2 | Finish engines role-mapped (paint/tile/POP/screed) | ✅ | NG, US, GB, DE, AU, CA, IN fully mapped via `market_material_roles`; FR has localized role mappings |
| 3 | Market-aware UI (i18n, currency, persistence) | ✅ | Commit `fb776ffd` (internationalized calculators) |
| 4 | Foundation estimator market pricing | ✅ | Overlay + provenance + currency (commit `2c960ad6`) |
| 5 | BuildToRoof market prefills | ✅ | Prices step prefills from market book; 34 inputs currency-aware (`350e2f1f`) |
| 6 | Trade coverage panels (electrical/plumbing/doors) | ✅ | Non-NG users told plainly what's covered (`350e2f1f`) |
| 7 | Rebar books | 🟡 | ✅ US, DE, IN, EG verified; 🟡 AU indicative ('low', needs quote); ❌ GB, CA, rest |
| 8 | Plumbing pipe books | 🟡 | ✅ GB all 4 keys, US all 4, DE waste/drainage, AT cold/hot; ❌ DE cold/hot (PP-R) |
| 8b | Plumbing fittings/valves | 🟡 | Resolver walks PLUMBING_FITTING_KEYS (per-piece). US 5/5 + GB 4/5 + AT 2/5 LIVE in DB (seed migration executed 2026-10-13; 11/11 rows scan_confidence='manual', verified via resolver-shaped lookup). ❌ gb-union, at-elbow/union/valve, all DE |
| 9 | Electrical books | ❌ | Not started; resolver pattern ready |
| 10 | Doors/windows books | ❌ | Not started |
| 11 | Price campaign remainder | 🟡 | ~174 'low' rows to verify |
| 12 | Structural methodology profiles | ❌ | Research arc (DIN/BS/ACI foundation, block modules) |
| 13 | AI foundation adapters (engines-expanded.ts) | ✅ | Repaired 2026-10-13: electrical/plumbing adapters called 3-arg engines with 1 arg and read nonexistent result fields (would crash the conversational estimator). Now fetch rules + market price book exactly like the pages; margin/roof/regional adapters field-corrected; quantityLine takes 3 args |
| 14 | Wallfinishing int'l assemblies (remote branch) | ✅ | 2026-10-13: `mortar-mix` mode mapped to engine `volume` (old mode silently refused to calculate), thickness shapes normalized, WallLayerCategory widened (lining/render/plaster), WallSubstrate += aac; type gate 49 → 0 |

Key commits (newest last): `af1bdeea` role-fallback disclosure ·
`2c960ad6` foundation market pricing · `fb776ffd` i18n calculators ·
`350e2f1f` 6-page market pricing · `9de911d2` rebar US/DE/IN ·
`51bbfedc` EG rebar · `9d3b6512` AU rebar indicative + confidence-aware
provenance · `b3f12d40` plumbing US/DE · `6f34d349` GB pipes ·
`0ee2ea40` GB drainage (GB complete) · US drainage + AT pipes · `e12ba27a` identity sweep rebased onto remote structural work · `6c82cadc` AI adapter repair + wallfinishing data fixes + type gate 0 (latest).

---

## 4. REMAINING WORK (step-by-step)

### A. Rebar books — GB, CA, then remaining top-30 markets
- GB: retail sticks verified but ~2x mill price (Next Day Steel T16 £14.21/6m;
  The Metal Store 12mm £9/3m) — DO NOT seed those. Need a per-tonne merchant
  quote: Jewson/Travis Perkins trade counter, Lemon Reinforcement
  (shop.lemonreinforcement.co.uk), or a dated MEPS UK Domestic figure.
- CA: Kallanish paywalled. Try Rona/Home Hardware 10M (3.05m? verify actual
  stock length) listings; if only per-stick retail, apply the same GB caution.
- Pattern for any new market: verify per-tonne (or per-stick with explicit
  length), seed `{mkt}-rebar-{12,16,20,25}mm` (category `rebar`), per-length =
  12 × kg/m × price/kg, kg/m = 0.888/1.578/2.466/3.854 (engine constants).
  Page wiring is automatic via `resolveMarketRebar`.

### B. Plumbing — fittings + valves (US, GB, DE, AT)
- **2026-10-13 batch (READY, needs DB execution):** 11 verified rows in
  `supabase/migrations/20261013160000_plumbing_fittings_us_gb_at.sql` —
  US 5/5 (elbow $0.85 PexUniverse, tee $1.82 AF Supply CR12T, reducer
  $2.00 Walmart XFITTING 5-pk, union $1.00 Water Armor 25-pk, valve $6.42
  AF Supply), GB 4/5 (elbow £3.00 Wickes Primaflow, tee £3.15 Screwfit
  Speedfit 5-pk, reducer £7.26 JG Speedfit via Plumbing at Source, valve
  £8.45 JG Speedfit 15SVP at Wickes), AT 2/5 (tee €1.59, reducer €0.98,
  Hornbach.at Multitherm). FIRST STEP when resuming: run that migration
  against the live DB (Management API or SQL editor) and check the
  verification SELECT returns 11 manual rows. **EXECUTED 2026-10-13: 11/11 live.** Resolver + page wiring are
  already committed (structural-market.ts PLUMBING_FITTING_KEYS;
  test `resolveMarketPlumbing.test.ts`).
  + "
- Remaining gaps to verify: gb-union (straight union, not union-tee),
  at-elbow/at-union/at-valve (Hornbach.at FV-Plast/Multitherm + Herz
  Kugelhahn listings exist but prices didn't surface — use browserbase on
  the product URLs), DE all 5 (obi.de search snippets are price-poor;
  browserbase on hornbach.de Multitherm pages, or obi.de product pages).
- Engine keys: `plumb-elbow`, `plumb-tee`, `plumb-reducer`, `plumb-union`,
  `plumb-valve`. Prices are PER PIECE.
- Seed slugs `{mkt}-elbow`, `{mkt}-tee`, `{mkt}-reducer`, `{mkt}-union`,
  `{mkt}-valve` (category `pipe`), then extend `resolveMarketPlumbing` in
  `src/lib/estimation/structural-market.ts` (add the fitting keys to its
  registry — mirror the pipe loop) and the page needs no other change.
- Sourcing leads: Home Depot PEX fitting pages (search "1/2 PEX crimp elbow
  Home Depot" — prices appear in snippets, e.g. Apollo brass barbed ~$1-2/ea;
  get exact product+price), Wickes push-fit elbow/tee (rendered read), OBI/
  Hornbach PP-R fittings ("HT Bogen"/"PPR Winkel"). 2026-10-11 note: HD
  category snippets showed fragments ("Ear Elbow $8.98" — ambiguous, don't
  use); open a single product page for a clean SKU+price.
- DE cold/hot pipes: still open. Alibaba wholesale does NOT qualify. Try
  OBI.de "PP-R Rohr 20mm" product page, or Rehau/Pipelife DE listings. AT
  cold/hot are seeded from Hornbach.at MLC composite (€4.00/m) — same lead
  may exist on hornbach.de for DE.

### C. Electrical books (US, GB, DE first)
- Read `src/lib/estimation/electrical-engine.ts` for exact slugs/units first
  (cable, conduit, junction boxes, breakers; likely per-metre and per-piece).
- Add `resolveMarketElectrical` mirroring the plumbing resolver; wire
  ElectricalEstimator exactly like PlumbingEstimator (overlay + provenance
  panel + `[marketCode]` effect deps — see `git show b3f12d40` for the diff).
- Voltage/standard differences (110V vs 230V, NEC vs IEC): price only, and
  name the market's standard honestly (e.g. "NM-B 14/2 (US)"). No methodology
  claims beyond what the engine already does.

### D. Doors/windows books + BuildToRoof prefills
- Engine keys in doors-windows-engine.ts; same resolver pattern.
- BTR: cement/sand prefills exist; add rebar prefill once a market has both a
  rebar book and the BTR rebar price keys (see Prices step state).

### E. Price campaign remainder (~174 'low' rows in estimation_prices)
- Sweep by region: EG/SA paint via English-language retailers; TR via
  Trendyol; JP/KR/Nordic stubborn rows via direct category-page reads
  (browserbase). Sandpaper/filler/waterproofing rows everywhere.
- Update `estimation_materials.name` + `estimation_prices` together; keep
  name+unit consistent. Verified rows → `scan_confidence='manual'` with
  citable source URL in `price_source`.

### F. Structural methodology profiles (research arc)
- Market-scoped block modules (sandcrete vs parpaing vs CMU), rebar spacing
  conventions, foundation practice (DIN strip footing vs NG).
- Add a market-conditional in the engine + a disclosure in MarketScopeNotice
  when a market's profile goes live. BS 5385/DIN finish-engine precedent
  shows the expected depth of sourcing.

---

## 5. PROVEN METHODS & GOTCHAS

- **JS-rendered retail pages**: raw fetch/web_search returns nav markup; use
  `browserbase_navigate` + `browserbase_extract` (Drainfast price was
  extractable this way; Wickes prices visible in navigate text).
- **Category pages can render empty** (Travis Perkins maintenance banner) —
  go straight to a product URL instead.
- **Retail per-stick ≠ construction price** (UK rebar) — don't seed inflated
  bases; prefer per-tonne/per-bulk anchors.
- **Indicative bands** (Plexs AU): seed only as 'low' with "admin-adjustable";
  resolver text automatically says "verify with a local supplier".
- `fetchAllPrices(true)` is the NG flow; market overlays run AFTER it in page
  effects — keep that order. Effect deps must include `[marketCode]`.
- Engine price keys are exact NG slug strings (`rebar-16mm-per-length`,
  `plumb-pipe-cold`); overlays key on those exact strings.
- **Adapters must match real engine signatures** (2026-10-13): before
  registering an engine in the AI layer, read the engine's actual signature and
  result interface. The remote branch shipped 5 adapters that crashed on
  invocation (calculateElectrical/calculatePlumbing take `(input, rules, prices)`,
  not `(input)`; results have `lines`, not `cable_lines`/`pipe_lines`;
  quantityLine is `(label, quantity, unit)`; EngineResult requires
  `ok/engine/calculatedAt`). The AI registry imports registerExpandedEngines()
  eagerly, so a bad adapter breaks the conversational estimator at runtime
  even though pages and vitest stay green.
- **Empty ARRAY[] literals break whole-file execution** (2026-10-13):
  Postgres `42P18 cannot determine type of empty array` in
  20261014150000_comprehensive_engine_inventory.sql rolled back the entire
  multi-statement file on first run. Cast as `ARRAY[]::text[]` (16 sites, fixed
  and applied: 54 engines, 1080 matrix rows). The Management API query endpoint
  runs a whole file as one transaction and returns only the LAST statement's
  rows - verify with explicit follow-up SELECTs.
- **Migration applied-state check**: there is no schema_migrations tracking
  table; probe for each file's artifacts (tables/columns/rows) before running.
  As of 2026-10-13 everything in supabase/migrations IS APPLIED (latest:
  20261013160000 fittings seed, 20261014150000 engine inventory).
- **New data vocabulary must exist in the engine** (2026-10-13): assemblies
  using `quantityMode: "mortar-mix"` fell to the engine's unsupported-mode
  default and silently refused to calculate. New categories may be display-only
  (safe to widen the union) but new quantity modes are LOGIC — either use an
  existing mode or extend the engine switch first.
- **HARD GATE (2026-10-11 discovery): the root `tsconfig.json` is a
  solution-style NO-OP — `npx tsc --noEmit -p tsconfig.json` checks nothing
  and let broken pages ship. ALWAYS run `npx tsc --noEmit -p tsconfig.app.json`
  (0 errors as of 2026-10-11) AND the FULL vitest suite
  (`npx vitest run`, ~800 files, >5 min — run it in tmux), not just
  `src/lib/estimation/__tests__`. Page-level breakage (regex edits landing
  inside object literals / JSX blocks) only shows up in the full run.
- Identity sweep (2026-10-11, shipped same day): all WhatsApp CTAs (footer,
  navbar x2, contact page, support chat fallback) replaced with mailto email
  contact; WhatsAppFab component deleted; siteConfig whatsapp keys removed;
  whatsappUrl retired from analytics. No +234 number anywhere in the UI.
  Share-to-WhatsApp (user's own number, via lib/share.ts) intentionally kept.
  Footer now carries an honest trust strip: "39 markets · Local currency
  pricing · Email support". No fake US address/badges — owner was advised
  against fabricated origin claims; a real US LLC / custom-domain email are
  the legitimate routes when budget allows.
- `npx tsc --noEmit -p tsconfig.app.json` must stay at 0 errors before push.
  Add unit tests for new resolvers (`structural-market.test.ts` is the pattern).

## 6. VERIFY CURRENT STATE (fresh agent checklist)

```bash
git clone https://github.com/petertubin-droid/frelux && cd frelux
npx tsc --noEmit -p tsconfig.json        # must be clean
npx vitest run src/lib/estimation/__tests__   # 231+ pass
# DB sanity: count market pipe/rebar rows per market via Management API:
#   SELECT market, count(*) FROM estimation_prices
#   WHERE price_type='material' AND is_active
#   AND ref_id IN (SELECT id FROM estimation_materials WHERE category IN ('rebar','pipe'))
#   GROUP BY market;
```
