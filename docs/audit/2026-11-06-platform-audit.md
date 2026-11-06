# FRELUXTOOLS platform audit, 6 November 2026

Scope: public site at https://freluxtools.com/, the production repository, and
the deployed artefact. Every figure below was measured in this session. Items
that could not be measured are listed as outstanding rather than assumed.

## 1. Authoritative codebase

| Check               | Result                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| Local worktree      | `petertubin-droid/frelux`, branch `main`, clean before this batch                       |
| Production deployer | same repository; `netlify.toml` and `scripts/lib/site-url.mjs` set the canonical origin |
| Second repository   | `Petertubin/frelux` not inspected: no access from this environment                      |

The two GitHub URLs named in the brief resolve to one deployment path, not two
active codebases. Confirmation that `Petertubin/frelux` is archived or a mirror
needs repository access.

## 2. Platform inventory (measured)

| Surface                             | Count                       |
| ----------------------------------- | --------------------------- |
| Route declarations in `src/App.tsx` | 362                         |
| Page modules under `src/pages`      | 577 files, 319 non-test     |
| Components                          | 459                         |
| Library modules under `src/lib`     | 1371                        |
| Test files                          | 1196 (685 inside `src/lib`) |
| Database migrations                 | 678                         |
| Edge functions                      | 80                          |

### Engine connectivity

319 non-test pages were parsed for imports from `@/lib`:

- 267 pages import at least one engine, 52 do not.
- Concentration of shared cores: estimation 179 pages, international 146,
  safeError 66, suppliers 29, market-intelligence 27, price-index 18, boq 16,
  calculator-monitor 15, measurement 14, engineering 14, project-intelligence
  13, pro-connect 13, marketplace 11, location-intelligence 10, wallfinishing 10.

The dependency graph is already centralised rather than a set of independent
calculators: most pages reach the same estimation and international cores.

### Pages with no engine import

52 pages, of which most are non-calculating surfaces (Contact, Credits, Faq,
Metrics, NotFound, Partners, Printables). Three are calculator-related and need
individual review:

- `src/pages/SmartCalculator.tsx`, 91 lines, no library import.
- `src/pages/MineralStoneCalculator.tsx`, 30 lines, no library import.
- `src/pages/MathematicalPlanElevation.tsx`, 253 lines, no library import, so
  any formula in it is local to the page and cannot be shared or regression
  tested through the common cores.

Classification of every one of the 267 engine-backed pages as fully or partly
functional needs per-engine output checks, which is the next audit stage (see
section 8). A visible interface was not treated as proof of a working backend.

## 3. Deployment state

The live HTML loads `/assets/js/index-BLA0sjDR.js`. The current worktree builds
`index-Z1x-3t73.js`. The production artefact therefore predates the commits
from this week, including the map, article and navigation work. Deployment is
tracked as an open action, not a code defect; no Netlify API credential is
available here.

Live sitemap carries 3067 URLs against 1638 in a local build. The difference is
not a regression: article, colour and market-template URLs are fetched from
Supabase during the Netlify build, and a local build without the Supabase
environment variables falls back to the static route list. Measured split of the
live file: 1344 `/market`, 794 `/colors`, 443 `/learn`, 157 `/es`, 79
`/templates`, 66 `/faq`, 44 `/building-types`.

## 4. Domain and indexation

| Probe                              | Result                                                |
| ---------------------------------- | ----------------------------------------------------- |
| `https://freluxtools.com/`         | 200, canonical `https://freluxtools.com/`             |
| `https://www.freluxtools.com/`     | 301 to apex                                           |
| `https://freluxtools.netlify.app/` | 301 to `https://freluxtools.com/`                     |
| `http://freluxtools.com/`          | not verified, port 80 is blocked in this sandbox      |
| `robots.txt`, `sitemap.xml`        | 200                                                   |
| Sitemap URLs                       | 3067, all unique; a 12 URL random sample returned 200 |
| Structured data on home            | Organization, WebSite, ItemList with 9 ListItems      |
| hreflang tags anywhere             | none                                                  |

### Defect found and fixed in this batch

`/es/` was the only locale prefix missing its `X-Robots-Tag: noindex` header.
Live headers for `/fr/`, `/de/`, `/pt/`, `/ru/`, `/id/`, `/sw/`, `/ar/`, `/hi/`,
`/zh/`, `/ja/` and `/nl/` return `noindex, nofollow`; `/es/` returned nothing.
At the same time 157 `/es/` URLs were published in `sitemap.xml`, and the
prerendered `/es/` page was byte-identical to its English original
(`/es/learn/pop-ceiling-maintenance-and-repair-tips/` and the English page both
39413 bytes, identical text, zero Spanish markers), declared `lang="en"` and
canonicalised to the English root.

That combination is the worst of both policies: duplicate English pages
submitted for indexing while the other eleven locales are excluded. The static
route list in the sitemap generator already enforced English-only, but the
Supabase-fed article and template lists did not, so locale rows reached
production.

Fixed: `/es` and `/es/*` now carry the same noindex header as every other
locale, and the sitemap generator filters locale-prefixed paths at assembly
time instead of trusting the static list. `src/lib/locale-url-policy.test.ts`
asserts that every locale declared in `LANGUAGES` has both header rules, that
the generator applies the filter, and that no locale URL ships in the sitemap.
The filter is prefix-exact, so English routes such as `/escrow` and
`/estimate-refresh` are unaffected.

Removal of the 157 URLs is confirmed only by the next production build, because
the list originates from Supabase at build time.

## 5. Prices and market data

Measured against production on 6 November 2026. The earlier "not measurable" note
is superseded: the replacement Supabase token returns rows.

| Store                       | Rows | Groups     | Freshest stamp                                                  | Oldest stamp |
| --------------------------- | ---- | ---------- | --------------------------------------------------------------- | ------------ |
| `market_material_prices`    | 1369 | 40 markets | `last_verified_at` null everywhere                              | -            |
| `estimation_prices`         | 1996 | 40 markets | `verified_at` null everywhere, last `effective_date` 2026-08-22 | 2026-08-22   |
| `market_price_observations` | 54   | 3 markets  | 2026-11-06                                                      | 2026-10-30   |
| `frelux_price_observations` | 0    | 0          | -                                                               | -            |
| `estimation_materials`      | 634  | 634        | 2026-10-29                                                      | 2026-10-06   |
| `material_catalog`          | 58   | -          | `price_updated_at` null everywhere                              | -            |
| `material_prices`           | 7    | 1 currency | 2026-10-29                                                      | 2026-10-15   |

Provenance inside `market_material_prices`:

- 1366 rows `verification_status = 'unverified'`, 3 rows `'no_data'`, zero rows
  `'verified'`.
- 9 rows carry a `last_scanned_at`, a `source_url` and a `supplier_name`. The
  other 1360 carry none of the three.
- Per market: US 76 prices, GB 70, DE 61, CA 60, AU 59, ZA 59, BR 58, IT 57,
  KE 57, FR 56, MX 56, IN 56. Observations exist for three markets only, so the
  index publishes prices for 37 markets it has never observed.

Interpretation: the price stack is a derived price book, not a live market feed.
Four parallel stores exist (`market_material_prices`, `estimation_prices`,
`market_price_observations`, `frelux_price_observations`), one of which is empty,
and the two that feed the product carry no verification stamps at all.

### Defects found

1. No age check anywhere in the read paths. A row marked `verified` was trusted
   permanently, so a two-year-old verification would present as current.
2. A row marked `verified` with no date was trusted, although the claim cannot
   be checked without a stamp.
3. The supplier benchmark summary said "last-known price ... not verified" but
   never stated how old the price was, which the brief requires.
4. The admin price table showed a relative date under the status pill with no
   explanation of what backs the number, so an unreviewed row read like a
   reviewed one.

### Fixed in this batch

- `src/lib/pricing/provenance.ts`: single description of price evidence with
  five states (`verified`, `stale`, `observed`, `unverified`, `no_data`), a
  sourced flag, an age in days, and labels that never call an unsourced number
  confirmed. `STALE_AFTER_DAYS = 90`, `AGING_AFTER_DAYS = 45`.
- `src/lib/suppliers/index-bridge.ts`: the benchmark carries a `provenance`
  object, `isVerified` is derived from it rather than from the status column,
  and the summary sentence states the state and the age.
- `src/lib/estimation/queries.ts`: a `verified` row older than 90 days, or with
  no stamp, moves to the stale set instead of the verified set.
- `src/pages/admin/AdminMarketPrices.tsx`: the row shows the provenance label
  with the detail as a tooltip.
- `src/lib/pricing/provenance.test.ts`: 10 assertions over the boundaries,
  including verified-without-date demotion, aging versus stale, future stamps
  and unparseable input.

### Ingestion: the scanner was dead while every indicator read healthy

The cron job `market-scan-dispatch` was scheduled, enabled and firing every 20
minutes. In the 24 hours to 06:00 it ran 72 times and failed 72 times:

```
ERROR: column reference "token" is ambiguous
QUERY: select token into token from public.price_intel_tokens limit 1
```

`dispatch_market_scans` declared a PL/pgSQL variable named `token` that shadowed
the column it selected, so the function raised before dispatching anything. All
43 rows in `market_scan_settings` were left overdue (oldest `next_run_at`
2026-10-30) and observations stopped at 54 rows across three markets.

Renaming the variable exposed a second instance of the same class one statement
later, found only by running the function after the first fix:

```
ERROR: column reference "market" is ambiguous
QUERY: update public.market_scan_settings ... where market = m.market
```

A function declared `RETURNS TABLE(market text, ...)` has an output parameter
named `market`, so the unqualified UPDATE predicate resolved against that
parameter.

A third defect sat beside them: `price-digest-weekly` passed a single literal
argument to `jsonb_build_object`, so it failed every Monday with "argument list
must have even number of elements".

Fixed and applied to production (`20261106100000`, `20261106103000`):

- `dispatch_market_scans` uses `v_token` and `v_row`, qualifies every column,
  picks the newest active unexpired token deterministically, and raises instead
  of dispatching an empty token header.
- `price_intel_tokens` gains `is_active` and `expires_at`.
- `price-digest-weekly` carries a valid JSONB body.
- `price_scan_coverage()` reports per market the active sources, how many are
  actually scannable, blocked count, never-scanned count and last success, so a
  source count is never mistaken for reach.

Live verification after applying: `dispatch_market_scans(3)` returned EG, CI and
ET with dispatched true, overdue markets fell from 43 to 40, and the edge
function answered 200 with real runs (CI: 2 sources scanned, 1 candidate
created; ET: 1 source scanned, 1 failed).

### Observation integrity: the evidence was being dropped

Once the dispatcher was alive, the edge function reported the contradiction
directly:

```
{"market":"CI","scanned":2,"candidates_created":1,"observations_filed":0,"auto_applied":1}
```

A price was published while the observation behind it was never stored. The
writer sends a PostgREST upsert whose conflict target is
`source_id,supplier_name,market,material_slug,brand,specification,unit,observed_on`,
but the only unique index on `market_price_observations` was built on
`COALESCE(...)` expressions, which Postgres cannot use to infer an `ON CONFLICT`
target. Every write failed with 42P10 and the function discarded the error
because it only counted rows when `!obsError`.

Second defect in the same run: `price-intel-scan` writes `observations_filed`,
`markets_scanned` and `prices_updated` to `price_scan_runs`, and those columns
did not exist, so PostgREST rejected the whole close. The three runs started that
morning were still `running` with no `finished_at`, while every run from 3
November or earlier was `completed`.

A reading that had to be corrected: the 54 rows covering 6 pairs looked like
duplication (one AU pair repeated 7 times), but grouping by day shows one
observation per day across 7 to 8 days. That is a daily series, not duplication,
and nothing was deleted on that basis. 0 rows were removed by the cleanup.

Fixed and applied (`20261106110000`, `20261106113000`):

- plain unique index on exactly the conflict target, with defaults that stop a
  future NULL column from defeating it, plus a before-insert trigger that skips
  an exact same-supplier, same-day repeat for any writer.
- `is_outlier` is now set by that trigger when a price deviates more than 40%
  from the peer median of at least 5 recent observations, so the flag means
  something instead of being null on every row.
- `price_scan_runs` gains the counters the writer sends.
- `price-intel-scan` reports `observations_failed` and `observations_error`,
  refuses to auto-apply any group when the observation write failed, and logs a
  rejected run close instead of leaving a silent `running` row.

### Counts that were never evidence

`market_material_prices` holds 1381 rows and every one carried
`observations_count > 0`, maximum 7, while `market_price_observations` covers 6
market-material pairs. The counts came from
`20261103190500_backfill_market_prices_from_book.sql`, which copied them from the
estimation book. `describePriceProvenance` renders them as "N observations
recorded, none reviewed yet" in `AdminMarketPrices` and in
`suppliers/index-bridge`, so 1357 rows asserted evidence that does not exist.
Only 24 rows carry a `source_url` or `supplier_name`.

Fixed and applied (`20261106120000`): counts are derived from observations over a
90 day window, statement-level triggers keep them in step for insert, update and
delete, and the migration aborts if any row still reports observations for a pair
that has none. Rows claiming observations fell from 1381 to 34, matching the six
pairs that exist.

### Dispatch now spends its budget where data can exist

Of the 28 markets Frelux must cover, 12 have no scannable source at all (CH, CN,
GH, ID, JP, KR, MX, NL, PL, SA, SE, SG), 16 have between 1 and 12, and 6 have any
observation in the last 90 days. Dispatch ordered only by `next_run_at`, so a
market with nothing to scan consumed a slot every day and reported failure.

`dispatch_market_scans` now parks a market whose active sources are all
`search_page_only` or `bot_blocked` for seven days and orders the rest by
scannable source count. Overdue markets fell from 38 to 19 immediately, and the
next three dispatches went to US, GB and DE instead of arbitrary overdue rows.
`price_market_readiness()` reports per market the scannable reach, observations,
book rows and a verdict: `unconfigured`, `configured, no data yet`, `live,
evidence ageing`, or `live`.

### Correction: an access_status label was treated as a capability

The parking rule added in `20261106120000` assumed a market whose active sources
were all `search_page_only` could not produce a price. The 05:40 runs disproved
it: SA and PL have no source outside that label, and the scanner filed 8 and 2
observations from them with `source_format` `search` and extraction `json_ld`.
The label describes the page type; the scanner extracts structured data from
search pages.

Parking SA for seven days would have stopped a market that was producing data,
so `20261106130000` removes the rule, releases the markets it parked, and orders
dispatch by demonstrated yield: observations in the last 90 days, then sources
with a recorded success, then the most overdue. A market is parked only when it
has no active source at all.

After the correction: zero markets are structurally unconfigured, SA and PL are
released, overdue returned to 29, and readiness ranks GB 36 observations, AU 14,
SA 8, DE 5, CA 4, NG 2, US 2, PL 2, with NL (141 sources) and IN (83) configured
but never having produced an observation.

### The same shadowing defect, three times

`dispatch_market_scans` returns `TABLE(market text, dispatched boolean)`, so
`market` is an output parameter. The 06:52 revision added a per-market yield
subquery containing a bare `market` column and every call failed:

```
ERROR: column reference "market" is ambiguous
QUERY: select s.market, ... left join (select market, count(*) ...
```

`20261106140000` aliases the subquery table and its output column
(`select o2.market as obs_market`), renames the cursor field to `scan_market`, and
fails the migration if an unaliased reference returns. A test pins the shape. The
lesson recorded here: this function has now produced this defect three times, and
only execution catches it.

### The red CI run and the grant it was hiding

The failing CI step was "Privileged grant locks", not the tests: recreating
`dispatch_market_scans` in `20261106130000` and `20261106140000` reissued the
PostgreSQL default EXECUTE grant to PUBLIC, which `20261106150000` relocked. That
commit made CI green again, but it was never applied to production, and the gate
did not list the audit's own SECURITY DEFINER additions:

```
sync_price_evidence_counts   acl = NULL (default PUBLIC execute)
```

A function that writes `market_material_prices` was callable through PostgREST by
any anonymous client, while CI reported green. `20261106160000` revokes PUBLIC,
anon and authenticated from `sync_price_evidence_counts` and
`market_price_observation_guard`, keeps the reporting functions
(`price_scan_coverage`, `price_market_readiness`) on authenticated plus
service_role, and raises if either privilege returns. The gate now lists all four,
so a future recreation fails CI instead of passing silently. Both migrations are
applied:

```
dispatch_market_scans           postgres=X service_role=X
market_price_observation_guard  postgres=X service_role=X
price_market_readiness          postgres=X authenticated=X service_role=X
price_scan_coverage             postgres=X authenticated=X service_role=X
sync_price_evidence_counts      postgres=X service_role=X
```

### Why coverage is still thin

`price_scan_sources` holds 2119 rows across 43 markets, 1464 active. Access
status of the active rows: 1324 `search_page_only`, 61 `live`, 29
`bot_blocked`, 46 null. Scan status: 1166 never scanned, 193 failed, 58 ok.
Measured reach per market: GB 112 active sources but 12 scannable, DE 57 and 7,
NG 81 and 4, US 62 and 12 with no success ever recorded. Aggregated errors:
78 HTTP 403, 60 "no price found", 16 HTTP 404, 17 HTTP 503, 8 HTTP 429.

Reviving the dispatcher restores the schedule, it does not manufacture coverage:
most configured sources are retailer search pages that cannot yield a product
price, and a further 78 are refused outright. Real coverage for the required
markets needs live product sources or permitted APIs, which is a sourcing task,
not a code fix. Until then the provenance work above keeps unevidenced prices
labelled as such.

## 6. Security

- Database RLS and grant state not re-verified this session for the reason in
  section 5.
- No credential was read from or written to the client bundle during this batch.
- `/es/` header gap was an indexation defect, not an exposure.

## 7. Performance

Not measured in this batch. A local build emits 637 JavaScript chunks; Core Web
Vitals, Lighthouse and slow-network behaviour need a dedicated run against the
deployed artefact, after the pending deploy.

## 8. Prioritised roadmap

1. Deploy the pending build, then re-probe the `/es/` headers, sitemap and
   canonical values in production. (blocked on Netlify credential)
2. Price freshness audit: issue a valid Supabase token, then measure staleness
   per market and city, duplicate keys and outliers before touching the UI.
3. Per-engine output verification: reference inputs with independently computed
   expected values for the paint, block, tile, roofing, POP, borehole and
   structural cores, recording every disagreement.
4. Bring the three engine-free calculator pages onto shared cores, starting with
   `MathematicalPlanElevation.tsx` because it is the largest.
5. Cross-tool consistency tests so one quantity cannot be computed two ways.
6. Search Console and analytics verification with the owner's credentials, to
   confirm which of the 3067 submitted URLs are actually indexed.
7. Learn content integrity: empty categories, internal links to calculators,
   duplicate topics.
8. Monetisation and admin audit after the above correctness work, not before.

## 9. Changes in this batch

- `public/_headers`: `/es` and `/es/*` noindex rules, completing the twelve
  locale prefixes.
- `scripts/lib/locale-paths.mjs`: single source of truth for locale prefixes and
  the prefix test.
- `scripts/generate-sitemap.mjs`: locale paths dropped at assembly, with a
  logged count.
- `src/lib/locale-url-policy.test.ts`: five assertions covering header
  completeness per locale, prefix matching, generator wiring and sitemap output.

Verification: `vitest run src/lib/locale-url-policy.test.ts
src/lib/sitemap-namespace.test.ts src/lib/ads-txt.test.ts` 27 passed; `tsc`
clean; production build prerenders 1638 routes.

## 10. Outstanding

- Valid Supabase token for database evidence.
- Netlify deploy confirmation and a live re-probe.
- Per-engine functional classification, which this batch did not complete.
- Second repository disposition.
- Performance and accessibility measurement.
- Search Console access.
