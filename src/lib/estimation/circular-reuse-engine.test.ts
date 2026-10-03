/**
 * Circular/Reuse Engine tests (Future Engine 9)
 *
 * Every expected value below is hand-computed from the
 * deterministic chain:
 *   recovered = qty × recovery_rate
 *   reused    = recovered × reuse_fraction
 *   recycled  = recovered × recycle_fraction
 *   landfill  = qty − reused − recycled
 *   diversion = (reused + recycled) / qty × 100
 *   value     = reused × unit_value_naira
 *
 * Base case: 500 units, recovery 0.9, reuse 0.6, recycle 0.3,
 * value ₦3,500/unit, target 0.75, rounding 2:
 *   recovered 450; reused 270; recycled 135; landfill 95;
 *   diversion 81% (meets 75%); value ₦945,000.
 */

import { describe, it, expect } from "vitest";
import {
  calculateCircularReuse,
  type CircularReuseInput,
} from "./circular-reuse-engine";

const factor = {
  recovery_rate: 0.9,
  reuse_fraction: 0.6,
  recycle_fraction: 0.3,
  unit_value_naira: 3500,
};

const rules = [
  { rule_key: "diversion_target_fraction", rule_value: { value: 0.75 } },
  { rule_key: "rounding_decimals", rule_value: { value: 2 } },
];

function makeInput(over: Partial<CircularReuseInput> = {}): CircularReuseInput {
  return {
    category: "aluminium_roof_sheets",
    quantity: 500,
    factors: { aluminium_roof_sheets: factor },
    rules,
    ...over,
  };
}

describe("calculateCircularReuse", () => {
  it("computes the hand-verified recovery chain", () => {
    const r = calculateCircularReuse(makeInput());
    expect(r.ok).toBe(true);
    expect(r.recovered_qty).toBe(450);
    expect(r.reused_qty).toBe(270);
    expect(r.recycled_qty).toBe(135);
    expect(r.landfill_qty).toBe(95);
    expect(r.diversion_percent).toBe(81);
    expect(r.meets_diversion_target).toBe(true);
    expect(r.reuse_value_naira).toBe(945000);
    expect(r.warnings).toEqual([]);
  });

  it("rounds quantities to the configured decimals (verified by hand: 1000 × 0.872 = 872; 872 × 0.45 = 392.4)", () => {
    const r = calculateCircularReuse(
      makeInput({
        quantity: 1000,
        factors: {
          aluminium_roof_sheets: {
            recovery_rate: 0.872,
            reuse_fraction: 0.45,
            recycle_fraction: 0.25,
            unit_value_naira: 1250.5,
          },
        },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.recovered_qty).toBe(872);
    expect(r.reused_qty).toBe(392.4);
    expect(r.recycled_qty).toBe(218);
    expect(r.landfill_qty).toBe(389.6);
    // (392.4 + 218) / 1000 = 61.04%
    expect(r.diversion_percent).toBe(61.04);
    // 392.4 × 1250.5 = 490,696.2
    expect(r.reuse_value_naira).toBe(490696.2);
  });

  it("refuses an unconfigured material — never assumes a recovery rate", () => {
    const r = calculateCircularReuse(
      makeInput({ category: "tempered_glass_panels" }),
    );
    expect(r.ok).toBe(false);
    expect(r.reused_qty).toBeNull();
    expect(r.warnings[0]).toMatch(
      /No recovery factor is configured for 'tempered_glass_panels'/,
    );
    expect(r.warnings[0]).toMatch(/refuses to guess/);
  });

  it("refuses a non-positive quantity", () => {
    expect(calculateCircularReuse(makeInput({ quantity: 0 })).ok).toBe(false);
    const neg = calculateCircularReuse(makeInput({ quantity: -50 }));
    expect(neg.ok).toBe(false);
    expect(neg.warnings[0]).toMatch(/Quantity must be a positive number/);
  });

  it("refuses a recovery rate outside 0–1 — never clamps", () => {
    const r = calculateCircularReuse(
      makeInput({
        factors: {
          aluminium_roof_sheets: { ...factor, recovery_rate: 1.2 },
        },
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/outside 0–1/);
    expect(r.recovered_qty).toBeNull();
  });

  it("refuses reuse + recycle fractions summing above 1", () => {
    const r = calculateCircularReuse(
      makeInput({
        factors: {
          aluminium_roof_sheets: {
            ...factor,
            reuse_fraction: 0.7,
            recycle_fraction: 0.5,
          },
        },
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/sum to more than 1/);
  });

  it("reports value as honestly absent when unit value is not configured", () => {
    const r = calculateCircularReuse(
      makeInput({
        factors: {
          aluminium_roof_sheets: { ...factor, unit_value_naira: null },
        },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.reused_qty).toBe(270);
    expect(r.reuse_value_naira).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/does not invent material prices/);
  });

  it("omits the target verdict when the diversion target rule is missing — never defaults it", () => {
    const r = calculateCircularReuse(
      makeInput({
        rules: [{ rule_key: "rounding_decimals", rule_value: { value: 2 } }],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.diversion_percent).toBe(81);
    expect(r.meets_diversion_target).toBeNull();
    expect(r.warnings.join(" ")).toMatch(
      /No valid 'diversion_target_fraction' rule/,
    );
  });

  it("reports a plan that misses the diversion target honestly", () => {
    const r = calculateCircularReuse(
      makeInput({
        quantity: 400,
        factors: {
          aluminium_roof_sheets: {
            recovery_rate: 0.5,
            reuse_fraction: 0.2,
            recycle_fraction: 0.1,
            unit_value_naira: 1000,
          },
        },
      }),
    );
    // recovered = 400 × 0.5 = 200; reused = 200 × 0.2 = 40; recycled = 200 × 0.1 = 20
    // landfill = 400 − 40 − 20 = 340; diversion = 60/400 = 15%; value = 40 × 1000 = 40,000
    expect(r.ok).toBe(true);
    expect(r.recovered_qty).toBe(200);
    expect(r.reused_qty).toBe(40);
    expect(r.recycled_qty).toBe(20);
    expect(r.landfill_qty).toBe(340);
    expect(r.diversion_percent).toBe(15);
    expect(r.meets_diversion_target).toBe(false);
    expect(r.reuse_value_naira).toBe(40000);
  });

  it("refuses to compute without a valid rounding rule", () => {
    const r = calculateCircularReuse(makeInput({ rules: [] }));
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/rounding_decimals/);
  });
});
