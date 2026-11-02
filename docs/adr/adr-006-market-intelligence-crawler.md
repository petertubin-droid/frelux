# ADR-006: Market Intelligence Crawler Strategy

**Status:** Accepted  
**Date:** 2026-08-20

## Context

Frelux's pricing layer depends on current material prices from Nigerian building material markets. Prices fluctuate frequently and vary by region. Manual price entry doesn't scale, and scraping vendor websites is legally and technically fragile.

## Decision

Build a **resilient crawler adapter** (`src/lib/market-intelligence/crawler/`) that:

- Fetches pricing data from configured market sources
- Normalizes extracted data into a unified product schema (name, price, currency, market, unit)
- Derives currency from the target market automatically
- Tracks request counts to respect rate limits
- Stores results in Supabase for historical price tracking

The crawler is designed as an adapter pattern — new market sources can be added without modifying the core extraction logic.

## Consequences

- **Positive:** Material prices stay current without manual data entry. Historical price data enables trend analysis and market intelligence features. The adapter pattern makes adding new sources straightforward.
- **Negative:** Web scraping is inherently fragile — site layout changes break extractors. Rate limiting and anti-bot measures require ongoing maintenance. Legal review needed per source.
- **Mitigation:** The crawler fails gracefully (returns partial results), and the pricing layer falls back to last-known-good prices when fresh data is unavailable.

## Alternatives Considered

- **Manual price entry by admins:** Reliable but doesn't scale and introduces human error.
- **Third-party price API (e.g., a construction material API):** No comprehensive API exists for the Nigerian market. Most APIs cover US/EU pricing only.
- **User-reported prices (crowdsourced):** Useful as a supplementary signal but unreliable as the primary source without verification.
