import { describe, it, expect } from "vitest";
import {
  useHeroContent,
  DEFAULT_HERO_CONTENT,
  invalidateHeroContentCache,
} from "./useHeroContent";

describe("useHeroContent", () => {
  it("exports DEFAULT_HERO_CONTENT with correct fields", () => {
    expect(DEFAULT_HERO_CONTENT.headline).toContain("Every trade");
    expect(DEFAULT_HERO_CONTENT.subheadline).toContain("market-verified");
    expect(DEFAULT_HERO_CONTENT.ctaPrimaryLabel).toBe("Start Estimating Free");
    expect(DEFAULT_HERO_CONTENT.ctaPrimaryHref).toBe("/construction-tools");
    expect(DEFAULT_HERO_CONTENT.ctaSecondaryLabel).toBe(
      "Try the AI Photo Estimator",
    );
    expect(DEFAULT_HERO_CONTENT.ctaSecondaryHref).toBe("/image-estimator");
  });

  it("useHeroContent is a function (hook)", () => {
    expect(typeof useHeroContent).toBe("function");
  });

  it("invalidateHeroContentCache is a function", () => {
    expect(typeof invalidateHeroContentCache).toBe("function");
  });
});
