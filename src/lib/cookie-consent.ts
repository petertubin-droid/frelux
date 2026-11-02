/**
 * Cookie Consent Engine, manages user consent state for cookies/tracking.
 *
 * Categories:
 *  - essential: always on (auth, preferences, security)
 *  - analytics: Google Analytics, web vitals
 *  - advertising: Google AdSense, Meta Pixel
 *
 * Consent is stored in localStorage as `frelux_cookie_consent` with a version
 * number. If the version changes (e.g. new categories added), the banner
 * re-appears so the user can re-consent.
 *
 * Re-prompt logic:
 *  - No stored consent → show banner
 *  - Stored consent older than 180 days → re-show
 *  - Version mismatch → re-show
 */

export type CookieCategory = "essential" | "analytics" | "advertising";

export interface CookieConsent {
  version: number;
  categories: Record<CookieCategory, boolean>;
  timestamp: number; // epoch ms
  source: "banner" | "implicit" | "settings";
}

const STORAGE_KEY = "frelux_cookie_consent";
const CURRENT_VERSION = 2;
const CONSENT_EXPIRY_DAYS = 180;
const CONSENT_EXPIRY_MS = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export const COOKIE_CATEGORIES: {
  key: CookieCategory;
  label: string;
  description: string;
  required: boolean;
}[] = [
  {
    key: "essential",
    label: "Essential",
    description:
      "Required for core site functionality, login, preferences, and security. Always on.",
    required: true,
  },
  {
    key: "analytics",
    label: "Analytics",
    description:
      "Help us understand how the site is used so we can improve it. Anonymous and aggregated.",
    required: false,
  },
  {
    key: "advertising",
    label: "Advertising",
    description:
      "Used to show relevant ads that keep our tools free. Controlled by our ad partners.",
    required: false,
  },
];

/** Read stored consent, or null if missing/expired/version-mismatched. */
export function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CookieConsent;

    // Version mismatch → treat as no consent
    if (parsed.version !== CURRENT_VERSION) return null;

    // Expired → treat as no consent
    if (Date.now() - parsed.timestamp > CONSENT_EXPIRY_MS) return null;

    return parsed;
  } catch {
    return null;
  }
}

/** Whether the banner should be shown based on stored consent. */
export function shouldShowBanner(): boolean {
  return getStoredConsent() === null;
}

/** Save consent to localStorage. */
export function saveConsent(
  categories: Record<CookieCategory, boolean>,
  source: CookieConsent["source"] = "banner",
): CookieConsent {
  const consent: CookieConsent = {
    version: CURRENT_VERSION,
    categories: {
      essential: true, // always
      analytics: categories.analytics,
      advertising: categories.advertising,
    },
    timestamp: Date.now(),
    source,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // localStorage might be unavailable (private mode), fail gracefully
  }

  // Dispatch a custom event so listeners (AnalyticsScripts, etc.) can react
  window.dispatchEvent(
    new CustomEvent("frelux:cookie-consent", { detail: consent }),
  );

  // Keep Google Consent Mode in step with the choice.
  applyGoogleConsent(consent.categories);

  return consent;
}

/** Accept all categories. */
export function acceptAll(
  source: CookieConsent["source"] = "banner",
): CookieConsent {
  return saveConsent(
    { essential: true, analytics: true, advertising: true },
    source,
  );
}

/** Reject all non-essential categories. */
export function rejectAll(
  source: CookieConsent["source"] = "banner",
): CookieConsent {
  return saveConsent(
    { essential: true, analytics: false, advertising: false },
    source,
  );
}

/** Check if a specific category is consented. */
export function hasConsent(category: CookieCategory): boolean {
  const consent = getStoredConsent();
  if (!consent) return category === "essential";
  return consent.categories[category] ?? false;
}

/** Google Consent Mode v2 signal names we map our categories onto. */
export type GoogleConsentState = {
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  analytics_storage: "granted" | "denied";
};

/** Translates our two optional categories into Google consent signals. */
export function googleConsentState(
  categories: Record<CookieCategory, boolean>,
): GoogleConsentState {
  const analytics = categories.analytics ? "granted" : "denied";
  const advertising = categories.advertising ? "granted" : "denied";
  return {
    ad_storage: advertising,
    ad_user_data: advertising,
    ad_personalization: advertising,
    analytics_storage: analytics,
  };
}

/**
 * Sends the visitor's current choice to gtag as a Consent Mode update.
 *
 * Safe to call at any time: before the tag loads it is a no-op, and when no
 * choice has been stored the signal stays denied. Called on every save, on
 * withdrawal, and once after the tag is injected so returning visitors do not
 * have to answer the banner again.
 */
export function applyGoogleConsent(
  categories?: Record<CookieCategory, boolean>,
): void {
  if (typeof window === "undefined") return;
  const tag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof tag !== "function") return;
  const resolved = categories ??
    getStoredConsent()?.categories ?? {
      essential: true,
      analytics: false,
      advertising: false,
    };
  tag("consent", "update", googleConsentState(resolved));
}

/** Withdraw consent, clears storage so banner reappears. */
export function withdrawConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("frelux:cookie-consent-withdrawn"));
  applyGoogleConsent({ essential: true, analytics: false, advertising: false });
}

export { STORAGE_KEY, CURRENT_VERSION, CONSENT_EXPIRY_DAYS };
