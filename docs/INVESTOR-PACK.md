# FRELUX Investor & Buyer Pack

## The asset

A profitable, revenue-bearing construction-tech platform:

- 45+ calculators and AI estimators with recurring subscription revenue
  (Pro / Premium / Enterprise tiers) plus marketplace and ad revenue
- Defensible data moat: automated market price crawling with validated
  per-market price books
- A worldwide layer that is built and shipped: 11 crawlable locale URLs with
  real translated chrome and hreflang, 24 display currencies with a live FX
  feed, a seeded US price region proving the model travels, and a Stripe
  checkout edge function ready for international cards
- Unusually strong engineering hygiene for a solo project: 6,600+ tests,
  764 test files, typecheck + E2E + build enforced in CI, CHANGELOG, ADRs,
  security policy, and public metrics at `/metrics`

## Metrics pack (what to assemble before listing)

- Traffic: GA4 sessions/users by country, top pages, organic vs referral
- Registered users, active users, estimates run per month
- MRR, churn, ARPU; revenue by source (ads vs subscriptions vs marketplace)
- CAC if any paid acquisition exists
- Costs: hosting, Supabase, AI inference

## Technical due-diligence binder (already in the repo)

- `docs/ARCHITECTURE.md` — one-pager
- `docs/RUNBOOK.md` — how to run, deploy, verify
- `docs/API.md`, `docs/CONSTRUCTION_DICTIONARY_API.md`
- `CHANGELOG.md`, `docs/adr/`, `SECURITY.md`, `CONTRIBUTING.md`
- CI pipeline definition (`.github/workflows/`)
- Access to the private repo on request during diligence

## Positioning narrative

"FRELUX is a construction cost-estimation platform with 45+ tools, recurring
subscription revenue, and a proprietary crawled price dataset. The worldwide
layer — locale URLs, live FX, region-aware pricing, Stripe — is built and
dormant on NGN-only defaults; a buyer switches it on."

## Channels

### Website / SaaS buyers

- Flippa, Acquire.com, Empire Flippers. SaaS with recurring revenue
  typically prices at 2–4x annual profit. The buyer profile is someone who
  wants the international expansion upside without building it.
- Before listing: custom domain + 90 days of international traffic and
  conversions improves both the multiple and buyer confidence.

### Investors

- Traction proof first: the worldwide layer is live, so the strongest order
  is (1) flip on currency/locale defaults, (2) collect 90 days of
  international traffic and paid conversions, (3) pitch angels in the
  contech/proptech space — the crawled NG price data plus the worldwide
  expansion optionality is the story.

## Pre-listing checklist (owner actions)

- [ ] Custom domain + canonical/sitemap/GSC migration (RUNBOOK has steps)
- [ ] Renew Supabase access token and apply the three pending migrations
- [ ] Add Stripe keys + deploy edge function for international cards
- [ ] 90 days of GA4 + conversion data after switching on worldwide defaults
- [ ] Metrics pack numbers above
