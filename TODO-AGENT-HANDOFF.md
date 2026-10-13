# FRELUX — Global Expansion TODO / Agent Handoff

Living handoff for the Frelux market-expansion work. **Status markers:** ✅ DONE,
🟡 PARTIAL (has verified data, gaps remain), ❌ NOT STARTED. Any agent
continuing cold: read section 2 (WHERE TO START), verify state with the
commands in section 6, then work top-to-bottom through section 4 (REMAINING
WORK). Update this file with every batch you complete — including flipping
status markers and adding the commit hash.

Last updated: 2026-10-13 (P2 batch 2 typology profiles all 20 markets + concurrent UI currency sweep reconciled)

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
      REMAINING ELECTRICAL BOOKS (13 of 20): GH KE ZA JP FR BR SA AE CN
      ID MX KR IT. Next suggested order: GH KE ZA, then FR BR SA AE,
      then hard markets (JP KR CN ID MX KR IT).

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

| #   | Workstream                                           | Status | Detail                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 39-market price books (8 core rows + finish engines) | ✅     | All 39 markets in `market_profiles` active with books; ~182/356 rows verified                                                                                                                                                                                                                         |
| 2   | Finish engines role-mapped (paint/tile/POP/screed)   | ✅     | NG, US, GB, DE, AU, CA, IN fully mapped via `market_material_roles`; FR has localized role mappings                                                                                                                                                                                                   |
| 3   | Market-aware UI (i18n, currency, persistence)        | ✅     | Commit `fb776ffd` (internationalized calculators)                                                                                                                                                                                                                                                     |
| 4   | Foundation estimator market pricing                  | ✅     | Overlay + provenance + currency (commit `2c960ad6`)                                                                                                                                                                                                                                                   |
| 5   | BuildToRoof market prefills                          | ✅     | Prices step prefills from market book; 34 inputs currency-aware (`350e2f1f`)                                                                                                                                                                                                                          |
| 6   | Trade coverage panels (electrical/plumbing/doors)    | ✅     | Non-NG users told plainly what's covered (`350e2f1f`)                                                                                                                                                                                                                                                 |
| 7   | Rebar books                                          | 🟡     | ✅ US, DE, IN, EG verified; 🟡 AU indicative ('low', needs quote); ❌ GB, CA, rest                                                                                                                                                                                                                    |
| 8   | Plumbing pipe books                                  | 🟡     | ✅ GB all 4 keys, US all 4, DE waste/drainage, AT cold/hot; ❌ DE cold/hot (PP-R)                                                                                                                                                                                                                     |
| 8b  | Plumbing fittings/valves                             | 🟡     | Resolver walks PLUMBING_FITTING_KEYS (per-piece). US 5/5 + GB 4/5 + AT 2/5 LIVE in DB (seed migration executed 2026-10-13; 11/11 rows scan_confidence='manual', verified via resolver-shaped lookup). ❌ gb-union, at-elbow/union/valve, all DE                                                       |
| 9   | Electrical books                                     | 🟡     | US, GB, DE, NG, CA, AU, IN, GH, KE, ZA (10/20) complete; 10 markets remaining                                                                                                                                                                                                                         |
| 10  | Doors/windows books                                  | ❌     | Not started                                                                                                                                                                                                                                                                                           |
| 11  | Price campaign remainder                             | 🟡     | ~174 'low' rows to verify                                                                                                                                                                                                                                                                             |
| 12  | Structural methodology profiles                      | ❌     | Research arc (DIN/BS/ACI foundation, block modules)                                                                                                                                                                                                                                                   |
| 13  | AI foundation adapters (engines-expanded.ts)         | ✅     | Repaired 2026-10-13: electrical/plumbing adapters called 3-arg engines with 1 arg and read nonexistent result fields (would crash the conversational estimator). Now fetch rules + market price book exactly like the pages; margin/roof/regional adapters field-corrected; quantityLine takes 3 args |
| 14  | Wallfinishing int'l assemblies (remote branch)       | ✅     | 2026-10-13: `mortar-mix` mode mapped to engine `volume` (old mode silently refused to calculate), thickness shapes normalized, WallLayerCategory widened (lining/render/plaster), WallSubstrate += aac; type gate 49 → 0                                                                              |

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
