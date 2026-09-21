# AD settings — Frelux ad system reference folder

Purpose: a single place where any agent (or human) can read the diagnosis of
Frelux's "ad slots only show in incognito" issue, and the Heartsyncx ad
structure code to apply when fixing or extending Frelux's ad settings.

## Contents

- `DIAGNOSIS.md` — why ad slots only show in incognito browsers (verified 2026-09-21)
- `heartsyncx-ad-structure/` — drop-in reference copies of Heartsyncx's ad code:
  - `AdPlacement.tsx` — consent-gated, honest-labeled ad slot component
  - `AdNetworkScripts.tsx` — lazy script injection for ad networks
  - `ConsentProvider.tsx` — GDPR consent categories (essential/analytics/advertising)

## How to apply the Heartsyncx structure to Frelux

Frelux's ad system is DB-driven (`ad_providers` + `ad_placements`, resolved by
`src/components/ui/AdSlot.tsx` via `src/lib/ad-config.ts`). To adopt the
Heartsyncx pattern:

1. Wrap the app (or AdSlot) in a consent gate: only resolve/render advertising
   slots when the `advertising` consent category is granted (see
   ConsentProvider.tsx). Frelux currently injects ad scripts without a consent
   gate — a GDPR gap Heartsyncx already solved.
2. Keep the "Advertisement" label on every rendered slot (both sites do this).
3. Reserve slot height to avoid layout shift when an ad fills (see AdPlacement.tsx).
4. Never render a fake or placeholder ad when no provider is configured
   (Frelux already resolves "none" honestly — keep that).
