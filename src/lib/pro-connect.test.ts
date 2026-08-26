import { describe, it, expect } from "vitest";
import { getCategoryFromCalculator, generateProSlug } from "./pro-connect";

describe("pro-connect", () => {
  it("getCategoryFromCalculator maps known calculators", () => {
    expect(getCategoryFromCalculator("paint")).toBe("painters");
    expect(getCategoryFromCalculator("painting")).toBe("painters");
    expect(getCategoryFromCalculator("tile")).toBe("tilers");
    expect(getCategoryFromCalculator("tiling")).toBe("tilers");
    expect(getCategoryFromCalculator("screeding")).toBe("wall-screeders");
    expect(getCategoryFromCalculator("pop")).toBe("pop-installers");
    expect(getCategoryFromCalculator("pop_ceiling")).toBe("pop-installers");
    expect(getCategoryFromCalculator("contractor")).toBe(
      "building-contractors",
    );
  });

  it("getCategoryFromCalculator returns null for unknown", () => {
    expect(getCategoryFromCalculator("unknown")).toBeNull();
    expect(getCategoryFromCalculator("")).toBeNull();
  });

  it("generateProSlug creates slug from name", () => {
    expect(generateProSlug("John Doe")).toBe("john-doe");
    expect(generateProSlug("  ACME  Builders  ")).toBe("acme-builders");
    expect(generateProSlug("Mike & Sons!")).toBe("mike-sons");
  });

  it("generateProSlug adds suffix for duplicates", () => {
    expect(generateProSlug("John Doe", ["john-doe"])).toBe("john-doe-2");
    expect(generateProSlug("John Doe", ["john-doe", "john-doe-2"])).toBe(
      "john-doe-3",
    );
  });

  it("generateProSlug returns base when no existing slugs", () => {
    expect(generateProSlug("Test Pro")).toBe("test-pro");
  });
});
