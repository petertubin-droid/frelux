import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredConsent,
  shouldShowBanner,
  saveConsent,
  acceptAll,
  rejectAll,
  hasConsent,
  withdrawConsent,
  COOKIE_CATEGORIES,
} from "./cookie-consent";

describe("COOKIE_CATEGORIES", () => {
  it("has essential, analytics, and advertising", () => {
    const keys = COOKIE_CATEGORIES.map((c) => c.key);
    expect(keys).toContain("essential");
    expect(keys).toContain("analytics");
    expect(keys).toContain("advertising");
  });

  it("marks only essential as required", () => {
    const essential = COOKIE_CATEGORIES.find((c) => c.key === "essential");
    expect(essential?.required).toBe(true);
    const analytics = COOKIE_CATEGORIES.find((c) => c.key === "analytics");
    expect(analytics?.required).toBe(false);
  });
});

describe("cookie consent flow", () => {
  beforeEach(() => {
    localStorage.clear();
    withdrawConsent();
  });

  it("returns null when no consent stored", () => {
    expect(getStoredConsent()).toBeNull();
  });

  it("shows banner when no consent", () => {
    expect(shouldShowBanner()).toBe(true);
  });

  it("acceptAll grants all categories", () => {
    const consent = acceptAll();
    expect(consent.categories.essential).toBe(true);
    expect(consent.categories.analytics).toBe(true);
    expect(consent.categories.advertising).toBe(true);
  });

  it("rejectAll keeps only essential", () => {
    const consent = rejectAll();
    expect(consent.categories.essential).toBe(true);
    expect(consent.categories.analytics).toBe(false);
    expect(consent.categories.advertising).toBe(false);
  });

  it("saveConsent persists specific preferences", () => {
    saveConsent({ essential: true, analytics: false, advertising: true });
    const stored = getStoredConsent();
    expect(stored).not.toBeNull();
    expect(stored!.categories.essential).toBe(true);
    expect(stored!.categories.analytics).toBe(false);
    expect(stored!.categories.advertising).toBe(true);
  });

  it("hasConsent returns correct values after acceptAll", () => {
    acceptAll();
    expect(hasConsent("essential")).toBe(true);
    expect(hasConsent("analytics")).toBe(true);
    expect(hasConsent("advertising")).toBe(true);
  });

  it("hasConsent returns false for non-essential after rejectAll", () => {
    rejectAll();
    expect(hasConsent("essential")).toBe(true);
    expect(hasConsent("analytics")).toBe(false);
    expect(hasConsent("advertising")).toBe(false);
  });

  it("does not show banner after consent saved", () => {
    acceptAll();
    expect(shouldShowBanner()).toBe(false);
  });
});
