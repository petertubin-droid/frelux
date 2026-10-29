# Engine matrix reconciliation (29 Oct 2026)

Closes the P1 finding in `docs/audit-engines-ui-2026-10-29.md`: eight engines were marked
`not_implemented` in 18 of 20 markets while their calculator pages ship everywhere.

## Method

For each engine, the shipped page and engine source were inspected for how market context
actually reaches the calculation:

- per-market price book resolved at runtime (`fetchMarketPriceBook`)
- market labour rates (`useLabourConfig`)
- market construction typology (`getConstructionTypology`)
- market-specific branches and trade role mappings

Nothing was inferred from the engine name or from the audit text.

## Findings

| Engine | Market wiring found | Reconciled status |
| --- | --- | --- |
| flooring | Market price book resolved per market | `partially_verified` |
| waterproofing | Price book, trade role mappings, NG-specific branch | `partially_verified` |
| doors_windows | Market price book resolved per market | `partially_verified` |
| tyrolene | Market labour rates only; materials global | `partially_verified` |
| grafitex (`finish-calc`) | Market labour config only | `partially_verified` |
| build_to_roof | Market construction typology | `partially_verified` |
| mineral_stone | None: global method, no local prices, codes or practice | `requires_verification` |
| stucco | None: shares the mineral stone engine | `requires_verification` |

Statuses now describe behaviour instead of absence: the six wired engines say which local
input is real and which local detail is still unverified; the two global engines say plainly
that nothing local is applied and figures need verification before quoting.

Home markets keep their existing `verified` entries; GH keeps `partially_verified`.

## Guard

`engine-inventory.test.ts` now fails if any of these eight engines regresses to
`not_implemented`, so the matrix cannot drift away from the shipped UI again.

## Not covered here

Whether a given market's price book is complete for a specific product line is a data
question, not a matrix question. `requires_verification` on mineral stone and stucco is the
honest state until local product and rate data is entered.
