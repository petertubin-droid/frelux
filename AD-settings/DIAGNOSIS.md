# Why Frelux ad slots only show in incognito (diagnosis, 2026-09-21)

## What was verified in the code and DB (all healthy)

- RLS on the ad tables is correct: `ad_placements` has `public_read_ad_placements`
  (SELECT for anon + authenticated, qual true); `ad_providers` is admin-only and
  exposed safely through the `ad_providers_public` view; `ad_analytics_events`
  writes are public INSERT with admin-gated UPDATE/DELETE.
- `fetchAdConfig()` (src/lib/ad-config.ts) has only a 1-minute in-memory cache —
  no localStorage/sessionStorage gate that could differ between profiles.
- AdSlot renders do NOT depend on cookie consent in Frelux (ads are injected
  regardless of the consent banner decision) — so consent is NOT the cause.
- No service worker serves a cached UI bundle (only push/error listeners exist).
- `isPaid` defaults to false and comes from the DB paid-status table — it only
  hides ads for genuinely paid, logged-in users.

## Most likely causes, in order

1. **An ad-blocker / privacy extension in the normal browser profile.** Chrome
   disables extensions in Incognito by default, which is exactly the "works only
   in incognito" signature. Every Frelux network (AdSense, Adsterra, Monetag)
   is script-injected, so one blocker kills all slots in the normal profile.
   Check: chrome://extensions — is a blocker (uBlock, AdGuard, Brave shields)
   enabled, and is "Allow in Incognito" off for it? Visit a page, open DevTools
   console and look for blocked requests to pagead2.googlesyndication.com /
   adsterra / monetag hosts.
2. **Stale HTTP cache in the normal profile.** The normal profile may be
   serving an older bundle from before the ad system shipped. Hard refresh
   (Ctrl+Shift+R) or DevTools → Network → "Disable cache" + reload.
3. **Logged-in state differences** — if you are logged in as a paid/flagged user
   in the normal profile, AdSlot resolves "none" by design (paid users never
   see ads). Incognito = logged out = ads. Check Admin → user paid status.

## Quick tests

- Open the site in the normal profile with the blocker temporarily disabled —
  if slots appear, it is the extension.
- Compare DevTools console on both profiles: `window.adsbygoogle` should be an
  array and the Layout should log the AdSense script injection (ad-diagnostics).
