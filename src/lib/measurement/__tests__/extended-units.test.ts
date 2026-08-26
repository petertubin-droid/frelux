/**
 * Tests for the Extended Units module (Feature 1 — Universal Measurement Engine)
 *
 * Tests:
 * - Extended length conversions (mm, cm, ft, in, m)
 * - Volume conversions (m³, ft³, L)
 * - Quantity unit labels
 * - Calculator-declared unit support
 * - Extended area conversions
 * - Unit system preference defaults
 * - Backward compatibility with existing units
 */

import { describe, it, expect } from "vitest";
import {
  // Extended length
  toMetersExtended,
  fromMetersExtended,
  convertLength,
  extendedLengthUnitLabel,
  extendedLengthUnitShort,
  // Volume
  toCubicMeters,
  fromCubicMeters,
  convertVolume,
  volumeUnitLabel,
  volumeUnitShort,
  // Quantity
  quantityUnitLabel,
  quantityUnitShort,
  // Calculator support
  getSupportedLengthUnits,
  getSupportedQuantityUnits,
  isLengthUnitSupported,
  isQuantityUnitSupported,
  CALCULATOR_UNIT_SUPPORT,
  // Extended area
  toSqMetersExtended,
  fromSqMetersExtended,
  extendedAreaUnitLabel,
  // System preference
  defaultLengthUnitForSystem,
  defaultAreaUnitForSystem,
  defaultVolumeUnitForSystem,
} from "../extended-units";

// Also test backward compatibility with existing units
import { toMeters, fromMeters, sqftToSqm, sqmToSqft } from "../units";

describe("Extended Length Units", () => {
  describe("toMetersExtended", () => {
    it("converts millimetres to metres", () => {
      expect(toMetersExtended(1000, "millimeters")).toBe(1);
      expect(toMetersExtended(600, "millimeters")).toBe(0.6);
      expect(toMetersExtended(1, "millimeters")).toBe(0.001);
    });

    it("converts centimetres to metres", () => {
      expect(toMetersExtended(100, "centimeters")).toBe(1);
      expect(toMetersExtended(60, "centimeters")).toBe(0.6);
      expect(toMetersExtended(1, "centimeters")).toBe(0.01);
    });

    it("passes through metres unchanged", () => {
      expect(toMetersExtended(5, "meters")).toBe(5);
    });

    it("converts feet to metres (backward compatible)", () => {
      expect(toMetersExtended(10, "feet")).toBeCloseTo(3.048, 10);
    });

    it("converts inches to metres (backward compatible)", () => {
      expect(toMetersExtended(12, "inches")).toBeCloseTo(0.3048, 10);
    });
  });

  describe("fromMetersExtended", () => {
    it("converts metres to millimetres", () => {
      expect(fromMetersExtended(1, "millimeters")).toBe(1000);
      expect(fromMetersExtended(0.6, "millimeters")).toBe(600);
    });

    it("converts metres to centimetres", () => {
      expect(fromMetersExtended(1, "centimeters")).toBe(100);
      expect(fromMetersExtended(0.6, "centimeters")).toBe(60);
    });

    it("converts metres to feet (backward compatible)", () => {
      expect(fromMetersExtended(3.048, "feet")).toBeCloseTo(10, 6);
    });

    it("converts metres to inches (backward compatible)", () => {
      expect(fromMetersExtended(0.3048, "inches")).toBeCloseTo(12, 6);
    });
  });

  describe("convertLength", () => {
    it("converts mm to cm", () => {
      expect(convertLength(100, "millimeters", "centimeters")).toBe(10);
    });

    it("converts feet to mm", () => {
      expect(convertLength(1, "feet", "millimeters")).toBeCloseTo(304.8, 2);
    });

    it("converts inches to cm", () => {
      expect(convertLength(1, "inches", "centimeters")).toBeCloseTo(2.54, 4);
    });

    it("converts mm to feet", () => {
      expect(convertLength(304.8, "millimeters", "feet")).toBeCloseTo(1, 4);
    });

    it("converts cm to metres", () => {
      expect(convertLength(100, "centimeters", "meters")).toBe(1);
    });

    it("converts metres to mm", () => {
      expect(convertLength(1, "meters", "millimeters")).toBe(1000);
    });
  });

  describe("Labels", () => {
    it("returns full labels", () => {
      expect(extendedLengthUnitLabel("millimeters")).toBe("Millimetres");
      expect(extendedLengthUnitLabel("centimeters")).toBe("Centimetres");
      expect(extendedLengthUnitLabel("feet")).toBe("Feet");
      expect(extendedLengthUnitLabel("meters")).toBe("Metres");
      expect(extendedLengthUnitLabel("inches")).toBe("Inches");
    });

    it("returns short labels", () => {
      expect(extendedLengthUnitShort("millimeters")).toBe("mm");
      expect(extendedLengthUnitShort("centimeters")).toBe("cm");
      expect(extendedLengthUnitShort("feet")).toBe("ft");
      expect(extendedLengthUnitShort("meters")).toBe("m");
      expect(extendedLengthUnitShort("inches")).toBe("in");
    });
  });
});

describe("Volume Units", () => {
  describe("toCubicMeters", () => {
    it("passes through cubic metres", () => {
      expect(toCubicMeters(1, "cubic_meters")).toBe(1);
      expect(toCubicMeters(2.5, "cubic_meters")).toBe(2.5);
    });

    it("converts cubic feet to cubic metres", () => {
      // 1 ft³ = 0.028316846592 m³
      expect(toCubicMeters(1, "cubic_feet")).toBeCloseTo(0.028316846592, 10);
      expect(toCubicMeters(35.3147, "cubic_feet")).toBeCloseTo(1, 3);
    });

    it("converts litres to cubic metres", () => {
      expect(toCubicMeters(1000, "litres")).toBe(1);
      expect(toCubicMeters(1, "litres")).toBe(0.001);
      expect(toCubicMeters(20, "litres")).toBe(0.02);
    });
  });

  describe("fromCubicMeters", () => {
    it("converts cubic metres to cubic feet", () => {
      expect(fromCubicMeters(1, "cubic_feet")).toBeCloseTo(35.3147, 2);
    });

    it("converts cubic metres to litres", () => {
      expect(fromCubicMeters(1, "litres")).toBe(1000);
      expect(fromCubicMeters(0.02, "litres")).toBe(20);
    });
  });

  describe("convertVolume", () => {
    it("converts litres to cubic feet", () => {
      // 1000 L = 1 m³ ≈ 35.3147 ft³
      expect(convertVolume(1000, "litres", "cubic_feet")).toBeCloseTo(
        35.3147,
        2,
      );
    });

    it("converts cubic feet to litres", () => {
      // 1 ft³ = 0.028316846592 m³ = 28.316846592 L
      expect(convertVolume(1, "cubic_feet", "litres")).toBeCloseTo(28.3168, 2);
    });
  });

  describe("Labels", () => {
    it("returns full labels", () => {
      expect(volumeUnitLabel("cubic_meters")).toBe("Cubic Metres (m³)");
      expect(volumeUnitLabel("cubic_feet")).toBe("Cubic Feet (ft³)");
      expect(volumeUnitLabel("litres")).toBe("Litres (L)");
    });

    it("returns short labels", () => {
      expect(volumeUnitShort("cubic_meters")).toBe("m³");
      expect(volumeUnitShort("cubic_feet")).toBe("ft³");
      expect(volumeUnitShort("litres")).toBe("L");
    });
  });
});

describe("Quantity Units", () => {
  it("returns labels for all quantity units", () => {
    expect(quantityUnitLabel("pieces")).toBe("Pieces");
    expect(quantityUnitLabel("bags")).toBe("Bags");
    expect(quantityUnitLabel("buckets")).toBe("Buckets");
    expect(quantityUnitLabel("cartons")).toBe("Cartons");
    expect(quantityUnitLabel("packs")).toBe("Packs");
    expect(quantityUnitLabel("sheets")).toBe("Sheets");
    expect(quantityUnitLabel("rolls")).toBe("Rolls");
    expect(quantityUnitLabel("partitions")).toBe("Partitions");
    expect(quantityUnitLabel("other")).toBe("Other");
  });

  it("returns short labels", () => {
    expect(quantityUnitShort("pieces")).toBe("pcs");
    expect(quantityUnitShort("bags")).toBe("bags");
    expect(quantityUnitShort("buckets")).toBe("buckets");
    expect(quantityUnitShort("cartons")).toBe("cartons");
  });
});

describe("Calculator Unit Support", () => {
  it("painting supports feet and meters, not inches", () => {
    const units = getSupportedLengthUnits("painting");
    expect(units).toContain("feet");
    expect(units).toContain("meters");
    expect(units).not.toContain("inches");
    expect(units).not.toContain("millimeters");
  });

  it("block supports inches", () => {
    const units = getSupportedLengthUnits("block");
    expect(units).toContain("inches");
    expect(units).toContain("feet");
    expect(units).toContain("meters");
  });

  it("tiling supports mm and cm", () => {
    const units = getSupportedLengthUnits("tiling");
    expect(units).toContain("millimeters");
    expect(units).toContain("centimeters");
    expect(units).toContain("feet");
    expect(units).toContain("meters");
  });

  it("screeding supports buckets and bags", () => {
    const units = getSupportedQuantityUnits("screeding");
    expect(units).toContain("buckets");
    expect(units).toContain("bags");
  });

  it("tiling supports cartons, packs, and pieces", () => {
    const units = getSupportedQuantityUnits("tiling");
    expect(units).toContain("cartons");
    expect(units).toContain("packs");
    expect(units).toContain("pieces");
  });

  it("isLengthUnitSupported works", () => {
    expect(isLengthUnitSupported("block", "inches")).toBe(true);
    expect(isLengthUnitSupported("painting", "inches")).toBe(false);
    expect(isLengthUnitSupported("tiling", "millimeters")).toBe(true);
    expect(isLengthUnitSupported("painting", "millimeters")).toBe(false);
  });

  it("isQuantityUnitSupported works", () => {
    expect(isQuantityUnitSupported("screeding", "buckets")).toBe(true);
    expect(isQuantityUnitSupported("painting", "cartons")).toBe(false);
    expect(isQuantityUnitSupported("tiling", "cartons")).toBe(true);
  });

  it("all calculator contexts have declarations", () => {
    const contexts = [
      "painting",
      "screeding",
      "tiling",
      "grafitex",
      "block",
      "pop",
      "tyrolene",
      "fence_screeding",
      "fence_painting",
    ] as const;
    for (const ctx of contexts) {
      expect(CALCULATOR_UNIT_SUPPORT[ctx]).toBeDefined();
      expect(CALCULATOR_UNIT_SUPPORT[ctx].lengthUnits.length).toBeGreaterThan(
        0,
      );
      expect(CALCULATOR_UNIT_SUPPORT[ctx].quantityUnits.length).toBeGreaterThan(
        0,
      );
    }
  });
});

describe("Extended Area Units", () => {
  it("converts sqcm to sqm", () => {
    expect(toSqMetersExtended(10000, "sqcm")).toBe(1);
    expect(toSqMetersExtended(100, "sqcm")).toBe(0.01);
  });

  it("converts sqmm to sqm", () => {
    expect(toSqMetersExtended(1000000, "sqmm")).toBe(1);
    expect(toSqMetersExtended(10000, "sqmm")).toBe(0.01);
  });

  it("converts sqft to sqm (backward compatible)", () => {
    expect(toSqMetersExtended(1, "sqft")).toBeCloseTo(0.092903, 6);
  });

  it("converts sqm to sqcm", () => {
    expect(fromSqMetersExtended(1, "sqcm")).toBe(10000);
  });

  it("converts sqm to sqmm", () => {
    expect(fromSqMetersExtended(1, "sqmm")).toBe(1000000);
  });

  it("returns labels", () => {
    expect(extendedAreaUnitLabel("sqm")).toBe("m²");
    expect(extendedAreaUnitLabel("sqft")).toBe("ft²");
    expect(extendedAreaUnitLabel("sqcm")).toBe("cm²");
    expect(extendedAreaUnitLabel("sqmm")).toBe("mm²");
  });
});

describe("Unit System Preferences", () => {
  it("metric defaults to meters", () => {
    expect(defaultLengthUnitForSystem("metric")).toBe("meters");
  });

  it("imperial defaults to feet", () => {
    expect(defaultLengthUnitForSystem("imperial")).toBe("feet");
  });

  it("mixed defaults to meters", () => {
    expect(defaultLengthUnitForSystem("mixed")).toBe("meters");
  });

  it("metric area default is sqm", () => {
    expect(defaultAreaUnitForSystem("metric")).toBe("sqm");
  });

  it("imperial area default is sqft", () => {
    expect(defaultAreaUnitForSystem("imperial")).toBe("sqft");
  });

  it("metric volume default is litres", () => {
    expect(defaultVolumeUnitForSystem("metric")).toBe("litres");
  });

  it("imperial volume default is cubic_feet", () => {
    expect(defaultVolumeUnitForSystem("imperial")).toBe("cubic_feet");
  });
});

describe("Backward Compatibility", () => {
  it("existing toMeters still works for feet", () => {
    expect(toMeters(10, "feet")).toBeCloseTo(3.048, 10);
  });

  it("existing toMeters still works for meters", () => {
    expect(toMeters(5, "meters")).toBe(5);
  });

  it("existing toMeters still works for inches", () => {
    expect(toMeters(12, "inches")).toBeCloseTo(0.3048, 10);
  });

  it("existing fromMeters still works", () => {
    expect(fromMeters(3.048, "feet")).toBeCloseTo(10, 6);
    expect(fromMeters(5, "meters")).toBe(5);
  });

  it("existing sqftToSqm still works", () => {
    expect(sqftToSqm(100)).toBeCloseTo(9.2903, 3);
  });

  it("existing sqmToSqft still works", () => {
    expect(sqmToSqft(10)).toBeCloseTo(107.639, 2);
  });

  it("extended conversions match existing conversions for shared units", () => {
    expect(toMetersExtended(10, "feet")).toBe(toMeters(10, "feet"));
    expect(toMetersExtended(12, "inches")).toBe(toMeters(12, "inches"));
    expect(toMetersExtended(5, "meters")).toBe(toMeters(5, "meters"));
  });
});

describe("Precision and Round-Trip", () => {
  it("round-trip mm → m → mm preserves value", () => {
    const original = 600;
    const m = toMetersExtended(original, "millimeters");
    const back = fromMetersExtended(m, "millimeters");
    expect(back).toBeCloseTo(original, 6);
  });

  it("round-trip cm → m → cm preserves value", () => {
    const original = 60;
    const m = toMetersExtended(original, "centimeters");
    const back = fromMetersExtended(m, "centimeters");
    expect(back).toBeCloseTo(original, 6);
  });

  it("round-trip litres → m³ → litres preserves value", () => {
    const original = 20;
    const m3 = toCubicMeters(original, "litres");
    const back = fromCubicMeters(m3, "litres");
    expect(back).toBeCloseTo(original, 6);
  });

  it("round-trip ft³ → m³ → ft³ preserves value", () => {
    const original = 5;
    const m3 = toCubicMeters(original, "cubic_feet");
    const back = fromCubicMeters(m3, "cubic_feet");
    expect(back).toBeCloseTo(original, 6);
  });

  it("round-trip sqcm → sqm → sqcm preserves value", () => {
    const original = 5000;
    const sqm = toSqMetersExtended(original, "sqcm");
    const back = fromSqMetersExtended(sqm, "sqcm");
    expect(back).toBeCloseTo(original, 2);
  });

  it("cross-conversion mm → feet → mm is consistent", () => {
    const original = 304.8; // 1 foot in mm
    const ft = convertLength(original, "millimeters", "feet");
    expect(ft).toBeCloseTo(1, 4);
    const back = convertLength(ft, "feet", "millimeters");
    expect(back).toBeCloseTo(original, 2);
  });
});
