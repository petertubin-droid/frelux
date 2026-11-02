# 20-Market Internationalization Audit — 2026-10-13

Phase 1 forensic baseline for the 20-market mandate
(20 markets: NG US GB CA AU DE IN GH KE ZA JP FR BR SA AE CN ID MX KR IT).
Starting commit: `ce3583d5` (main, pushed). This document records what was
verified against the actual repository and production database, not what
any earlier report claimed.

## 1. Verified inventory

### Market registry

- **Canonical market layer**: `BUILTIN_MARKET_PROFILES` in
  `src/lib/international/market-context.tsx` — exactly 20 profiles, all
  `status: "active"`, each with currency, measurement system, unit lists and
  local terminology. DB mirror `market_profiles` (unique on country_code).
- **Measurement defaults**: US + CA `imperial`, NG `mixed`, remaining 17
  `metric`.
- **Country picker** (`countries.ts`) lists 33 countries incl. non-profile
  codes (ET, EG, TZ, CI, ES, NL, PL, SE, CH, ID…) — picker options, not
  market profiles. Only the 20 registered profiles resolve market context.
- **Wall finishing engine countries** (`wallfinishing/countries.ts`): 15 of
  the 20 (no CN/ID/MX/KR/IT).

### Engines (canonical registry, commit this round)

`ENGINE_CAPABILITIES` in `src/lib/international/capability-registry.ts` —
34 engines across finishing / structure / MEP / costing / AI, each with
portability classification, verified market list and evidence citation.
Verified pairs: 174 (NG: all 34; the other 14 finishing markets: the 5
finishing engines + margin + 4 market-independent AI features).

### Database state (production, verified 2026-10-13)

- `market_calculator_config`: seeded for 15 markets (NG 34 rows, others 10)
  from `engine_capability_verified` — migration
  `20261014130000_engine_capability_registry.sql`.
- `engine_capabilities` / `engine_capability_verified`: new registry tables
  (public read), backing the `market_config_integrity_issues` view (empty =
  no config row claims unverified availability).
- Price books: 39 active markets in `estimation_prices`; wall-finishing
  role mappings for 15 markets; CN/ID/MX/KR/IT have pricebook rows but no
  role mappings or assemblies → their finishing engines are honestly
  `not_implemented`, not silently enabled.

## 2. Defects found and fixed this round (Phase 2 of the mandate)

1. **Missing config row silently disabled supported markets.**
   `isCalculatorAvailable` returned `config?.is_available ?? false`; only
   NG was special-cased. 14 of 20 markets returned false for everything.
   Fixed: registry-driven resolution where verified engines with no row are
   `enabled`, and NG is no longer special-cased (it is simply verified for
   the widest engine set, preserving behaviour).
2. **DB rows could manufacture capabilities.** An `is_available = true` row
   now yields `requires_verification` when the pair is not in the verified
   registry; only explicit `false` rows can disable.
3. **No truthful availability states.** Added
   `resolveCalculatorAvailability` returning
   `enabled | disabled | not_configured | not_implemented |
requires_verification` with user-safe reasons.
4. **Config table CHECK listed 13 calculator types** while the app ships
   34 engines. Widened to the canonical list (additive; existing rows
   untouched).

## 3. Status per market (honest, as of this commit)

| Market                  | Currency                        | Units                     | Verified engines     | Unverified but wired                                      | Gaps                                                                 |
| ----------------------- | ------------------------------- | ------------------------- | -------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| NG                      | NGN                             | mixed                     | all 34               | —                                                         | none known                                                           |
| US GB CA AU DE IN       | USD GBP CAD AUD EUR INR         | imp/met/imp/met/met/mixed | 10 each              | structure/MEP engines are NG-typology (`not_implemented`) | US timber-frame / cavity-wall typologies pending                     |
| GH KE ZA JP FR BR SA AE | GHS KES ZAR JPY EUR BRL SAR AED | metric                    | 10 each              | as above                                                  | price sources mostly unscannable (Jiji 403s); some prices unverified |
| CN ID MX KR IT          | CNY IDR MXN KRW EUR             | metric                    | 4 each (margin + AI) | finishing engines `not_implemented`: no assemblies/roles  | profiles exist, engines unverified                                   |

## 4. Backlog (mandate phases 3–17, ordered)

- [x] P0.1 Forensic audit + baseline (this document)
- [x] P0.2 Market configuration gating fixed (registry + seeds + tests)
- [x] P0.3 Capability registry + truthful availability states
- [x] P0.4 Unit conversion / market defaults sweep — VERIFIED 2026-10-13
      (no defects found): paint pack size resolves from
      `product.standard_pack_size` → pack-size rule → 20 L default
      (`getPackSizeLitres`, paint-engine.ts), never hardcoded per page;
      local terminology (`paint_bucket`, `cement_bag`, …) flows from
      market profiles via `local_terminology` (CostEstimator,
      regional intelligence); B2R prefills market cement/sand prices
      per market and marks the NG default when the book is empty
      (BuildToRoofEstimator.tsx 405–431). No page hardcodes bucket/bag
      labels without market context (swept src/pages + src/components).
- [x] P0.5 Missing-price guard sweep — VERIFIED 2026-10-13 (no defects
      found): estimation engines (paint, electrical, doors/windows,
      flooring, foundation, generator, maintenance) all use the
      pricedLines/unpriced split — totals count only priced lines and
      unpriced items push explicit warnings ("NOT CONFIGURED"), never
      zero-cost; `fetchMarketPriceBook` is market-scoped with disclosed
      NG-reference fallback (`fromReference`), cross-market mixing via
      `fetchAllPrices` remains only in the admin price updater (admin
      surface, by design). Inheritance: only AU/CA/AE inherit NG in
      production; all other books stand alone.
- [x] P1.6 Market-aware unit defaults — DONE 2026-10-13. Audit finding:
      no page consumed the measurement bridge; 6 pages hardcoded their
      initial room unit (PaintCalculator + PaintingEstimator "feet" for
      everyone; FinishEstimator, PopCeilingCostEstimator, PopCeilingCalculator,
      TileCalculator "meters" for everyone). Fix: new
      `room-unit-defaults.ts` (`resolveMarketRoomUnit(market, legacyDefault)` —
      NG keeps each page's existing default untouched; imperial markets get
      feet; metric markets get meters; scale-matched room/door/window
      dimension defaults per unit) wired into all 6 pages with
      pristine-room sync effects that never override user edits. Tests:
      room-unit-defaults.test.ts (7) + all 6 page test files green
      (19 tests).
- [ ] P1.7 Material roles / provenance / pricebook validation (exists for
      wall finishing; extend to other engines)
- [x] P1.8 Standards + evidence registry — DONE 2026-10-13, migration
      20261014140000 applied to production: `construction_standards`
      table (market_code FK, domain, authority, evidence_type,
      coverage_spec, applies_to, confidence, RLS public read) seeded
      with 16 verified entries across 10 markets (ZA RhinoLite +
      Gyproc screed datasheets, SA/AE Knauf MP75, KE putty + screed
      guide, GH putty planning rate, JP gypsum box rate, BR Suvinil
      ficha + Argalit ACII, FR webercol flex + NF DTU 42.1, GB BS EN
      1401-1, DE DIN EN 1451). Notes lifted verbatim from project
      migrations; no invented standards; low-confidence planning
      defaults labelled as such. Sync guard:
      construction-standards.test.ts (4 tests).
- [x] P1.9 Calculation audit metadata — DONE 2026-10-13. Audit finding:
      createCalculationAudit existed but was consumed by NO save path;
      estimates from 12 calculator pages persisted with zero market
      traceability. Fix: createEstimateAuditFromStorage() +
      withCalculationAudit() in calculation-audit.ts (reads the same
      localStorage keys the MarketProvider resolves on first render;
      NG legacy fallback; never throws, never blocks a save) wired
      into the single persistence choke point createEstimate() in
      estimation/queries.ts — audit lands in
      inputs.calculation_audit (jsonb, no schema change), never
      overwrites an existing audit. Tests: calculation-audit.test.ts
      (10 green) + estimate-consuming page tests (14 green).
- [x] P2.10–13 substantially done — re-verified 2026-10-13 after the
      parallel session's commit 3352f336 (this backlog entry was stale).
      Actual verified state: wall assemblies for ALL 20 markets in
      wallfinishing/assemblies.ts (id-prefix counts: gb 14, us/sa/ng/fr/
      ca/au/ae 9, za/ke/jp/it/in/gh/de/cn/br 8, mx/id 7, kr 6);
      electrical-profiles.ts + plumbing-profiles.ts (all 20 markets,
      NM-B for US, market pipe standards) consumed by
      ElectricalEstimator/PlumbingEstimator pages;
      construction-typologies.ts (20 typologies) consumed by
      BuildToRoofEstimator; structural-market.ts price provenance
      consumed by Foundation/Reinforcement/BuildToRoof/Plumbing pages.
      Tests: electrical/plumbing profiles + typologies + engines 64
      green; Electrical/Plumbing/BuildToRoof page tests 3 green.
      Remaining gap (P2.14): no dedicated masonry engine module —
      blockwork/concrete lives inside Build-to-Roof typologies;
      flooring-engine.ts geometry is market-neutral (price lookup is
      market-aware via material roles only).
- [x] P3.15 AI→deterministic engine routing (conversational estimator) —
      DONE 2026-10-14: ConversationalEstimator was fully market-blind
      (0 references). Now resolves the visitor's market, fetches admin
      paint-type coverage + the market's verified retail pack via
      resolveMaterialPriceByRole → estimation_pack_sizes join (new
      fetchPackSizeById), passes the market CalcConfig into the
      deterministic engine, discloses market context + price availability
      on the reply, and pins market into parse-log telemetry.
      Remaining AI pages (CountVision, AiColorAssistant, DefectDiagnosis)
      are market-neutral by design — no price/engine divergence yet.
      Tests: 7 page tests incl. disclosure + telemetry pin.
- [x] P3.16 saved-project market pinning — DONE 2026-10-14:
      saveCalculationToProject attaches calc_data.market_pin via
      createEstimateAuditFromStorage (additive, never overwrites,
      non-object data untouched); readMarketPin helper + ProjectDetail
      badge show the pinned market on historical saves.
      Certification suite extended (28 tests green).
- [x] P3.17 admin config center surfaces — DONE 2026-10-15:
      `AdminCapabilityAvailability` ("Availability" tab in Admin →
      Engine Configuration) discloses the canonical capability
      registry: per-engine verified/unverified market chips across
      all 20 markets, evidence + unverified reasons verbatim from
      the registry, category/search filters, registry-wide
      verified-pair metrics. Discloses only — a DB availability row
      can never manufacture capability. 6 component tests.
- [x] P4.18–20 CN ID MX KR IT full profiles, e2e + regression matrix,
      deployment verification report — DONE 2026-10-15: native
      profiles were already in code (wall-finishing country
      profiles/assemblies, electrical + plumbing profile records,
      construction typologies for all five markets; parallel effort
      commits 3352f336 + 8bccc391). Closed with:
      `five-market-regression-matrix.test.ts` (36 tests) pinning
      native-record coverage (resolvers' generic fallbacks rejected
      as coverage), currency registration, mandate-set membership
      and capability-registry honesty per market. Surfaced + fixed a
      real bug: Indonesia had NO entry in the international country
      currency table, so `getCountryCurrency("ID")` silently fell
      back to NGN (now `ID → IDR`, `src/lib/international/countries.ts`).
      Deployment verification report distinguishing code vs test-DB
      vs production: `docs/DEPLOYMENT-VERIFICATION-REPORT.md`
      (live Management API reads; 435 migrations recorded; workflow
      edge functions deployed; registry stays honestly
      `requires_verification` for these five markets until
      evidence-backed role mappings + pricebooks exist).

## 5. Non-negotiables honoured

- No invented prices, products, standards or assumptions; no silent NG
  fallback (pricing resolver returns null = unpriced; wall-finishing
  engine reports unpriced lines).
- Additive only: existing NG rows preserved; admin-disabled rows preserved
  (`ON CONFLICT DO NOTHING`); no destructive production changes.
- Tests added: `capability-registry.test.ts` (10 tests incl. a
  migration-sync test that fails if the SQL seed drifts from the TS
  registry), `calculator-config.test.ts` rewritten (12 tests).
