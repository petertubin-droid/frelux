import { readFileSync } from "node:fs";
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

describe("calculator route coverage", () => {
  // Read the router rather than a hand-kept list: a calculator page that is
  // added to App.tsx but not to the registry never received the wide view,
  // because Layout marks <main> from this function.
  const routes = Array.from(
    new Set(
      Array.from(
        readFileSync("src/App.tsx", "utf8").matchAll(/path="(\/[^"]*)"/g),
        (match) => match[1],
      ),
    ),
  );

  it("registers every estimator route in the router", () => {
    const estimators = routes.filter((path) => /-estimator$/.test(path));
    expect(estimators.length).toBeGreaterThan(5);
    const unregistered = estimators.filter((path) => !isCalculatorPath(path));
    expect(unregistered, unregistered.join(", ")).toEqual([]);
  });

  it("registers the bill of quantities studio", () => {
    expect(isCalculatorPath("/boq-studio")).toBe(true);
  });

  it("leaves catalogues, trackers, studios and quote pages alone", () => {
    for (const path of [
      "/",
      "/calculators",
      "/brand-studio",
      "/document-studio",
      "/quotes",
      "/quote/abc123",
      "/site-tracker",
      "/site-tracker/p1",
      "/diaspora-tracker",
      "/regional-cost-index",
    ]) {
      expect(isCalculatorPath(path), path).toBe(false);
    }
  });
});
