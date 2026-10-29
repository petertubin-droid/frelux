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

## Priority markets, 29 Oct 2026

The owner named US, UK, CN, CA, AU and UAE as the markets that matter. Each now
has at least one retailer that answers a real search with real prices, found by
testing candidates until one worked rather than registering a hopeful URL:

| Market | Working source | Price offers in the test page |
| --- | --- | --- |
| US | Amazon.com | 92 |
| UK | Wickes, B&Q, Homebase | 123 / 67 / 1 |
| CN | DHgate (wholesale, USD) | 332 |
| CA | Amazon.ca | 149 |
| AU | Reece (trade) | 90 |
| AE | Amazon.ae | 113 |

Amazon throttles by source address: eu, jp and in stores answer 503 on every
attempt while .com, .ca, .sa, .ae and .com.br serve normally, so every check now
retries three times with backoff before calling a retailer blocked. Home Depot
(US, CA, MX), Lowe's, Bunnings, Leroy Merlin, Coupang, Takealot, JD.com and
Tokopedia refuse both a server fetch and a real headless browser from this
network, so their sources are deactivated instead of quietly failing every week.

CN caveat: DHgate quotes wholesale export prices in USD. It keeps the Chinese
book moving but it is not a local retail price; a local CNY source (1688, JD or
Suning, all JS-rendered) needs a rendered fetch.

## Full market coverage, 29 Oct 2026

Every FRELUX market was swept for a retailer that answers a real search with real
prices. Result: 26 of the 32 markets have a working source; six do not.

| Market | Working source | Notes |
| --- | --- | --- |
| NG | Jumia, Konga | local, reliable |
| GH | Jumia | local, reliable |
| KE | Jumia | local, reliable |
| ZA | Amazon.co.za | few offers per page |
| US | Amazon.com | needs retries |
| CA | Amazon.ca | needs retries |
| MX | Amazon.com.mx | 435 offers |
| BR | Amazon.com.br | needs retries |
| GB | Wickes, B&Q, Homebase | reliable |
| FR | Amazon.fr | serves on retry |
| IT | Amazon.it | serves on retry |
| ES | Amazon.es | serves on retry |
| NL | Amazon.nl | serves on retry |
| DE | OBI | reliable |
| PL | OBI PL | reliable |
| SE | Amazon.se | serves on retry |
| CH | OBI CH | reliable |
| AE | Amazon.ae | serves on retry |
| SA | Amazon.sa | needs retries |
| JP | MonotaRO, Amazon.co.jp | MonotaRO is the strongest source found (900+ offers) |
| IN | Flipkart, IndiaMART | few parsed prices per page |
| KR | Danawa | price comparison, few parsed |
| SG | Lazada SG (JSON endpoint) | reliable |
| ID | Lazada ID (JSON endpoint) | reliable |
| CN | DHgate | wholesale export prices in USD |
| AU | Reece | trade supplier |
| EG, TZ, CI, ET, TR, NZ | none | every candidate refused automated requests |

Two technical findings worth keeping:

1. Amazon throttles by source address, not by country. A single 503 means
   nothing; the same store serves a full page on the third or fourth attempt.
   The scan function now retries 403/429/5xx five times with backoff and reports
   how many attempts it took.
2. Lazada's `?ajax=true` variant returns server-rendered JSON with prices, which
   is why Singapore and Indonesia work while their normal search pages do not.
