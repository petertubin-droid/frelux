# FRELUX Features

Last reviewed: 2026-10-30

The catalogue below describes what the platform does today, where the code
lives, and the honest limits of each feature. Anything not shipped is listed
under **Not yet built** rather than implied by marketing copy.

---

## Estimation

- **Trade calculators**: paint, tiles, screeding, POP ceiling, roofing,
  tyrolene, and the wider trade registry in `src/config/construction-tools.ts`.
  Deterministic formulas in `src/lib/estimation`.
- **Build-to-roof estimator**: multi-building pipeline with a material
  breakdown per stage.
- **BOQ generator**: priced bill of quantities from a finished estimate.
- **Structural, foundation, carbon and solar tools**: separate
  deterministic modules, each with its own validation tests.
- **Image estimator**: area detection from a photo, with the measurement
  always editable by hand.
- **Conversational estimator**: natural-language brief parsed into a full
  estimate; the parsed values are shown for review before they are used.
- **Market-tagged pricing**: every price row carries an ISO market code, so
  an estimate discloses which market configuration produced it and whether
  the data is verified or user-supplied.

## Saved calculator templates

- **Save the inputs, not the answer**: a template stores the configuration
  of a calculation so re-running it later recalculates against current
  prices instead of replaying stale numbers.
- **Private or public**: a user keeps a template to themselves or publishes
  it for anyone to open; the owner can switch visibility later.
- **Load, duplicate, adjust**: open a saved template into the calculator,
  change one figure, and save it as a new version rather than overwriting.
- **SEO template pages**: public templates get a crawlable page at
  `/templates/<slug>`, plus a market-localised variant at
  `/market/<code>/templates/<slug>` with a market-unique title and
  description, and a hub at `/market/<code>/templates`. Market variants
  declare a reciprocal hreflang family with the global page.
- **Admin management**: templates are listed, reviewed and unpublished from
  the admin console; a template with no valid inputs cannot be published.

Code: `src/lib/template-data.ts`, `src/lib/templates-market.ts`,
`src/pages/templates/`, `scripts/lib/template-catalog.mjs` (feeds prerender
and sitemap).

## 3D globe map

- **Worldwide by default**: the opening frame follows the visitor: their
  saved place, then their market's reference city, then the whole globe. No
  single country is hard-coded as the default view.
- **Three layers**: verified professionals, open projects and material
  stock, each with its own pin colour and its own empty state.
- **Records only**: a pin exists only where a record carries a valid
  latitude and longitude (null island is treated as missing). The map never
  invents a position.
- **Worldwide place search**: type any city or address and the camera flies
  there through OpenStreetMap's Nominatim, debounced, cached per query and
  abortable when the visitor keeps typing.
- **FRELUX chrome**: a compass dial that tracks bearing and pitch and
  resets north on click, zoom and fullscreen keys, a live count, a scale bar
  measured from the projection, and a record card anchored to the chosen pin.
- **Reader-aware units**: kilometres by default, miles for the locales that
  use them; distances require the visitor's own location, which is opt-in.
- **Surfaces**: full workspace at `/map`, plus embedded panels on Pro
  Connect and the marketplace.
- **No paid keys**: MapLibre GL JS with OpenFreeMap vector tiles and AWS
  Terrain Tiles; no API key, no vendor quota. A WebGL-less device gets an
  honest notice instead of a blank box.

Code: `src/components/map/GlobeMap.tsx`, `MapPanel.tsx`,
`src/lib/map/{geo,defaults,geocode,use-map-layers}.ts`,
`src/pages/map/ExploreMap.tsx`.

**Current limit:** the geo-bearing tables (`pro_profiles`,
`marketplace_listings`, `marketplace_products`) are still empty, so the map
shows its empty state rather than a populated world. It becomes useful the
first time a professional, job or listing publishes coordinates.

## Weather intelligence

- **Live forecast first**: OpenWeather when the key resolves, otherwise the
  keyless Open-Meteo feed. Both are live; neither is simulated.
- **Honest fallback**: if every live source fails, the widget shows a
  seasonal estimate and labels it as such. It never presents an estimate as
  a forecast.
- **Local to the reader**: coordinates come from the visitor's own
  location when granted, otherwise the market's reference city, so the
  banner speaks about the site they are planning, not head office.
- **Cached 30 minutes per coordinate pair**: one lookup serves the page,
  the calculators and the map panel.

Code: `src/lib/weather.ts`, `src/lib/weather-locations.ts`,
`src/components/weather/WeatherBanner.tsx`.

## Marketplace and Pro Connect

- **Materials marketplace**: sellers list stock with prices, units,
  delivery and pickup areas; admin moderation can remove a listing.
- **Pro Connect**: verified professional profiles with trades, coverage,
  portfolios and contact.
- **Jobs**: post a calculation as a job and receive bids; the estimate
  travels with the job so bids are comparable.
- **Trust and safety**: verification status, suspension and reporting are
  enforced server-side, not only in the UI.

## Learning and assistance

- **Learn Hub**: written guides per trade, canonical per market where the
  content genuinely differs.
- **Construction dictionary**: multilingual terminology with confidence
  scoring and admin curation (`docs/CONSTRUCTION_DICTIONARY_API.md`).
- **AI Studio**: colour consultation and a learning assistant are the
  sanctioned external-model surfaces; the admin assistant runs on the
  platform agent, and code assistance stays on the platform agent too. No
  external model is part of the estimation or pricing path.

## Pricing, markets and languages

- **32 markets** with a market profile each: ISO code, currency, units and
  pricing source.
- **Token packs at $1.99** in every market, including Nigeria.
- **Nigeria subscriptions** stay on the naira list (Pro 5,000, Premium
  15,000, Enterprise 50,000 per month) as a deliberate exception to the USD
  catalogue; every settlement is quoted before payment and verified after.
- **Display currencies** convert through a keyless live FX feed with a 12
  hour cache; admin-set rates win.
- **11 languages** with locale URLs; Arabic renders RTL. Chrome strings are
  translated in React, and locale URLs stay out of the sitemap until page
  bodies are genuinely translated, so crawlers never see duplicate English.

## Admin console

- **49 admin pages** under RBAC: pricing and markets, SEO and prerender
  health, materials and price books, templates, integrations, ads, users,
  errors and dictionaries.
- **Integration keys**: client-safe provider keys are exposed only through
  the `integration_keys_public` view; secrets stay behind RLS.
- **Premium surface**: shared glass primitives (`admin-surface`,
  `admin-inset`) keep the console visually consistent.

## Quality

- Deterministic calculators with unit tests per formula.
- Targeted vitest runs during work, full suite in CI on push, Playwright E2E
  for the critical flows, `tsc -b` and eslint in the same gate.
- Prerender of 1,489 routes and a 1,483-URL sitemap generated from the same
  catalogue as the pages, so the two cannot drift.

## Not yet built

- Populated map data (see the limit above).
- Translated page bodies for the 7 UI-only locales.
- Stripe checkout is coded but inactive until `STRIPE_SECRET_KEY` is set.
- Netlify auto-builds are paused by owner decision; pushes to `main` do not
  reach `freluxtools.com` until they resume.
