# ADR-002: Provider-Agnostic Ad Management

**Status:** Accepted  
**Date:** 2026-08-03

## Context

Frelux monetizes through display ads and rewarded video ads. The ad landscape is fragmented across 30+ providers (Google AdSense, AdMob, Unity Ads, AppLovin, ironSource, etc.) with varying SDKs, credential formats, and placement rules. Hardcoding any single provider would lock the platform into one network's revenue terms.

## Decision

Build a **provider-agnostic ad management system** with two core tables:

- `ad_providers` — pluggable provider configs (credentials, priority, type)
- `ad_placements` — placement slots with ordered provider fallback chains

Providers are seeded but inactive by default. Admin activates providers from the admin panel without code changes. Each placement links to one or more providers via an ordered `provider_ids` array for automatic fallback.

## Consequences

- **Positive:** Adding a new ad network is a database row, not a code deploy. Fallback chains ensure ad coverage even if a provider goes down. Rewarded ads use the same architecture for feature unlocks.
- **Negative:** The abstraction layer adds indirection — debugging requires checking which provider is serving a placement. Ad unit IDs must be managed per-provider-per-placement.
- **Trade-off accepted:** Flexibility over simplicity. The admin panel complexity is justified by revenue diversification.

## Alternatives Considered

- **Single provider (AdSense only):** Simpler but locks into Google's revenue share and terms. No fallback if AdSense suspends the account.
- **Client-side mediation (Google Mobile Ads SDK):** SDK handles mediation but only within Google's network. Doesn't support web display ads or offerwall providers.
- **Third-party mediation (MoPub/FAN):** Adds another SDK layer with its own terms. Still doesn't unify web display + rewarded video.
