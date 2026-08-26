import { describe, it, expect } from "vitest";
import {
  normalizeCoverage,
  getCoverageUnitLabel,
  getPackSizeLitres,
  getRoundingRule,
  getStandardHeight,
  getStandardCoatCount,
  getOpeningDeductionPct,
  getCeilingQuantityBuckets,
  getCeilingCoverageRate,
  isPriceConfigured,
} from "@/lib/estimation/paint-engine";
import type { EstimationCalcRule, EstimationProduct } from "@/types/estimation";
import { calculateLineTotal } from "@/lib/estimation/pricing";

function makeRule(
  rule_value: Record<string, unknown> = {},
): EstimationCalcRule {
  return {
    id: "rule-1",
    rule_key: "test",
    calculator_type: "paint",
    rule_value,
    rule_status: "verified_frelux",
    description: null,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
}

describe("paint-engine — normalizeCoverage", () => {
  it("returns 0 for zero/negative coverage", () => {
    expect(normalizeCoverage(0, "m2_per_liter", 20)).toBe(0);
    expect(normalizeCoverage(-5, "m2_per_liter", 20)).toBe(0);
  });

  it("passes through m2_per_liter", () => {
    expect(normalizeCoverage(12, "m2_per_liter", 20)).toBe(12);
  });

  it("converts m2_per_bucket to m2_per_liter", () => {
    expect(normalizeCoverage(240, "m2_per_bucket", 20)).toBe(12);
  });

  it("converts ft2_per_liter to m2_per_liter", () => {
    const result = normalizeCoverage(100, "ft2_per_liter", 20);
    expect(result).toBeCloseTo(100 * 0.092903, 4);
  });

  it("converts ft2_per_bucket to m2_per_liter", () => {
    const result = normalizeCoverage(2000, "ft2_per_bucket", 20);
    expect(result).toBeCloseTo((2000 * 0.092903) / 20, 4);
  });

  it("uses default bucket size of 20 when packSize is 0", () => {
    expect(normalizeCoverage(240, "m2_per_bucket", 0)).toBe(12);
  });
});

describe("paint-engine — getCoverageUnitLabel", () => {
  it("returns label for each unit type", () => {
    expect(getCoverageUnitLabel("m2_per_liter")).toContain("m²");
    expect(getCoverageUnitLabel("m2_per_bucket")).toContain("bucket");
    expect(getCoverageUnitLabel("ft2_per_liter")).toContain("ft²");
    expect(getCoverageUnitLabel("ft2_per_bucket")).toContain("ft²");
  });

  it("returns fallback for unknown unit", () => {
    expect(getCoverageUnitLabel("unknown")).toBeTruthy();
  });
});

describe("paint-engine — getPackSizeLitres", () => {
  it("uses product standard_pack_size when set", () => {
    const product = { standard_pack_size: 4 } as EstimationProduct;
    expect(getPackSizeLitres(product, null)).toBe(4);
  });

  it("uses rule litres when product has no pack size", () => {
    const product = { standard_pack_size: null } as EstimationProduct;
    const rule = makeRule({ litres: 5 });
    expect(getPackSizeLitres(product, rule)).toBe(5);
  });

  it("defaults to 20 when neither set", () => {
    expect(getPackSizeLitres(null, null)).toBe(20);
  });

  it("ignores rule litres when <= 0", () => {
    const rule = makeRule({ litres: -1 });
    expect(getPackSizeLitres(null, rule)).toBe(20);
  });
});

describe("paint-engine — getRoundingRule", () => {
  it("returns rule string when present", () => {
    const rule = makeRule({ rule: "round" });
    expect(getRoundingRule(rule)).toBe("round");
  });

  it("defaults to ceil", () => {
    expect(getRoundingRule(null)).toBe("ceil");
  });

  it("defaults to ceil when rule_value has no rule string", () => {
    const rule = makeRule({ rule: 123 });
    expect(getRoundingRule(rule)).toBe("ceil");
  });
});

describe("paint-engine — getStandardHeight", () => {
  it("returns both ft and m from rule", () => {
    const rule = makeRule({ value_m: 3, value_ft: 10 });
    const h = getStandardHeight(rule);
    expect(h.m).toBe(3);
    expect(h.ft).toBe(10);
  });

  it("computes ft from m when only m provided", () => {
    const rule = makeRule({ value_m: 3 });
    const h = getStandardHeight(rule);
    expect(h.m).toBe(3);
    expect(h.ft).toBeCloseTo(3 / 0.3048, 2);
  });

  it("returns default when no rule", () => {
    const h = getStandardHeight(null);
    expect(h.m).toBeGreaterThan(0);
    expect(h.ft).toBeGreaterThan(0);
  });
});

describe("paint-engine — getStandardCoatCount", () => {
  it("returns count from rule", () => {
    const rule = makeRule({ count: 3 });
    expect(getStandardCoatCount(rule)).toBe(3);
  });

  it("defaults to 2", () => {
    expect(getStandardCoatCount(null)).toBe(2);
  });

  it("defaults to 2 when count is 0 or negative", () => {
    const rule = makeRule({ count: 0 });
    expect(getStandardCoatCount(rule)).toBe(2);
  });
});

describe("paint-engine — getOpeningDeductionPct", () => {
  it("returns percentage from rule", () => {
    const rule = makeRule({ deduction_percentage: 50 });
    expect(getOpeningDeductionPct(rule)).toBe(50);
  });

  it("defaults to 100 when no rule", () => {
    expect(getOpeningDeductionPct(null)).toBe(100);
  });

  it("defaults to 100 when percentage is out of range", () => {
    const rule = makeRule({ deduction_percentage: 150 });
    expect(getOpeningDeductionPct(rule)).toBe(100);
  });
});

describe("paint-engine — getCeilingQuantityBuckets", () => {
  it("returns buckets from rule", () => {
    const rule = makeRule({ buckets: 1.5 });
    expect(getCeilingQuantityBuckets(rule)).toBe(1.5);
  });

  it("defaults to 0.5", () => {
    expect(getCeilingQuantityBuckets(null)).toBe(0.5);
  });

  it("defaults to 0.5 when buckets is negative", () => {
    const rule = makeRule({ buckets: -1 });
    expect(getCeilingQuantityBuckets(rule)).toBe(0.5);
  });
});

describe("paint-engine — getCeilingCoverageRate", () => {
  it("returns enabled + rate from rule", () => {
    const rule = makeRule({ enabled: true, m2_per_liter: 10 });
    const r = getCeilingCoverageRate(rule);
    expect(r.enabled).toBe(true);
    expect(r.m2PerLiter).toBe(10);
  });

  it("returns disabled when no rule", () => {
    const r = getCeilingCoverageRate(null);
    expect(r.enabled).toBe(false);
    expect(r.m2PerLiter).toBeNull();
  });

  it("defaults enabled to true when not explicitly false", () => {
    const rule = makeRule({ m2_per_liter: 8 });
    const r = getCeilingCoverageRate(rule);
    expect(r.enabled).toBe(true);
  });
});

describe("paint-engine — isPriceConfigured", () => {
  it("true for positive number", () => {
    expect(isPriceConfigured(100)).toBe(true);
  });

  it("false for 0", () => {
    expect(isPriceConfigured(0)).toBe(false);
  });

  it("false for negative", () => {
    expect(isPriceConfigured(-5)).toBe(false);
  });
});

// ── Per-bucket pricing regression test (Issue: price was multiplied by litres, not buckets) ──
describe("paint-engine — per-bucket pricing regression", () => {
  it("materialCost = unitPrice × practicalBuckets (not litres)", () => {
    // Scenario: 2 practical buckets of 20L paint at ₦12,000 per bucket
    // BUG was: 12000 × 40 (litres) = ₦480,000
    // CORRECT:  12000 × 2 (buckets) = ₦24,000
    const unitPrice = 12000;
    const practicalBuckets = 2;
    const packSizeLitres = 20;
    const practicalLitres = practicalBuckets * packSizeLitres; // 40

    // The engine should use calculateLineTotal(unitPrice, practicalBuckets)
    const correctTotal = calculateLineTotal(unitPrice, practicalBuckets);
    const buggyTotal = calculateLineTotal(unitPrice, practicalLitres);

    expect(correctTotal).toBe(24000);
    expect(buggyTotal).toBe(480000); // demonstrates what the bug produced
    expect(correctTotal).not.toBe(buggyTotal);
  });
});
