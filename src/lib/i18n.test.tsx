import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("i18n", () => {
  it("module exports something", async () => {
    const mod = await import("@/lib/i18n");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});

describe("hero translations (Track 4)", () => {
  it("every locale translates the default hero strings", async () => {
    const { translations, LANGUAGES } = await import("@/lib/i18n");
    const { DEFAULT_HERO_CONTENT } = await import("@/lib/useHeroContent");
    const keys = [
      DEFAULT_HERO_CONTENT.headline,
      DEFAULT_HERO_CONTENT.subheadline,
      DEFAULT_HERO_CONTENT.ctaPrimaryLabel,
      DEFAULT_HERO_CONTENT.ctaSecondaryLabel,
    ];
    for (const lang of LANGUAGES) {
      if (lang.value === "en") continue;
      const dict = translations[lang.value];
      for (const key of keys) {
        expect(dict[key], `${lang.value}: missing hero key`).toBeTruthy();
        expect(dict[key], `${lang.value}: untranslated copy`).not.toEqual(key);
      }
    }
  });
});

describe("nav chrome translations (i18n batch 2026-10-23)", () => {
  it("every locale translates the account dropdown, section labels and mobile bottom nav", async () => {
    const { translations, LANGUAGES } = await import("@/lib/i18n");
    const keys = [
      "Account",
      "Business",
      "Plan",
      "Saved Estimates & Projects",
      "My Job Listings",
      "My Products",
      "Contractor Workspace",
      "Analytics",
      "Brand Studio",
      "Rewards",
      "Home",
      "Tools",
      "Market",
      "Projects",
    ];
    for (const lang of LANGUAGES) {
      if (lang.value === "en") continue;
      const dict = translations[lang.value];
      for (const key of keys) {
        expect(
          dict[key],
          `${lang.value}: missing nav key "${key}"`,
        ).toBeTruthy();
        // Legitimate cognates (Spanish "Plan" IS the correct
        // translation of the Pricing-section label "Plan").
        const cognateOk =
          (lang.value === "es" && key === "Plan") ||
          (lang.value === "nl" && key === "Account");
        if (!cognateOk) {
          expect(
            dict[key],
            `${lang.value}: untranslated nav copy "${key}"`,
          ).not.toEqual(key);
        }
      }
    }
  });
});
