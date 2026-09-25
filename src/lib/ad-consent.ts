import {
  getStoredConsent,
  hasConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";

/**
 * Ad-serving consent gate — the Heartsyncx pattern applied to Frelux.
 *
 * Heartsyncx gates every ad on explicit cookie consent:
 *  - Nothing serves until the visitor has made an explicit consent choice
 *    (banner answered or set in settings). A first-time visitor sees no ads.
 *  - Google AdSense is allowed after ANY explicit choice: without the
 *    advertising category it requests Non-Personalized Ads (NPA) per
 *    Google policy.
 *  - Personalization-heavy networks (Monetag, Adsterra, and every other
 *    third-party ad network) require the `advertising` consent category.
 *
 * Frelux previously injected ad scripts without a consent gate — this
 * module is the single source of truth for that gate, consumed by AdSlot
 * (in-slot rendering), Layout (site-wide script injection) and the
 * Adsterra Direct Link renderer.
 *
 * Rewarded flows (monetag-rewarded / adsense-rewarded) are opt-in user
 * actions, not passive tracking; they keep their own gating.
 */

/** True once the visitor has answered the consent banner (either way). */
export function hasAnyConsentChoice(): boolean {
  return getStoredConsent() !== null;
}

/** The stored consent record, or null when the banner is unanswered. */
export function currentAdConsent(): CookieConsent | null {
  return getStoredConsent();
}

/** True when the visitor granted the advertising consent category. */
export function hasAdvertisingConsent(): boolean {
  return hasConsent("advertising");
}

/**
 * Whether a provider may serve ads to this visitor right now.
 *
 * - No explicit consent choice yet → nobody serves (GDPR: tracking
 *   scripts must not load before consent).
 * - google_adsense (and its media_net shim) → allowed after any explicit
 *   choice; the unit should be pushed with NPA when advertising is not
 *   granted (see shouldRequestNonPersonalizedAds).
 * - Every other network (monetag, adsterra, propellerads, ezoic, …) →
 *   requires the advertising category.
 */
export function canServeProviderAds(slug: string): boolean {
  if (!hasAnyConsentChoice()) return false;
  if (slug === "google_adsense" || slug === "media_net") return true;
  return hasAdvertisingConsent();
}

/**
 * True when an AdSense unit should be pushed with
 * requestNonPersonalizedAds: 1 (no advertising consent granted).
 */
export function shouldRequestNonPersonalizedAds(): boolean {
  return !hasAdvertisingConsent();
}

/** Event names dispatched when the visitor's consent changes. */
export const CONSENT_CHANGE_EVENTS = [
  "frelux:cookie-consent",
  "frelux:cookie-consent-withdrawn",
] as const;

/** Subscribe to consent changes (banner accept/reject, settings, withdraw). */
export function onConsentChange(cb: () => void): () => void {
  const handler = () => cb();
  CONSENT_CHANGE_EVENTS.forEach((e) => window.addEventListener(e, handler));
  return () => {
    CONSENT_CHANGE_EVENTS.forEach((e) =>
      window.removeEventListener(e, handler),
    );
  };
}
