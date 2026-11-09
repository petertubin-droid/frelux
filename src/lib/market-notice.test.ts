import { describe, it, expect } from "vitest";
import { isCalculatorPath, CALCULATOR_ROUTES } from "@/lib/market-notice";

describe("market notice placement", () => {
  it("stays off the pages that market the product", () => {
    for (const path of ["/", "/about", "/pricing", "/rewards", "/learn"]) {
      expect(isCalculatorPath(path), path).toBe(false);
    }
  });

  it("stays off tool catalogues", () => {
    for (const path of ["/tools", "/tools/finishes", "/tools/structure/"]) {
      expect(isCalculatorPath(path), path).toBe(false);
    }
  });

  it("appears on the calculators the registry lists", () => {
    for (const path of [
      "/paint-calculator",
      "/smart-calculator",
      "/mathematical-plan-elevation",
      "/structural-calculator",
      "/image-estimator",
      "/build-to-roof-estimator",
    ]) {
      expect(isCalculatorPath(path), path).toBe(true);
    }
  });

  it("appears on tool pages beneath a category", () => {
    for (const path of [
      "/tools/finishes/paint",
      "/tools/structure/concrete",
      "/tools/ai/photo-estimator",
    ]) {
      expect(isCalculatorPath(path), path).toBe(true);
    }
  });

  it("stays off registry entries that only publish information", () => {
    for (const path of ["/material-prices", "/code-reference", "/field-sync"]) {
      expect(isCalculatorPath(path), path).toBe(false);
      expect(CALCULATOR_ROUTES.has(path)).toBe(false);
    }
  });

  it("resolves the query string, hash and trailing slash to the same page", () => {
    expect(isCalculatorPath("/paint-calculator?src=nav")).toBe(true);
    expect(isCalculatorPath("/paint-calculator/")).toBe(true);
    expect(isCalculatorPath("/rewards/#credits")).toBe(false);
  });
});
