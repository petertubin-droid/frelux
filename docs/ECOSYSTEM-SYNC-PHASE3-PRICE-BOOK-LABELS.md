# Phase 3: the price book stops calling every row verified, 2026-11-01 22:20

## What was wrong

`/prices` claimed in its own copy that "every price below was captured from a
named retailer scan or admin-verified source". That was not true. The rows it
reads include 517 FX reference figures and a set of seeded baselines, and any
row with no `price_source` was rendered with the literal words "FRELUX
verified", which is the strongest claim on the page attached to the weakest
evidence.

Rows were also keyed by category and name only, so the same material priced in
two markets appeared twice with nothing to tell them apart except a currency
code in a separate column.

## What changed

Each row now carries an evidence class from the shared classifier and shows it
as a badge next to its source:

| Badge        | Meaning on the page                           |
| ------------ | --------------------------------------------- |
| Verified     | supplier price, checked                       |
| Reported     | collected, not independently verified         |
| FX reference | calculated from a macro rate, not a quotation |
| Baseline     | seeded figure with no live source             |

The market code sits beside the badge, and the row key includes the market, so
two markets read as two labelled rows instead of an accident. A row with no
recorded source now says "Source not recorded" rather than claiming
verification. The page copy states plainly that four different kinds of number
appear here and defines each, replacing the blanket claim.

No price value, formatting, movement arrow or filter changed. 60 tests across
the price book pages and the price index pass. Typecheck and build clean.

## Still open in Phase 3

1. `src/lib/estimation/queries.ts` `fetchAllPrices` still reads the table
   directly for admin and checking screens. That is legitimate for admin, but
   any consumer that is not an admin screen should use the resolver.
2. Calculator price notes still use the older wording in most places.
