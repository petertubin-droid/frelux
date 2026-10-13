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
- [ ] P1.6 Common market context + unit conversion service
      (`measurement-bridge.ts` exists — audit per-engine adoption)
- [ ] P1.7 Material roles / provenance / pricebook validation (exists for
      wall finishing; extend to other engines)
- [ ] P1.8 Standards + evidence registry (new table; per-market entries)
- [ ] P1.9 Calculation audit metadata (exists for wall finishing)
- [ ] P2.10–14 Wall/ceiling assemblies (15 markets done; CN ID MX KR IT
      pending), electrical + plumbing modular profiles, Build-to-Roof
      typologies, structural/masonry/flooring localization
- [ ] P3.15–17 AI features → deterministic engine routing per market;
      saved-project market pinning; admin config center surfaces
- [ ] P4.18–20 CN ID MX KR IT full profiles, e2e + regression matrix,
      deployment verification report

## 5. Non-negotiables honoured

- No invented prices, products, standards or assumptions; no silent NG
  fallback (pricing resolver returns null = unpriced; wall-finishing
  engine reports unpriced lines).
- Additive only: existing NG rows preserved; admin-disabled rows preserved
  (`ON CONFLICT DO NOTHING`); no destructive production changes.
- Tests added: `capability-registry.test.ts` (10 tests incl. a
  migration-sync test that fails if the SQL seed drifts from the TS
  registry), `calculator-config.test.ts` rewritten (12 tests).
