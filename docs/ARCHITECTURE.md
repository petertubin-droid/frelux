# FRELUX Architecture (one-pager)

## Shape

Single-page React 18 + TypeScript + Vite app, served on Netlify. All data and
auth live in Supabase (Postgres with row-level security, Auth, Storage, Edge
Functions). No bespoke server: the database is the backend, edge functions
handle payments and third-party calls.

## Layers

- **UI** — `src/pages` (public tools), `src/pages/admin` (RBAC-gated console),
  `src/components` (chrome + shadcn-style primitives).
- **Estimation engine** — `src/lib/estimation`: deterministic calculators,
  Naira-authoritative pricing, per-market price rows.
- **International layer** — `src/lib/international`: market profiles (ISO
  market codes, units, currency), visitor display-currency context with a
  keyless live FX feed (open.er-api.com, 12h cache; admin rates override),
  purchase of conversion is display-only.
- **Localization** — `src/lib/i18n.tsx`: 11 languages, each with a locale
  URL (`/es/`, `/ar/`, ...) routed by `LocaleAwareRoutes` (prefix stripped,
  language forced) as client-side language switching. Real React chrome
  translations keyed by English source strings; `useSeo` canonicalizes
  every locale view to the English page and the sitemap lists unique
  English URLs only (locale forms served duplicate home HTML to crawlers;
  see the 2026-10-08 sitemap fix). Arabic renders RTL.
- **Construction dictionary** — multilingual terminology service with
  confidence scoring, admin curation, versioned audit trail
  (`docs/CONSTRUCTION_DICTIONARY_API.md`).
- **Market intelligence** — scheduled crawlers write validated material
  prices into estimation price books (market-tagged rows).
- **Mapping** — `src/lib/map` (coordinates, layer queries, opening frame,
  Nominatim place search) and `src/components/map/GlobeMap.tsx`: MapLibre GL
  globe projection with OpenFreeMap vectors and AWS terrain tiles, no API key.
  MapLibre is imported on demand so non-map routes keep their bundle small.
- **Weather** — `src/lib/weather.ts` resolves OpenWeather (client-safe key via
  the `integration_keys_public` view) then keyless Open-Meteo, caches per
  coordinate for 30 minutes, and labels the seasonal estimate when both fail.
  Coordinates come from `src/lib/weather-locations.ts` by market.
- **Templates** — `src/lib/template-data.ts` stores calculator inputs (never
  results); `src/lib/templates-market.ts` derives per-market SEO pages and the
  hreflang family consumed by prerender and the sitemap.
- **Payments** — Paystack (default); `stripe-checkout` edge function for
  international cards, returns 501 until `STRIPE_SECRET_KEY` is set.

## Quality gates

CI on every push: eslint, tsc -b, vitest (6,600+ tests), Playwright E2E,
production build. Deploys only on green.

## Data model highlights

`market_profiles` (per-market config), `estimation_prices` (market-tagged
prices), `construction_terms` + versions (dictionary), `data_subject_requests`
(GDPR/CCPA intake), plus marketplace/pro-connect domain tables. RLS on every
table; admin-gated policies for management.

## Operations

Migrations run via the Supabase Management API (SQL over HTTPS) — see
[Runbook](RUNBOOK.md). Frontend deploys are automatic from `main`.
