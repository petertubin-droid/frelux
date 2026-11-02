/**
 * Embodied Carbon Engine tests (Future Engine 5)
 *
 * Every expected value below is hand-verified.
 */

import { describe, it, expect } from "vitest";
import {
  calculateEmbodiedCarbon,
  categoriesWithFactors,
  type EmbodiedCarbonInput,
} from "./embodied-carbon-engine";
import type { CarbonFactor, EstimationCalcRule } from "@/types/estimation";
import type { EpdFactor } from "./ec3-epd";

const factor = (over: Partial<CarbonFactor> = {}): CarbonFactor =>
  ({
    id: "f-1",
    category: "emulsion_paint",
    category_label: "Emulsion paint (per litre)",
    unit: "litre",
    kg_co2e_per_unit: 2.5,
    description: null,
    source_reference: "EPD 2025 average",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  }) as unknown as CarbonFactor;

const rules: EstimationCalcRule[] = [
  {
    id: "r1",
    rule_key: "rounding_decimals",
    calculator_type: "embodied_carbon",
    rule_value: { value: 2 },
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  } as unknown as EstimationCalcRule,
];

const input = (
  over: Partial<EmbodiedCarbonInput> = {},
): EmbodiedCarbonInput => ({
  lines: [{ category: "emulsion_paint", quantity: 20 }],
  factors: [factor()],
  rules,
  ...over,
});

describe("calculateEmbodiedCarbon", () => {
  it("computes quantity × factor per line and sums (hand-verified)", () => {
    // 20 litres × 2.5 = 50; plus 3 bags × 90 = 270 → total 320
    const r = calculateEmbodiedCarbon(
      input({
        lines: [
          { category: "emulsion_paint", quantity: 20 },
          { category: "cement_bag", quantity: 3 },
        ],
        factors: [
          factor(),
          factor({
            id: "f-2",
            category: "cement_bag",
            unit: "bag",
            kg_co2e_per_unit: 90,
          }),
        ],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.total_kg_co2e).toBe(320);
    expect(r.covered_lines).toBe(2);
    expect(r.excluded_lines).toBe(0);
    expect(r.warnings).toHaveLength(0);
    expect(r.line_results[0].kg_co2e).toBe(50);
    expect(r.line_results[1].kg_co2e).toBe(270);
    expect(r.steps[1].detail).toMatch(/3 bag × 90 kgCO2e\/bag = 270/);
  });

  it("matches categories case-insensitively and tolerates stray spaces", () => {
    const r = calculateEmbodiedCarbon(
      input({ lines: [{ category: "  EMULSION_PAINT ", quantity: 4 }] }),
    );
    expect(r.total_kg_co2e).toBe(10);
    expect(r.line_results[0].matched_category).toBe("emulsion_paint");
  });

  it("excludes lines without a configured factor with a warning, never guesses", () => {
    const r = calculateEmbodiedCarbon(
      input({
        lines: [
          { category: "emulsion_paint", quantity: 10 },
          { category: "marble_tile", quantity: 40 },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.total_kg_co2e).toBe(25); // only the covered line
    expect(r.covered_lines).toBe(1);
    expect(r.excluded_lines).toBe(1);
    expect(r.warnings.join(" ")).toMatch(
      /No carbon factor is configured for 'marble_tile'/,
    );
    expect(r.warnings.join(" ")).toMatch(
      /1 excluded for missing\/invalid factors/,
    );
  });

  it("reports clearly when nothing can be matched", () => {
    const r = calculateEmbodiedCarbon(
      input({ lines: [{ category: "unknown_thing", quantity: 5 }] }),
    );
    expect(r.ok).toBe(true);
    expect(r.total_kg_co2e).toBe(0);
    expect(r.warnings.join(" ")).toMatch(
      /the total is 0 kgCO2e and reflects ONLY configured categories/,
    );
  });

  it("excludes invalid quantities instead of guessing", () => {
    const r = calculateEmbodiedCarbon(
      input({
        lines: [
          { category: "emulsion_paint", quantity: -5 },
          { category: "emulsion_paint", quantity: NaN },
        ],
      }),
    );
    expect(r.total_kg_co2e).toBe(0);
    expect(r.excluded_lines).toBe(2);
    expect(r.warnings.join(" ")).toMatch(/invalid quantity/);
  });

  it("excludes a line whose configured factor is invalid, with its source", () => {
    const r = calculateEmbodiedCarbon(
      input({
        factors: [factor({ kg_co2e_per_unit: -1 })],
      }),
    );
    expect(r.excluded_lines).toBe(1);
    expect(r.line_results[0].excluded).toBe(true);
    expect(r.line_results[0].source_reference).toBe("EPD 2025 average");
    expect(r.warnings.join(" ")).toMatch(/configured factor .* is invalid/);
  });

  it("refuses an empty line list", () => {
    const r = calculateEmbodiedCarbon(input({ lines: [] }));
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/No estimate lines provided/);
  });

  it("ignores inactive factors", () => {
    const r = calculateEmbodiedCarbon(
      input({ factors: [factor({ is_active: false })] }),
    );
    expect(r.total_kg_co2e).toBe(0);
    expect(r.warnings.join(" ")).toMatch(
      /No carbon factor is configured for 'emulsion_paint'/,
    );
  });

  it("honours the configured rounding rule (hand-verified)", () => {
    // 3 litres × 2.555 = 7.665 → 2dp: 7.67; with 3dp rule: 7.665
    const r2 = calculateEmbodiedCarbon(
      input({
        factors: [factor({ kg_co2e_per_unit: 2.555 })],
        lines: [{ category: "emulsion_paint", quantity: 3 }],
      }),
    );
    expect(r2.total_kg_co2e).toBe(7.67);

    const r3 = calculateEmbodiedCarbon(
      input({
        factors: [factor({ kg_co2e_per_unit: 2.555 })],
        lines: [{ category: "emulsion_paint", quantity: 3 }],
        rules: [
          {
            ...rules[0],
            rule_value: { value: 3 },
          } as unknown as EstimationCalcRule,
        ],
      }),
    );
    expect(r3.total_kg_co2e).toBe(7.665);
  });

  it("handles zero quantities as covered, contributing zero", () => {
    const r = calculateEmbodiedCarbon(
      input({ lines: [{ category: "emulsion_paint", quantity: 0 }] }),
    );
    expect(r.total_kg_co2e).toBe(0);
    expect(r.covered_lines).toBe(1);
    expect(r.excluded_lines).toBe(0);
  });
});

describe("categoriesWithFactors", () => {
  it("returns unique sorted active categories", () => {
    expect(
      categoriesWithFactors([
        factor(),
        factor({ id: "f-2", category: "cement_bag" }),
        factor({ id: "f-3", category: "inactive_thing", is_active: false }),
      ]),
    ).toEqual(["cement_bag", "emulsion_paint"]);
  });
});


describe("calculateEmbodiedCarbon — EPD integration (Sustainability Pillar 5)", () => {
  const adminFactors = [
    factor({
      id: "f-concrete",
      category: "concrete",
      unit: "m3",
      kg_co2e_per_unit: 350, // static estimate, replaced by the EPD below
      source_reference: "ICE v3 batch estimate",
    }),
    factor({
      id: "f-paint",
      category: "emulsion_paint",
      unit: "litre",
      kg_co2e_per_unit: 2.5,
      source_reference: "EPD 2025 average",
    }),
  ];

  const epdFactor: EpdFactor = {
    category: "concrete",
    label: "Ready-Mix Concrete C30/37",
    epd_id: "frelux-epd-1",
    unit: "m3",
    kg_co2e_per_unit: 320.5, // plant-specific verified value
    plant: "Lafarge Mississauga Plant",
    publisher: "NSF International",
    valid_until: "2028-06-30",
    verified: true,
    modules: ["A1", "A2", "A3"],
    source_reference: "EC3 EPD frelux-epd-1 (plant: Lafarge Mississauga Plant)",
  };

  it("lets a verified EPD replace the static admin factor per category", () => {
    const r = calculateEmbodiedCarbon({
      lines: [
        { category: "Concrete", quantity: 10 },
        { category: "emulsion_paint", quantity: 4 },
      ],
      factors: adminFactors,
      epdFactors: [epdFactor],
      rules,
    });
    expect(r.ok).toBe(true);
    expect(r.epd_replaced_categories).toEqual(["concrete"]);
    const concrete = r.line_results.find((l) => l.matched_category === "concrete")!;
    expect(concrete.factor_source).toBe("epd");
    expect(concrete.kg_co2e).toBe(3205); // 10 × 320.5 (EPD), not 10 × 350 (admin)
    const paint = r.line_results.find((l) => l.matched_category === "emulsion_paint")!;
    expect(paint.factor_source).toBe("admin");
    expect(paint.kg_co2e).toBe(10); // 4 × 2.5, admin fallback
    expect(r.total_kg_co2e).toBe(3215);
    expect(r.warnings.join(" ")).toContain("replaced the static planning factor");
    expect(r.steps.map((st) => st.detail).join(" ")).toContain("verified EPD");
  });

  it("runs identically on admin factors when no EPD data is supplied", () => {
    const r = calculateEmbodiedCarbon({
      lines: [{ category: "Concrete", quantity: 10 }],
      factors: adminFactors,
      rules,
    });
    const concrete = r.line_results[0];
    expect(concrete.factor_source).toBe("admin");
    expect(concrete.kg_co2e).toBe(3500); // 10 × 350, the static estimate
  });

  it("produces the RICS whole-life breakdown on every run", () => {
    const r = calculateEmbodiedCarbon({
      lines: [
        { category: "Concrete", quantity: 10 },
        { category: "emulsion_paint", quantity: 4 },
      ],
      factors: adminFactors,
      epdFactors: [epdFactor],
      rules,
    });
    expect(r.whole_life).toBeDefined();
    expect(r.whole_life!.ok).toBe(true);
    // Both factors are product-stage (A1): upfront = total
    expect(r.whole_life!.upfrontCarbon).toBe(3215);
    expect(r.whole_life!.modules.map((m) => m.module)).toEqual(["A1"]);
    expect(r.whole_life!.disclosures.join(" ")).toContain("PAS 2080");
    // Module-less admin factor: the A1–A3 assumption is stated INSIDE the
    // breakdown, not the top-level engine warnings (legacy runs stay quiet).
    expect(r.whole_life!.warnings.join(" ")).toContain("assumed into the A1–A3 product stage");
    expect(r.warnings.join(" ")).not.toContain("assumed into the A1–A3");
  });

  it("buckets a factor with an explicit A4 module into the construction group", () => {
    const r = calculateEmbodiedCarbon({
      lines: [{ category: "concrete", quantity: 10 }],
      factors: [
        factor({
          id: "f-a4",
          category: "concrete",
          unit: "m3",
          kg_co2e_per_unit: 12,
          module_stage: "A4",
          source_reference: "freight factor",
        }),
      ],
      rules,
    });
    expect(r.whole_life!.upfrontCarbon).toBe(120);
    expect(r.whole_life!.groupTotals.construction).toBe(120);
    expect(r.warnings.join(" ")).not.toContain("assumed into the A1–A3");
  });
});
