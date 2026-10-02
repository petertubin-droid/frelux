/**
 * FRELUX Mineral Stone Engine Tests
 *
 * Every expected value below is computed BY HAND from first principles
 * (see the comment above each case). The tests must not simply re-run the
 * engine's own formula — they pin the arithmetic the engine is supposed
 * to produce.
 */

import { describe, it, expect } from "vitest";
import {
  calculateMineralStone,
  type MineralStoneConfig,
} from "./mineral-stone-engine";

// ─────────────────────────────────────────────────────────
// Config builders
// ─────────────────────────────────────────────────────────

function makeConfig(
  overrides: Partial<MineralStoneConfig["profile"]> = {},
  productOverrides: Partial<MineralStoneConfig["product"]> = {},
): MineralStoneConfig {
  return {
    product: {
      id: "p1",
      name: "Configured Stone Product",
      slug: "configured-stone-product",
      brand: null,
      product_notes: null,
      technical_spec: null,
      standard_pack_size: 25,
      pack_unit_symbol: "kg",
      price_per_pack: 15000,
      ...productOverrides,
    },
    profile: {
      id: "q1",
      name: "Standard application",
      slug: "standard",
      is_active: true,
      calculation_model: "mass_per_area",
      coverage: null,
      coverage_min: null,
      coverage_max: null,
      coverage_unit: null,
      consumption_min: 2.5,
      consumption_max: 3.5,
      consumption_unit: "kg_per_m2",
      default_coats: 2,
      waste_percentage: 0,
      ...overrides,
    },
  };
}

const M2 = "m2";
const FT2 = "ft2";

// ─────────────────────────────────────────────────────────
// MODEL B — mass per area (the prompt's worked example)
// ─────────────────────────────────────────────────────────

describe("Mineral Stone: mass per area model", () => {
  it("computes the 53.89 m² × 2.5–3.5 kg/m² example by hand", () => {
    // Area 53.89 m², 1 coat, consumption 2.5–3.5 kg/m², no waste:
    //   min kg = 53.89 × 2.5 = 134.725
    //   max kg = 53.89 × 3.5 = 188.615
    //   25 kg packages: 134.725 / 25 = 5.389  → ceil → 6
    //                   188.615 / 25 = 7.5446 → ceil → 8
    const r = calculateMineralStone(
      { area: 53.89, area_unit: M2, coats: 1 },
      makeConfig({ default_coats: 1 }),
    );
    expect(r.calculable).toBe(true);
    expect(r.warnings).toHaveLength(0);
    expect(r.material_min).toBeCloseTo(134.725, 10);
    expect(r.material_max).toBeCloseTo(188.615, 10);
    expect(r.purchase_min).toBe(6);
    expect(r.purchase_max).toBe(8);
    expect(r.calculation_model).toBe("mass_per_area");
  });

  it("multiplies by coats and applies waste before pack rounding", () => {
    // Area 40 m², 2 coats, consumption exactly 2 kg/m² (min=max), waste 10%:
    //   raw kg = 40 × 2 × 2 = 160
    //   with waste = 160 × 1.1 = 176
    //   25 kg packs: 176 / 25 = 7.04 → ceil → 8
    const r = calculateMineralStone(
      { area: 40, area_unit: M2, coats: 2 },
      makeConfig({
        consumption_min: 2,
        consumption_max: 2,
        waste_percentage: 10,
      }),
    );
    expect(r.with_waste_min).toBeCloseTo(176, 10);
    expect(r.with_waste_max).toBeCloseTo(176, 10);
    expect(r.purchase_min).toBe(8);
    expect(r.purchase_max).toBe(8);
  });

  it("computes cost from whole purchase quantities, not raw kg", () => {
    // From the 53.89 m² example: purchase 6–8 packs at 15,000
    //   → cost 90,000 – 120,000
    const r = calculateMineralStone(
      { area: 53.89, area_unit: M2, coats: 1 },
      makeConfig({ default_coats: 1 }),
    );
    expect(r.cost_min).toBe(90000);
    expect(r.cost_max).toBe(120000);
  });

  it("handles a different package size (5 kg) with the same consumption", () => {
    // 134.725 kg / 5 kg = 26.945 → 27; 188.615 / 5 = 37.723 → 38
    const r = calculateMineralStone(
      { area: 53.89, area_unit: M2, coats: 1 },
      makeConfig({ default_coats: 1 }, { standard_pack_size: 5 }),
    );
    expect(r.purchase_min).toBe(27);
    expect(r.purchase_max).toBe(38);
  });
});

// ─────────────────────────────────────────────────────────
// MODEL A — coverage per package
// ─────────────────────────────────────────────────────────

describe("Mineral Stone: coverage-based model", () => {
  it("computes a coverage range as a purchase range", () => {
    // Area 50 m², 2 coats, coverage 3.5–5 m²/package (heavy–thin):
    //   effective area = 100 m²
    //   packages min = 100 / 5 = 20
    //   packages max = 100 / 3.5 = 28.571428571…
    //   waste 10%: 22 exactly → 22; 31.428571… → 32
    const r = calculateMineralStone(
      { area: 50, area_unit: M2, coats: 2 },
      makeConfig({
        calculation_model: "coverage_based",
        coverage_min: 3.5,
        coverage_max: 5,
        coverage_unit: "m2_per_package",
        consumption_min: null,
        consumption_max: null,
        consumption_unit: null,
        waste_percentage: 10,
      }),
    );
    expect(r.calculable).toBe(true);
    expect(r.material_min).toBeCloseTo(20, 10);
    expect(r.material_max).toBeCloseTo(28.5714285714, 9);
    expect(r.purchase_min).toBe(22);
    expect(r.purchase_max).toBe(32);
    expect(r.material_unit).toBe("package");
  });

  it("uses the legacy single coverage column as an exact quantity", () => {
    // Area 40 m², 1 coat, coverage 10 m²/package (single value): 4 packages exactly.
    const r = calculateMineralStone(
      { area: 40, area_unit: M2, coats: 1 },
      makeConfig({
        calculation_model: "coverage_based",
        coverage: 10,
        coverage_min: null,
        coverage_max: null,
        coverage_unit: "m2_per_package",
        consumption_min: null,
        consumption_max: null,
        consumption_unit: null,
      }),
    );
    expect(r.material_min).toBe(4);
    expect(r.material_max).toBe(4);
    expect(r.purchase_min).toBe(4);
    expect(r.purchase_max).toBe(4);
    expect(r.coverage_min).toBe(10);
    expect(r.coverage_max).toBe(10);
  });

  it("does not let float dust inflate an exact whole-package result", () => {
    // Area 35 m², 1 coat, coverage 7 m²/package → 5 packages.
    // 35/7 = 5 exactly in decimal, but float may give 5.000000000000001;
    // the engine must return 5, not 6.
    const r = calculateMineralStone(
      { area: 35, area_unit: M2, coats: 1 },
      makeConfig({
        calculation_model: "coverage_based",
        coverage: 7,
        coverage_min: null,
        coverage_max: null,
        coverage_unit: "m2_per_package",
        consumption_min: null,
        consumption_max: null,
        consumption_unit: null,
      }),
    );
    expect(r.purchase_min).toBe(5);
    expect(r.purchase_max).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────
// MODEL C — volume per area
// ─────────────────────────────────────────────────────────

describe("Mineral Stone: volume per area model", () => {
  it("computes litres from L/m² consumption", () => {
    // Area 100 m², 1 coat, 0.3–0.4 L/m², 5 L packages, no waste:
    //   30–40 L → 30/5 = 6 → 6; 40/5 = 8 → 8
    const r = calculateMineralStone(
      { area: 100, area_unit: M2, coats: 1 },
      makeConfig(
        {
          calculation_model: "volume_per_area",
          consumption_min: 0.3,
          consumption_max: 0.4,
          consumption_unit: "litre_per_m2",
          default_coats: 1,
        },
        { standard_pack_size: 5, pack_unit_symbol: "L" },
      ),
    );
    expect(r.calculable).toBe(true);
    expect(r.material_min).toBeCloseTo(30, 10);
    expect(r.material_max).toBeCloseTo(40, 10);
    expect(r.material_unit).toBe("L");
    expect(r.purchase_min).toBe(6);
    expect(r.purchase_max).toBe(8);
  });
});

// ─────────────────────────────────────────────────────────
// Units
// ─────────────────────────────────────────────────────────

describe("Mineral Stone: unit handling", () => {
  it("converts ft² to m² with the exact factor before calculating", () => {
    // 100 ft² = 9.290304 m² (exact). Consumption 2 kg/m², 1 coat:
    //   9.290304 × 2 = 18.580608 kg → 20 kg pack → ceil(0.9290304) = 1
    const r = calculateMineralStone(
      { area: 100, area_unit: FT2, coats: 1 },
      makeConfig({ consumption_min: 2, consumption_max: 2, default_coats: 1 }),
    );
    expect(r.area_m2).toBeCloseTo(9.290304, 12);
    expect(r.material_min).toBeCloseTo(18.580608, 10);
    expect(r.purchase_min).toBe(1);
    expect(r.purchase_max).toBe(1);
  });

  it("rejects an invalid area unit", () => {
    const r = calculateMineralStone(
      { area: 100, area_unit: "acres", coats: 1 },
      makeConfig(),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("Invalid area unit 'acres'");
  });

  it("rejects an unsupported consumption unit", () => {
    const r = calculateMineralStone(
      { area: 100, area_unit: M2, coats: 1 },
      makeConfig({ consumption_unit: "lb_per_ft2" }),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("Consumption unit");
  });
});

// ─────────────────────────────────────────────────────────
// Coats / layers
// ─────────────────────────────────────────────────────────

describe("Mineral Stone: coats and layers", () => {
  it("uses the configured default when the user does not enter coats", () => {
    // Configured default_coats = 2, input coats = null:
    //   20 m² × 2 coats × 2 kg/m² = 80 kg → 25 kg packs → ceil(3.2) = 4
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: null },
      makeConfig({ consumption_min: 2, consumption_max: 2, default_coats: 2 }),
    );
    expect(r.coats).toBe(2);
    expect(r.purchase_min).toBe(4);
    expect(r.purchase_max).toBe(4);
  });

  it("refuses to guess a coat count when none is configured or entered", () => {
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: null },
      makeConfig({ default_coats: null }),
    );
    expect(r.calculable).toBe(false);
    expect(
      r.warnings.some((w) => w.includes("coats/layers is not configured")),
    ).toBe(true);
    expect(r.material_min).toBeNull();
  });

  it("rejects fractional coats", () => {
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1.5 },
      makeConfig(),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("whole number");
  });
});

// ─────────────────────────────────────────────────────────
// Missing configuration — never a silent guess
// ─────────────────────────────────────────────────────────

describe("Mineral Stone: missing configuration", () => {
  it("refuses when the calculation model is not configured", () => {
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1 },
      makeConfig({ calculation_model: null }),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("Calculation model is not configured");
  });

  it("refuses when coverage data is missing (Model A)", () => {
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1 },
      makeConfig({
        calculation_model: "coverage_based",
        coverage: null,
        coverage_min: null,
        coverage_max: null,
        coverage_unit: "m2_per_package",
        consumption_min: null,
        consumption_max: null,
      }),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("Coverage is not configured");
  });

  it("refuses when consumption data is missing (Model B)", () => {
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1 },
      makeConfig({ consumption_min: null, consumption_max: null }),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("not configured");
  });

  it("computes material but no purchase quantity when the package size is missing", () => {
    // 20 m² × 2 kg/m² = 40 kg, but no package size:
    //   material is known, purchase quantity is NOT guessed.
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1 },
      makeConfig(
        { consumption_min: 2, consumption_max: 2, default_coats: 1 },
        { standard_pack_size: null, pack_unit_symbol: null },
      ),
    );
    expect(r.material_min).toBeCloseTo(40, 10);
    expect(r.purchase_min).toBeNull();
    expect(r.calculable).toBe(false);
    expect(
      r.warnings.some((w) => w.includes("Package size/unit is not configured")),
    ).toBe(true);
  });

  it("still calculates quantities when the price is missing, and warns", () => {
    const r = calculateMineralStone(
      { area: 53.89, area_unit: M2, coats: 1 },
      makeConfig({ default_coats: 1 }, { price_per_pack: null }),
    );
    expect(r.calculable).toBe(true);
    expect(r.purchase_min).toBe(6);
    expect(r.cost_min).toBeNull();
    expect(
      r.warnings.some((w) => w.includes("Price per package is not configured")),
    ).toBe(true);
  });

  it("warns when waste is not configured and shows raw quantities", () => {
    // 40 kg raw; waste null → quantities WITHOUT waste + explicit warning.
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1 },
      makeConfig({
        consumption_min: 2,
        consumption_max: 2,
        default_coats: 1,
        waste_percentage: null,
      }),
    );
    expect(r.with_waste_min).toBeCloseTo(40, 10);
    expect(r.waste_percentage).toBeNull();
    expect(
      r.warnings.some((w) => w.includes("Waste percentage is not configured")),
    ).toBe(true);
  });

  it("refuses when the profile is inactive", () => {
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1 },
      makeConfig({ is_active: false }),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("inactive");
  });
});

// ─────────────────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────────────────

describe("Mineral Stone: input validation", () => {
  it("rejects zero area", () => {
    const r = calculateMineralStone(
      { area: 0, area_unit: M2, coats: 1 },
      makeConfig(),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("positive number");
  });

  it("rejects negative area", () => {
    const r = calculateMineralStone(
      { area: -5, area_unit: M2, coats: 1 },
      makeConfig(),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("positive number");
  });

  it("rejects a waste percentage of 100 or more", () => {
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1 },
      makeConfig({ waste_percentage: 100 }),
    );
    expect(r.calculable).toBe(false);
    expect(r.warnings[0]).toContain("waste percentage is invalid");
  });

  it("rejects NaN area", () => {
    const r = calculateMineralStone(
      { area: NaN, area_unit: M2, coats: 1 },
      makeConfig(),
    );
    expect(r.calculable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
// Determinism & transparency
// ─────────────────────────────────────────────────────────

describe("Mineral Stone: determinism and transparency", () => {
  it("produces identical results for identical inputs and config", () => {
    const input = { area: 53.89, area_unit: M2, coats: 1 };
    const cfg = makeConfig({ default_coats: 1 });
    const a = calculateMineralStone(input, cfg);
    const b = calculateMineralStone(input, cfg);
    expect(a).toEqual(b);
  });

  it("explains every step of the prompt example", () => {
    const r = calculateMineralStone(
      { area: 53.89, area_unit: M2, coats: 1 },
      makeConfig({ default_coats: 1 }),
    );
    const labels = r.steps.map((s) => s.label);
    expect(labels).toContain("Surface area");
    expect(labels).toContain("Calculation model");
    expect(labels).toContain("Configured consumption");
    expect(labels).toContain("Material requirement (kg)");
    expect(labels).toContain("Waste allowance");
    expect(labels).toContain("Package requirement");
    expect(labels).toContain("Purchase quantity");
    expect(labels).toContain("Cost");
    // the breakdown must contain the actual arithmetic
    const materialStep = r.steps.find(
      (s) => s.label === "Material requirement (kg)",
    )!;
    expect(materialStep.detail).toContain("134.725");
    expect(materialStep.detail).toContain("188.615");
  });

  it("echoes product notes and technical spec from configuration", () => {
    const r = calculateMineralStone(
      { area: 20, area_unit: M2, coats: 1 },
      makeConfig(
        {},
        {
          brand: "Verified Brand",
          product_notes: "Apply with steel trowel.",
          technical_spec: "Datasheet XYZ, 2026 edition",
        },
      ),
    );
    expect(r.brand).toBe("Verified Brand");
    expect(r.product_notes).toBe("Apply with steel trowel.");
    expect(r.technical_spec).toBe("Datasheet XYZ, 2026 edition");
  });
});
