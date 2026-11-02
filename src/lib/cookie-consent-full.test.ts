import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoredConsent,
  shouldShowBanner,
  saveConsent,
  acceptAll,
  rejectAll,
  hasConsent,
  withdrawConsent,
  COOKIE_CATEGORIES,
  CURRENT_VERSION,
  STORAGE_KEY,
} from "./cookie-consent";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("getStoredConsent", () => {
  it("returns null when no consent is stored", () => {
    expect(getStoredConsent()).toBeNull();
  });

  it("returns the stored consent when valid and not expired", () => {
    const consent = {
      version: CURRENT_VERSION,
      categories: { essential: true, analytics: true, advertising: false },
      timestamp: Date.now(),
      source: "banner" as const,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    const result = getStoredConsent();
    expect(result?.categories.analytics).toBe(true);
  });

  it("returns null when the version does not match", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 0,
        categories: {},
        timestamp: Date.now(),
        source: "banner",
      }),
    );
    expect(getStoredConsent()).toBeNull();
  });

  it("returns null when consent is older than 180 days", () => {
    const old = Date.now() - 181 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CURRENT_VERSION,
        categories: {},
        timestamp: old,
        source: "banner",
      }),
    );
    expect(getStoredConsent()).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getStoredConsent()).toBeNull();
  });
});

describe("shouldShowBanner", () => {
  it("returns true when no consent exists", () => {
    expect(shouldShowBanner()).toBe(true);
  });

  it("returns false when valid consent exists", () => {
    acceptAll();
    expect(shouldShowBanner()).toBe(false);
  });
});

describe("saveConsent", () => {
  it("always forces essential to true", () => {
    const result = saveConsent({
      essential: false,
      analytics: false,
      advertising: false,
    });
    expect(result.categories.essential).toBe(true);
  });

  it("persists to localStorage with the current version", () => {
    saveConsent({ essential: true, analytics: true, advertising: false });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(CURRENT_VERSION);
  });

  it("dispatches a custom event", () => {
    const handler = vi.fn();
    window.addEventListener("frelux:cookie-consent", handler);
    saveConsent({ essential: true, analytics: true, advertising: false });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("frelux:cookie-consent", handler);
  });
});

describe("acceptAll / rejectAll", () => {
  it("acceptAll enables every category", () => {
    const result = acceptAll();
    expect(result.categories.essential).toBe(true);
    expect(result.categories.analytics).toBe(true);
    expect(result.categories.advertising).toBe(true);
  });

  it("rejectAll keeps essential but disables the rest", () => {
    const result = rejectAll();
    expect(result.categories.essential).toBe(true);
    expect(result.categories.analytics).toBe(false);
    expect(result.categories.advertising).toBe(false);
  });
});

describe("hasConsent", () => {
  it("returns true for essential even without stored consent", () => {
    expect(hasConsent("essential")).toBe(true);
  });

  it("returns false for non-essential without stored consent", () => {
    expect(hasConsent("analytics")).toBe(false);
    expect(hasConsent("advertising")).toBe(false);
  });

  it("returns true for accepted categories after acceptAll", () => {
    acceptAll();
    expect(hasConsent("analytics")).toBe(true);
    expect(hasConsent("advertising")).toBe(true);
  });

  it("returns false for rejected categories after rejectAll", () => {
    rejectAll();
    expect(hasConsent("analytics")).toBe(false);
    expect(hasConsent("advertising")).toBe(false);
  });
});

describe("withdrawConsent", () => {
  it("removes the stored consent", () => {
    acceptAll();
    expect(getStoredConsent()).not.toBeNull();
    withdrawConsent();
    expect(getStoredConsent()).toBeNull();
  });

  it("dispatches a withdrawn event", () => {
    const handler = vi.fn();
    window.addEventListener("frelux:cookie-consent-withdrawn", handler);
    withdrawConsent();
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("frelux:cookie-consent-withdrawn", handler);
  });
});

describe("COOKIE_CATEGORIES", () => {
  it("defines three categories with the first being essential and required", () => {
    expect(COOKIE_CATEGORIES).toHaveLength(3);
    expect(COOKIE_CATEGORIES[0].key).toBe("essential");
    expect(COOKIE_CATEGORIES[0].required).toBe(true);
  });

  it("has exactly one required category", () => {
    expect(COOKIE_CATEGORIES.filter((c) => c.required).length).toBe(1);
  });

  it("gives every category a non-empty label and description", () => {
    for (const cat of COOKIE_CATEGORIES) {
      expect(cat.label).toBeTruthy();
      expect(cat.description).toBeTruthy();
    }
  });
});
