# Market Onboarding Runbook (32→N markets)

Phase 4 of the FRELUX globalization architecture (2026-10-27). This is the
executable version of the 48-hour territory rollout: every step below has a
command, and CI enforces the honesty rules automatically.

Architecture contract (do not break):

- **One-file authoring**: a market's static building-practice data lives in
  `src/lib/international/markets/<code>.ts` (a typed `MarketBundle`).
- **Registries compose from bundles** — they cannot drift.
- **Prices stay in the database** (`estimation_prices`, admin-editable,
  staleness-tracked). Never put material prices in a bundle or landing page.
- **Real, standard-referenced data only.** Every `standardsRef` cites an
  actual standard. A missing market is better than an invented value.
- **CI gates**: `market-registry-completeness.test.ts` fails the build if
  any engine registry drops below full market coverage, if a bundle slot is
  missing, if landing data drifts from the bundles, or if TODO placeholders
  survive.

## Day 1 — Market research (human work, no code)

Gather, from real sources (national standards bodies, utility rules,
supplier catalogues, a local engineer where possible):

| Field                                          | Source                             |
| ---------------------------------------------- | ---------------------------------- |
| Standard wall unit + dimensions                | national masonry/supply practice   |
| Cement bag retail weight                       | supplier catalogues                |
| Electrical standard, voltage, wiring method    | national wiring code               |
| Plumbing standard, pipe materials, slope rules | national plumbing code             |
| Currency code + symbol                         | ISO 4217                           |
| Wall build-ups and finishes                    | local practice (for wallfinishing) |

Record the citation for every value. `standardsRef` must name a real
standard; notes must keep the honest "quantity takeoff only, consult a
licensed local professional" contract.

## Day 2 — Author the data

```bash
node scripts/new-market.mjs <CODE> <CountryName>   # e.g. PK Pakistan
```

The scaffold prints the full checklist. In order:

1. Replace **every TODO** in `src/lib/international/markets/<code>.ts` with
   the sourced values (electrical + plumbing profiles).
2. Add `<CODE>` entries to the four engine registries:
   - `masonry-standalone-engine.ts` → `MASONRY_MARKET_REGISTRY.<CODE>`
   - `drywall-standalone-engine.ts` → `DRYWALL_MARKET_PROFILES.<CODE>`
   - `plastering-standalone-engine.ts` → `CEMENT_BAG_WEIGHT_BY_MARKET.<CODE>`
   - `wallfinishing/countries.ts` → `WALLFIN_COUNTRY_PROFILES` entry
3. Register the bundle in `markets/index.ts` (import + `MARKET_BUNDLES`).
4. Regenerate `scripts/market-landing-data.mjs` from the bundles (Phase 3
   extraction; ask the dev/agent owning that tooling) — the integrity test
   will fail until it matches the bundle exactly.
5. Verify:

```bash
node scripts/validate-market.mjs <CODE>
```

Everything automated is checked there: bundle registration, TODOs cleared,
all engine registry entries, landing data, route wiring, `tsc`, and the
CI completeness + integrity gates. Non-zero exit = not ready.

## Day 3 — Launch and QA

1. Full local verification:

```bash
npm run build          # vite build + prerender (171 routes) + sitemap
npx vitest run         # full suite
```

2. Manual staging QA on the preview server:

```bash
npm run preview        # serves on http://localhost:4173
```

Checklist for `http://localhost:4173/market/<code>/`:

- [ ] Page renders with the market's name and currency symbol
- [ ] Block unit name + dimensions match the Day 1 research
- [ ] Cement bag weight correct
- [ ] Electrical + plumbing standards listed match the citations
- [ ] Honest verify-locally notice present
- [ ] Clicking a calculator (e.g. Build-to-Roof) opens with the market
      preselected (units, block sizes follow the bundle)
- [ ] `/sitemap.xml` contains `/market/<code>/`
- [ ] Unknown-code page (`/market/zz`) still shows the honest fallback

3. Push. CI runs the full suite + build + E2E + Lighthouse. The
   completeness gate is the last line of defense — if it fails, CI red is
   the gate working; fix the data, never the gate.

4. Post-launch: enter the market's **prices** in the admin price database
   (prices are DB-only by design, with staleness tracking — do not add
   them to the bundle).

## Adding the market to the canonical list

`ALL_MARKET_CODES` (`src/lib/international/capability-registry.ts`) is the
canonical 32-market list today. Extending beyond 32 markets means adding
the code there as an explicit, reviewed decision — the completeness gate
then demands a bundle + all registry entries for it, immediately.
