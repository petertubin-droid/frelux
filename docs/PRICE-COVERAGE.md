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

### AU and CA: the naming gap is closed (2026-10-31)

Both catalogues were staged and mapped at zero. Two separate causes, both now
fixed:

1. **Naming.** Supplier rows were scored against catalogue names in a single
   vocabulary. Australian merchants sell Villaboard and Gyprock, Canadian ones
   sell Sheetrock and OSB, and none of those words appear in the catalogue.
   `supabase/functions/_shared/supplier-aliases.ts` rewrites a row into
   canonical terms before scoring, per market, and `matchMaterials` now takes
   the market. Catalogue names also lose their `(AU)`/`(CA)` suffix, which no
   supplier repeats and which alone could block a perfect match.
2. **Missing rows.** The AU catalogue held paint and rebar, the CA catalogue
   held gypsum and pipe, and the merchants sell plywood and lumber. Rows for the
   staged products are declared in
   `supabase/migrations/20261031180000_au_ca_material_rows.sql`, unpriced on
   purpose: a merchant listing a product is not a price.

Verified by `scripts/price-scan/au-ca-alias-report.ts`, which writes
`data/price-scan/au-ca-alias-map.json`:

| Market | Retailer       | Bound           | Refused                                |
| ------ | -------------- | --------------- | -------------------------------------- |
| AU     | Plyco          | 3 of 3          | 0                                      |
| CA     | Handley Lumber | 1 of 1 material | 2 (Construction Screws, Dock Hardware) |

The two refusals are the point, not a shortfall: a fastener has no material row
and never will. `supabase/functions/_shared/au-ca-coverage.test.ts` fails if a
row or an alias is removed.

Both migrations are applied to project `nfgaaohweygwydoelxnf` (2026-10-31) and
the four rows are confirmed present in `estimation_materials` with units
attached. They carry no price, so AU and CA still show no local coverage; what
changed is that an observation can now land, where before it had no target.

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

## The six requested markets, probed on 2026-10-31

Every market leader in China, Canada, Mexico, Australia, the UAE and Italy was
asked for a machine readable catalogue. Not one obliged.

| Market | Leader            | Answer                                               |
| ------ | ----------------- | ---------------------------------------------------- |
| CN     | Alibaba           | no catalogue to a server request                     |
| CN     | Made-in-China     | 404 on both endpoints                                |
| CA     | Home Depot Canada | no response to server fetch                          |
| CA     | Rona              | 403                                                  |
| CA     | Kent              | 404                                                  |
| MX     | CEMEX             | 400 to server fetch                                  |
| MX     | Interceramic      | 404                                                  |
| AU     | Bunnings          | no response                                          |
| AU     | Beaumont Tiles    | reachable, but 229 of 231 products are $0.00 samples |
| AE     | Danube Home       | 404                                                  |
| AE     | ACE Hardware UAE  | 404                                                  |
| IT     | Leroy Merlin      | 403                                                  |
| IT     | Bricocenter       | 403                                                  |
| IT     | Tecnomat          | 403                                                  |
| US     | Home Depot        | 404                                                  |
| US     | Lowe's            | 403                                                  |
| GB     | Screwfix          | 404                                                  |

The pattern is not bad luck. Large merchants block server-side fetch or run
platforms with no public product API, while small merchants publish freely. That
is why coverage grows from mid-size merchants such as Plyco, and why scraping
leaders will never be the answer here.

What this means per market:

- **AU** gained real plywood prices from Plyco. Beaumont Tiles is a showroom
  sample catalogue and is deactivated. More merchants like Plyco are the path.
- **CA** has Handley Lumber staged and waiting. Canada's material list is pipes,
  rebar and gypsum, so lumber has nowhere to land until CA material rows exist.
- **MX, AE, CN, IT** have no verified source and no reachable catalogue. Gulf and
  Italian merchants trade through price lists and distributors, so these are
  outreach markets. Community price reporting on the material tracker is the only
  live path in the meantime.

All seventeen leaders are recorded in `price_scan_sources` with
`access_status = blocked_or_unavailable` and `is_active = false`, so the outreach
list lives next to the price book and nobody probes the same dead end twice. The
same evidence is in `scripts/price-scan/market-leaders.json`.
