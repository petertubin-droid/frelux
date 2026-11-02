# Phase 3: structural engines learn what their prices are, 2026-11-01 21:00

## The gap

`structural-market.ts` read prices with `select("price, scan_confidence")`. It
never asked for `verification_status`, `price_source` or `supplier_name`, so it
could not tell a verified supplier quotation from an FX band or a seeded
baseline. Every structural engine therefore consumed whatever the row said and
labelled it from `scan_confidence` alone, which meant a seeded baseline priced
as `manual` could be described as a "verified per-tonne anchor".

That is the exact failure the directive names: presenting adjusted or seeded
figures as verified ones.

## The change

All three reads now select `price_source, supplier_name, verification_status`
alongside the price, and every provenance row carries an `evidence` class plus
a caveat appended to its explanation:

| Evidence class      | What the engine now says                                                  |
| ------------------- | ------------------------------------------------------------------------- |
| `supplier_verified` | nothing extra, it is a quotation                                          |
| `supplier_reported` | "Reported price, not independently verified."                             |
| `macro_reference`   | "Reference band from a macro or FX adjustment, not a supplier quotation." |
| `baseline`          | "Seeded baseline with no live source: a placeholder, not a market price." |

`classifyEvidence` is shared with the price resolver, so one implementation
decides what counts as a quotation across the index and the engines.

## No calculation changed

Prices, quantities and overrides are untouched. Only the provenance object and
its explanation text gained information, which is additive to every consumer.
1537 tests across `src/lib/price-index` and `src/lib/estimation` pass, plus 4
new caveat tests. Build clean.

## Still open in Phase 3

1. Nine other modules still read `estimation_prices` directly:
   `src/lib/estimation/queries.ts` (read and admin write),
   `src/pages/MaterialPrices.tsx`, and five admin screens. The admin ones are
   legitimate; `queries.ts` and `MaterialPrices.tsx` are the two that should
   route through the resolver.
2. There is no price cache to invalidate. The only price-adjacent storage is
   the chosen project city in `use-project-city.ts`, so the invalidation item
   in my earlier list was wrong and is dropped.
3. Tiers are returned by the resolver and by structural provenance but most
   calculator UIs still render the older price note wording.
