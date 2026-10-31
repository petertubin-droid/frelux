# Price coverage

What FRELUX can actually price, per market, and why the gaps exist. Written
2026-10-31 after probing supplier catalogues and finding one false match in the
live book.

## The rule this document follows

A market is covered when its own suppliers publish prices FRELUX can read, and
those prices clear the consensus path. A registered source is not coverage. A
staged product is not coverage. An observation is not coverage. Only a price in
the book that a calculator can use is coverage.

## How a supplier becomes a price

1. **Probe.** `scripts/price-scan/probe-catalogues.mjs` asks a candidate for a
   machine readable catalogue (Shopify `/products.json`, WooCommerce store API)
   and counts products that are building materials, not tools.
2. **Register.** Passing sources are added to `price_scan_sources` with a source
   class, licence and attribution. Provenance is recorded, never implied.
3. **Stage.** The six-hourly sync writes every product row to
   `catalogue_products`.
4. **Match.** A row needs the market's material prefix, the same product noun
   and the same package size. Tool titles are refused outright by
   `catalogue_title_is_tool()`.
5. **Observe.** `apply_catalogue_aliases()` writes `market_price_observations`.
6. **Promote.** Consensus fills `market_material_prices`, which is what the
   estimation engine reads. One observation is never promoted on its own.

## Live state, market by market

| Market | Local price book                 | Verified supplier catalogues            | What is missing                                        |
| ------ | -------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| NG     | 35 of 40 prices local            | n/a (community reporting is the path)   | freshness on 5 rows                                    |
| US     | 55 of 71 local                   | none registered                         | no supplier catalogue probed yet                       |
| GB     | 39 of 59 local, 20 exchange-rate | Bravikon (sand, verified in production) | blocking of large merchants (403)                      |
| AU     | 16 materials                     | Plyco (2 observations written)          | Australian material rows for timber and panel products |
| CA     | 15 materials                     | Handley Lumber (250 staged, 0 mapped)   | Canadian material rows for lumber                      |
| AE     | 16 materials                     | none                                    | no reachable catalogue found                           |
| MX     | 16 materials                     | none                                    | no machine readable catalogue found                    |
| CN     | 24 materials                     | none                                    | no reachable catalogue found                           |

## What was learned the hard way

**Tools masquerade as materials.** Paint Access passed the first probe with 136
"building" matches. Reading the titles showed sprayers, roller sleeves and
hoses. The harness now subtracts tool nouns, and the database refuses tool
titles at the money boundary.

**False matches were already live.** A Canadian "Irwin 18 inch Pipe Wrench" had
been auto-mapped to `ca-pipe-drainage`, which would have priced drainage pipe
off a wrench. The observation was deleted, the row quarantined, and
`catalogue_title_is_tool()` now guards the write path (migration
`20261031130000_catalogue_tool_guard.sql`).

**The bottleneck is the material catalogue, not the suppliers.** AU and CA
material lists are pipes, rebar and a few branded products. A general merchant
selling lumber and sheet goods has nothing to attach to. Coverage grows by
adding material rows that verified suppliers actually price, one honest row at a
time. Two Australian plywood rows were added this way and now carry observations
from Plyco at AUD 537.99 and 557.20.

**A market must exist before it can be covered.** Ireland was registered and
staged 458 rows before anyone checked that Ireland is not one of the 32 priced
markets. The source is deactivated with its rows retained.

## To add a market

1. Find a merchant with a public catalogue: a Shopify store's
   `/products.json`, or a WooCommerce store's `/wp-json/wc/store/products`.
2. Run the probe and read the examples, not just the count.
3. Check the market's material list has rows the products can map to. If not,
   add the material rows first, with a clear name and unit.
4. Register the source, let the sync stage it, then approve the first mappings
   in `/admin/market-prices`.
5. Re-run the scan and confirm the market's verification snapshot in
   `src/lib/international/price-verification.json` improves. If it does not, the
   coverage claim on the site does not change either.
