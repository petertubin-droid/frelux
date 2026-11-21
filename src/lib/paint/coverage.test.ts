import { describe, expect, it } from "vitest";
import {
  DEFAULT_COVERAGE_M2_PER_LITER,
  coverageSourceLabel,
  litresForArea,
  resolvePaintCoverage,
} from "./coverage";

describe("resolvePaintCoverage", () => {
  it("prefers the selected paint type over the admin calc rule", () => {
    const r = resolvePaintCoverage(
      { coverage_rate: 12, coverage_unit: "m²/L" },
      8,
    );
    expect(r).toEqual({ m2PerLiter: 12, source: "paint_type" });
  });

  it("falls back to the admin calc rule when no paint type is chosen", () => {
    expect(resolvePaintCoverage(null, 8)).toEqual({
      m2PerLiter: 8,
      source: "calc_rule",
    });
    expect(resolvePaintCoverage({ coverage_rate: 0 }, 8).source).toBe(
      "calc_rule",
    );
  });

  it("uses the documented default when nothing is configured", () => {
    expect(resolvePaintCoverage(null, null)).toEqual({
      m2PerLiter: DEFAULT_COVERAGE_M2_PER_LITER,
      source: "fallback",
    });
    expect(resolvePaintCoverage({ coverage_rate: -4 }, 0).source).toBe(
      "fallback",
    );
  });

  it("converts a square-foot coverage rate to square metres", () => {
    const r = resolvePaintCoverage(
      { coverage_rate: 100, coverage_unit: "sq ft/L" },
      null,
    );
    expect(r.source).toBe("paint_type");
    expect(r.m2PerLiter).toBeCloseTo(9.290304, 5);
  });

  it("treats metric spellings as metric", () => {
    for (const unit of ["m²/L", "m2/L", "sqm/L", "SQM per litre"]) {
      const r = resolvePaintCoverage(
        { coverage_rate: 11, coverage_unit: unit },
        null,
      );
      expect(r.m2PerLiter).toBe(11);
    }
  });

  it("accepts numeric strings from PostgREST", () => {
    expect(
      resolvePaintCoverage({ coverage_rate: "9.5" }, null).m2PerLiter,
    ).toBe(9.5);
  });
});

describe("litresForArea", () => {
  const tenSqm = { m2PerLiter: 10, source: "fallback" as const };

  it("multiplies by coats and rounds up", () => {
    expect(litresForArea(100, 2, tenSqm)).toBe(20);
    expect(litresForArea(101, 2, tenSqm)).toBe(21);
  });

  it("returns null for a missing area instead of a zero", () => {
    expect(litresForArea(0, 2, tenSqm)).toBeNull();
    expect(litresForArea(Number.NaN, 2, tenSqm)).toBeNull();
  });
});

describe("coverageSourceLabel", () => {
  it("names each owner in plain words", () => {
    expect(coverageSourceLabel("paint_type")).toContain("paint type");
    expect(coverageSourceLabel("calc_rule")).toContain("admin default");
    expect(coverageSourceLabel("fallback")).toContain("documented default");
  });
});
