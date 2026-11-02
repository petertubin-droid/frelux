// =========================================================
// AI FOUNDATION, UNIT CONVERSION TESTS (Phase-2 point 6)
//
// The Copilot → engine unit boundary. Pinned:
//   * FT_TO_M matches the authoritative engines exactly (0.3048)
//   * spellings normalize to canonical tokens, unknown → null
//   * ft → m converts WITH provenance evidence text
//   * m → ft is REFUSED loudly, never silently passed on
// =========================================================
import { describe, it, expect } from "vitest";
import {
  FT_TO_M,
  normalizeLengthUnit,
  convertToEngineUnit,
} from "@/lib/ai-foundation/units";

describe("FT_TO_M constant", () => {
  it("matches the authoritative engines (calc.ts / pop-tile-calc.ts)", () => {
    expect(FT_TO_M).toBe(0.3048);
  });
});

describe("normalizeLengthUnit", () => {
  it("maps metric spellings to 'm'", () => {
    for (const u of ["m", "meter", "meters", "metre", "metres", " M "]) {
      expect(normalizeLengthUnit(u)).toBe("m");
    }
  });

  it("maps imperial spellings to 'ft'", () => {
    for (const u of ["ft", "foot", "feet", "'"]) {
      expect(normalizeLengthUnit(u)).toBe("ft");
    }
  });

  it("null/empty/unknown → null, never a guess", () => {
    expect(normalizeLengthUnit(null)).toBeNull();
    expect(normalizeLengthUnit(undefined)).toBeNull();
    expect(normalizeLengthUnit("")).toBeNull();
    expect(normalizeLengthUnit("cubits")).toBeNull();
  });
});

describe("convertToEngineUnit", () => {
  it("ft → m converts with evidence text", () => {
    const r = convertToEngineUnit(10, "ft", "m");
    expect(r.value).toBeCloseTo(3.048, 10);
    expect(r.converted).toBe(true);
    expect(r.evidence).toContain("10 ft");
    expect(r.evidence).toContain("3.0480 m");
    expect(r.evidence).toContain("0.3048");
  });

  it("m → m is a no-op with no conversion provenance", () => {
    const r = convertToEngineUnit(3.5, "m", "m");
    expect(r.value).toBe(3.5);
    expect(r.converted).toBe(false);
    expect(r.evidence).toBeUndefined();
  });

  it("unknown source unit is passed through unconverted", () => {
    const r = convertToEngineUnit(3.5, null, "m");
    expect(r.value).toBe(3.5);
    expect(r.converted).toBe(false);
  });

  it("m → ft is REFUSED loudly (no engine needs it)", () => {
    const r = convertToEngineUnit(3, "m", "ft");
    expect(r.converted).toBe(false);
    expect(r.evidence).toContain("not convertible");
  });

  it("non-finite values are never converted", () => {
    const r = convertToEngineUnit(Number.NaN, "ft", "m");
    expect(r.converted).toBe(false);
  });
});
