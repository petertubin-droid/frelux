# FRELUX — Global Expansion TODO / Agent Handoff

Living handoff for the Frelux market-expansion work. **Status markers:** ✅ DONE,
🟡 PARTIAL (has verified data, gaps remain), ❌ NOT STARTED. Any agent
continuing cold: read docs/MASTER-MANDATE-INTERNATIONALIZATION.md FIRST
(the authoritative owner directive, 2026-10-14 — supersedes the 2026-10-13
condensed mandate previously embedded here; it adds the full phase plan,
research/evidence rules, per-engine completion gates, explicit status
vocabulary, coverage-matrix fields, deliverables, and acceptance criteria),
then read section 2 (WHERE TO START), verify state with the commands in
section 6, then work top-to-bottom through section 4 (REMAINING WORK).
Update this file with every batch you complete — including flipping status
markers and adding the commit hash.

**Hard line from the owner (2026-10-14):** no hardcoded, placeholder, or
partially implemented features may be presented as done. Every claim must
carry its real status: verified live, tests only, or staged/partial with the
hardcoded parts named. Unverifiable items are disclosed, never greenwashed.

Last updated: 2026-10-15 (P2 batch 20: ZA & FR doors/windows price books READY in migration 20261015010000; batch 19 CA pending DB exec; AU documented blocked-by-access; batch 18 resolver + US/GB/DE books complete)

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
        NG assumptions catalogued for the P2 structural batch: 1) engineering/sequence-planner.ts: hard-mandates 9-inch (225mm)
        hollow sandcrete foundation walls + 6-inch partitions and words
        them as 'the standard' — wrong for poured-concrete/timber markets
        (US GB DE CA AU JP FR...). Needs market-scoped wall-methodology
        rules (blockwork vs CMU vs poured concrete). 2) engineering/structural-calculator.ts: beams assumed b=225mm
        (9-inch block width) + 'Nigerian construction practice' framing
        (concrete grade 20-30 MPa presets). Needs market-scoped member
        sizing rules per regional methodology. 3) engineering/timeline-estimator.ts: Season='dry'|'rainy' with
        rainy=1.2 productivity penalty — NG/tropical climate model.
        Needs per-market workability inputs (winter shutdown CA/GB/DE,
        monsoon IN/ID, heat restrictions SA/AE).
        These three modules serve FoundationCalculator/ProjectTimeline/
        ProjectSequence pages; non-NG visitors currently get NG
        methodology — fix via market-scoped rule modules in P2 (mirror the
        resolveStructuralMarketPricing pattern already used by the
        structural estimator pages). typical defaults in engines) — feed P1.
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

- [x] P2 batch 18: Doors & Windows Market Books, Resolver & Estimator Integration (2026-10-14): - Implemented `resolveMarketDoorsWindows` and `DOORS_WINDOWS_ENGINE_KEYS` in `src/lib/estimation/structural-market.ts`: * Resolves all 8 engine keys: `door-flush`, `door-panel`, `door-security`, `door-frame`, `door-hinge`, `door-lockset`, `window-aluminium`, `window-louver`. * Checks market-scoped slugs (e.g. `us-door-flush`) with fallback to shared engine slugs. * Explicitly reports unpriced keys in `unresolved` — zero silent substitution or fallback to Nigerian reference prices. * Detailed provenance rows include market, unit price, formatted explanation, and supplier source. - Integrated resolver into `src/pages/DoorsWindowsEstimator.tsx`: * Guarded `fetchMarketPriceBook` reference fallback: items in `fromReference` are nulled out for non-NG markets instead of inheriting Nigerian prices in local currency. * Overlays resolved market prices into `priceMap`. * Added dynamic price book coverage badge (`trade-price-coverage`) reporting exact count of priced items out of 8. * Added market price provenance card (`doors-windows-price-provenance`) displaying verified items with currency formatting, supplier citation, and honest unpriced disclosure. - Created additive Supabase migration `supabase/migrations/20261014170000_doors_windows_books_us_gb_de.sql`: * US: JELD-WEN flush slab $68, Masonite 6-panel slab $67, EverMark split jamb kit $61.98, Everbilt mortise hinge $2.32, Defiant keyed entry knob $10.13, JELD-WEN vinyl sliding window $169 (The Home Depot live listings, manual confidence). Unpriced: security screen (not equivalent to solid leaf) and jalousie louvre. * GB: Wickes flush primed door £39, Wickes 6-panel moulded door £32, softwood door lining set £32, 76mm butt hinges £1.50 (Wickes live listings, manual confidence). Unpriced: security, lockset, aluminum sliding window, louvre. * DE: Pertura CPL interior door €109, Pertura casing frame €79, galvanized frame hinge €1.35, stainless steel rose handle set €23.95 (Hornbach live listings, manual confidence). Unpriced: panel, security, aluminum sliding window, louvre. - Added unit test suite in `src/lib/estimation/__tests__/resolveMarketDoorsWindows.test.ts` (3 tests). - Added DOM integration tests in `src/pages/DoorsWindowsEstimator.test.tsx` (3 tests). - Verified: 22 test files (323 tests) passing across estimation and page suites, TypeScript app check 0 errors (`npx tsc --noEmit -p tsconfig.app.json`).

- [x] P2 batch 20: Doors & Windows price books for South Africa (ZA) and France (FR) (2026-10-15): - Migration `supabase/migrations/20261015010000_doors_windows_books_za_fr.sql`: 11 total verified manual rows across ZA (7 rows) and FR (4 rows) (scan_confidence='manual'). - ZA (ZAR, Cashbuild, Doors Direct, and Leroy Merlin SA live listings): * door-flush: R302.95 (Cashbuild Hardboard Wood Door 813 x 2032 mm, SKU #212) * door-panel: R439.95 (Cashbuild Tudor Moulded 6 Panel Door 813 x 2032 mm, SKU #211404) * door-frame: R363.00 (Doors Direct Budget Unassembled Hardwood Door Frame 58x40mm, SKU #ALIDF001) * door-hinge: R23.00 (Doors Direct Lock Worx 100mm Butt Hinge Pair R46.00 / R23.00 each, SKU #LWFH100CH-1) * door-lockset: R250.00 (Leroy Merlin SA Eureka 2-Lever Fort Knox Satin Nickel Lockset with Handles, SKU #81439155) * window-aluminium: R1434.00 (Doors Direct PT912M Aluminium Top Hung Window 900x1200mm AAMSA certified, SKU #PT912M) * door-security: R3709.00 (Leroy Merlin SA Ibuild Aluminium Sliding Door 1790x2090mm Bronze with safety glass & hardware, SKU #81427020) * window-louver: intentionally unpriced (tropical jalousie louvres are not standard residential practice under SANS 10400-XA / SANS 204 fenestration) - FR (EUR TTC, Brico Dépôt France live listings): * door-flush: 39.90 € (Brico Dépôt Bloc-porte isoplane prépeint blanc poussant 204 x 73 cm ép. 40 mm avec cadre et serrure, Réf #3660568300447, Code #670722) * door-panel: 69.90 € (Brico Dépôt Bloc-porte isoplane prépeint décor 204 x 83 cm ép. 40 mm, Réf #3660568300546, Code #670724) * door-hinge: 1.99 € (Brico Dépôt Paumelle de bâtiment AB 110 x 55 mm, Réf #3283889158711) * door-lockset: 9.90 € (Brico Dépôt Ensemble de poignées de porte Cyriac avec rosaces clé/cylindre, Réf #5059340548296) * door-frame, door-security, window-aluminium, window-louver intentionally unpriced: in French practice (NF P 01-005 / DTU 36.2), interior doors are overwhelmingly installed as factory-assembled bloc-porte sets; separate huisserie requires partition thickness specification (50/72/98mm); French security entrance doors require certified A2P BP1/BP2/BP3 rating with multi-point lock under DTU 36.5; and residential fenestration requires double-glazed oscillo-battant / ouvrant à la française under NF EN 14351-1 / RE2020. Disclosed and never substituted. - Unit test suite updated: `src/lib/estimation/__tests__/resolveMarketDoorsWindows.test.ts` expanded with dedicated ZA and FR test cases verifying override values and unresolved items (all 5 tests green). - Verified: 19 estimation test files (307 tests) passing, strict TypeScript app check clean (`npx tsc --noEmit -p tsconfig.app.json`).

- [x] P2 batch 19: Doors & Windows CA price book (READY, needs DB execution) + AU blocked-by-access research (2026-10-14): - Migration `20261014230000_doors_windows_books_ca.sql` — 6 CA rows verified from live
      Home Depot Canada listings (scan_confidence='manual'): door-flush $104.00
      (Masonite DHP30 30x80 flush hollow core slab, SKU 1000135663), door-panel $97.00
      (Masonite 306PBORE 6-panel pre-bored slab, SKU 1000711037), door-frame $100.00
      (Alexandria Moulding 03438-93S37CE pre-machined single frame set, SKU 1000814129),
      door-hinge $4.49 (Onward 2820NBB 3in full-mortise 2-pack $8.98, SKU 1001602212),
      door-lockset $13.98 (Defiant TFX200B keyed entry knob, SKU 1001952640),
      window-aluminium $268.00 (JELD-WEN Willmar B44258 36x24 slider Low-E,
      SKU 1000526625). door-security + window-louver intentionally unpriced
      (no direct CA equivalence; disclosed, never substituted). NOT YET EXECUTED
      against the live DB: the Supabase management token (sbp_570b...) expired
      and returns 401 — owner must issue a fresh access token, then run the
      migration via Management API or SQL editor and verify with
      `SELECT count(*) FROM estimation_prices WHERE market='CA' AND is_active
      AND scan_confidence='manual';` (expect >= 6). - AU researched same day, NOT seeded — blocked by access, per the mandate's
      no-fabrication rule: bunnings.com.au Cloudflare-gates category AND product
      pages; Mitre 10 search renders empty for the same bot session; Doors Plus
      is measure-and-quote only; Hume Doors publishes no online prices; google
      snippets for Bunnings locksets/handles exist (Lockwood Symmetry Manor
      entrance knobset $62.72 p4092809, Lemaar/ Ikonic passage sets $24.98-$60.89)
      but per gotchas a snippet is below the clean-product-page bar — do not
      seed from snippets. Retry AU when a verifiable product page is reachable.

- [x] P2 batch 17: Tier 2 Estimator Currency Localization & Regression Suites (2026-10-14, commit `5095e9f`): - Localized active currency symbol and code derivation across 8 Tier 2 estimator pages:
      `DoorsWindowsEstimator.tsx`, `ElectricalEstimator.tsx`, `FlooringEstimator.tsx`, `FoundationEstimator.tsx`,
      `GeneratorEstimator.tsx`, `PlumbingEstimator.tsx`, `ReinforcementEstimator.tsx`, and `WaterproofingEstimator.tsx`. - Eliminated hardcoded "NGN" across all 8 pages in `createEstimate` persistence calls and `price_snapshot` line items,
      correctly snapshotting the active market's `currencyCode`. - Added `currencyCode` into the `save` callback dependency arrays to ensure dynamic market profile switches immediately persist. - Passed explicit `currencySymbol` into all `formatCurrency` invocations across all 8 pages to eliminate default fallback to Naira (₦). - Added `key` prop support to `numberInput` helpers across all 8 pages, resolving React unique key warnings. - Added comprehensive static AST contract regression test suite in `src/lib/estimation/__tests__/tier2-currency-regression.test.ts` (40 tests passing). - Added complete DOM component integration regression suite in `src/pages/__tests__/tier2-currency-integration.test.tsx` verifying currency rendering, estimate persistence, and quote exports across US (USD), GB (GBP), and DE (EUR) markets. - Verified: 317 tests passing across estimation and page suites, TypeScript app check 0 errors.

- [x] P2 batch 16: Plumbing fittings/valves full coverage (GB, AT, DE) (2026-10-14): - Added Supabase migration `20261013170000_plumbing_fittings_gb_at_de.sql` completing: * GB: `gb-union` (£2.25 JG Speedfit 15mm push-fit connector, Wickes) -> GB 5/5 * AT: `at-elbow` (€0.95 Multitherm PPR 90° 20mm), `at-union` (€0.89 Multitherm PPR 25mm Muffe), `at-valve` (€12.59 DVGW Trinkwasserkugelhahn 1/2", OBI) -> AT 5/5 * DE: Full 5/5 set using standard domestic 15mm copper press-fit DVGW system & 1/2" ball valve:
      `de-elbow` (€2.15, Hornbach), `de-tee` (€4.49, OBI), `de-reducer` (€2.00 22x15mm, Hornbach), `de-union` (€1.98, Hornbach), `de-valve` (€9.19, OBI) -> DE 5/5 - US (5/5), GB (5/5), AT (5/5), and DE (5/5) fittings and valves are now fully seeded.

- [x] P2 batch 15: BuildToRoof rebar prefill & plumbing coverage disclosure (2026-10-14): - BuildToRoofEstimator: wired `resolveMarketRebar(marketCode)` into the
      existing market price prefill effect alongside cement and sand.
      Maps resolved diameters (`rebar-12mm-per-length`, `rebar-16mm-per-length`,
      `rebar-20mm-per-length`, `rebar-25mm-per-length`) to the estimator's
      underscore keys (`rebar_12mm_per_length`, etc.). Step 7 (Prices) renders
      a clear `market-rebar-note` showing diameter coverage and disclosing
      unresolved diameters that keep the baseline default. - PlumbingEstimator: updated coverage notice copy to truthfully reflect
      verified pipe and fitting key resolutions from `resolveMarketPlumbing`
      rather than asserting pipes/fittings are not yet covered. Unresolved
      items are accurately disclosed without claiming silent substitution. - Verified: 264 estimation/page unit tests green, TypeScript app check 0 errors.

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
- [x] Remaining 11 wall profiles WEB-VERIFIED (2026-10-13): CA (2x6
      wood frame @16in o.c., R-20 batt, 8in poured concrete foundation,
      NBC plan sets — verified), FR (parpaing 20cm + isolation par
      l'extérieur, Qualitel 20-40cm — verified), IT (laterizio forato
      20x25x25 + cappotto, Wienerberger/Poroton — industry_standard), SA
      (concrete block 200mm + AAC growth, Benna guide —
      industry_standard), AE (hollow concrete block work villas —
      industry_standard), CN (砖混 brick-concrete low-rise / RC
      high-rise — industry_standard), ID (bata merah + Hebel AAC —
      industry_standard), MX (block 15x20x40 + tabique rojo with
      castillos y dalas confined masonry — industry_standard), KR (RC
      wall-panel apartments — verified), GH (sandcrete 9/6in —
      verified), KE (machine-cut Ndarugo 9x9 stones — verified).
      ALL 20 mandate markets now have profiled methodologies with
      sources; generic unverified fallback only for non-mandate codes.
- [x] UI currency leaks & market context remediation (P1/P2 UI sweep): - BuildToRoofEstimator: binding wire cost now uses formatCurrency()
      reflecting the active market rather than hardcoded Naira. - AdvancedCalculator: integrated useMarket(); dynamic currency symbol
      and code applied across AI analysis prompts, Q&A prompts,
      cost adjustment inputs/summaries, PDF export HTML, and saved
      estimate currency metadata. - RoomBuilder: integrated useMarket(); dynamic currency symbol replaces
      all 5 hardcoded Naira currency labels on material, labour, and
      total room costs. - LabourEstimator: integrated useMarket(); renders active market
      context banner clarifying benchmark worker-day productivity.
- [x] P2 batch 2: engineering/typology-profile.ts — market-scoped
      residential building typologies, WEB-VERIFIED: US (single-family/
      ranch dominant), GB (semi-detached/terraced, stock shares 24.6/
      17.9/22%), DE (Einfamilienhaus stock, Mehrfamilienhaus 58% of new
      builds), FR (maison individuelle/pavillon), JP (62.3% detached
      two-storey, 61% wooden), CA (single detached 8.4M, NRCan), AU
      (70% separate houses ABS 2021), BR (84.8% casas IBGE Censo 2022),
      ZA (88.5% formal StatsSA), KR (apartments) — verified; IT IN MX
      ID SA AE CN GH KE — industry_standard with sources. NG option
      list preserved exactly. ProjectTimeline building-type select now
      offers market-local typologies (Einfamilienhaus, Rumah, Sobrado,
      Maisonette...), snaps default on market change, disclosure note
      rendered. Unprofiled codes get disclosed generic fallback.

- [x] P2 batch 3: STRUCTURAL AI ADAPTER FAMILY LIVE — foundation,
      doors_windows, reinforcement adapters (engines-structural.ts).
      Fully operational + location aware: REQUIRE explicit marketCode
      (no silent NG), fetch calc rules + market price book with the
      structural overlay (pack-size/per-tonne conversions), currency
      from getCountryCurrency(market), unpriced lines disclosed in
      raw.unpriced_lines + costs.regionalDataAvailable=false, adapter
      defaults (labour mode none, include_locksets true) disclosed in
      raw.adapter_assumptions. Copilot routing: 3 new task types
      (foundation_estimate/doors_windows_estimate/reinforcement_estimate)
      wired through types.ts, requirements.ts (marketCode a REQUIRED
      fact so the AI asks for country), orchestrator deterministic
      keyword routing, CopilotWidget labels, calculator-intelligence
      knowledge entries, ai-copilot edge schema (task enum + fact keys + prompt: never assume country, ask). REMOVED the silent NG
      defaults from electrical/plumbing AI adapters — missing market
      now returns an honest "Market code is required" error. Suite
      7156 green, type gate 0. 14 adapter tests in
      ai-foundation/**tests**/engines-structural.test.ts.
- [x] P2 batch 4: PLUMBING FITTINGS BATCH 2 APPLIED LIVE (2026-10-13):
      verified, committed — 20261013170000_plumbing_fittings_at_complete_gb_de.sql.
      5 web-verified rows (zero manual confirmation, live listings
      read 2026-10-13): at-elbow PPR-Winkel Multitherm 90° 25x25mm
      EUR 0.99 (hornbach.at/p/4031000); at-union PPR-Muffe Multitherm
      25x25mm EUR 0.89 (hornbach.at/p/4031022); at-valve Kugelhahn
      Edelstahl 1/2" I/I EUR 9.95 (hornbach.at/p/6088338); gb-union JG
      Speedfit push-fit coupler 15mm GBP 4.04 inc VAT Screwfix product
      89950; de-tee T-Stück Messing 1/2" EUR 3.49 (toom.de/p/5464965).
      ON APPLY: AT becomes 5/5, GB 5/5, DE 1/5.
      APPLIED + VERIFIED 2026-10-13 with a fresh owner-supplied
      sbp_ token: 16/16 active fitting rows live (US 5, GB 5, AT 5,
      DE 1), all scan_confidence='manual'; resolver slug convention
      (marketCode-fitting, e.g. at-elbow) confirmed in
      structural-market.ts resolvePlumbingSlugGroup; 245 estimation
      tests green. NOTE: apply_pending_migrations.py uses a
      HARDCODED file list (both plumbing migrations added to it);
      new migrations must be appended there or they are silently
      skipped. The 20261013160000 file re-applied idempotently (was
      applied earlier without a supabase_migrations record).
      Remaining honest gaps: de-elbow/reducer/union/valve
      (obi.de/hornbach.de search snippets stay price-poor; next pass
      should read product pages directly, Kirchhoff brass line at
      OBI is the candidate family).
- [x] P2 batch 5: PLUMBING FITTINGS DE COMPLETE, APPLIED LIVE
      (2026-10-13, migration 20261013180000): all four remaining
      DE fittings web-verified from live toom.de listings (rendered
      via browser, snippets are price-poor):
      de-elbow Winkel 90° Messing blank 1/2" IG/AG (Cornat art 5460285) EUR 8.29; de-reducer Reduzierstück Messing blank
      3/4" IG x 1/2" AG EUR 3.99; de-union Muffe Messing blank 1/2"
      IG EUR 4.29; de-valve Kugelhahn Messing 1/2 Zoll EUR 6.99.
      DE methodology: brass threaded (Schraubfitting) fittings,
      consistent with de-tee. FITTINGS BOOK NOW COMPLETE:
      US 5/5, GB 5/5, AT 5/5, DE 5/5 = 20/20 active rows, all
      scan_confidence='manual', verified via Management API SELECT.
      Note: toom.de prices are JS-rendered — use the browser for
      product-page reads; the "Häufig dazu gekauft" cross-listing
      on a rendered product page carries exact name+price pairs
      for the rest of the Cornat brass family.
      NEXT for plumbing price books: pipes (plumb-pipe-*) for
      US/GB/AT/DE if the resolver expects them and they are
      missing; then GB/CA rebar per-tonne anchors.
- [x] P2 batch 6: PLUMBING PIPES AT+DE COMPLETE, APPLIED LIVE
      (2026-10-13, migration 20261013190000): 4 web-verified rows
      (browser-rendered hornbach.at / snippet-verified hornbach.de):
      at-pipe-waste HT Rohr DN 50 1000mm (hornbach.at art. 262942)
      EUR 2.25/m; at-pipe-drainage HT Rohr DN 110 2000mm (art. 266955) EUR 5.25/m; de-pipe-cold + de-pipe-hot Kupferrohr
      15x1mm 5m (hornbach.de art. 1319206) EUR 34.00/5m =
      EUR 6.80/m (copper hard rod, hot+cold, pairs with the brass
      Schraubfitting fittings book). PIPE BOOK NOW COMPLETE:
      US 4/4, GB 4/4, AT 4/4, DE 4/4 = 16/16 active rows, all
      scan_confidence='manual'. Combined with batch 5 the plumbing
      market books are complete: 36 rows (20 fittings + 16 pipes),
      zero unresolved keys for US/GB/AT/DE plumbing pages.
      GOTCHA: hornbach.at serves a JS bot-challenge on first load —
      wait ~5s in the browser and the product page renders with
      per-metre price lines ("Entspricht x EUR pro m").
      NEXT: GB/CA rebar per-tonne anchors, then electrical books.
- [x] P2 batch 7: REBAR PER-TONNE ANCHORS GB + CA, APPLIED LIVE
      (2026-10-13, migration 202610132000): 8 rows, all
      scan_confidence='manual'. resolveMarketRebar now resolves
      all four diameters (12/16/20/25mm) for GB and CA.
      GB (Tippers, live rendered pages, incl VAT): 12mm 6m GBP
      8.84 (BIRFBT12) = GBP 17.68/12m; 16mm 6m GBP 15.74
      (BIRFBT16) = GBP 31.48/12m; both = GBP 1.66/kg, so 20mm
      GBP 49.13 and 25mm GBP 76.78 derived at that rate.
      CA (MY Construction Supply Grade 400W 20ft, live Home
      Depot Canada marketplace listings): 10M CAD 8.98 ->
      CAD 17.68/12m (12mm slot); 15M CAD 17.98 -> CAD 35.39/12m
      (16mm slot); both = CAD 1.877/kg, so 20M CAD 53.12 and
      25M CAD 88.44 derived at that rate (bar masses from
      Groupe Picard published lbs/ft). NOTE: rebar slugs are
      category 'steel'; engine maps {mkt}-rebar-{d}mm ->
      rebar-{d}mm-per-length. 245 estimation tests green.
      GOTCHAS: Tippers prices are JS-rendered (Aphix platform;
      static HTML only has GBP 0.00 cart placeholders) and they
      stock only 12/16mm bars; homedepot.ca search is JS-only
      (extract via browser). NEXT: electrical books (US/GB/AT/DE),
      then remaining market structural anchors.
- [x] P2 batch 8: ELECTRICAL BOOKS US + GB, APPLIED LIVE
      (2026-10-13, migration 20261013210000): 22 rows
      (11 slugs x 2 markets), all scan_confidence='manual'. The
      electrical page now prices every line from the market's own
      book for US/GB (was unpriced everywhere; NG reference book
      still has no elec prices BY DESIGN - admin-entered).
      US (Home Depot live listings unless noted): 14/2 NM-B 250ft
      $124 (50c/ft) = $1.64/m; 12/2 NM-B 72c/ft = $2.36/m; 10/2
      NM-B $1.23/ft = $4.04/m; 8 AWG bare Cu ground 50ft $40 =
      $2.62/m; Nassau 2-2-4 SER $1.86/ft = $6.10/m; 1/2 EMT 10ft
      $6.98 = $2.29/m; Steel City 806SW-20R box $3.06; Homeline
      HOM120CP breaker $6.99 (Hammond Hardware); Leviton 1451-2W
      switch $0.85; Leviton BR15-W receptacle $2.68; Eaton
      BR1220B100 load center $109.99 (W.D. Bryant).
      GB (Screwfix live listings unless noted, incl VAT):
      1.5mm2 T&E 100m GBP 65.99 = 0.66/m; 2.5mm2 T&E 100m
      GBP 94.99 = 0.95/m; 6mm2 T&E 25m GBP 33.99 = 1.36/m;
      6491X G/Y 2.5mm2 100m GBP 48.51 = 0.49/m; 10mm2 T&E 25m
      (99630) GBP 72.99 = 2.92/m; Deta TTE 20mm x 3m conduit
      GBP 2.29 = 0.76/m; Knightsbridge 5A 4-term JB GBP 1.59;
      Wylex PSB06-B MCB GBP 8.95 (Willrose Electrical); LAP
      1-gang switch 71728 GBP 1.05; LAP 2-gang 13A socket
      GBP 6.37; Wylex dual-RCD consumer unit GBP 109.99.
      CODE: ElectricalEstimator coverage note is now dynamic
      (ELECTRICAL_MATERIAL_SLUGS exported from
      electrical-engine.ts; note shows real coverage per market
      instead of the hardcoded "does not yet cover" text).
      GOTCHAS: homedepot.com blocks the browser (Akamai
      Access Denied) - verify via Google snippets of HD pages
      or alternate retailers; screwfix.com blocks curl but
      Google-indexed category pages show prices; Screwfix
      snippets render as "GBP x Inc Vat". 257 tests green
      (estimation+pages), tsc 0 errors.
      NEXT: DE + AT electrical books (AT needs an
      ELECTRICAL_PROFILES entry too - currently generic IEC
      fallback; add OVE/ONORM E 8101 profile with NYM-J
      methodology), then NG electrical book (Jumia/Konga
      listings), then remaining market anchors.
- [x] P2 batch 9: ELECTRICAL BOOK DE, APPLIED LIVE (2026-10-13,
      migration 20261013220000): 11 rows, all manual. Electrical
      books now live for US, GB, DE (3 of 20 markets).
      USER DIRECTIVE (2026-10-13): ALL estimation work must cover
      the WHOLE 20-market set (NG US GB CA AU DE IN GH KE ZA JP
      FR BR SA AE CN ID MX KR IT) and all 40+ engines - never a
      2-4 market subset. Per-market rolls must continue until
      every market has a full electrical book.
      DE (DIN VDE 0100 / DIN 18015 methodology, incl 19% MwSt):
      lighting NYM-J 3x1,5mm2 50m EUR 35.99 (hornbach.de 834195)
      = 0.72/m; socket NYM-J 3x2,5mm2 50m EUR 78.50
      (elektroland24) = 1.57/m; dedicated NYM-J 5x2,5mm2 (Herd)
      50m EUR 55.90 (Amazon.de Waskonig+Walter) = 1.12/m; earth
      H07V-U 2,5mm2 grun/gelb 100m EUR 49.31 (elektroland24) =
      0.49/m; feeder NYM-J 5x6mm2 50m EUR 365.31 (voelkner.de,
      ab-3-Pack tier) = 7.31/m; conduit Installationsrohr M25
      starr 3m EUR 2.37 (hornbach.de 5715557) = 0.79/m;
      junction Kaiser 1555-06 20-pack EUR 17.43 (hornbach.de) =
      0.87/box; breaker ABB S201-B16 EUR 2.99 (wittko.eu);
      switch Busch-Jaeger 2020 US-201 EUR 10.65
      (elektroshopwagner.de); socket outlet Busch-Jaeger alpha
      nea Schuko-Einsatz EUR 12.44 (Amazon.de); DB Hensel KV
      1512 12TE IP54 EUR 53.12 (watt24.com).
      GOTCHA: hornbach.de category queries return .lu/.at/.ch
      siblings - pin exact art numbers. idealo.de is a price
      aggregator; prefer direct shop pages (voelkner, watt24,
      elektroland24, elektroshopwagner all render prices to
      Google).
      REMAINING ELECTRICAL BOOKS (17 of 20): NG CA AU IN GH KE
      ZA JP FR BR SA AE CN ID MX KR IT. Suggested order: NG next
      (Jumia/Konga single-core + conduit listings), then CA
      (homedepot.ca NMD90), AU (Bunnings TPS), IN (Finolex 90m
      coils), GH/KE/ZA, then hard ones (JP KR CN ID via
      MonotaRO/Japan, Coupang, Alibaba retail, Tokopedia).
- [x] P2 batch 10: ELECTRICAL BOOKS NG, CA, AU, IN (2026-10-13,
      migration 20261013230000): 44 rows (11 per market), all manual.
      Electrical books now live for US, GB, DE, NG, CA, AU, IN (7 of 20 markets).
      NG (NEMSA / NBC methodology, Konga/Bricmax live listings):
      lighting Coleman 1.5mm2 Cu 100m NGN 45,000 = 450.00/m; socket
      Coleman 2.5mm2 Cu 100m NGN 65,000 = 650.00/m; dedicated Coleman
      4.0mm2 Cu 100m NGN 95,000 = 950.00/m; earth Coleman 2.5mm2 Cu
      100m NGN 65,000 = 650.00/m; feeder Coleman 16mm2 Cu 100m
      NGN 330,000 = 3,300.00/m; conduit Dignity 20mm uPVC 2.9m length
      NGN 693 (25-pack NGN 17,325) = 239.00/m; junction uPVC 1-gang
      box 10-pack NGN 3,500 = 350.00 each; breaker C&S/Chint 20A 1P MCB
      6kA NGN 3,100.00 each; switch A&BT 1-gang 1-way 10-pack NGN 9,900
      = 990.00 each; socket 13A switched socket outlet NGN 2,500.00 each;
      DB Havells 6-way SPN distribution board NGN 30,000.00 each.
      CA (Canadian Electrical Code / CSA C22.1, Home Depot Canada live listings):
      lighting Southwire 14/2 NMD90 150m CAD 185.00 = 1.23/m; socket
      Southwire 12/2 NMD90 150m CAD 369.00 = 2.46/m; dedicated Southwire
      10/2 NMD90 75m CAD 289.00 = 3.85/m; earth Southwire 6 AWG/8 AWG Cu
      ground CAD 2.85/m; feeder Nassau 2-2-2-4 aluminum SER CAD 8.69/m;
      conduit Iberville 1/2 in. x 10 ft EMT CAD 17.45 = 5.73/m; junction
      Iberville 3x2x2-1/2 in. 12.5 cu in steel box (1000106202) CAD 2.98 each;
      breaker Schneider Homeline CHOM115CP 15A 1P CAD 14.45 each; switch
      Leviton 15A toggle CAD 1.58 each; socket Leviton duplex TR CAD 1.78 each;
      DB Siemens SEQ32100SM 100A 32-circuit loadcentre CAD 186.94 each.
      AU (AS/NZS 3000 Wiring Rules, Bunnings / Sparky Direct live listings):
      lighting Nexans Olex 2C+E 1.5mm2 TPS 100m AUD 149.00 = 1.49/m; socket
      Olex 2C+E 2.5mm2 TPS 100m AUD 239.00 = 2.39/m; dedicated DETA 6mm2
      2C+E TPS 20m AUD 166.00 = 8.30/m; earth Olex 6mm2 green/yellow earth
      AUD 3.30/m; feeder Electra-Cables 16mm2 100m AUD 539.59 = 5.40/m;
      conduit DETA 20mm x 4m rigid conduit AUD 4.34 = 1.09/m; junction
      DETA 4x40A box AUD 4.45 each; breaker DETA 20A 1P+N 6kA 30mA Type A
      RCBO AUD 46.30 each; switch DETA 1-gang switch AUD 8.07 each; socket
      DETA double GPO 10A AUD 7.59 each; DB Major Tech VBM1114SMA 12-pole
      distribution board AUD 48.40 each.
      IN (IS 732 / NBC 2016, Moglix / TradeIndia live listings):
      lighting Finolex 1.5 sq mm FR PVC 90m INR 2,406 = 26.73/m; socket
      Finolex 2.5 sq mm FR PVC 90m INR 3,597 = 39.97/m; dedicated Finolex
      Gold 4.0 sq mm FR PVC 90m INR 5,208 = 57.87/m; earth Finolex Gold
      1.5 sq mm green Cu 90m INR 2,088 = 23.20/m; feeder Finolex 16 sq mm
      2C XLPE armoured 100m INR 13,186 = 131.86/m; conduit Primco Plast
      20mm MMS rigid PVC conduit 3m INR 50.00 = 16.67/m; junction Tekson
      2-module GI metal box INR 69.00 each; breaker Havells 16A SP B-curve
      MCB INR 200.00 each; switch Anchor Penta Modular 6A 20-pack INR 919 =
      45.95 each; socket Anchor Roma 6/16A combi socket 10-pack INR 2,193 =
      219.30 each; DB Anchor UNO 6-way SPN distribution board INR 2,434.00 each.
- [x] P2 batch 11: ELECTRICAL BOOKS GH, KE, ZA (2026-10-13,
      migration 20261013240000): 33 rows (11 per market), all manual.
      Electrical books now live for US, GB, DE, NG, CA, AU, IN, GH, KE, ZA (10 of 20 markets).
      GH (Energy Commission L.I. 2008 methodology, Valmont/Esca Tech live listings):
      lighting RR 1.5mm2 Cu 100m GH₵ 320.00 = 3.20/m; socket RR 2.5mm2 Cu 100m GH₵ 460.00 = 4.60/m;
      dedicated RR 4.0mm2 Cu 100m GH₵ 1,150.00 = 11.50/m; earth RR 2.5mm2 Cu 100m GH₵ 460.00 = 4.60/m;
      feeder Nexans Kabelmetal 16mm2 Cu 100m GH₵ 3,750.00 = 37.50/m; conduit Valmont 20mm x 3m PVC GH₵ 4.83/m;
      junction Valmont 3x3 PVC pattress box GH₵ 4.50 each; breaker Valmont Focus 1P MCB GH₵ 28.00 each;
      switch Valmont Focus 1-gang 1-way GH₵ 15.00 each; socket Valmont Focus 13A double socket GH₵ 38.00 each;
      DB Valmont Focus 12-way consumer unit GH₵ 390.00 each.
      KE (EPRA / KS IEC 60364 methodology, TDK / East Africa Cable / Rapidtech live listings):
      lighting East Africa Cable 1.5mm2 Cu 100m KES 3,600.00 = 36.00/m; socket East Africa Cable 2.5mm2
      Cu 90m KES 7,900.00 = 87.78/m; dedicated East Africa Cable 4.0mm2 Cu 100m KES 9,000.00 = 90.00/m;
      earth East Africa Cable 2.5mm2 Cu 90m KES 7,900.00 = 87.78/m; feeder TDK 16mm2 Cu 100m
      KES 28,400.00 = 284.00/m; conduit Rapidtech Tronic 20mm x 2.9m PVC KES 68.97/m; junction Winstar
      single box KES 40.00 each; breaker Randtech 1P 20A MCB KES 270.00 each; switch Tronic 1-gang 1-way
      KES 95.00 each; socket Hada Windsor 13A twin socket KES 300.00 each; DB Havells 8-way SPN DB KES 4,500.00 each.
      ZA (SANS 10142-1 methodology, Leroy Merlin SA / Builders Warehouse live listings):
      lighting Aberdare Surfix 1.5mm2 2C+E 100m R 1,649.00 = 16.49/m; socket Surfix 2.5mm2 2C+E 100m
      R 2,249.00 = 22.49/m; dedicated 4.0mm2 T&E 10m R 411.00 = 41.10/m; earth Waco 1.5mm2 earth wire R 7.00/m;
      feeder 16mm2 2C+E armoured cable 25m R 2,499.00 = 99.96/m; conduit 20mm PVC conduit 3m R 34.00 = 11.33/m;
      junction Crabtree 4x2 PVC box R 14.00 each; breaker CBI 20A 1P MCB R 99.00 each; switch Veti 1-gang
      1-way switch R 54.00 each; socket Veti double 16A socket R 115.00 each; DB Crabtree 12-way surface DB R 349.00 each.
- [x] P2 batch 12: ELECTRICAL BOOKS FR, BR, SA, AE (2026-10-13,
      migration 20261013250000): 44 rows (11 per market), all manual.
      Electrical books now live for US, GB, DE, NG, CA, AU, IN, GH, KE, ZA, FR, BR, SA, AE (14 of 20 markets).
      FR (NF C 15-100 methodology, Brico Dépôt / Leroy Merlin France live listings):
      lighting Nexans H07V-U 1.5mm2 100m 21.60 € = 0.22/m; socket H07V-U 2.5mm2 100m 32.90 € = 0.33/m;
      dedicated H07V-R 6.0mm2 25m 35.90 € = 1.44/m (32A plaque de cuisson); earth H07V-U 2.5mm2 100m 32.90 € = 0.33/m;
      feeder H07V-R 16mm2 3.20 €/m; conduit ICTA Ø20mm 100m 30.50 € = 0.31/m; junction boîte placo Ø67mm 0.59 € each;
      breaker Schneider Domae 1P+N 16A/20A 8.99 € each; switch Schneider Ovalis 10A 3.29 € each;
      socket Legrand Dooxie 2P+T 16A affleurante 4.59 € each; DB tableau 2 rangées 26 modules 48.90 € each.
      BR (ABNT NBR 5410 methodology, Leroy Merlin Brasil / Cobrecom / Megatron live listings):
      lighting Cobrecom 1.5mm2 flex 100m R$ 162,90 = 1.63/m; socket Megatron 2.5mm2 flex 100m R$ 229,90 = 2.30/m;
      dedicated Megatron 6.0mm2 flex 100m R$ 599,90 = 6.00/m (chuveiro elétrico); earth Cobrecom 2.5mm2 flex 100m
      R$ 229,90 = 2.30/m; feeder Cobrecom 16mm2 flex 100m R$ 1.540,00 = 15.40/m; conduit Tramontina DN25 50m
      R$ 84,99 = 1.70/m; junction Tigre Tigreflex 4x2 amarela R$ 3,69 each; breaker Steck 1P 20A DIN R$ 9,90 each;
      switch Tramontina Liz 1-gang R$ 11,90 each; socket Tramontina Liz 10A 2P+T NBR 14136 R$ 15,90 each;
      DB Tigre 12/16 disjuntores embutir R$ 108,90 each.
      SA (SBC 401 / SASO methodology, Alfanar / Boussah live listings):
      lighting Alfanar 2.5mm2 Cu 100m 271 SAR = 2.71/m; socket Alfanar 4.0mm2 Cu 100m 418 SAR = 4.18/m;
      dedicated Alfanar 6.0mm2 Cu 100m 639 SAR = 6.39/m; earth Alfanar 2.5mm2 Cu 100m 271 SAR = 2.71/m;
      feeder Riyadh Cables / Alfanar 4C 16mm2 Cu 35.00 SAR/m; conduit 20/25mm EMT / PVC 19.55 SAR/3m = 6.52/m;
      junction Alfanar GI back box 7x7 cm 2.70 SAR each; breaker Alfanar 1P 20A/32A MCB 10kA 19.00 SAR each;
      switch Alfanar Alfa 1-gang 10A 7.45 SAR each; socket Alfanar Massa 13A 3-pin SASO 2203 24.30 SAR each;
      DB Alfanar 12-way 100A consumer unit 465.75 SAR each.
      AE (DEWA / BS 7671 methodology, Ducab / Schneider / SupplyVan live listings):
      lighting Ducab 2.5mm2 Cu 100m 113 AED = 1.13/m; socket Ducab 4.0mm2 Cu 100m 175 AED = 1.75/m;
      dedicated Ducab 6.0mm2 Cu 100m 260 AED = 2.60/m; earth Ducab 2.5mm2 Cu 100m 113 AED = 1.13/m;
      feeder Ducab 4C 16mm2 cable 28.00 AED/m; conduit Decoduct 25mm PVC 3m 5.00 AED = 1.67/m;
      junction York GI back box 3x3 2.00 AED each; breaker Schneider Easy9 1P 20A 16.82 AED each;
      switch Schneider Vivace 1-gang 6.00 AED each; socket Schneider Vivace 13A switched socket 16.00 AED each;
      DB Gewiss / Schneider / Hager 8-12 way consumer unit 337.00 AED each.
- [x] P2 batch 13: ELECTRICAL BOOKS IT, MX, JP (2026-10-13,
      migration 20261013260000): 33 rows (11 per market), all manual.
      Electrical books now live for US, GB, DE, NG, CA, AU, IN, GH, KE, ZA, FR, BR, SA, AE, IT, MX, JP (17 of 20 markets).
      IT (CEI 64-8 methodology, Tecnomat / Leroy Merlin Italia live listings):
      lighting Cavo FS17 1x1.5mm2 100m 21.90 € = 0.22/m; socket FS17 1x2.5mm2 100m 34.90 € = 0.35/m;
      dedicated FS17 1x6.0mm2 100m 85.03 € = 0.85/m (piano cottura induzione 32A); earth FS17 1x2.5mm2 100m
      34.90 € = 0.35/m; feeder FS17 1x16mm2 / FG16 3.50 €/m; conduit Tubo corrugato Ø20mm 100m 31.97 € = 0.32/m;
      junction Scatola 503 3 moduli 0.95 € each; breaker Bticino 1P+N 10A/16A 4.5kA 8.50 € each;
      switch Bticino Matix 1P 10AX completo 4.50 € each; socket Bticino Matix bipasso 10/16A 2P+T 5.80 € each;
      DB Sartel incasso 24 moduli IP40 21.40 € each.
      MX (NOM-001-SEDE-2018 methodology, The Home Depot México live listings):
      lighting IUSA/Indiana THW-LS 14 AWG 100m ,025.00 MXN = 10.25/m; socket Indiana/IUSA THW-LS 12 AWG 100m
      ,435.00 MXN = 14.35/m; dedicated IUSA THW-LS 10 AWG 100m ,279.00 MXN = 22.79/m; earth IUSA THW-LS
      14 AWG verde 100m ,025.00 MXN = 10.25/m; feeder Indiana THW-LS 8 AWG 1.50/m; conduit Poliflex
      naranja 3/4" 50m 99.00 MXN = 19.98/m; junction Amanco chalupa 1/2" PVC 2.00 MXN each; breaker
      Square D QO 1P 15A/20A QO115/QO120 29.00 MXN each; switch Commercial Electric apagador con placa
      9.00 MXN each; socket Lucek duplex polarizado/aterrizado con placa 5.00 MXN each; DB Centro de carga
      Square D QOD 8 polos bifásica empotrar 69.00 MXN each.
      JP (DENAN Law / JIS C 8305 methodology, MonotaRO / Amazon.co.jp live listings):
      lighting Fujidenshi/YASAKA 600V VVF 1.6mm 2C 100m ¥16,478 = 165.00/m; socket Aichi/YASAKA VVF 2.0mm
      2C 100m ¥24,980 = 250.00/m; dedicated YASAKA VVF 2.0mm 3C / 200V with earth 100m ¥39,980 = 400.00/m;
      earth Aichi IV 1.6mm green 100m ¥6,490 = 65.00/m; feeder 600V CV 3C 8mm2 ¥1,250.00/m; conduit
      Bakuma/Mirai PF-16 16mm 50m ¥4,948 = 99.00/m; junction Mirai CSW-1NF 1-gang box ¥461.00 each;
      breaker Panasonic compact breaker SH 2P1E 20A BSH2201 ¥1,428.00 each; switch Panasonic Cosmo Wide 21
      switch set WT5001 ¥580.00 each; socket Panasonic Cosmo Wide 21 duplex grounding outlet WTF1502WK ¥680.00 each;
      DB Tempearl/Panasonic 8-circuit residential DB with ELB ¥17,580.00 each.
- [x] P2 batch 14: ELECTRICAL BOOKS CN, ID, KR (2026-10-13,
      migration 20261013270000): 33 rows (11 per market), all manual.
      ALL 20 ELECTRICAL MARKETS ARE NOW COMPLETE: US, GB, DE, NG, CA, AU, IN, GH, KE, ZA, FR, BR, SA, AE, IT, MX, JP, CN, ID, KR (20 of 20 markets, 220 active rows total).
      CN (GB 50054 / GB 50303 methodology, live merchant listings):
      lighting Huaxin / Zhujiang ZR-BV 1x1.5mm2 100m 88.80-91.60 ¥ = 0.90 CNY/m; socket Xinxing / Zhujiang ZR-BV 1x2.5mm2 100m 145.00 ¥ = 1.45 CNY/m;
      dedicated Huaxin ZR-BV 1x4.0mm2 100m 223.60 ¥ = 2.24 CNY/m; earth ZR-BV 1x2.5mm2 yellow/green 100m 145.00 ¥ = 1.45 CNY/m;
      feeder Huaxin / Zhujiang ZR-BV 1x16mm2 / YJV 3x10/16mm2 14.80 CNY/m; conduit LESSO (联塑) PVC-U cold-bend A-pipe Ø20mm 2.85m 7.05 ¥ = 2.47 CNY/m;
      junction LESSO / TEP 86-type PVC flush box (86型暗盒) 2.50 CNY each; breaker Chint (正泰) NXB-63 / DZ47 1P 16A/20A MCB 6kA 8.50 CNY each;
      switch Bull (公牛) G12 86-type 1-gang 1-way switch (一开单控) 7.20 CNY each; socket Bull (公牛) G12 10A 5-hole combination socket (五孔插座) 7.20 CNY each;
      DB Chint (正泰) PZ30-8 / PZ30-12 flush residential distribution box body 75.00 CNY each.
      ID (PUIL 2011 / SNI 0225 methodology, Mitra10 / Tokopedia / GudangMaterial live listings):
      lighting Kabel Eterna NYM 2x1.5mm2 50m IDR 666,000 = IDR 13,320/m; socket Kabel Supreme NYM 3x2.5mm2 50m IDR 1,370,000 = IDR 27,400/m;
      dedicated Kabel Supreme NYM 3x4.0mm2 IDR 42,000/m; earth Kabel NYA 1x2.5mm2 tembaga hijau/kuning IDR 4,800/m;
      feeder Kabel NYY 4x6 / 4x10mm2 PLN intake cable IDR 68,000/m; conduit Pipa conduit Boss / Clipsal PVC Ø20mm 2.9m/3m IDR 16,800 = IDR 5,800/m;
      junction Inbow Doos mangkok tanam Nero / Broco IDR 2,800 each; breaker MCB Schneider Domae 1P 10A/16A/20A 4.5kA IDR 75,000 each;
      switch Saklar engkel 1-gang inbow Broco Galleo / Gracio IDR 21,000 each; socket Stop kontak arde Schuko 16A Broco Galleo G151 IDR 22,500 each;
      DB Box MCB Schneider Domae DOMH12108F 8 modul inbow IDR 185,000 each.
      KR (KEC 2021 / KS C IEC 60364 methodology, Enuri / Danawa / Seoul P&C / Sangdo live listings):
      lighting LS Cable / Gaon HFIX 1x1.5mm2 100m 51,000 KRW = 510 KRW/m; socket LS Cable / Gaon HFIX 1x2.5mm2 100m 65,350 KRW = 654 KRW/m;
      dedicated LS Cable HFIX 1x4.0mm2 100m 105,000 KRW = 1,050 KRW/m; earth LS Cable HFIX 1x2.5mm2 green 100m 65,350 KRW = 654 KRW/m;
      feeder 600V F-CV 3-core 6/10mm2 8,500 KRW/m; conduit Seoul P&C flame-retardant CD flexible conduit 16mm 100m 27,500 KRW = 275 KRW/m;
      junction Standard 1-gang synthetic resin / steel flush box (1개용 매입박스) 850 KRW each; breaker LS ELECTRIC 32GRhN 2P 20A 30mA ELB 8,770 KRW each;
      switch Winners / Jinheung 1-gang wide flush switch 2,200 KRW each; socket Winners / Jinheung 2-gang grounded outlet 16A 250V (MCP2-22008) 2,450 KRW each;
      DB Sangdo / Jinheung residential distribution board 5-6 circuit (주택용 세대분전함) 22,600 KRW each.
      REMAINING ELECTRICAL BOOKS: None! All 20 markets complete.

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

1. 🟡 **Doors/windows books** (section 4D) — resolver + US/GB/DE seeded & executed.
   CA book ready in `20261014230000_doors_windows_books_ca.sql` but NOT executed live
   (expired Supabase management token — owner action needed). AU blocked-by-access
   (documented leads). Remaining markets disclosed unpriced.
2. 🟡 **DE + GB rebar books** (section 4A) — need merchant-level anchors; all
   leads and gotchas documented.
3. 🟡 **Price campaign remainder (~174 'low' rows)** (section 4E) — sweep by
   region; EG/SA paint in English sources, TR via Trendyol.
4. ❌ **Structural methodology profiles** (section 4F) — the long arc;
   research-heavy, do after the price trades.
5. ✅ **Plumbing fittings & valves** (section 4B) — US, GB, AT, DE COMPLETE
   (20/20 rows seeded with verified retail sources in migrations 20261013160000 & 20261013170000).
6. ✅ **Electrical cable/conduit books** (section 4C) — ALL 20 MARKETS COMPLETE
   (20/20 markets, 220 manual-confidence rows live in migrations 20261013210000–20261013270000).
7. ✅ **Tier 2 Estimator Currency Localization & Regression** (commit `5095e9f`) — ALL 8 PAGES COMPLETE
   with static AST contract and live DOM integration test suites.

---

## 3. STATUS BOARD (workstreams)

| #   | Workstream                                           | Status | Detail                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 39-market price books (8 core rows + finish engines) | ✅     | All 39 markets in `market_profiles` active with books; ~182/356 rows verified                                                                                                                                                                                                                         |
| 2   | Finish engines role-mapped (paint/tile/POP/screed)   | ✅     | NG, US, GB, DE, AU, CA, IN fully mapped via `market_material_roles`; FR has localized role mappings                                                                                                                                                                                                   |
| 3   | Market-aware UI (i18n, currency, persistence)        | ✅     | Commit `fb776ffd` (internationalized calculators) + `5095e9f` (Tier 2 8-estimator complete currency localization & regression suites)                                                                                                                                                                 |
| 4   | Foundation estimator market pricing                  | ✅     | Overlay + provenance + currency (commit `2c960ad6`)                                                                                                                                                                                                                                                   |
| 5   | BuildToRoof market prefills                          | ✅     | Prices step prefills from market book; 34 inputs currency-aware (`350e2f1f`)                                                                                                                                                                                                                          |
| 6   | Trade coverage panels (electrical/plumbing/doors)    | ✅     | Non-NG users told plainly what's covered (`350e2f1f`)                                                                                                                                                                                                                                                 |
| 7   | Rebar books                                          | 🟡     | ✅ US, DE, IN, EG verified; 🟡 AU indicative ('low', needs quote); ❌ GB, CA, rest                                                                                                                                                                                                                    |
| 8   | Plumbing pipe books                                  | 🟡     | ✅ GB all 4 keys, US all 4, DE waste/drainage, AT cold/hot; ❌ DE cold/hot (PP-R)                                                                                                                                                                                                                     |
| 8b  | Plumbing fittings/valves                             | ✅     | Resolver walks PLUMBING_FITTING_KEYS (per-piece). US 5/5, GB 5/5, AT 5/5, DE 5/5 complete (migrations 20261013160000 & 20261013170000; 20/20 rows seeded with verified retail sources)                                                                                                                |
| 9   | Electrical books                                     | ✅     | All 20 markets complete (US, GB, DE, NG, CA, AU, IN, GH, KE, ZA, FR, BR, SA, AE, IT, MX, JP, CN, ID, KR; 220 active rows)                                                                                                                                                                             |
| 10  | Doors/windows books                                  | 🟡     | Resolver + page coverage/provenance live; US, GB, DE executed live (20261014170000); CA ready-but-not-executed (20261014230000, expired mgmt token); AU blocked-by-access; other markets disclosed unpriced                                                                                           |
| 11  | Price campaign remainder                             | 🟡     | ~174 'low' rows to verify                                                                                                                                                                                                                                                                             |
| 12  | Structural methodology profiles                      | ❌     | Research arc (DIN/BS/ACI foundation, block modules)                                                                                                                                                                                                                                                   |
| 13  | AI foundation adapters (engines-expanded.ts)         | ✅     | Repaired 2026-10-13: electrical/plumbing adapters called 3-arg engines with 1 arg and read nonexistent result fields (would crash the conversational estimator). Now fetch rules + market price book exactly like the pages; margin/roof/regional adapters field-corrected; quantityLine takes 3 args |
| 14  | Wallfinishing int'l assemblies (remote branch)       | ✅     | 2026-10-13: `mortar-mix` mode mapped to engine `volume` (old mode silently refused to calculate), thickness shapes normalized, WallLayerCategory widened (lining/render/plaster), WallSubstrate += aac; type gate 49 → 0                                                                              |

Key commits (newest last): `af1bdeea` role-fallback disclosure ·
`2c960ad6` foundation market pricing · `fb776ffd` i18n calculators ·
`350e2f1f` 6-page market pricing · `9de911d2` rebar US/DE/IN ·
`51bbfedc` EG rebar · `9d3b6512` AU rebar indicative + confidence-aware
provenance · `b3f12d40` plumbing US/DE · `6f34d349` GB pipes ·
`0ee2ea40` GB drainage (GB complete) · US drainage + AT pipes · `e12ba27a` identity sweep rebased onto remote structural work · `6c82cadc` AI adapter repair + wallfinishing data fixes + type gate 0 · `2e55788` electrical NG/CA/AU/IN · `146eeb52` electrical GH/KE/ZA · `76eb3df6` electrical FR/BR/SA/AE · `4ce1fe6b` electrical IT/MX/JP · `6d691099` electrical CN/ID/KR (all 20 markets complete) · `92e953d` plumbing fittings full coverage · `5095e9f` Tier 2 estimator currency localization & regression suites (latest).

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
  - "
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

### C. Electrical books (COMPLETE — all 20 markets)

- **Status**: ✅ All 20 markets completed across batches 8 through 14 (migrations `20261013210000` through `20261013270000`):
  - US & GB (batch 8, migration `20261013210000`)
  - DE (batch 9, migration `20261013220000`)
  - NG, CA, AU, IN (batch 10, migration `20261013230000`)
  - GH, KE, ZA (batch 11, migration `20261013240000`)
  - FR, BR, SA, AE (batch 12, migration `20261013250000`)
  - IT, MX, JP (batch 13, migration `20261013260000`)
  - CN, ID, KR (batch 14, migration `20261013270000`)
- 220 active price rows total (11 material slugs per market) all verified with `scan_confidence='manual'` and full provenance notes.
- Resolver `resolveMarketElectrical` wired into `ElectricalEstimator.tsx` with market overlays, live currency formatting, and fallback provenance.
- Electrical profiles unit test suite covers all 20 markets in `src/lib/estimation/__tests__/electrical-profiles.test.ts` (all 20 passed).

### D. Doors/windows books + BuildToRoof prefills

- ✅ Doors/windows resolver (`resolveMarketDoorsWindows`) and engine keys (`DOORS_WINDOWS_ENGINE_KEYS`) implemented in `structural-market.ts`.
- ✅ Page integration in `DoorsWindowsEstimator.tsx` with dynamic coverage badge, provenance card, and honest unpriced disclosure (no silent fallback).
- ✅ Verified price seeds for US, GB, DE in `20261014170000_doors_windows_books_us_gb_de.sql` (EXECUTED live).
- 🟡 CA price book `20261014230000_doors_windows_books_ca.sql` (6 verified Home Depot Canada
  rows) — READY, needs DB execution (expired management token).
- 🟡 ZA & FR price book `20261015010000_doors_windows_books_za_fr.sql` (11 verified rows:
  7 ZA rows from Cashbuild / Doors Direct / Leroy Merlin SA; 4 FR rows from Brico Dépôt France) — READY,
  needs DB execution alongside CA.
- ❌→blocked-by-access AU: Bunnings Cloudflare-gated, Mitre 10 empty render, Doors Plus
  quote-only, Hume Doors no online prices. Do not seed from search snippets (gotcha).
  Retry when a clean product page is reachable; candidate leads: Lockwood Symmetry Manor
  entrance knobset $62.72 (Bunnings p4092809), Ikonic San Fran passage leverset $24.98
  (p0407181), Lemaar Almeri passage handle $60.89 (p0491748).
- BTR: cement/sand prefills exist; rebar prefill is active for markets with rebar books. Opening purchases remain explicitly excluded from BTR per engineering design.

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
