# Phase 3: price read cache, 2026-11-01 22:00

## Is a cache a good idea here

Yes, within limits, because the read pattern justifies it. A calculator page
asks for the same listing set repeatedly during one visit, and every ask costs
two round trips to Supabase (price rows, then material names). Caching removes
the repeats without touching a calculation.

It is only safe because prices are the one thing that must not go quietly
stale. So the cache carries four constraints:

1. **Scoped keys.** Market, city, material ids, window and limit are all in the
   key, sorted and normalised. Two different questions can never share an entry,
   and a US figure cannot be returned for an NG request.
2. **Short lifetime.** Five minutes on price rows.
3. **Write invalidation.** `createOrUpdatePrice` calls `invalidatePriceCache`
   after a successful insert, so an admin price edit is visible on the next
   read rather than on the next expiry.
4. **No resurrection.** A read that began before an invalidation is not allowed
   to repopulate the entry, so a slow in-flight query cannot put back prices
   that were just changed.

Plus: failures are never cached, concurrent duplicate reads collapse into one
in-flight load, and the result reports `cached` and `cache_age_ms` so any
surface that wants to say "as of a moment ago" can.

## What changed

- `src/lib/price-index/cache.ts` (new): `withPriceCache`, `invalidatePriceCache`,
  `priceCacheKey`, `priceCacheStats`, five minute TTL.
- `src/lib/price-index/queries.ts`: `fetchListings` now reads through the cache
  and returns `cached` and `cache_age_ms` alongside the listings. The uncached
  reader is kept private as `loadListings`.
- `src/lib/estimation/queries.ts`: `createOrUpdatePrice` invalidates on success.
- `src/lib/price-index/cache.test.ts` (new): 8 tests covering key stability,
  expiry, age reporting, invalidation, no-resurrection, duplicate collapsing
  and market separation.

1549 tests pass across price-index and estimation. Typecheck clean. Build clean.

## Deliberately not cached

Catalogue reads (`fetchCities`, `fetchIndexMaterials`) are cheap and almost
static; caching them would buy little and add another staleness surface.
History and submission reads stay direct, since they are per-material and
rarely repeated within a visit.
