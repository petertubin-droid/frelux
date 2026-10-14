import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const TIER2_PAGES = [
  "DoorsWindowsEstimator.tsx",
  "ElectricalEstimator.tsx",
  "FlooringEstimator.tsx",
  "FoundationEstimator.tsx",
  "GeneratorEstimator.tsx",
  "PlumbingEstimator.tsx",
  "ReinforcementEstimator.tsx",
  "WaterproofingEstimator.tsx",
];

describe("Tier 2 Estimators Currency Localization Regression Suite", () => {
  for (const pageName of TIER2_PAGES) {
    const fullPath = path.resolve("src/pages", pageName);
    const content = fs.readFileSync(fullPath, "utf-8");

    describe(pageName, () => {
      it("derives currencyCode and currencySymbol from active market profile", () => {
        expect(content).toContain("useMarket();");
        expect(content).toMatch(/currencySymbol\s*=\s*market\?\.currencySymbol/);
        expect(content).toMatch(/currencyCode\s*=\s*market\?\.currencyCode/);
      });

      it("never hardcodes NGN when creating an estimate record", () => {
        // Must use currencyCode instead of hardcoded "NGN"
        expect(content).not.toMatch(/createEstimate\(\{\s*[\s\S]*?currency:\s*["']NGN["']/);
        expect(content).toMatch(/createEstimate\(\{\s*[\s\S]*?currency:\s*currencyCode/);
      });

      it("never hardcodes NGN in price_snapshot on line items", () => {
        expect(content).not.toMatch(/price_snapshot:\s*\{\s*base:[^,]+,\s*currency:\s*["']NGN["']/);
        expect(content).toMatch(/price_snapshot:\s*\{\s*base:[^,]+,\s*currency:\s*currencyCode/);
      });

      it("includes currencyCode in the save useCallback dependencies", () => {
        expect(content).toMatch(/const save = useCallback\([\s\S]*?\n\s*\}, \[[^\]]*currencyCode[^\]]*\]\);/);
      });

      it("passes currencySymbol to every formatCurrency call (no bare formatCurrency defaulting to ₦)", () => {
        // Matches formatCurrency calls without second argument: formatCurrency(foo)
        // Should not exist in the page
        const bareCalls = content.match(/formatCurrency\([^,)]+\)/g);
        expect(bareCalls, `Found unlocalized formatCurrency calls in ${pageName}`).toBeNull();
      });
    });
  }
});
