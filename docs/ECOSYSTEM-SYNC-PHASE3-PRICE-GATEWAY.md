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

Corrected on 2026-11-01 after measuring actual query sites. The first version of
this section listed 27 files that "mention `estimation_prices`". Most of them
only name the table in a comment; they resolve through shared readers and never
query it. Counting comments as consumers would have sent the migration after the
wrong files.

Measured `.from("estimation_prices")` call sites in `src/`:

| File                                      | Queries | Role                                                       |
| ----------------------------------------- | ------- | ---------------------------------------------------------- |
| `src/lib/estimation/market-materials.ts`  | 1       | the role resolver the gateway wraps                        |
| `src/lib/estimation/queries.ts`           | 5       | CRUD plus `fetchActivePrice` / `fetchActivePriceForMarket` |
| `src/lib/estimation/structural-market.ts` | 4       | structural, rebar, plumbing, doors/windows overrides       |
| `src/lib/price-index/queries.ts`          | 1       | public price index feed                                    |
| `src/pages/MaterialPrices.tsx`            | 1       | price list surface                                         |
| `src/pages/admin/*`                       | 12      | pricing admin, scan, submissions, overview                 |
| `supabase/functions/*`                    | 4 files | edge functions (server side, separate concern)             |

Files that name the table in prose only, and therefore inherit coordinated
pricing as soon as their shared reader moves: `mineral-stone-engine.ts`,
`tyrolene-config.ts`, `wallfinishing/prices.ts`, `ai-foundation/engine-pricing.ts`,
`ai-foundation/engines-phase2.ts`, `international/capability-registry.ts`, the
type files, and the tests.

### The two axes

There are two ways the platform asks for a price, and one shape now answers
both:

- **Role axis**, `resolvePrice({ market, role, citySlug? })`. Assembly pricing:
  own market, inheritance chain, then the bundled book, NG city evidence on top.
- **Material axis**, `resolveMaterialPrice({ market, refId, priceType? })`.
  What the structural, rebar, plumbing and doors/windows engines ask. It reads
  the requested market only, because those engines report an unpriced material
  instead of borrowing an ancestor's price.

Both return `PriceResolution`, both report coverage and provenance, both refuse
to invent an amount.

### Where the migration stands

`structural-market.ts` is the next real target: four query sites, existing
tests for plumbing and doors/windows, and a strict own-market rule the material
axis already matches exactly. It is not migrated yet because proving it live
needs readable price rows, and the app's client cannot read them (below).

## Verification

- `npx vitest run src/lib/pricing`: 66 tests pass, 14 of them new.
- `npx tsc --noEmit -p tsconfig.app.json`: clean.
- Live role-axis run on the bundled production book: `interior-paint` in NG
  resolved at NGN 17,000 with coverage `local`; `blockwork` in NG and in an
  unrecorded market returned `not_priced` with a null amount and the "enter a
  price to continue" message.

- Live database check against `freluxproject`: the app client connects
  (`https://nfgaaohweygwydoelxnf.supabase.co`) and `estimation_prices` returns
  **0 rows** to it. The stored service credential is a management token
  (`sbp_…`), not a service-role JWT, so the sandbox cannot read the table with
  elevated rights either. Every engine exit was measured through this path:
  rebar, plumbing and doors/windows returned all keys in `unresolved` and no
  overrides, for US, GH, KE and GB alike.
  This is what "no verified price book" looks like from inside the product, and
  it is why the gateway's `not_priced` state matters more than its happy path.

## Not done yet, stated plainly

- No consumer has been switched over. `structural-market.ts` is next, once a
  readable price row exists to prove the swap changed nothing but the
  provenance.
- Price book coverage is unchanged: 15 verified markets in the snapshot, three
  markets with local observations in `estimation_prices`. A gateway cannot
  report coverage that does not exist, and does not pretend to.
