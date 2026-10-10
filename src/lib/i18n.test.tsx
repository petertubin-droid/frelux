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
