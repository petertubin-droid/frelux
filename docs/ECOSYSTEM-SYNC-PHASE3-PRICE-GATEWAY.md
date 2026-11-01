# Phase 3: one price resolver

Phase 3 of the synchronisation directive. The existing price modules are not
wrong, they are uncoordinated. This phase wraps them behind one entry point with
one response shape, additively.

## What landed

`src/lib/pricing/price-gateway.ts`

```ts
resolvePrice({ market, role, quantity?, citySlug? }): Promise<PriceResolution>
resolvePrices(market, roles): Promise<PriceResolution[]>
allPriced(resolutions): boolean
unpricedRoles(resolutions): MaterialRole[]
```

It does not read `estimation_prices` itself. It wraps
`resolveCityAwarePriceByRole`, which already implements the honest order: the
market's own role mapping, then the inheritance chain, then the bundled book
when the database is unreachable. In NG it additionally prefers city-level
listing evidence where enough samples exist.

What the gateway adds to that resolver is the part every caller was doing
differently:

- **Coverage**, from the same snapshot the honesty badges read, so an amount
  never travels without the sentence describing how local it is.
- **Provenance**: price row id, material slug and name, the market that actually
  supplied the price, effective date, price source, scan confidence, and whether
  the basis was a city or the whole market.

Four states, and only four:

| status       | meaning                                                           |
| ------------ | ----------------------------------------------------------------- |
| `local`      | priced in the requested market, and that market is verified       |
| `unverified` | priced in the requested market, coverage partial or unverified    |
| `inherited`  | priced from an ancestor market, never reported as local           |
| `not_priced` | nothing priced; the amount is `null`, and no fallback is invented |

`taxStatus` is always `tax_not_determined`. The gateway has no rate to default
to and does not acquire one.

## Consumer map

Measured across `src/` at this commit. 27 files mention `estimation_prices`.
They are not one category, and treating them as one would break things.

### Engine and calculator consumers, to migrate onto the gateway

In this order, smallest blast radius first:

1. `src/lib/estimation/mineral-stone-engine.ts`
2. `src/lib/estimation/tyrolene-config.ts`
3. `src/lib/estimation/structural-market.ts`
4. `src/lib/wallfinishing/prices.ts` (already resolves by role; it should call
   the gateway so coverage and provenance arrive with the price)
5. `src/lib/ai-foundation/engine-pricing.ts`
6. `src/lib/ai-foundation/engines-phase2.ts`

Each has its own tests, so each migration is verifiable on its own.

### Foundation, not a consumer

- `src/lib/estimation/market-materials.ts` is the resolver the gateway wraps.
  It stays as it is.

### Stays direct on purpose

These read or write the table as data, not as a calculation input, and routing
them through a price resolver would be the wrong shape:

- `src/lib/estimation/queries.ts` (admin CRUD)
- `src/lib/estimation/price-scanner.ts` (writes scans)
- `src/lib/price-index/queries.ts` (public price index feed)
- `src/components/estimation/PriceSubmissionForm.tsx` (submission)
- `src/pages/MaterialPrices.tsx` (price list)
- admin pages: `AdminEstimationPricing`, `AdminPriceUpdater`,
  `AdminPriceSubmissions`, `AdminPriceScan`, `AdminPricePipeline`,
  `AdminTyroleneConfig`, `AdminOverview`, `AdminPaintEngineTest`
- `src/types/*` and test fixtures

## Verification

- `npx vitest run src/lib/pricing`: 66 tests pass, 14 of them new.
- `npx tsc --noEmit -p tsconfig.app.json`: clean.
- Live smoke against the app's own data path (bundled book, no DB env in the
  sandbox): `interior-paint` in NG resolved at NGN 17,000 with coverage `local`;
  `blockwork` in NG and in an unrecorded market returned `not_priced` with a
  null amount and the "enter a price to continue" message. No fallback appeared.

## Not done yet, stated plainly

- No consumer has been switched over. The gateway is landed and tested, and the
  six migrations above are the next increments.
- Price book coverage is unchanged: 15 verified markets in the snapshot, three
  markets with local observations in `estimation_prices`. A gateway cannot
  report coverage that does not exist, and does not pretend to.
