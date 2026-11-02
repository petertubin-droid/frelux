# Phase 3: evidence ladder in the price resolver, 2026-11-01 20:00

## What was missing

`resolveMaterialPrice` had three outcomes: city median, national median, or
unavailable. Every published figure carried the same shape regardless of
whether it rested on a verified supplier quotation, a web survey, an FX
reference or a seeded baseline. The 517 NG rows whose `price_source` reads
"FX reference from the live NG book" were presented exactly like a verified
supplier price.

It also had no market guard. Callers were trusted to pre-filter, so a set of
listings spanning markets would have been pooled into one median and labelled
with whichever city happened to be selected.

## What was added

**Evidence tiers.** Every published figure now carries `tier`:

| Tier                       | Meaning                                         |
| -------------------------- | ----------------------------------------------- |
| `approved_city_index`      | verified samples, city, above the sample gate   |
| `approved_national_index`  | verified samples, national basis                |
| `qualified_supplier_offer` | city figure mixing verified and reported prices |
| `crowdsourced_benchmark`   | reported prices only                            |
| `macro_adjusted_reference` | FX or indicative band, never a quotation        |
| `baseline_reference`       | seeded figure, no live source                   |

`classifyEvidence` reads what each row actually records: `seeded reference` and
`no retailer link` mark a baseline; `FX reference`, `macro`, `indicative band`
and `index-adjusted` mark a macro reference; only `verification_status =
'verified'` marks a supplier quotation. Reference and baseline tiers force
`indicative: true` and add a warning saying so.

**Full response contract.** Alongside the existing fields: `market`, `currency`,
`brand`, `package_size`, `source_url`, `delivery_included`, `fallback_reason`,
`warnings`, and a machine readable `code` on unavailable results.

**Market isolation.** Passing `market` filters other markets out. When the
filter leaves nothing, the result is `unavailable` with code `market_mismatch`
and names the markets that do have evidence, rather than borrowing one.

**No pooling of incompatible evidence.** If the evidence for one material spans
more than one brand, or more than one sale unit, the resolver refuses with
`mixed_brand` or `mixed_sale_unit` and asks for a brand or unit. Passing
`brand` or `saleUnit` narrows instead of refusing.

## Measured blast radius

None. Grouping active `estimation_prices` by market and material shows zero
materials with more than one distinct sale unit, in every market. The refusal
path protects future evidence without blanking any figure today.

## Files

- `src/lib/price-index/resolver.ts`
- `src/lib/price-index/types.ts` (optional `brand`, `package_size`, `delivery_included`)
- `src/lib/price-index/calculator-prices.ts` (passes `market: "NG"` on its NG-only branch)
- `src/lib/price-index/resolver-ladder.test.ts` (11 new tests)

## Still open in Phase 3

1. The 14 modules that read price tables directly still bypass this resolver.
2. Cache invalidation on approved-price change is not wired.
3. Tiers and warnings are returned but not yet rendered by most calculators;
   the ones that display a price note still show the older wording.
