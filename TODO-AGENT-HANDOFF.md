# FRELUX — Global Expansion TODO / Agent Handoff

Living document for the market-expansion work. Any agent continuing this work
should read this top to bottom, verify the state with the commands given, and
continue from "Next steps". Update this file with every batch you complete.

Last updated: 2026-10-11 (EG rebar seeded; US/DE/IN/EG now live)

---

## 1. CONTEXT (read first)

Frelux is a construction cost calculator SaaS (Vite + React + TS + Tailwind +
Supabase). It is expanding from a Nigerian-only tool to a worldwide product
where EVERY market gets accurate, verified, country-specific pricing and
methodology.

### Hard rules (from the owner — never break these)

1. Never break existing calculator functionality, DB connections, auth, or Supabase integration.
2. Never invent prices. Every price must be web-verified from supplier listings
   or authoritative market assessments, with the source stored in
   `estimation_prices.price_source` and `scan_confidence='manual'` for verified rows.
3. No silent fallbacks to Nigerian logic. When a market lacks data, the UI says
   so ("unpriced", "not covered") instead of quietly using NG numbers.
   Exception: `market_profiles.inherits_from` chains (US→NG etc.) are allowed
   and disclosed via the MarketScopeNotice.
4. Do not invent testimonials, user counts, or fake claims.
5. All public routes prerendered, SEO-friendly, crawlable.
6. No sub-agents (owner's standing instruction for this work).
7. Unit consistency: when converting pack sizes (e.g. FR 25kg cement bag → the
   engine's 50kg basis), the conversion must be deterministic and disclosed in
   provenance text.
8. Commit + push to `main` after each verified batch. Remote moves sometimes —
   `git pull --rebase origin main` before pushing.

### Repo & environment

- Repo: `petertubin-droid/frelux` (GitHub). Local clone path varies by session
  (e.g. `/app/conversations/<id>/frelux`).
- Supabase project ref: `nfgaaohweygwydoelxnf`. DB access pattern: Supabase
  Management API `POST /v1/projects/nfgaaohweygwydoelxnf/database/query` with a
  management token (service-role bearer; ask the owner for it if not already
  in the session environment — DO NOT store it in the repo or this file).
- Frontend anon access is normal Supabase client SDK.
- Tests: `npx vitest run src/lib/estimation/__tests__ <other dirs>`; type check:
  `npx tsc --noEmit -p tsconfig.json`.

---

## 2. WHAT WAS DONE (state as of 2026-10-11)

### Verified price books — 39 markets
Every market in `market_profiles` has a price book seeded with 8+ core rows
(interior/exterior paint, primer, filler, cement, sand, sandpaper,
waterproofing) + finish engines (pop 5 rows, tile 2, screed 1).
`scan_confidence='manual'` = web-verified anchor; `'low'` = indicative band
(see `price_source` text: "Indicative 2026 retail band; admin-adjustable").
Price verification campaign: ~182/356 rows verified; ~174 'low' rows remain.

### Finish engines — market-scoped (7 markets + NG)
Painting, tiling, POP/ceiling, screeding engines resolve materials by ROLE via
`market_material_roles` (market → role → material_slug → price, walking
`market_profiles.inherits_from`). Fully mapped: **NG, US, GB, DE, AU, CA, IN**.
FR has role mappings seeded (enduit de lissage instead of UK skim plaster,
sous-couche instead of mist coat — French practice documented in notes).

### Structural pages — market pricing (all 6 pages)
- `src/lib/estimation/structural-market.ts` — resolver: cement pack-size
  conversion (engine basis = 50kg bag), sand only when bulk-volume priced,
  rebar per-length mapping. Everything unverifiable returns null → reported.
- **FoundationEstimator**: market price overlay + provenance panel + market currency.
- **BuildToRoofEstimator**: Prices step prefills from market book (cement
  converted, sand when volumetric); all 34 price inputs use market currency symbol.
- **ReinforcementEstimator**: rebar market prices (US/DE/IN seeded) + provenance panel.
- **Electrical / Plumbing / Doors-Windows**: price-coverage panel for non-NG
  users (states the market book doesn't cover the trade yet; NG book disclosed).
- `MarketScopeNotice.tsx` — discloses NG methodology for structural engines.

### Rebar price books seeded (verified, deterministic conversion)
US Grade 60 $1,036/MT (IMARC Q2-2026); DE B500B €615/t (eurometal delivered);
IN Fe500 TMT ₹56,500/t (Tata Nexarc Pune Oct-2026).
Materials: `{mkt}-rebar-{12,16,20,25}mm`, category `rebar`. Per-length price =
12m × kg/m × price/kg using the engine's constants (0.888/1.578/2.466/3.854,
STOCK_LENGTH_M=12).

### Key commits (newest last)
- `af1bdeea` market-role fallback disclosure + 255 tests
- `2c960ad6` foundation estimator market pricing + provenance
- `fb776ffd` i18n calculators (landed remotely — keep)
- `350e2f1f` market pricing across all 6 structural pages
- `9de911d2` rebar books US/DE/IN + reinforcement wiring

---

## 3. WHAT NEEDS TO BE DONE (priority order)

### A. Rebar books for remaining markets (GB, AU, CA first, then top-30)
- UK search only surfaced paywalled forecasts (MEPS). Try: UK builders'
  merchants (Travis Perkins, Jewson) selling 12m bar or per-tonne quotes;
  Australia: Steel.com.au / Metaland / Auststeel; Canada: Rona/Home Hardware
  or per-tonne from Russel Metals.
- 2026-10-11 second pass (searches only, NOTHING seeded - no verified anchor):
  * GB: MEPS/Kallanish paywalled; no merchant per-tonne listing surfaced. Next
    agent: read the MEPS GB rebar page via a trial or find a Jewson/TP product page.
  * AU: only market-size articles (USD 1.79bn by 2030). Try steel.com.au product pages.
  * CA: Kallanish paywalled. Try Rona/Home Hardware 10M lengths -> per-tonne is
    NOT derivable from retail sticks (pack basis unknown) - do not convert.
  * EG: SEEDED 2026-10-11. Anchor Beshay Steel factory-gate EGP 38,500/t
    (elKady Steel live factory-gate listing Oct-2026, corroborated by Aug-2026
    market updates: Ezz 39,700, Beshay 38,500). eg-rebar-{12,16,20,25}mm live,
    scan_confidence='manual'.
  * AU: still nothing usable (market-size articles only). Try
    steel.com.au / Metaland product pages or a dated ASI/Austrak price note.
- Seed pattern: INSERT estimation_materials (name, slug=`{mkt}-rebar-{d}mm`,
  category='rebar') + estimation_prices (market, price_type='material',
  price=per-12m-length, scan_confidence='manual', price_source with the URL/source text).
- The page wiring already works via `resolveMarketRebar` — only DB rows needed.

### B. Plumbing price books (pipes, fittings, valve)
- PIPES DONE 2026-10-11 for US + DE (resolver `resolveMarketPlumbing` wired into
  PlumbingEstimator, provenance panel live):
  * US: us-pipe-cold/hot $1.08/m (PEX-B 1/2", Home Depot PlumbFlex 300ft $100);
    us-pipe-waste $7.48/m (PVC DWV 3", Charlotte Pipe $22.78/10ft). Drainage
    NOT seeded (no verified 4" sewer price yet - check Home Depot 4" listing).
  * DE: de-pipe-waste + de-pipe-drainage EUR 8.90/m (HT Rohr DN 110, Hornbach
    4.45/0.5m). Cold/hot (PP-R) NOT seeded - Alibaba wholesale quotes do not
    qualify; get an OBI/Hornbach PP-R 20mm per-m listing.
- REMAINING for pipes: GB (Wickes product pages are JS-rendered SPAs - raw
  fetch returns nav markup, NO price. Next agent: use browserbase to open
  https://www.wickes.co.uk/Pipelife-Easylay-White-Pipe-Coil---15mm/p/9000294722
  and https://www.wickes.co.uk/FloPlast-WP01B-Black-Push-Fit-Waste-Pipe---32mm-x-3m/p/175683
  and read the rendered price; also try JG Speedfit 15mm barrier pipe coil
  (usually ~GBP 15-25/25m -> derive per-m) and Travis Perkins 110mm
  underground drainage 3m lengths), fittings (elbow/tee/reducer/union - prices
  per piece), valves. Engine keys: `plumb-pipe-*` done; `plumb-elbow/tee/
  reducer/union`, `plumb-valve` pending.
- 2026-10-11 fitting searches also returned no extractable prices (Home Depot
  fitting category pages render prices via JS; Hornbach category pages not
  read). Use browserbase_get_content on a single product page next round.
- METHODOLOGY: substitution is disclosed in material names + provenance text
  (US PEX, DE HT DIN EN 1451 vs NG PVC). Keep doing that per market.

### C. Electrical price books (cable, conduit, boxes, breakers)
- Engine keys: `elec-conduit`, `elec-junction-box`, `elec-breaker`, plus
  spec slugs. Same pattern as B. Watch voltage/standard differences
  (230V vs 110V, NEC vs IEC) — price only, don't fake methodology.

### D. Doors/windows price books + BuildToRoof trade prefills
- Same pattern. BTR Prices step already supports overlays (see its effect).

### E. Price verification campaign remainder (~174 'low' rows)
- Sweep by region; EG/SA paint in English sources; TR via Trendyol.
- Keep name+price unit consistent when renaming materials.

### F. Structural methodology profiles (the long arc)
- Market-scoped block modules (sandcrete vs parpaing vs CMU), rebar
  conventions, foundation practice (DIN vs NG strip footing).
- Requires standards research (BS 5385 precedent: DE/GB finish engines).
- Update MarketScopeNotice when a market's structural profile goes live.

---

## 4. STEP-BY-STEP: HOW TO CONTINUE (worked example: rebar for a new market)

1. `git clone` the repo if needed; `git pull --rebase origin main`.
2. Web-verify the anchor: search "<market> rebar price per tonne 2026" or a
   supplier listing. Record source + date + price. Two corroborating sources
   preferred; never invent.
3. Compute per-length: `12 * kg_per_m[d] * (tonne_price/1000)`, round to 2dp.
   kg_per_m: 12→0.888, 16→1.578, 20→2.466, 25→3.854.
4. Seed DB (python + Management API; see section 1 for access):
   - INSERT estimation_materials (name="Grade/badge rebar {d}mm x 12m ({MKT})",
     slug="{mkt}-rebar-{d}mm", category='rebar', is_active=true,
     effective_date=today). Idempotent: guard with WHERE NOT EXISTS.
   - Deactivate old prices for that ref_id+market, then INSERT estimation_prices
     (price_type='material', ref_id, market, price, currency, price_source,
     notes, scan_confidence='manual', effective_date=today, is_active=true).
5. No code changes needed (resolver reads slugs generically). Run:
   `npx tsc --noEmit -p tsconfig.json` and
   `npx vitest run src/lib/estimation/__tests__` (expect ~231+ green).
6. `git add -A && git commit && git push`; if rejected, pull --rebase, push again.
7. Update this file's section 2/3 and push again.

## 5. KNOWN GOTCHAS

- `fetchAllPrices(true)` is the market-blind NG flow; market overlays happen in
  the page effects AFTER it — keep that ordering.
- Engine price keys are NG catalog slugs (e.g. `cement-per-bag` is a material
  slug, not a description). Overlays key on those exact strings.
- Never seed a price whose unit doesn't match the engine's basis without the
  deterministic conversion in `structural-market.ts` + provenance text.
- Tests live in `src/lib/estimation/__tests__/` and mock supabase — DB seeding
  does not break them, but code changes to resolvers should add unit tests
  (see `structural-market.test.ts` for the pattern).
- Netlify auto-deploys on push; build-hook 404s are known (manual trigger if needed).
