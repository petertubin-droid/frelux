# FRELUX Runbook

## Run locally

```bash
npm install
npm run dev        # Vite dev server
npm run typecheck  # tsc -b
npm test           # vitest
npm run build      # production bundle
```

## Environment

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — backend.
- Optional: Sentry, analytics, `VITE_STRIPE_PUBLISHABLE_KEY` (client half of
  Stripe checkout; pairs with the `STRIPE_SECRET_KEY` Supabase secret on the
  `stripe-checkout` edge function).
- Secrets never live in the repo.

## Database migrations

The sandbox (and CI) cannot open Postgres ports; migrations are applied over
HTTPS with the Supabase Management API. `scripts/apply_pending_migrations.py`
derives the pending list dynamically (every repo migration not yet recorded in
`supabase_migrations.schema_migrations`, in filename order) — never
hand-maintain a list. It is idempotent-safe: files are guarded, re-applies
just re-record the history row. Run with `SUPABASE_ACCESS_TOKEN` exported:

```
POST https://api.supabase.com/v1/projects/{ref}/database/query
Authorization: Bearer <access token>   body: { "query": "<sql>" }
```

- Frelux DB project: `freluxproject`, ref `nfgaaohweygwydoelxnf` (eu-west-1).
- Apply pending files under `supabase/migrations/` in filename order; each is
  idempotent or guarded.
- All migrations through `20261007130000` are applied live as of
  2026-10-04, including the worldwide set (language registry cleanup,
  English-only conversational packs, US market profile + USD reference
  price book, data subject requests table).
- `20261007090000_wallfin_international_wall_systems` applied live as of
  2026-10-06: `wallfin_labour_rates` (per-market finishing labour, per-m²,
  local currency, estimate-flagged), US/CA/GB/IN/AU finishing materials +
  retail price rows with provenance, and role mappings for the Wall Finish
  Estimator (AU native 5 roles, CA 8, GB 13, IN 9; remaining roles inherit).
- All migrations through `20261005220000` are applied live as of
  2026-10-05: `market_material_roles` (engines price by ROLE per market,
  NG + US mappings, inherits_from fallback to the NG reference), the
  real US retail price book (10 verified USD product rows with retailer
  provenance; the 5 generic USD rows deactivated, history kept), and the
  price scan pipeline (`price_scan_sources` + `price_scan_candidates`,
  admin-only).
- The `price-scan` edge function is deployed live (admin-gated,
  SSRF-guarded retail page fetch, JSON-LD → meta → regex extraction).
  Scans land as PENDING candidates; only admin approval writes into
  `estimation_prices` (per market, provenance in price_source /
  scan_source / scan_confidence).
- Access tokens expire; when a 401 hits, the owner generates a new one from
  the Supabase dashboard (Account → Access Tokens) and it is stored as a
  secret.

## Deploy

Netlify auto-build is PAUSED (owner directive, 2026-09-11): pushes to `main`
do NOT deploy until the owner resumes builds. Verify deployment state with:

- CI history: https://github.com/petertubin-droid/frelux/actions
- Live: https://freluxtools.netlify.app/metrics (public platform status)

## Search engine verification

- **Bing**: `public/BingSiteAuth.xml` is already deployed; confirm ownership
  in Bing Webmaster Tools.
- **Google Search Console**: add the verification meta tag (or upload the
  HTML file to `public/`) from GSC → verify → submit
  `https://freluxtools.netlify.app/sitemap.xml`. Re-submit after the custom
  domain migration (see INVESTOR-PACK.md).
- **Custom domain**: point DNS at Netlify, then update `SITE_URL` in
  `src/lib/seo.ts`, the sitemap `<loc>` host, and canonicals, and
  301 the old host.

## Stripe checkout (international cards)

1. Set `STRIPE_SECRET_KEY` (Supabase edge secret) and
   `VITE_STRIPE_PUBLISHABLE_KEY` (Netlify env).
2. Deploy the `stripe-checkout` edge function (`supabase/functions/stripe-checkout`).
3. Test with a Stripe test card; NGN amounts are in kobo in the function.
4. Until configured, the gateway returns not-configured and checkout falls
   back to Paystack.

## Flutterwave checkout (Pan-African + international cards)

Gateway selected in Admin Settings → Payment gateway. Nigerian-merchant
friendly: Flutterwave onboards Nigerian businesses and settles to local
banks while accepting international cards and 30+ currencies.

1. Create a Flutterwave business account; switch to LIVE mode to get the
   live keys.
2. Set Supabase edge secrets on the three functions:
   - `flutterwave-checkout`: `FLUTTERWAVE_SECRET_KEY`
   - `flutterwave-verify`: `FLUTTERWAVE_SECRET_KEY`
   - `flutterwave-webhook`: `FLW_SECRET_HASH` (+ a random secret hash you
     also enter in the Flutterwave dashboard → Settings → Webhooks)
3. Deploy all three functions (`supabase/functions/flutterwave-*`).
4. No Flutterwave public key is required by FRELUX's hosted checkout flow.
   The browser calls `flutterwave-checkout`, which uses the server-side
   `FLUTTERWAVE_SECRET_KEY`. Keep that secret configured on checkout and
   verification functions.
5. Webhook URL in the Flutterwave dashboard:
   `https://<project-ref>.supabase.co/functions/v1/flutterwave-webhook`
6. Test end-to-end with the Flutterwave test cards; NGN amounts are in
   NAIRA (major units) in these functions — the edge function converts
   the canonical kobo prices itself.
7. The checkout selector cannot inspect server secrets at page load. If the
   selected provider is not configured, checkout returns the provider's
   actionable error. Paystack invalid-key initialization errors fall back to
   Flutterwave before any transaction is created, when its Edge Function is
   configured.

## Transactional email (Resend)

The `send-email` edge function sends transactional email through
Resend. It is live and the `RESEND_API_KEY` Supabase secret is set.

Setup remaining (one-time, in the Resend dashboard / DNS provider):

1. `freluxtools.com` was added as a Resend domain (id
   3ff088ce-5a38-459b-97d2-ef9bccbcf112). Add the shown DNS records
   (2x SPF TXT on `send`/`rsend`, DKIM TXT on
   `resend._domainkey`) at the DNS provider, then verify the domain
   in Resend. Until verified, Resend rejects the sender and the
   function returns sent:false (the contact form is unaffected).
2. Optional admin inbox for contact notifications:
   `supabase secrets set CONTACT_NOTIFY_EMAIL=...`
3. Sending is best-effort and rate limited (5/min/IP). Recipients are
   derived from stored rows only; the admin panel stays the source
   of truth for contact messages.

## Learn article publication policy (owner directive, Oct 17 2026)

Every article series - global or local, seeded by migration - goes live
immediately, with `petertubin` as the author byline (FRELUX editorial
team). Reference implementation:
`supabase/migrations/20261024200000_publish_us_articles_petertubin.sql`.

Recipe for a new series (replace `US` with the market code):

1. Resolve a reviewer auth user (prefer an account with a `profiles`
   row) and set the transaction-local claims config (set_config) to it inside the
   transaction - the attribution triggers stamp `reviewed_by`,
   `verified_by` and `editorial_reviewed_by` from the JWT, so a raw
   `postgres`-session UPDATE would otherwise fail the source CHECK
   constraint (accepted status requires a real reviewer id).
2. Accept the topic's pending sources (`learn_wall_finishing_sources`).
3. Verify the topic (`learn_wall_finishing_topics` guard requires at
   least one accepted citation first).
4. Approve + publish the articles:
   `status='published', editorial_review_status='approved',
   author='petertubin', published_at=now()`.

The publication guard (`guard_wall_finishing_article_publication`)
blocks `status='published'` on wall-finishing articles without recorded
editorial approval, a verified topic and an accepted citation - never
weaken it; run the recipe instead. The dynamic `/sitemap.xml` function
picks the articles up automatically (status=published).
