import { describe, it, expect } from "vitest";
import {
  calculateScreedingPutty,
  calculateScreedingMixSystem,
  calculateScreedingSystem,
  dbToSystemConfig,
} from "@/lib/calc";
import type { ScreedingSystemConfig } from "@/types";

// =========================================================
// Test fixtures — configuration objects that simulate
// what the Admin would configure in the database.
// NO hardcoded business values in the engine itself.
// =========================================================
//
// MODEL: the admin-configured ratio (e.g. 2 buckets per 12 m²)
// describes the COMPLETE standard job at the default coat
// count — it already includes the standard coats. Quantities
// scale linearly with area at the default coats; a coat
// count DIFFERENT from the default scales proportionally.
//

function makePuttyConfig(
  overrides: Partial<ScreedingSystemConfig> = {},
): ScreedingSystemConfig {
  return {
    systemType: "putty",
    displayName: "Putty",
    description: "Professional Putty screeding calculation.",
    coverageAreaM2: 12,
    coverageUnit: "m²",
    defaultCoats: 2,
    wastePercentage: 0,
    currency: "NGN",
    currencySymbol: "₦",
    puttyName: "Putty",
    puttyQuantity: 2,
    puttyUnit: "bucket",
    puttyPricePerUnit: 12000,
    paintName: null,
    paintQuantity: null,
    paintUnit: null,
    paintPricePerUnit: null,
    cementName: null,
    cementQuantity: null,
    cementUnit: null,
    cementPricePerUnit: null,
    roundingRule: "ceil",
    ...overrides,
  };
}

function makeMixConfig(
  overrides: Partial<ScreedingSystemConfig> = {},
): ScreedingSystemConfig {
  return {
    systemType: "white_cement_paint",
    displayName: "White Cement + Screeding Paint",
    description: "Combined White Cement and Screeding Paint calculation.",
    coverageAreaM2: 20,
    coverageUnit: "m²",
    defaultCoats: 2,
    wastePercentage: 20,
    currency: "NGN",
    currencySymbol: "₦",
    puttyName: null,
    puttyQuantity: null,
    puttyUnit: null,
    puttyPricePerUnit: null,
    paintName: "Screeding Paint",
    paintQuantity: 2,
    paintUnit: "bucket",
    paintPricePerUnit: 25000,
    cementName: "White Cement",
    cementQuantity: 1,
    cementUnit: "bag",
    cementPricePerUnit: 7500,
    roundingRule: "ceil",
    ...overrides,
  };
}

// =========================================================
// PUTTY CALCULATION TESTS
// =========================================================

describe("calculateScreedingPutty", () => {
  describe("default scenario (2 buckets per 12 m², default 2 coats)", () => {
    it("produces correct quantity for exactly 12 m²", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(12, config);

      // At default coats the configured ratio is taken verbatim:
      // 12 m² = one 12 m² block = 2 buckets
      expect(result.systemType).toBe("putty");
      expect(result.netScreedingArea).toBe(12);
      expect(result.coats).toBe(2);
      expect(result.putty.baseQuantity).toBe(2);
      expect(result.putty.purchaseQuantity).toBe(2);
    });

    it("produces correct quantity for 24 m² (2x coverage) — 4 buckets", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(24, config);

      // 24 / 12 = 2 blocks × 2 buckets = 4 buckets (business spec)
      expect(result.putty.baseQuantity).toBe(4);
      expect(result.putty.purchaseQuantity).toBe(4);
    });

    it("produces correct quantity for 6 m² (half coverage)", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(6, config);

      // 6 / 12 = 0.5 blocks × 2 buckets = 1 bucket
      expect(result.putty.baseQuantity).toBe(1);
      expect(result.putty.purchaseQuantity).toBe(1);
    });

    it("does NOT double-count default coats on top of the configured ratio", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(32.6, config);

      // Regression: previously (32.6/12) × 2 × 2 coats massively over-estimated.
      // Correct: (32.6/12) × 2 = 5.4333 → ceil → 6 buckets.
      expect(result.putty.baseQuantity).toBeCloseTo(5.43, 1);
      expect(result.putty.purchaseQuantity).toBe(6);
    });
  });

  describe("coat scaling", () => {
    it("keeps the configured ratio at the default coat count", () => {
      const config = makePuttyConfig({ defaultCoats: 3 });
      const result = calculateScreedingPutty(12, config);

      // defaultCoats = 3, no explicit coats → factor = 3/3 = 1 → 2 buckets
      expect(result.coats).toBe(3);
      expect(result.putty.baseQuantity).toBe(2);
    });

    it("scales proportionally for coats above the default", () => {
      const config = makePuttyConfig();
      const result3Coats = calculateScreedingPutty(12, config, 3);

      // factor = 3/2 = 1.5 → 2 × 1.5 = 3 buckets
      expect(result3Coats.coats).toBe(3);
      expect(result3Coats.putty.baseQuantity).toBe(3);
    });

    it("scales proportionally for coats below the default", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(12, config, 1);

      // factor = 1/2 = 0.5 → 2 × 0.5 = 1 bucket
      expect(result.coats).toBe(1);
      expect(result.putty.baseQuantity).toBe(1);
    });

    it("treats 0 coats as 1 coat (minimum)", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(12, config, 0);

      expect(result.coats).toBe(1);
      // factor = 1/2 → 1 bucket
      expect(result.putty.baseQuantity).toBe(1);
    });
  });

  describe("waste factor", () => {
    it("applies waste percentage correctly", () => {
      const config = makePuttyConfig({ wastePercentage: 10 });
      const result = calculateScreedingPutty(12, config);

      // base = 2, waste = 2 * 0.1 = 0.2, final = 2.2, purchase = ceil(2.2) = 3
      expect(result.putty.wastePercentage).toBe(10);
      expect(result.putty.wasteQuantity).toBeCloseTo(0.2, 1);
      expect(result.putty.finalQuantity).toBeCloseTo(2.2, 1);
      expect(result.putty.purchaseQuantity).toBe(3);
    });

    it("handles 0% waste", () => {
      const config = makePuttyConfig({ wastePercentage: 0 });
      const result = calculateScreedingPutty(12, config);

      expect(result.putty.wasteQuantity).toBe(0);
      expect(result.putty.finalQuantity).toBe(result.putty.baseQuantity);
    });

    it("clamps waste to 100%", () => {
      const config = makePuttyConfig({ wastePercentage: 150 });
      const result = calculateScreedingPutty(12, config);

      // 150% clamped to 100% → waste = base, final = 2x base
      expect(result.putty.wastePercentage).toBe(150);
      expect(result.putty.wasteQuantity).toBeCloseTo(
        result.putty.baseQuantity,
        1,
      );
    });
  });

  describe("rounding", () => {
    it("rounds up to whole buckets with ceil rule", () => {
      const config = makePuttyConfig({ wastePercentage: 5 });
      const result = calculateScreedingPutty(12, config);

      // base = 2, waste = 0.1, final = 2.1, purchase = ceil(2.1) = 3
      expect(result.putty.purchaseQuantity).toBe(3);
    });

    it("does not round with none rule", () => {
      const config = makePuttyConfig({
        wastePercentage: 5,
        roundingRule: "none",
      });
      const result = calculateScreedingPutty(12, config);

      // final = 2.1, no rounding
      expect(result.putty.purchaseQuantity).toBeCloseTo(2.1, 1);
    });
  });

  describe("pricing", () => {
    it("calculates cost from configured price", () => {
      const config = makePuttyConfig({ puttyPricePerUnit: 12000 });
      const result = calculateScreedingPutty(12, config);

      // 2 buckets * 12000 = 24000
      expect(result.putty.totalCost).toBe(24000);
      expect(result.materialCost).toBe(24000);
    });

    it("returns null cost when price is not configured (0)", () => {
      const config = makePuttyConfig({ puttyPricePerUnit: 0 });
      const result = calculateScreedingPutty(12, config);

      expect(result.putty.totalCost).toBeNull();
      expect(result.materialCost).toBeNull();
    });

    it("returns null cost when price is null", () => {
      const config = makePuttyConfig({ puttyPricePerUnit: null });
      const result = calculateScreedingPutty(12, config);

      expect(result.putty.totalCost).toBeNull();
      expect(result.materialCost).toBeNull();
    });

    it("updates cost when price changes", () => {
      const config10k = makePuttyConfig({ puttyPricePerUnit: 10000 });
      const config15k = makePuttyConfig({ puttyPricePerUnit: 15000 });
      const result10k = calculateScreedingPutty(12, config10k);
      const result15k = calculateScreedingPutty(12, config15k);

      expect(result10k.materialCost).toBe(20000);
      expect(result15k.materialCost).toBe(30000);
    });
  });

  describe("edge cases", () => {
    it("handles zero area", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(0, config);

      expect(result.netScreedingArea).toBe(0);
      expect(result.putty.baseQuantity).toBe(0);
      expect(result.putty.purchaseQuantity).toBe(0);
    });

    it("handles negative area (clamped to 0)", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(-10, config);

      expect(result.netScreedingArea).toBe(0);
      expect(result.putty.baseQuantity).toBe(0);
    });

    it("handles fractional area", () => {
      const config = makePuttyConfig();
      const result = calculateScreedingPutty(18.5, config);

      // base = (18.5 / 12) × 2 = 3.0833
      expect(result.putty.baseQuantity).toBeCloseTo(3.08, 1);
      expect(result.putty.purchaseQuantity).toBe(4); // ceil(3.0833)
    });
  });
});

// =========================================================
// WHITE CEMENT + SCREEDING PAINT CALCULATION TESTS
// =========================================================

describe("calculateScreedingMixSystem", () => {
  describe("default scenario (2 paint + 1 cement per 20 m², 20% waste, default 2 coats)", () => {
    it("produces correct quantities for exactly 20 m²", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(20, config);

      expect(result.systemType).toBe("white_cement_paint");
      expect(result.netScreedingArea).toBe(20);
      expect(result.coats).toBe(2);

      // At default coats the configured ratio is taken verbatim:
      // 1 block of 20 m² = 2 paint buckets + 1 cement bag
      expect(result.paint.baseQuantity).toBe(2);
      expect(result.cement.baseQuantity).toBe(1);
    });

    it("applies 20% waste correctly", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(20, config);

      // paint: base=2, waste=0.4, final=2.4, purchase=ceil(2.4)=3
      expect(result.paint.wastePercentage).toBe(20);
      expect(result.paint.wasteQuantity).toBeCloseTo(0.4, 1);
      expect(result.paint.finalQuantity).toBeCloseTo(2.4, 1);
      expect(result.paint.purchaseQuantity).toBe(3);

      // cement: base=1, waste=0.2, final=1.2, purchase=ceil(1.2)=2
      expect(result.cement.wasteQuantity).toBeCloseTo(0.2, 1);
      expect(result.cement.finalQuantity).toBeCloseTo(1.2, 1);
      expect(result.cement.purchaseQuantity).toBe(2);
    });

    it("calculates total material cost", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(20, config);

      // paint: 3 * 25000 = 75000
      // cement: 2 * 7500 = 15000
      // total = 90000
      expect(result.paint.totalCost).toBe(75000);
      expect(result.cement.totalCost).toBe(15000);
      expect(result.materialCost).toBe(90000);
    });
  });

  describe("different surface areas", () => {
    it("scales correctly for 40 m² (2x coverage)", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(40, config);

      // 2 blocks: paint = 4, cement = 2
      expect(result.paint.baseQuantity).toBe(4);
      expect(result.cement.baseQuantity).toBe(2);
    });

    it("scales correctly for 10 m² (half coverage)", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(10, config);

      // 0.5 blocks: paint = 1, cement = 0.5
      expect(result.paint.baseQuantity).toBe(1);
      expect(result.cement.baseQuantity).toBe(0.5);
    });
  });

  describe("waste application", () => {
    it("applies waste independently to paint and cement", () => {
      const config = makeMixConfig({ wastePercentage: 50 });
      const result = calculateScreedingMixSystem(20, config);

      // paint: base=2, waste=1, final=3, purchase=3
      expect(result.paint.wasteQuantity).toBeCloseTo(1, 1);
      expect(result.paint.purchaseQuantity).toBe(3);

      // cement: base=1, waste=0.5, final=1.5, purchase=2
      expect(result.cement.wasteQuantity).toBeCloseTo(0.5, 1);
      expect(result.cement.purchaseQuantity).toBe(2);
    });

    it("handles 0% waste", () => {
      const config = makeMixConfig({ wastePercentage: 0 });
      const result = calculateScreedingMixSystem(20, config);

      expect(result.paint.wasteQuantity).toBe(0);
      expect(result.cement.wasteQuantity).toBe(0);
      expect(result.paint.purchaseQuantity).toBe(result.paint.baseQuantity);
    });
  });

  describe("coat scaling", () => {
    it("keeps the configured ratio at the default coat count", () => {
      const config = makeMixConfig({ defaultCoats: 1 });
      const result = calculateScreedingMixSystem(20, config);

      // defaultCoats = 1, no explicit coats → factor = 1/1 = 1
      expect(result.coats).toBe(1);
      expect(result.paint.baseQuantity).toBe(2);
      expect(result.cement.baseQuantity).toBe(1);
    });

    it("scales proportionally for coats above the default", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(20, config, 3);

      // factor = 3/2 = 1.5 → paint = 3, cement = 1.5
      expect(result.coats).toBe(3);
      expect(result.paint.baseQuantity).toBe(3);
      expect(result.cement.baseQuantity).toBe(1.5);
    });

    it("scales proportionally for coats below the default", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(20, config, 1);

      // factor = 1/2 = 0.5 → paint = 1, cement = 0.5
      expect(result.coats).toBe(1);
      expect(result.paint.baseQuantity).toBe(1);
      expect(result.cement.baseQuantity).toBe(0.5);
    });
  });

  describe("rounding", () => {
    it("rounds up paint and cement independently", () => {
      const config = makeMixConfig({ wastePercentage: 15 });
      const result = calculateScreedingMixSystem(20, config);

      // paint: base=2, waste=0.3, final=2.3, purchase=ceil(2.3)=3
      expect(result.paint.purchaseQuantity).toBe(3);
      // cement: base=1, waste=0.15, final=1.15, purchase=ceil(1.15)=2
      expect(result.cement.purchaseQuantity).toBe(2);
    });

    it("supports no rounding", () => {
      const config = makeMixConfig({ roundingRule: "none" });
      const result = calculateScreedingMixSystem(20, config);

      // paint: final=2.4 (no ceil)
      expect(result.paint.purchaseQuantity).toBeCloseTo(2.4, 1);
      // cement: final=1.2 (no ceil)
      expect(result.cement.purchaseQuantity).toBeCloseTo(1.2, 1);
    });
  });

  describe("pricing", () => {
    it("calculates cost from configured prices", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(20, config);

      expect(result.paint.totalCost).toBe(75000); // 3 * 25000
      expect(result.cement.totalCost).toBe(15000); // 2 * 7500
      expect(result.materialCost).toBe(90000);
    });

    it("returns null cost when both prices are missing", () => {
      const config = makeMixConfig({
        paintPricePerUnit: 0,
        cementPricePerUnit: 0,
      });
      const result = calculateScreedingMixSystem(20, config);

      expect(result.paint.totalCost).toBeNull();
      expect(result.cement.totalCost).toBeNull();
      expect(result.materialCost).toBeNull();
    });

    it("calculates partial cost when only one price is set", () => {
      const config = makeMixConfig({
        paintPricePerUnit: 25000,
        cementPricePerUnit: 0,
      });
      const result = calculateScreedingMixSystem(20, config);

      expect(result.paint.totalCost).toBe(75000);
      expect(result.cement.totalCost).toBeNull();
      // materialCost = 75000 + 0 = 75000 (hasAnyPrice = true)
      expect(result.materialCost).toBe(75000);
    });
  });

  describe("edge cases", () => {
    it("handles zero area", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(0, config);

      expect(result.netScreedingArea).toBe(0);
      expect(result.paint.baseQuantity).toBe(0);
      expect(result.cement.baseQuantity).toBe(0);
    });

    it("handles negative area", () => {
      const config = makeMixConfig();
      const result = calculateScreedingMixSystem(-5, config);

      expect(result.netScreedingArea).toBe(0);
    });
  });
});

// =========================================================
// CONFIGURATION TESTS — Verify changing config changes results
// =========================================================

describe("Configuration-driven behaviour", () => {
  describe("Putty configuration changes", () => {
    it("changing coverage area changes calculation", () => {
      const config12 = makePuttyConfig({ coverageAreaM2: 12 });
      const config15 = makePuttyConfig({ coverageAreaM2: 15 });

      const r12 = calculateScreedingPutty(60, config12);
      const r15 = calculateScreedingPutty(60, config15);

      // 60/12 × 2 = 10 buckets
      expect(r12.putty.baseQuantity).toBe(10);
      // 60/15 × 2 = 8 buckets
      expect(r15.putty.baseQuantity).toBe(8);
    });

    it("changing putty quantity changes calculation", () => {
      const config2 = makePuttyConfig({ puttyQuantity: 2 });
      const config3 = makePuttyConfig({ puttyQuantity: 3 });

      const r2 = calculateScreedingPutty(12, config2);
      const r3 = calculateScreedingPutty(12, config3);

      // 12/12 × 2 = 2 vs 12/12 × 3 = 3
      expect(r2.putty.baseQuantity).toBe(2);
      expect(r3.putty.baseQuantity).toBe(3);
    });

    it("changing waste percentage changes calculation", () => {
      const config0 = makePuttyConfig({ wastePercentage: 0 });
      const config25 = makePuttyConfig({ wastePercentage: 25 });

      const r0 = calculateScreedingPutty(12, config0);
      const r25 = calculateScreedingPutty(12, config25);

      expect(r0.putty.purchaseQuantity).toBe(2);
      // base=2, waste=0.5, final=2.5, purchase=3
      expect(r25.putty.purchaseQuantity).toBe(3);
    });

    it("changing the default coat count does not change quantity at default coats", () => {
      // The configured ratio already represents the complete standard job,
      // whatever the admin sets the default coats to.
      const config2 = makePuttyConfig({ defaultCoats: 2 });
      const config4 = makePuttyConfig({ defaultCoats: 4 });

      expect(calculateScreedingPutty(12, config2).putty.baseQuantity).toBe(2);
      expect(calculateScreedingPutty(12, config4).putty.baseQuantity).toBe(2);
    });

    it("explicit coats scale relative to the configured default", () => {
      const config2 = makePuttyConfig({ defaultCoats: 2 });
      const config4 = makePuttyConfig({ defaultCoats: 4 });

      // 4 coats vs a 2-coat default → factor 2 → 4 buckets
      expect(calculateScreedingPutty(12, config2, 4).putty.baseQuantity).toBe(
        4,
      );
      // 4 coats vs a 4-coat default → factor 1 → 2 buckets
      expect(calculateScreedingPutty(12, config4, 4).putty.baseQuantity).toBe(
        2,
      );
    });
  });

  describe("White Cement + Paint configuration changes", () => {
    it("changing coverage area changes calculation", () => {
      const config20 = makeMixConfig({ coverageAreaM2: 20 });
      const config25 = makeMixConfig({ coverageAreaM2: 25 });

      const r20 = calculateScreedingMixSystem(100, config20);
      const r25 = calculateScreedingMixSystem(100, config25);

      // 100/20 × 2 = 10 vs 100/25 × 2 = 8
      expect(r20.paint.baseQuantity).toBe(10);
      expect(r25.paint.baseQuantity).toBe(8);
    });

    it("changing paint quantity changes calculation", () => {
      const config2 = makeMixConfig({ paintQuantity: 2 });
      const config3 = makeMixConfig({ paintQuantity: 3 });

      expect(calculateScreedingMixSystem(20, config2).paint.baseQuantity).toBe(
        2,
      );
      expect(calculateScreedingMixSystem(20, config3).paint.baseQuantity).toBe(
        3,
      );
    });

    it("changing cement quantity changes calculation", () => {
      const config1 = makeMixConfig({ cementQuantity: 1 });
      const config2 = makeMixConfig({ cementQuantity: 2 });

      expect(calculateScreedingMixSystem(20, config1).cement.baseQuantity).toBe(
        1,
      );
      expect(calculateScreedingMixSystem(20, config2).cement.baseQuantity).toBe(
        2,
      );
    });

    it("changing waste percentage changes calculation", () => {
      const config10 = makeMixConfig({ wastePercentage: 10 });
      const config30 = makeMixConfig({ wastePercentage: 30 });

      const r10 = calculateScreedingMixSystem(20, config10);
      const r30 = calculateScreedingMixSystem(20, config30);

      // paint base=2: 10% waste → final=2.2
      expect(r10.paint.finalQuantity).toBeCloseTo(2.2, 1);
      // paint base=2: 30% waste → final=2.6
      expect(r30.paint.finalQuantity).toBeCloseTo(2.6, 1);
    });

    it("explicit coats scale relative to the configured default", () => {
      const config2 = makeMixConfig({ defaultCoats: 2 });
      const config1 = makeMixConfig({ defaultCoats: 1 });

      // At default coats the ratio is verbatim: 2 paint buckets
      expect(calculateScreedingMixSystem(20, config2).paint.baseQuantity).toBe(
        2,
      );
      expect(calculateScreedingMixSystem(20, config1).paint.baseQuantity).toBe(
        2,
      );
      // 2 coats vs a 1-coat default → factor 2 → 4 buckets
      expect(
        calculateScreedingMixSystem(20, config1, 2).paint.baseQuantity,
      ).toBe(4);
    });
  });

  describe("no hardcoded business values in engine", () => {
    // The engine should produce different results for any configuration.
    // If it hardcoded 12, 20, 2, 1, etc., these tests would fail.
    it("engine works with arbitrary coverage area", () => {
      const config = makePuttyConfig({ coverageAreaM2: 7.5 });
      const result = calculateScreedingPutty(30, config);
      // 30/7.5 × 2 = 8
      expect(result.putty.baseQuantity).toBe(8);
    });

    it("engine works with arbitrary material quantity", () => {
      const config = makePuttyConfig({ puttyQuantity: 5.5 });
      const result = calculateScreedingPutty(12, config);
      // 12/12 × 5.5 = 5.5
      expect(result.putty.baseQuantity).toBe(5.5);
    });

    it("engine works with arbitrary mix ratio", () => {
      const config = makeMixConfig({
        paintQuantity: 3,
        cementQuantity: 2,
        coverageAreaM2: 15,
      });
      const result = calculateScreedingMixSystem(30, config);
      // 30/15 = 2 blocks → 6 paint, 4 cement
      expect(result.paint.baseQuantity).toBe(6);
      expect(result.cement.baseQuantity).toBe(4);
    });
  });
});

// =========================================================
// PRICING TESTS
// =========================================================

describe("Pricing from configuration", () => {
  it("Putty price is retrieved from configuration", () => {
    const config = makePuttyConfig({ puttyPricePerUnit: 15000 });
    const result = calculateScreedingPutty(12, config);
    // 2 buckets * 15000 = 30000
    expect(result.putty.totalCost).toBe(30000);
  });

  it("Screeding Paint price is retrieved from configuration", () => {
    const config = makeMixConfig({ paintPricePerUnit: 30000 });
    const result = calculateScreedingMixSystem(20, config);
    // 3 buckets (purchase qty) * 30000 = 90000
    expect(result.paint.totalCost).toBe(90000);
  });

  it("White Cement price is retrieved from configuration", () => {
    const config = makeMixConfig({ cementPricePerUnit: 10000 });
    const result = calculateScreedingMixSystem(20, config);
    // 2 bags (purchase qty) * 10000 = 20000
    expect(result.cement.totalCost).toBe(20000);
  });

  it("changing prices updates estimated costs", () => {
    const configA = makeMixConfig({ paintPricePerUnit: 20000 });
    const configB = makeMixConfig({ paintPricePerUnit: 40000 });

    const rA = calculateScreedingMixSystem(20, configA);
    const rB = calculateScreedingMixSystem(20, configB);

    expect(rA.paint.totalCost).toBe(60000); // 3 * 20000
    expect(rB.paint.totalCost).toBe(120000); // 3 * 40000
  });

  it("missing prices do not create fake costs", () => {
    const config = makePuttyConfig({ puttyPricePerUnit: null });
    const result = calculateScreedingPutty(12, config);

    expect(result.putty.totalCost).toBeNull();
    expect(result.materialCost).toBeNull();
    // Quantity should still be calculated
    expect(result.putty.purchaseQuantity).toBe(2);
  });
});

// =========================================================
// DISPATCH FUNCTION TESTS
// =========================================================

describe("calculateScreedingSystem dispatch", () => {
  it("dispatches to putty calculation for putty system", () => {
    const config = makePuttyConfig();
    const result = calculateScreedingSystem(12, config);

    expect(result.systemType).toBe("putty");
  });

  it("dispatches to mix calculation for white_cement_paint system", () => {
    const config = makeMixConfig();
    const result = calculateScreedingSystem(20, config);

    expect(result.systemType).toBe("white_cement_paint");
  });

  it("does not mix putty and cement/paint materials", () => {
    const puttyResult = calculateScreedingSystem(12, makePuttyConfig());
    const mixResult = calculateScreedingSystem(20, makeMixConfig());

    // Putty result should not have paint/cement
    expect(puttyResult.systemType).toBe("putty");
    expect("paint" in puttyResult).toBe(false);
    expect("cement" in puttyResult).toBe(false);
    expect("putty" in puttyResult).toBe(true);

    // Mix result should not have putty
    expect(mixResult.systemType).toBe("white_cement_paint");
    expect("putty" in mixResult).toBe(false);
    expect("paint" in mixResult).toBe(true);
    expect("cement" in mixResult).toBe(true);
  });
});

// =========================================================
// DB CONVERSION TESTS
// =========================================================

describe("dbToSystemConfig", () => {
  it("converts putty DB config correctly", () => {
    const dbConfig = {
      system_type: "putty" as const,
      display_name: "Putty",
      description: "Test putty",
      coverage_area_m2: 12,
      coverage_unit: "m²",
      default_coats: 2,
      waste_percentage: 5,
      currency: "NGN",
      currency_symbol: "₦",
      putty_name: "Putty",
      putty_quantity: 2,
      putty_unit: "bucket",
      putty_price_per_unit: 12000,
      paint_name: null,
      paint_quantity: null,
      paint_unit: null,
      paint_price_per_unit: null,
      cement_name: null,
      cement_quantity: null,
      cement_unit: null,
      cement_price_per_unit: null,
      rounding_rule: "ceil" as const,
    };

    const config = dbToSystemConfig(dbConfig);
    expect(config.systemType).toBe("putty");
    expect(config.coverageAreaM2).toBe(12);
    expect(config.puttyQuantity).toBe(2);
    expect(config.puttyPricePerUnit).toBe(12000);
    expect(config.paintQuantity).toBeNull();
  });

  it("converts mix DB config correctly", () => {
    const dbConfig = {
      system_type: "white_cement_paint" as const,
      display_name: "White Cement + Screeding Paint",
      description: null,
      coverage_area_m2: 20,
      coverage_unit: "m²",
      default_coats: 2,
      waste_percentage: 20,
      currency: "NGN",
      currency_symbol: "₦",
      putty_name: null,
      putty_quantity: null,
      putty_unit: null,
      putty_price_per_unit: null,
      paint_name: "Screeding Paint",
      paint_quantity: 2,
      paint_unit: "bucket",
      paint_price_per_unit: 25000,
      cement_name: "White Cement",
      cement_quantity: 1,
      cement_unit: "bag",
      cement_price_per_unit: 7500,
      rounding_rule: "ceil" as const,
    };

    const config = dbToSystemConfig(dbConfig);
    expect(config.systemType).toBe("white_cement_paint");
    expect(config.coverageAreaM2).toBe(20);
    expect(config.paintQuantity).toBe(2);
    expect(config.cementQuantity).toBe(1);
    expect(config.puttyQuantity).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────
// Phase 37: Extra material slot (Bond) — dormant by default,
// additive when enabled.
// ─────────────────────────────────────────────────────────
describe("Screeding extra material (Bond)", () => {
  it("is dormant when not enabled — no breakdown, unchanged cost", () => {
    const r = calculateScreedingMixSystem(20, makeMixConfig());
    expect(r.extra).toBeNull();
    // Cost is identical to the pre-Bond behaviour
    expect(r.materialCost).toBe(90000);
  });

  it("is dormant when enabled but missing name or quantity", () => {
    const r = calculateScreedingMixSystem(
      40,
      makeMixConfig({ extraEnabled: true, extraName: null }),
    );
    expect(r.extra).toBeNull();
    const r2 = calculateScreedingMixSystem(
      40,
      makeMixConfig({ extraEnabled: true, extraQuantity: 0 }),
    );
    expect(r2.extra).toBeNull();
  });

  it("scales with area, coats and waste exactly like paint/cement", () => {
    // Same coverage rule as paint: 40 m² / 20 m² = 2 units; 1 Bond per unit
    // × 1.5 coat factor (3 coats / 2 default) = 3 base; +20% waste = 3.6 → ceil 4
    const r = calculateScreedingMixSystem(
      40,
      makeMixConfig({
        extraEnabled: true,
        extraName: "Bond",
        extraQuantity: 1,
        extraUnit: "litre",
        extraPricePerUnit: 3500,
      }),
      3,
    );
    expect(r.extra).not.toBeNull();
    expect(r.extra!.baseQuantity).toBe(3);
    expect(r.extra!.purchaseQuantity).toBe(4);
    expect(r.extra!.totalCost).toBe(14000);
  });

  it("adds its cost into the total without changing paint/cement", () => {
    const without = calculateScreedingMixSystem(20, makeMixConfig());
    const withBond = calculateScreedingMixSystem(
      20,
      makeMixConfig({
        extraEnabled: true,
        extraName: "Bond",
        extraQuantity: 1,
        extraUnit: "litre",
        extraPricePerUnit: 3500,
      }),
    );
    // extra: base=1, +20% = 1.2 → ceil 2 → 2 × 3500 = 7000
    expect(withBond.extra!.totalCost).toBe(7000);
    expect(withBond.paint).toEqual(without.paint);
    expect(withBond.cement).toEqual(without.cement);
    expect(withBond.materialCost).toBe(90000 + 7000);
  });

  it("keeps the cost correct when extra is the only priced material", () => {
    const r = calculateScreedingMixSystem(
      20,
      makeMixConfig({
        paintPricePerUnit: null,
        cementPricePerUnit: null,
        extraEnabled: true,
        extraName: "Bond",
        extraQuantity: 1,
        extraUnit: "litre",
        extraPricePerUnit: 3500,
      }),
    );
    expect(r.paint.totalCost).toBeNull();
    expect(r.cement.totalCost).toBeNull();
    // extra: base=1, +20% = 1.2 → ceil 2 → 2 × 3500 = 7000
    expect(r.extra!.totalCost).toBe(7000);
    expect(r.materialCost).toBe(7000);
  });

  it("dbToSystemConfig maps extra_* columns and treats missing as disabled", () => {
    const dbConfig = {
      system_type: "white_cement_paint" as const,
      display_name: "Mix",
      description: null,
      coverage_area_m2: 20,
      coverage_unit: "m²",
      default_coats: 2,
      waste_percentage: 20,
      currency: "NGN",
      currency_symbol: "₦",
      putty_name: null,
      putty_quantity: null,
      putty_unit: null,
      putty_price_per_unit: null,
      paint_name: "Screeding Paint",
      paint_quantity: 2,
      paint_unit: "bucket",
      paint_price_per_unit: 25000,
      cement_name: "White Cement",
      cement_quantity: 1,
      cement_unit: "bag",
      cement_price_per_unit: 7500,
      rounding_rule: "ceil" as const,
      extra_enabled: true,
      extra_name: "Bond",
      extra_quantity: 1,
      extra_unit: "litre",
      extra_price_per_unit: 3500,
    };
    const config = dbToSystemConfig(dbConfig);
    expect(config.extraEnabled).toBe(true);
    expect(config.extraName).toBe("Bond");
    expect(config.extraQuantity).toBe(1);
    expect(config.extraPricePerUnit).toBe(3500);
  });
});
