# Weekly price-intel scan

`scripts/price-scan/scan.mjs` audits the live price book every week and decides
which markets may claim verified prices.

## What it does

1. Reads every active material price from the live book (anon read, no writes).
2. Classifies each row: `local_verified` (own currency, fresh, not an FX
   derivative), `fx_reference` (derived from the NG book at an FX rate), `stale`
   (older than 45 days).
3. Fetches retailer sources registered in `scripts/price-scan/sources.json`. A
   source needs a real product URL; the scan reports the gap instead of inventing
   a price. A fetched price more than 40% away from the current one is rejected as
   out of band.
4. Writes `data/price-scan/report-<date>.json` (full detail) and
   `src/lib/international/price-verification.json` (market verdict shipped to the
   UI).

## Market verdict

A market is verified when it has at least three prices, fewer than 25% are FX
references and fewer than 25% are stale. `PriceVerificationNotice` renders inside
every tool and data page header when the visitor's market is not verified, so a
calculator never presents reference-derived totals as local prices.

## Apply mode

`--apply` writes validated prices as new rows with the retailer URL and date in
the note. It refuses to run without a service-role key.

## First run, 29 Oct 2026

1,000 active material prices, 590 materials. Every non-NG market carries FX
reference rows (DE 98 of 224, GB 20 of 59, US 16 of 71, and up to 21 of 32 in
KR). NG is clean but has 5 stale rows. Registry is empty, so no price was
replaced: verified local prices are the missing input, not the machinery.

## Weekly schedule

Base44 workflow "Weekly Price Intel Scan" runs Mondays 06:00 Africa/Lagos.

## Retailer audit, 29 Oct 2026

`scripts/price-scan/check-retailers.mjs` fetches every registered retailer with a
real search ("cement 50kg") and records what came back. Registry extracted from
the migrations that seed `price_scan_sources`: 23 retailers over 20 markets.

| Outcome | Retailers |
| --- | --- |
| Parses prices | Jumia NG, Konga NG, Jumia GH, Jumia KE, Wickes GB, B&Q GB, Amazon.com.br, Amazon.sa, OBI DE |
| Blocks automated fetches | Home Depot US, Home Depot CA, Home Depot MX, Leroy Merlin FR, Bunnings AU, Coupang KR, Takealot ZA, Amazon.ae/.de/.in/.it/.co.jp (503) |
| Page loads, no usable price | JD.com CN (JS shell), Tokopedia ID (timeout) |

Two patterns were simply wrong and are fixed here and in
`20261029103000_fix_obi_bq_scan_patterns.sql`: OBI now uses `/search/<term>/`
(77 product offers on the page) and B&Q uses `?term=` (48 offers). Before the fix
both returned nothing usable.

What this means: nine retailers can be scanned unattended today, covering NG, GH,
KE, GB, BR, SA and DE. The blocked group needs either real product-page URLs with
the admin's manual approval, or a browser-based fetch, because their bot
protection rejects server-side requests regardless of headers.
