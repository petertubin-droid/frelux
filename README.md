# FRELUX — Worldwide Construction Estimation Platform

A production-grade construction cost estimation platform for builders everywhere.
45+ calculators and AI-powered estimators, a materials marketplace, a worldwide
3D site map, a local weather window for planning work, and automated market
price intelligence — in 11 languages with crawlable locale URLs, 24 display
currencies with a live FX feed, and region-aware pricing that travels.

## Built worldwide

- **11 languages, locale URLs** — `/es/`, `/fr/`, `/de/`, `/pt/`, `/ru/`,
  `/id/`, `/sw/`, `/ar/`, `/hi/`, `/zh/` (plus English) each render the app in
  that language. React-level chrome translations (no crawler-blind client
  widget), RTL support for Arabic. Locale URLs are client-side language
  switching: the sitemap lists only the unique English pages and locale
  views canonicalize to them, because prerender emits one content-bearing
  page per route (listing all 11 forms previously shipped 1,871 duplicate
  home pages to Google). Restore hreflang + sitemap entries only once
  locale URLs carry genuinely translated content.
- **22 display currencies, live FX** — amounts convert for display with a
  keyless live FX feed (open.er-api.com, 12h cache); owner-configured rates
  always override live rates per currency.
- **Region-aware pricing** — estimation prices carry an ISO market code.
  Nigeria's crawled price books are the live moat; a seeded US reference price
  book proves the model travels, and every market can grow its own book.
- **International checkout** — Paystack by default; a Stripe Checkout edge
  function ships in the repo and activates with `STRIPE_SECRET_KEY` so US/EU/Asia
  visitors can pay with local cards.
- **Compliance for worldwide traffic** — GDPR (EU/EEA) and CCPA/CPRA sections,
  consent-gated ads, and a working data-subject-request flow.

## Features

### Calculators & Estimators

- **Paint Calculator** — wall area, coats, paint types, live cost estimation
- **Tile / Screeding / POP Ceiling / Roofing / Tyrolene** calculators
- **Build-to-Roof Estimator** — multi-building pipeline with material breakdowns
- **Image Estimator** — AI-powered area detection from photos
- **Conversational Estimator** — English natural-language parsing to full estimates
- **Construction Sequence & Project Timeline** — phasing and Gantt scheduling
- **BOQ Generator, Carbon Footprint, Structural Load, Foundation Designer** and more

### Saved templates

- **Templates store inputs, not answers** — save a calculation as a private or
  public template and it recalculates against current prices when reopened
- **SEO template pages** — public templates get `/templates/<slug>` plus a
  market-localised page at `/market/<code>/templates/<slug>` with its own
  title, description and reciprocal hreflang
- **Admin management** — review, unpublish, and audit every published template

### 3D globe map

- **Worldwide opening frame** — your saved place, then your market's city, then
  the whole globe; no country is the default
- **Three layers** — professionals, open projects, material stock, each with a
  pin colour and an honest empty state
- **Pins come from records** — nothing is placed at a guessed coordinate
- **Worldwide place search** — any city on earth via OSM Nominatim, debounced
  and cached
- **FRELUX chrome** — compass dial (bearing and pitch, click to reset), zoom and
  fullscreen keys, live count, scale bar, anchored record card
- **Keyless stack** — MapLibre GL + OpenFreeMap vectors + AWS terrain tiles, with
  a WebGL fallback notice
- **Reader-aware units** — kilometres, or miles where that is the local custom

### Weather intelligence

- **Live forecast first** — OpenWeather with a key, Open-Meteo without one
- **Labelled fallback** — a seasonal estimate is shown as an estimate, never as
  a forecast
- **Local to the reader** — your own location, else your market's reference city
- **30-minute cache** per coordinate pair, shared by banner, calculators and map

### Platform

- **Marketplace** — buy/sell construction materials with seller dashboards
- **Pro Connect** — contractor/professional network
- **AI Studio** — color recommendations, learning assistant, AI monetization
- **Market Intelligence** — automated price crawling and validation
- **Learn Hub** — educational content for construction professionals
- **Public metrics page** — real platform stats at `/metrics`

### Admin

- 49 admin pages: analytics, branding, SEO, pricing, materials, users, ads,
  integrations, dictionary curation, and more
- Full RBAC with admin-only routes, real-time error monitoring, health dashboards

## Tech Stack

- **Frontend:** React 18, TypeScript 5, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Payments:** Paystack (+ optional Stripe for international cards)
- **Mapping:** MapLibre GL JS, OpenFreeMap vector tiles, AWS Terrain Tiles (no key)
- **Weather:** OpenWeather (optional key) with keyless Open-Meteo fallback
- **Quality:** 6,600+ vitest tests, Playwright E2E, typecheck + lint + build in CI
- **Deploy:** Netlify (auto-deploy on green CI), Docker support

## Documentation

- [Feature catalogue](docs/FEATURES.md)
- [Architecture one-pager](docs/ARCHITECTURE.md)
- [Runbook: run, deploy, verify](docs/RUNBOOK.md)
- [Investor / buyer pack](docs/INVESTOR-PACK.md)
- [API overview](docs/API.md) · [Construction dictionary API](docs/CONSTRUCTION_DICTIONARY_API.md)
- [Security policy](SECURITY.md) · [Contributing](CONTRIBUTING.md)

## License

See [LICENSE](LICENSE).
