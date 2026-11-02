import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hasAnyConsentChoice,
  hasAdvertisingConsent,
  canServeProviderAds,
  shouldRequestNonPersonalizedAds,
} from "@/lib/ad-consent";
import {
  saveConsent,
  withdrawConsent,
  STORAGE_KEY,
} from "@/lib/cookie-consent";

/**
 * Heartsyncx consent-gate pattern, applied to Frelux:
 *  - nothing serves before an explicit choice
 *  - AdSense serves after any choice (NPA without advertising consent)
 *  - other networks require the advertising category
 */

beforeEach(() => {
  localStorage.clear();
  withdrawConsent();
});

describe("ad-consent gate", () => {
  it("serves nothing while the banner is unanswered", () => {
    expect(hasAnyConsentChoice()).toBe(false);
    expect(canServeProviderAds("google_adsense")).toBe(false);
    expect(canServeProviderAds("monetag")).toBe(false);
    expect(canServeProviderAds("adsterra")).toBe(false);
  });

  it("allows AdSense after any explicit choice, requires advertising for others", () => {
    saveConsent(
      { essential: true, analytics: false, advertising: false },
      "banner",
    );
    expect(hasAnyConsentChoice()).toBe(true);
    expect(canServeProviderAds("google_adsense")).toBe(true);
    expect(canServeProviderAds("media_net")).toBe(true);
    expect(canServeProviderAds("monetag")).toBe(false);
    expect(canServeProviderAds("adsterra")).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
  });

  it("serves every network after accept-all", () => {
    saveConsent(
      { essential: true, analytics: true, advertising: true },
      "banner",
    );
    expect(canServeProviderAds("google_adsense")).toBe(true);
    expect(canServeProviderAds("monetag")).toBe(true);
    expect(canServeProviderAds("adsterra")).toBe(true);
    expect(canServeProviderAds("propellerads")).toBe(true);
    expect(hasAdvertisingConsent()).toBe(true);
  });

  it("requests NPA for AdSense exactly when advertising consent is absent", () => {
    saveConsent(
      { essential: true, analytics: false, advertising: false },
      "banner",
    );
    expect(shouldRequestNonPersonalizedAds()).toBe(true);
    saveConsent(
      { essential: true, analytics: true, advertising: true },
      "banner",
    );
    expect(shouldRequestNonPersonalizedAds()).toBe(false);
  });

  it("withdraw resets to the no-choice state", () => {
    saveConsent(
      { essential: true, analytics: true, advertising: true },
      "banner",
    );
    withdrawConsent();
    expect(hasAnyConsentChoice()).toBe(false);
    expect(canServeProviderAds("google_adsense")).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("consent change events fire the onConsentChange callback", () => {
    const cb = vi.fn();
    const off = onConsentChangeForTest(cb);
    saveConsent(
      { essential: true, analytics: true, advertising: true },
      "banner",
    );
    expect(cb).toHaveBeenCalled();
    off();
  });
});

// local import alias to keep the import list tidy above
import { onConsentChange as onConsentChangeForTest } from "@/lib/ad-consent";
