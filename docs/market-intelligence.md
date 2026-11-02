# FRELUX Market Intelligence

Public market data platform inside the existing FRELUX site, plus a private
Investor Centre. Everything here was built on the infrastructure the site
already had; nothing existing was replaced.

## 1. What ships

| Page | Route | Data behind it |
|---|---|---|
| Market Overview | `/market-intelligence` | market_index_series, market_rankings, mi_companies, provider status |
| Stock Market | `/market-intelligence/stocks` | mi_companies + provider quotes (watchlist in localStorage) |
| Stock detail | `/market-intelligence/stocks/:symbol` | provider quotes and daily candles |
| Materials Market | `/market-intelligence/materials` | market_index_series (official publishers), price_scan_candidates |
| Industry Trends | `/market-intelligence/trends` | market_index_series movements, market_rankings |
| Investment Insights | `/market-intelligence/investment` | mi_companies, provider quotes, mi_market_news |
| Market News | `/market-intelligence/news` | mi_market_news (source + date required) |
| Company Profiles | `/market-intelligence/companies`, `/companies/:symbol` | mi_companies |
| Investor Centre | `/investor-centre` (private) | mi_investor_snapshot(), mi_investor_documents |
| Admin controls | `/admin/listed-markets` (admin only) | mi_provider_config, mi_companies, mi_market_news, mi_investor_access |

The existing admin page at `/admin/market-intelligence` still owns the price
crawl pipeline. The new panel is separate and covers the listed-market tables,
so neither page grew into the other's job.

## 2. Backend

Migration `20261101220000_market_intelligence.sql` creates:

- `mi_companies` — 20 listed construction, materials, equipment and engineering
  companies with exchange, country, sector and currency.
- `mi_stock_quotes` — one row per symbol, written only by the edge function.
- `mi_stock_candles` — daily OHLCV history per symbol.
- `mi_market_news` — curated stories; `source_name` and `published_at` are NOT
  NULL, so a story cannot exist without provenance.
- `mi_provider_config` — provider capability, key env var name, refresh interval,
  last success and last error. Public read is closed; the function reads it and
  the admin panel edits it.
- `mi_investor_access` — per-user grants, RLS: a user sees only their own row.
- `mi_investor_documents` — investor reports, admin-only.
- `mi_investor_snapshot()` — SECURITY DEFINER function returning real counts
  (visitors, events, calculator completions, users, purchases, revenue) and
  refusing anyone who is neither admin nor a granted investor.

`20261101220500_mi_service_grants.sql` gives the service role the table
privileges the edge function needs (RLS bypass alone was not enough).

## 3. Provider integration

`supabase/functions/market-stocks` is a provider-agnostic gateway:

- actions: `status`, `quotes`, `candles`
- provider order: Finnhub → Financial Modeling Prep → Twelve Data → Alpha Vantage
- quotes are cached in `mi_stock_quotes` and served from cache inside the
  provider's configured refresh window
- every response carries `provider`, `as_of` and `is_delayed`
- with no key configured the function returns `configured: false` and the UI
  states that plainly; it never substitutes a placeholder price
- provider errors are written to `mi_provider_config.last_error` and shown in the
  admin panel

### Required environment variables (edge function secrets)

```
FINNHUB_API_KEY      # optional, recommended first
FMP_API_KEY          # optional
TWELVE_DATA_API_KEY  # optional
ALPHA_VANTAGE_API_KEY# optional
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by the platform.
No key is read by the browser; the client only calls the function.

## 4. Security

- Provider keys never reach the client bundle: the function reads them from the
  edge runtime environment.
- `mi_provider_config`, `mi_investor_access` and `mi_investor_documents` have no
  public read policy.
- The Investor Centre checks admin role or an explicit grant, and the snapshot
  RPC re-checks server-side, so hiding the UI is not the control.
- `/investor-centre` is `noindex, nofollow` in `public/_headers`, disallowed in
  `robots.txt`, never listed in the sitemap, and marked `noIndex` in `useSeo`.
- The module is additive: a failure in market data cannot affect calculators,
  because no calculator code imports it and every page degrades to a stated
  empty state.

## 5. SEO

- Seven public routes added to `scripts/generate-sitemap.mjs`,
  `scripts/prerender.mjs` (unique title + description each) and
  `scripts/seo-content-map.mjs` (crawlable h1, breadcrumb, body, internal links).
- Internal linking: navbar workspace "Market Intelligence" (7 links), footer
  "Resources" group, and cross-links between the sub-pages.
- Private routes excluded from all three files and blocked in robots.txt.

## 6. Monetisation readiness

The public pages are free and complete. `mi_companies.is_active` and the
provider refresh interval give the admin panel two levers for a future paid tier
without schema changes; no pricing is shown because none is set.

## 7. Testing

- `src/lib/market-intelligence/chart.test.ts` — scale, path geometry, candles,
  range windows, CSV, percent formatting (14 tests).
- `src/components/market-intelligence/charts.test.tsx` — accessible chart
  contracts, axis labels, empty states, candle bodies (5 tests).
- Existing regression suites re-run: route consistency, sitemap namespace,
  footer, site nav, learn pages.
- `npx tsc --noEmit` clean.

## 8. Known limitations

- No stock provider key is configured in this environment, so stock pages show
  an explicit "provider not configured" state rather than prices. Configure one
  of the variables above to switch them on; no code change is needed.
- `market_index_series` covers cement, steel, timber, paints, plumbing and pumps
  from official publishers. Categories without an official series are absent
  rather than estimated.
- Intraday (1D) candles are not offered: the configured providers' free tiers do
  not guarantee intraday history, and a fake intraday chart is worse than none.
- Market news is curated by an administrator; it is not auto-ingested, so the
  list stays empty until someone adds sourced items.
- The Investor Centre shows "not recorded" for traffic, valuation, margin and
  retention because FRELUX does not measure them in its own tables.

## 9. Deployment

1. Migrations are already applied to `nfgaaohweygwydoelxnf`.
2. Edge function `market-stocks` is already deployed.
3. To enable prices: add one provider key as an edge function secret, then
   redeploy nothing — the function reads it on the next call.
4. Netlify build is owned by the site owner; the new routes ship with the next
   build. Until then the pages exist in the repo and the database but not on the
   live domain.
