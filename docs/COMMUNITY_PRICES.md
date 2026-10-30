# Community price pipeline

The admin cannot keep 32 markets current alone, and retailer pages refuse
server-side fetching (verified: Ace Hardware, Jumia, Home Depot, Bunnings and
Jiji answer 403, Amazon answers 503). So the people who actually buy materials
report the price in their own market, and the price book updates itself once
reporters agree.

## What a reporter does

Any signed-in user opens the Material Price Tracker and reports a price. The
form defaults to the visitor's own market (`useMarket`), takes the currency
from that market, and offers the catalog as a `datalist`, so a report can
attach itself to a real `estimation_materials` row. A free-text item is
accepted but stays in review only: it has no catalog target to price.

Each report records market, region, item, unit, price, currency, vendor, the
optional product link, and `material_slug` when matched.

## When a report reaches the price book

`price_submissions` has an `after insert or update` trigger that calls
`apply_community_prices(market, material_slug)`. For each open group
(market + material) the function:

1. reads that market's own `price_auto_apply_rules` row (active),
2. takes the group median and the distinct reporter count,
3. keeps the reports inside `max_deviation_percent` of the median,
4. stops there unless the agreeing distinct reporters reach
   `min_agreeing_observations` (2 by default in every market today),
5. writes the median of the agreeing reports into `estimation_prices` as the
   material's price for that market, with `origin = 'community'`,
   `scan_confidence = 'medium'`, `price_source = 'community: N reporters'` and
   `last_scanned_at = now()`,
6. marks those reports `approved` and stores the resulting row id, price and
   timestamp on each report.

Reports that agree but fall short of the threshold become
`community_verified` with a `verification_count`, so the next agreeing report
completes the group. An outlier stays `pending` and never affects the price.

Nothing is guessed: a group with one reporter, or with reporters that disagree
beyond tolerance, writes nothing.

## What the admin still controls

`AdminPriceSubmissions` lists the queue, shows the catalog match and the
applied book price, links the source, and keeps the manual path: pick a
price-book item for a free-text report and approve it. "Apply agreed reports"
re-runs the sweep after a rule change. Any community price can still be
overridden in the Price Updater, which shows `community: N reporters` as its
source.

## Live checks performed

Applied on project `nfgaaohweygwydoelxnf` as
`20261030180000_community_price_pipeline.sql`, then validated end to end with
three distinct existing accounts on a temporary material, which resolved to
the median and wrote one price-book row, and with a two-reporter group
including a deliberate outlier, which correctly refused to write and applied
only after a third agreeing report (median of the agreeing pair). All test
rows were deleted afterwards; `price_submissions` is back to 0 rows and no
`zz-` materials remain.

## Known limits

- Agreement needs distinct accounts. One person cannot verify their own price.
- A report is only promoted automatically when it matched a catalog item; the
  free-text queue still needs an admin mapping.
- The retailer scanner stays available for markets where a real product URL
  can be supplied, but it is no longer the only path into the book.
