# ADR-005: Frelux Credits & Rewarded Access Model

**Status:** Accepted  
**Date:** 2026-08-25

## Context

Frelux offers premium features (advanced calculator, AI color assistant, AI learning assistant, premium reports) that need monetization beyond display ads. Users should be able to try premium features without paying, while power users and contractors need sustainable access.

## Decision

Implement a **dual-track access model**:

1. **Rewarded ads** — Users watch a video ad to unlock a premium feature for 24 hours. Configured per-feature via `rewarded_feature_config` with daily usage limits and cooldowns.
2. **Frelux Credits** — A virtual currency earned through ad engagement or purchased directly. Credits unlock features without ad viewing, appealing to power users.

Both systems use the same provider-agnostic ad infrastructure (ADR-002). The `rewarded_tool_config` table bridges individual tools to ad providers, while `rewarded_feature_config` handles feature-level configuration.

## Consequences

- **Positive:** Free users get real access to premium features via ads. Contractors can bypass ads with credits. Revenue flows from both ad impressions and credit purchases.
- **Negative:** Two monetization paths increase UI complexity — users must understand when they're earning credits vs. unlocking via ads. Postback handling for 6 offerwall providers adds operational overhead.
- **Security:** Postback endpoints verify provider signatures to prevent credit fraud. Client-hash identifies users without exposing auth tokens to ad networks.

## Alternatives Considered

- **Subscription only (SaaS model):** Predictable revenue but creates a hard paywall that limits adoption in the Nigerian construction market where subscription willingness is low.
- **Display ads only:** Lower friction but revenue per user is too low to sustain premium feature development.
- **One-time purchases (lifetime unlock):** Lifetime access undermines recurring revenue. Credits provide ongoing monetization.
