import { describe, it, expect } from "vitest";
import {
  useHeroContent,
  DEFAULT_HERO_CONTENT,
  invalidateHeroContentCache,
} from "./useHeroContent";

describe("useHeroContent", () => {
  it("exports DEFAULT_HERO_CONTENT with correct fields", () => {
    expect(DEFAULT_HERO_CONTENT.headline).toContain("Know Exactly");
    expect(DEFAULT_HERO_CONTENT.subheadline).toContain("FRELUX");
    expect(DEFAULT_HERO_CONTENT.ctaPrimaryLabel).toBe("Start Building");
    expect(DEFAULT_HERO_CONTENT.ctaPrimaryHref).toBe("/start-building");
    expect(DEFAULT_HERO_CONTENT.ctaSecondaryLabel).toBe("Explore Calculators");
    expect(DEFAULT_HERO_CONTENT.ctaSecondaryHref).toBe("/calculators");
  });

  it("useHeroContent is a function (hook)", () => {
    expect(typeof useHeroContent).toBe("function");
  });

  it("invalidateHeroContentCache is a function", () => {
    expect(typeof invalidateHeroContentCache).toBe("function");
  });
});
