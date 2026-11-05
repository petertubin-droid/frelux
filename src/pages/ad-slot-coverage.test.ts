import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the ad slots that were missing on newer public pages.
 *
 * These surfaces went live without a slot: the two newest estimators, the quote
 * checker, the building type pages, and the supplier and professional directory
 * pages. Nothing in the app would have complained, so this test reads the page
 * files and fails if a slot disappears again.
 */

const PUBLIC_PAGES_WITH_A_SLOT = [
  "src/pages/WindowBlindsEstimator.tsx",
  "src/pages/BoreholeWaterSystemEstimator.tsx",
  "src/pages/QuoteCheck.tsx",
  "src/pages/BuildingTypes.tsx",
  "src/pages/BuildingTypeDetail.tsx",
  "src/pages/suppliers/SupplierDirectory.tsx",
  "src/pages/suppliers/SupplierProfilePage.tsx",
  "src/pages/pro-connect/ProConnectDirectory.tsx",
  "src/pages/pro-connect/ProConnectProfile.tsx",
  "src/pages/pro-connect/ProCategoryLocationPage.tsx",
];

/** Surfaces where an ad would be intrusive, wrong, or behind a paid plan. */
const NEVER_ADS = [
  "src/pages/pro-connect/Messages.tsx",
  "src/pages/procurement/ProcurementNew.tsx",
];

describe("ad slot coverage on public pages", () => {
  it("keeps a slot on every page that was missing one", () => {
    for (const path of PUBLIC_PAGES_WITH_A_SLOT) {
      const source = readFileSync(path, "utf8");
      expect(source.includes("<AdSlot"), path).toBe(true);
      expect(
        source.includes('from "@/components/ui/AdSlot"'),
        `${path} imports the slot`,
      ).toBe(true);
    }
  });

  it("stays inside the two unit ceiling per page", () => {
    for (const path of PUBLIC_PAGES_WITH_A_SLOT) {
      const source = readFileSync(path, "utf8");
      const slots = source.match(/<AdSlot/g) ?? [];
      expect(slots.length, path).toBeLessThanOrEqual(2);
    }
  });

  it("keeps app work surfaces free of ads", () => {
    for (const path of NEVER_ADS) {
      const source = readFileSync(path, "utf8");
      expect(source.includes("<AdSlot"), path).toBe(false);
    }
  });
});
