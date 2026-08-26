import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredConsent,
  acceptAll,
  rejectAll,
  saveConsent,
  withdrawConsent,
  shouldShowBanner,
  COOKIE_CATEGORIES,
  type CookieCategory,
} from "./cookie-consent";

describe("cookie-consent module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getStoredConsent", () => {
    it("returns null when no consent stored", () => {
      expect(getStoredConsent()).toBeNull();
    });

    it("returns stored consent object", () => {
      acceptAll("banner");
      const stored = getStoredConsent();
      expect(stored).toBeTruthy();
      expect(stored?.categories.analytics).toBe(true);
    });
  });

  describe("acceptAll", () => {
    it("enables all cookie categories", () => {
      const consent = acceptAll("settings");
      expect(consent.categories.essential).toBe(true);
      expect(consent.categories.analytics).toBe(true);
      expect(consent.categories.advertising).toBe(true);
      expect(consent.source).toBe("settings");
    });

    it("persists to localStorage", () => {
      acceptAll("banner");
      const raw = localStorage.getItem("frelux_cookie_consent");
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).categories.analytics).toBe(true);
    });

    it("sets version and timestamp", () => {
      const consent = acceptAll("banner");
      expect(consent.version).toBe(2);
      expect(consent.timestamp).toBeGreaterThan(0);
    });
  });

  describe("rejectAll", () => {
    it("disables non-essential cookies but keeps essential", () => {
      const consent = rejectAll("banner");
      expect(consent.categories.essential).toBe(true);
      expect(consent.categories.analytics).toBe(false);
      expect(consent.categories.advertising).toBe(false);
    });

    it("persists rejection", () => {
      rejectAll("banner");
      const stored = getStoredConsent();
      expect(stored?.categories.analytics).toBe(false);
      expect(stored?.categories.advertising).toBe(false);
    });
  });

  describe("saveConsent", () => {
    it("saves custom consent configuration", () => {
      const categories: Record<CookieCategory, boolean> = {
        essential: true,
        analytics: true,
        advertising: false,
      };
      const consent = saveConsent(categories, "settings");
      expect(consent.categories.analytics).toBe(true);
      expect(consent.categories.advertising).toBe(false);
    });

    it("always forces essential to true even if passed false", () => {
      const consent = saveConsent(
        { essential: false, analytics: false, advertising: false },
        "banner",
      );
      expect(consent.categories.essential).toBe(true);
    });
  });

  describe("withdrawConsent", () => {
    it("removes stored consent", () => {
      acceptAll("banner");
      expect(getStoredConsent()).not.toBeNull();
      withdrawConsent();
      expect(getStoredConsent()).toBeNull();
    });
  });

  describe("shouldShowBanner", () => {
    it("returns true when no consent stored", () => {
      expect(shouldShowBanner()).toBe(true);
    });

    it("returns false when consent exists", () => {
      acceptAll("banner");
      expect(shouldShowBanner()).toBe(false);
    });
  });

  describe("COOKIE_CATEGORIES", () => {
    it("has essential, analytics, advertising", () => {
      const keys = COOKIE_CATEGORIES.map((c) => c.key);
      expect(keys).toContain("essential");
      expect(keys).toContain("analytics");
      expect(keys).toContain("advertising");
    });

    it("essential is required", () => {
      const essential = COOKIE_CATEGORIES.find((c) => c.key === "essential");
      expect(essential?.required).toBe(true);
    });
  });
});
