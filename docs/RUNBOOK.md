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
HTTPS with the Supabase Management API:

```
POST https://api.supabase.com/v1/projects/{ref}/database/query
Authorization: Bearer <access token>   body: { "query": "<sql>" }
```

- Frelux DB project ref: `hqvhlkunkdrxyuvziorm` (Supabase account: Freluxtools).
- Apply pending files under `supabase/migrations/` in filename order; each is
  idempotent or guarded.
- Pending after the worldwide release: `20261007100000` (English-only
  conversational packs + worldwide language registry rows),
  `20261007120000` (US market profile + USD reference prices),
  `20261007130000` (data subject requests table).
- Access tokens expire; when a 401 hits, the owner generates a new one from
  the Supabase dashboard (Account → Access Tokens) and it is stored as a
  secret.

## Deploy

Netlify auto-deploys `main` when CI is green. Verify with:

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
  `src/lib/seo.ts`, the sitemap `<loc>`/hreflang hosts, and canonicals, and
  301 the old host.

## Stripe checkout (international cards)

1. Set `STRIPE_SECRET_KEY` (Supabase edge secret) and
   `VITE_STRIPE_PUBLISHABLE_KEY` (Netlify env).
2. Deploy the `stripe-checkout` edge function (`supabase/functions/stripe-checkout`).
3. Test with a Stripe test card; NGN amounts are in kobo in the function.
4. Until configured, the gateway returns not-configured and checkout falls
   back to Paystack.
