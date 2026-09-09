// =========================================================
// PLAN VISION TESTS, dimensions, classification & scale (§4, §5,
// §16, §20, §21)
// =========================================================

import { describe, it, expect } from "vitest";
import { dimensionsContradict } from "../consistency";
import { DOCUMENT_RELIABILITY } from "../types";
import {
  clamp01,
  dimensionInUnit,
  dimensionToMeters,
  evaluateScale,
  explicitDimension,
  derivedDimension,
  inferredDimension,
  isDimensionGrade,
  isUnknown,
  missingScale,
  rankDimensions,
  SCALE_USABLE_CONFIDENCE,
  userCalibratedScale,
} from "../dimensions";
import { unknownDimension } from "../dimensions";

describe("dimension classification (§4)", () => {
  it("keeps explicit / derived / inferred / unknown distinct", () => {
    const e = explicitDimension(3.6, "m", 0.95);
    const d = derivedDimension(3.6, "m", 0.9);
    const i = inferredDimension(3.6, "m", 0.6);
    const u = unknownDimension();
    expect(e.kind).toBe("explicit");
    expect(d.kind).toBe("derived");
    expect(i.kind).toBe("inferred");
    expect(u.kind).toBe("unknown");
  });

  it("clamps confidence into 0..1", () => {
    expect(explicitDimension(1, "m", 5).confidence).toBe(1);
    expect(explicitDimension(1, "m", -3).confidence).toBe(0);
    expect(clamp01(NaN)).toBe(0);
  });

  it("never treats an inferred dimension as explicit in ranking", () => {
    const inferred = inferredDimension(4, "m", 0.99);
    const explicit = explicitDimension(3, "m", 0.1);
    // Explicit always outranks inferred, regardless of confidence.
    expect(rankDimensions(explicit, inferred)).toBeLessThan(0);
    expect(rankDimensions(inferred, explicit)).toBeGreaterThan(0);
  });

  it("ranks derived below explicit but above inferred", () => {
    const e = explicitDimension(3, "m", 0.5);
    const d = derivedDimension(3, "m", 0.5);
    const i = inferredDimension(3, "m", 0.9);
    expect(rankDimensions(d, e)).toBeGreaterThan(0);
    expect(rankDimensions(d, i)).toBeLessThan(0);
  });

  it("treats null as the weakest candidate", () => {
    expect(
      rankDimensions(null, inferredDimension(1, "m", 0.1)),
    ).toBeGreaterThan(0);
    expect(rankDimensions(inferredDimension(1, "m", 0.1), null)).toBeLessThan(
      0,
    );
    expect(rankDimensions(null, null)).toBe(0);
  });
});

describe("unit conversion (§20, exact, via the central service)", () => {
  it("converts all native units to metres exactly", () => {
    expect(dimensionToMeters(explicitDimension(1, "m", 1))).toBe(1);
    expect(dimensionToMeters(explicitDimension(100, "cm", 1))).toBe(1);
    expect(dimensionToMeters(explicitDimension(1000, "mm", 1))).toBe(1);
    expect(dimensionToMeters(explicitDimension(1, "ft", 1))).toBeCloseTo(
      0.3048,
      10,
    );
    expect(dimensionToMeters(explicitDimension(12, "in", 1))).toBeCloseTo(
      0.3048,
      10,
    );
  });

  it("returns null for unknown dimensions, never invents a value (§22)", () => {
    expect(dimensionToMeters(null)).toBeNull();
    expect(dimensionToMeters(unknownDimension())).toBeNull();
  });

  it("displays dimensions in the requested unit without mutating the original", () => {
    const dim = explicitDimension(1, "m", 1);
    expect(dimensionInUnit(dim, "ft")).toBeCloseTo(3.28084, 5);
    expect(dimensionInUnit(dim, "cm")).toBe(100);
    expect(dimensionInUnit(dim, "mm")).toBe(1000);
    expect(dim.unit).toBe("m");
    expect(dimensionInUnit(null, "ft")).toBeNull();
    expect(dimensionInUnit(unknownDimension(), "ft")).toBeNull();
  });
});

describe("scale handling (§5)", () => {
  it("marks a written scale with sufficient confidence as usable", () => {
    const scale = evaluateScale("written_scale", "1:100", 0.9);
    expect(scale.usable).toBe(true);
    expect(scale.source).toBe("written_scale");
    expect(scale.reason).toContain("1:100");
  });

  it("rejects a scale below the confidence threshold", () => {
    const scale = evaluateScale(
      "written_scale",
      "1:100",
      SCALE_USABLE_CONFIDENCE - 0.01,
    );
    expect(scale.usable).toBe(false);
    expect(scale.reason).toContain("below the");
    expect(scale.reason).toContain("% threshold");
  });

  it("treats unknown source as unusable and asks for manual input", () => {
    const scale = evaluateScale("unknown", "", 0.9);
    expect(scale.usable).toBe(false);
    expect(scale.reason).toMatch(/confirm dimensions manually/i);
  });

  it("missing scale never guesses", () => {
    const scale = missingScale();
    expect(scale.source).toBe("unknown");
    expect(scale.usable).toBe(false);
    expect(scale.reason).toContain("will not guess");
  });

  it("a user-calibrated scale is usable by definition", () => {
    const scale = userCalibratedScale("1:50");
    expect(scale.usable).toBe(true);
    expect(scale.source).toBe("user_calibrated");
    expect(scale.confidence).toBe(1);
  });
});

describe("document reliability tiers (§16, photos are never dimension-grade)", () => {
  it("classifies drawings as dimension-grade", () => {
    expect(isDimensionGrade(DOCUMENT_RELIABILITY.floor_plan)).toBe(true);
    expect(isDimensionGrade(DOCUMENT_RELIABILITY.architectural_pdf)).toBe(true);
    expect(isDimensionGrade(DOCUMENT_RELIABILITY.roof_plan)).toBe(true);
  });

  it("classifies photographs and screenshots as visual-only", () => {
    expect(isDimensionGrade(DOCUMENT_RELIABILITY.photograph)).toBe(false);
    expect(isDimensionGrade(DOCUMENT_RELIABILITY.screenshot)).toBe(false);
    expect(DOCUMENT_RELIABILITY.photograph).toBe("visual_only");
  });

  it("classifies scanned plans as undimensioned until calibrated", () => {
    expect(DOCUMENT_RELIABILITY.scanned_plan).toBe("undimensioned_drawing");
  });
});

describe("dimension contradiction comparison (unit-safe)", () => {
  it("does not flag metric vs imperial expression of the same length", () => {
    const metric = explicitDimension(3.048, "m", 0.9);
    const imperial = explicitDimension(10, "ft", 0.9); // 10 ft = 3.048 m
    expect(dimensionsContradict(metric, imperial)).toBe(false);
  });

  it("flags values differing beyond 10%", () => {
    expect(
      dimensionsContradict(
        explicitDimension(3, "m", 0.9),
        explicitDimension(3.5, "m", 0.9),
      ),
    ).toBe(true);
    expect(
      dimensionsContradict(
        explicitDimension(3, "m", 0.9),
        explicitDimension(3.2, "m", 0.9),
      ),
    ).toBe(false);
  });

  it("compares mm drawings against m facts correctly", () => {
    const mm = explicitDimension(15000, "mm", 0.95); // 15 m
    const m = explicitDimension(15, "m", 0.95);
    expect(dimensionsContradict(mm, m)).toBe(false);
    const m2 = explicitDimension(12, "m", 0.95);
    expect(dimensionsContradict(mm, m2)).toBe(true);
  });

  it("isUnknown guards unknown dimensions", () => {
    expect(isUnknown(null)).toBe(true);
    expect(isUnknown(unknownDimension())).toBe(true);
    expect(isUnknown(explicitDimension(3, "m", 1))).toBe(false);
  });
});
