# FRELUX domain launch audit — freluxtools.com

Run 2026-10-29 after the move off `freluxtools.netlify.app`. Every "verified"
line below was checked against the live site, the live database, or the test
suite during this audit; nothing here is assumed.

## 1. Domain and canonical identity

| Check | State |
| --- | --- |
| Apex resolves, valid TLS | Verified — `https://freluxtools.com` returns 200 |
| `www` → apex | Verified — 301 to `https://freluxtools.com/` |
| Trailing-slash normalisation | Verified — `/paint-calculator` 301s to `/paint-calculator/` |
| Missing route status | Verified — a nonexistent path returns a real 404, not a soft 200 |
| Canonical tags | Repo corrected; live copy still carries the old host (see Open) |
| Old host consolidation | Fixed today — 301 `freluxtools.netlify.app/*` → `freluxtools.com/:splat` in `netlify.toml`, first rule so nothing else matches first |
| Supabase auth origin | Verified — `site_url` and redirect allow list cover apex, www and the legacy host |
| Edge functions origin | Verified — CORS resolves from the `SITE_URL` secret (`freluxtools.com`), legacy origin kept for shared links |
| Database content | Verified — no content row references the old host. The only matches are historical `error_logs`, `application_errors` and `analytics_events` payloads |

## 2. Crawlability and SEO

- Sitemap namespace: **fixed today.** All three generators declared
  `sitemaps.org/sitemap/0.9` instead of `sitemaps.org/schemas/sitemap/0.9`,
  which is what Search Console reported as "Incorrect namespace". Guarded by
  `src/lib/sitemap-namespace.test.ts`.
- Sitemap content: the Supabase sitemap function now emits **3,633 URLs on
  `https://freluxtools.com`**. The live `/sitemap.xml` still serves 227 URLs on
  the old host from the paused build.
- `robots.txt`: repo sitemap directive points at the custom domain; live copy is
  stale for the same reason.
- Google verification meta tag present in `index.html`.
- Route/sitemap parity: `route-consistency.test.ts` passes — every registered
  route appears in the generated sitemap.
- Localised URLs are intentionally non-indexable (`public/_headers` sends
  `X-Robots-Tag: noindex, nofollow`, client-side `noindex` as backup). Correct
  while translations reuse English body copy.

## 3. Globalisation

- **32 markets** in `src/lib/international/countries.ts`; every market has a
  `/market/<code>` landing page and the sitemap test asserts all 32 are
  emitted.
- **13 UI locales**, the exact union in `src/lib/i18n.tsx`: `en`, `es`,
  `fr`, `de`, `pt`, `ru`, `id`, `sw`, `ar`, `hi`, `zh`, `ja`, `nl`.
  Each has a locale URL prefix that is noindex via `public/_headers`;
  `/ja` and `/nl` were missing that rule and were added in this pass.
- Currency formatting, per-market price books and unit conversion are covered
  by `__market-currency-sanity.test.ts`, `bundled-book.test.ts` and
  `calculator-config.test.ts`: **396 tests passing** across the international
  suite, including the calculation audit.
- Units: feet is the default input strategy for the painting estimator, metric
  optional; area maths stays internal per the standing product rule.

## 4. Calculations

- `calculation-audit.test.ts` and the estimation suite: **1,323 tests passing**
  (estimation), plus **1,638** across measurement, roof, tax and procurement.
- Invariants held: 2-coat default, 20-litre purchase unit with theoretical vs
  practical split, room-based input with no customer-facing m² entry.
- Credit path: rewards now grant real benefits (migration
  `20261029010000`), and the AI gateway spends a redeemed token before charging
  credits.

## 5. Structure and code hygiene

- `npm run build:api-engines` regenerated: the `frelix-api` bundle no longer
  embeds the old host (it now derives from `SITE_URL`).
- Playwright live config and the Monetag debug spec point at the custom domain.
- Test expectations no longer hardcode a host: `seo`, `structured-data`,
  `route-consistency`, `market-registry-completeness` and `article-validation`
  read `SITE_URL`, so the next domain move needs no test edits.
- Typecheck clean after every change in this audit.

## 6. Transport security

Verified live: `Strict-Transport-Security: max-age=63072000; includeSubDomains;
preload`, a full `Content-Security-Policy`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
and a restrictive `Permissions-Policy`.

## 7. Deliverability

- Resend key valid (sandbox send confirmed), **but** `freluxtools.com` still
  shows `failed` in Resend: the DKIM TXT, `send` MX, `send` SPF TXT and `rsend`
  CNAME are missing from the authoritative zone (`ns1-4.stableserver.net`).
  Exact values in `docs/dns-records-freluxtools.txt`.
- Termii key valid, ₦30.00 balance, **no approved sender ID**, so every SMS is
  rejected with `SENDER_ID_NOT_APPROVED`. The FRELUX application exists in
  Termii's queue and can only be completed in their dashboard.

## Open items (owner action or deploy)

1. **Deploy the site.** Every stale value below clears with one build: canonical
   host, `robots.txt` sitemap line, `/sitemap.xml` (namespace and host), the
   301 old-host rule, and the new `VITE_SITE_URL`.
2. **Resend:** add the four DNS records, then verify the domain.
3. **Termii:** approve the FRELUX sender ID and top up the balance.
4. **Decision, not a defect:** whether localised pages should become indexable
   with reciprocal `hreflang`. Today they are deliberately noindex because the
   body copy is English; indexing them before real translation would create
   near-duplicate pages. Changing this is an SEO programme, not a switch.
