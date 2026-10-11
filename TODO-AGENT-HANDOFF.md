# FRELUX — Global Expansion TODO / Agent Handoff

Living handoff for the Frelux market-expansion work. **Status markers:** ✅ DONE,
🟡 PARTIAL (has verified data, gaps remain), ❌ NOT STARTED. Any agent
continuing cold: read section 2 (WHERE TO START), verify state with the
commands in section 6, then work top-to-bottom through section 4 (REMAINING
WORK). Update this file with every batch you complete — including flipping
status markers and adding the commit hash.

Last updated: 2026-10-11 (after US drainage + AT pipes seed)

---

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
| 8 | Plumbing pipe books | 🟡 | ✅ GB all 4 keys, US all 4, DE waste/drainage, AT cold/hot; ❌ DE cold/hot (PP-R), fittings + valves everywhere |
| 9 | Electrical books | ❌ | Not started; resolver pattern ready |
| 10 | Doors/windows books | ❌ | Not started |
| 11 | Price campaign remainder | 🟡 | ~174 'low' rows to verify |
| 12 | Structural methodology profiles | ❌ | Research arc (DIN/BS/ACI foundation, block modules) |

Key commits (newest last): `af1bdeea` role-fallback disclosure ·
`2c960ad6` foundation market pricing · `fb776ffd` i18n calculators ·
`350e2f1f` 6-page market pricing · `9de911d2` rebar US/DE/IN ·
`51bbfedc` EG rebar · `9d3b6512` AU rebar indicative + confidence-aware
provenance · `b3f12d40` plumbing US/DE · `6f34d349` GB pipes ·
`0ee2ea40` GB drainage (GB complete) · US drainage + AT pipes (latest).

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
- Tests: `npx vitest run src/lib/estimation/__tests__` (expect 231+ green);
  `npx tsc --noEmit -p tsconfig.json` clean. Add unit tests for new resolvers
  (`structural-market.test.ts` is the pattern).

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
