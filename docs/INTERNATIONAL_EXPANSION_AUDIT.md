# International Expansion Audit — 2026-10-13

Phase 1 inventory of the real architecture, before adding JP / FR / BR / SA / AE.
Starting commit: `fc9f8f74` (main, pushed).

## 1. Market registry (single source of truth)

- **Client registry**: `BUILTIN_MARKET_PROFILES` in `src/lib/international/market-context.tsx`
  — 10 profiles (NG, US, GB, CA, AU, DE, IN, GH, KE, ZA), sort_order 10–100,
  typed by `MarketProfile` in `src/types/international.ts`
  (status: active | coming_soon | unsupported | test_only).
- **DB mirror**: `market_profiles` table (`20260824160000_phase40_international_architecture.sql`),
  seeded with NG/US/GB/CA/AU/DE/IN/GH/KE/ZA via phase40 + `20261007120000_us_market_reference_prices.sql`.
  Client falls back to builtins when the DB lookup misses.
- **Detection**: `market-suggest.ts` (timezone → market, privacy-local) and
  `locale-suggest.ts` (browser language → locale). Timezone map currently covers the 10 markets.
- **Country picker** (`countries.ts`) already lists JP, FR, BR, SA, AE with correct currencies —
  these are posting-form options, not registered market profiles yet.

## 2. Per-market capability inventory

| Market | Currency | Units       | Finish engines                                              | Price book | Ref catalog         | Notes                                   |
| ------ | -------- | ----------- | ----------------------------------------------------------- | ---------- | ------------------- | --------------------------------------- |
| NG     | NGN      | mixed m/sqm | POP, screed, tile, paint (native)                           | full       | FALLBACK_PRICES     | default market, deepest data            |
| US     | USD      | imperial    | drywall ceiling, joint-compound skim, VersaBond tile        | full       | US_REFERENCE_PRICES | heat-conscious regions in build-to-roof |
| GB     | GBP      | metric      | Thistle MultiFinish skim, plasterboard ceiling, UK tile set | full       | GB_REFERENCE_PRICES | pipe book (Wickes/Travis Perkins)       |
| CA     | CAD      | imperial    | drywall, joint compound                                     | full       | CA_REFERENCE_PRICES |                                         |
| AU     | AUD      | metric      | Gyprock base coat, Gyprock ceiling                          | full       | AU_REFERENCE_PRICES | rebar indicative book                   |
| DE     | EUR      | metric      | Rigips board, Fertigspachtel, C2TE Flexkleber               | full       | DE_REFERENCE_PRICES | pipe book                               |
| IN     | INR      | mixed       | gypsum board, cement wall putty                             | full       | IN_REFERENCE_PRICES | rebar book                              |
| GH     | GHS      | metric      | market-first fetch, NG fallback                             | partial    | — none              | no reference catalog                    |
| KE     | KES      | metric      | market-first fetch, NG fallback                             | partial    | — none              | no reference catalog                    |
| ZA     | ZAR      | metric      | market-first fetch, NG fallback                             | partial    | — none              | no reference catalog                    |

Known gap (to fix in this expansion per mandate): GH/KE/ZA lack reference
catalogs and market-scoped finish configs; new markets must not repeat that gap.

## 3. Price architecture

- `estimation_prices` (+ `estimation_price_history`, `price_source` col added phase36)
  — shared engine price table, RLS: public read / admin write.
- `market_products`, `market_pricing`, `market_material_rules`,
  `market_calculator_config` (phase40) — market-scoped catalogue + pricing.
- `price_scan_candidates` (`20261005220000`) — pending candidates from
  `price-scan` Edge Function (JSON-LD/meta/regex extraction, admin approval
  promotes to price book; nothing auto-publishes).
- Reference catalogs: `src/lib/estimation/price-scanner.ts`
  (`MARKET_CATALOGS` / `MARKET_DEFAULTS`, `ReferenceMarket` = NG/US/GB/DE/AU/CA/IN).
- Automation: `price-digest` Edge Function driven by pg_cron (Mondays 07:15 UTC,
  `20260920200000_newsletter_price_digest.sql`) — newsletter tracking heartbeat.
  Crawler stack: `src/lib/market-intelligence/` (crawler, price-resolver,
  price-validator, provider-registry) + `intel-search` / `intel-crawl` /
  `market-intelligence-crawl` functions. Admin pages: AdminPriceScan,
  AdminPriceUpdater (7-market selector), AdminPriceSubmissions, AdminMarketIntelligence,
  AdminMaterialPrices, AdminMarkets.

## 4. Rankings

No global rankings exist yet. Metric separation (output size, growth,
cost/m², material cost, FRELUX coverage confidence) will be new work.

## 5. Calculator/estimator surfaces that must respect market context

8 trade estimator pages (paint, tile, screeding, POP, waterproofing, flooring,
generator, reinforcement), structural pages (foundation, build-to-roof,
doors/windows, electrical, plumbing), labour rates (`ac58674f` market-scoped),
BOQ/PDF exports, saved estimates (`estimation_estimates.market_code`),
`fetchMarketPriceBook` (a13609e9) + `MarketScopeNotice`.

## 6. Conventions for this expansion

- Registry additions: builtin profile objects + `market_profiles` INSERT migration
  (ON CONFLICT DO NOTHING), additive only.
- Prices only from real sources with URL/date; missing → explicit unverified, never zero.
- New finishing systems go through market-scoped config tables
  (`screeding_system_config.market`, market_products/market_material_rules), never
  NG-formula silent fallback; MarketScopeNotice discloses NG-fallback pricing.
- Every phase lands with tests on touched files; full suite only at the end.
