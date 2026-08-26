import { describe, it, expect } from "vitest";
import {
  MM_TO_M,
  CM_TO_M,
  M_TO_MM,
  M_TO_CM,
  CUBIC_FT_TO_CUBIC_M,
  CUBIC_M_TO_LITRES,
  LITRES_TO_CUBIC_M,
  CUBIC_M_TO_CUBIC_FT,
  SQCM_TO_SQM,
  SQMM_TO_SQM,
  toMetersExtended,
  fromMetersExtended,
  convertLength,
  extendedLengthUnitLabel,
  extendedLengthUnitShort,
  toCubicMeters,
  fromCubicMeters,
  convertVolume,
  volumeUnitLabel,
  volumeUnitShort,
  quantityUnitLabel,
  quantityUnitShort,
  QUANTITY_UNIT_LABELS,
  QUANTITY_UNIT_SHORT,
  getSupportedLengthUnits,
  getSupportedQuantityUnits,
  isLengthUnitSupported,
  isQuantityUnitSupported,
  toSqMetersExtended,
  fromSqMetersExtended,
  extendedAreaUnitLabel,
  defaultLengthUnitForSystem,
  defaultAreaUnitForSystem,
  defaultVolumeUnitForSystem,
} from "@/lib/measurement/extended-units";

describe("extended-units — constants", () => {
  it("MM_TO_M is 0.001", () => expect(MM_TO_M).toBe(0.001));
  it("CM_TO_M is 0.01", () => expect(CM_TO_M).toBe(0.01));
  it("M_TO_MM is 1000", () => expect(M_TO_MM).toBe(1000));
  it("M_TO_CM is 100", () => expect(M_TO_CM).toBe(100));
  it("CUBIC_M_TO_LITRES is 1000", () => expect(CUBIC_M_TO_LITRES).toBe(1000));
  it("LITRES_TO_CUBIC_M is 0.001", () => expect(LITRES_TO_CUBIC_M).toBe(0.001));
  it("SQCM_TO_SQM is 0.0001", () => expect(SQCM_TO_SQM).toBe(0.0001));
  it("SQMM_TO_SQM is 0.000001", () => expect(SQMM_TO_SQM).toBe(0.000001));
  it("CUBIC_FT_TO_CUBIC_M is positive", () =>
    expect(CUBIC_FT_TO_CUBIC_M).toBeGreaterThan(0));
  it("CUBIC_M_TO_CUBIC_FT is reciprocal of CUBIC_FT_TO_CUBIC_M", () =>
    expect(CUBIC_M_TO_CUBIC_FT).toBeCloseTo(1 / CUBIC_FT_TO_CUBIC_M, 6));
});

describe("extended-units — toMetersExtended", () => {
  it("returns value as-is for meters", () => {
    expect(toMetersExtended(5, "meters")).toBe(5);
  });
  it("converts feet to meters", () => {
    expect(toMetersExtended(10, "feet")).toBeCloseTo(10 * 0.3048, 6);
  });
  it("converts inches to meters", () => {
    expect(toMetersExtended(12, "inches")).toBeCloseTo(12 * 0.0254, 6);
  });
  it("converts millimeters to meters", () => {
    expect(toMetersExtended(1000, "millimeters")).toBe(1);
  });
  it("converts centimeters to meters", () => {
    expect(toMetersExtended(100, "centimeters")).toBe(1);
  });
  it("throws for unknown unit", () => {
    expect(() => toMetersExtended(1, "unknown" as never)).toThrow();
  });
});

describe("extended-units — fromMetersExtended", () => {
  it("returns value as-is for meters", () => {
    expect(fromMetersExtended(5, "meters")).toBe(5);
  });
  it("converts meters to feet", () => {
    expect(fromMetersExtended(3.048, "feet")).toBeCloseTo(10, 3);
  });
  it("converts meters to millimeters", () => {
    expect(fromMetersExtended(1, "millimeters")).toBe(1000);
  });
  it("converts meters to centimeters", () => {
    expect(fromMetersExtended(1, "centimeters")).toBe(100);
  });
});

describe("extended-units — convertLength", () => {
  it("converts feet to meters", () => {
    expect(convertLength(10, "feet", "meters")).toBeCloseTo(3.048, 3);
  });
  it("converts inches to centimeters", () => {
    expect(convertLength(1, "inches", "centimeters")).toBeCloseTo(2.54, 2);
  });
  it("identity for same unit", () => {
    expect(convertLength(5, "meters", "meters")).toBe(5);
  });
});

describe("extended-units — extendedLengthUnitLabel", () => {
  it("returns label for each unit", () => {
    expect(extendedLengthUnitLabel("meters")).toBe("Metres");
    expect(extendedLengthUnitLabel("feet")).toBe("Feet");
    expect(extendedLengthUnitLabel("inches")).toBe("Inches");
    expect(extendedLengthUnitLabel("millimeters")).toBe("Millimetres");
    expect(extendedLengthUnitLabel("centimeters")).toBe("Centimetres");
  });
});

describe("extended-units — extendedLengthUnitShort", () => {
  it("returns short label for each unit", () => {
    expect(extendedLengthUnitShort("meters")).toBeTruthy();
    expect(extendedLengthUnitShort("feet")).toBeTruthy();
  });
});

describe("extended-units — toCubicMeters", () => {
  it("returns value as-is for cubic_meters", () => {
    expect(toCubicMeters(5, "cubic_meters")).toBe(5);
  });
  it("converts litres to cubic meters", () => {
    expect(toCubicMeters(1000, "litres")).toBe(1);
  });
  it("converts cubic_feet to cubic meters", () => {
    expect(toCubicMeters(1, "cubic_feet")).toBeCloseTo(CUBIC_FT_TO_CUBIC_M, 6);
  });
});

describe("extended-units — fromCubicMeters", () => {
  it("returns value as-is for cubic_meters", () => {
    expect(fromCubicMeters(5, "cubic_meters")).toBe(5);
  });
  it("converts cubic meters to litres", () => {
    expect(fromCubicMeters(1, "litres")).toBe(1000);
  });
  it("converts cubic meters to cubic feet", () => {
    expect(fromCubicMeters(1, "cubic_feet")).toBeCloseTo(
      CUBIC_M_TO_CUBIC_FT,
      4,
    );
  });
});

describe("extended-units — convertVolume", () => {
  it("converts litres to cubic_meters", () => {
    expect(convertVolume(1000, "litres", "cubic_meters")).toBe(1);
  });
  it("identity for same unit", () => {
    expect(convertVolume(5, "cubic_meters", "cubic_meters")).toBe(5);
  });
});

describe("extended-units — volumeUnitLabel", () => {
  it("returns labels", () => {
    expect(volumeUnitLabel("cubic_meters")).toBeTruthy();
    expect(volumeUnitLabel("litres")).toBeTruthy();
    expect(volumeUnitLabel("cubic_feet")).toBeTruthy();
  });
});

describe("extended-units — volumeUnitShort", () => {
  it("returns short labels", () => {
    expect(volumeUnitShort("cubic_meters")).toBeTruthy();
    expect(volumeUnitShort("litres")).toBeTruthy();
  });
});

describe("extended-units — QUANTITY_UNIT_LABELS and SHORT", () => {
  it("QUANTITY_UNIT_LABELS is a record", () => {
    expect(typeof QUANTITY_UNIT_LABELS).toBe("object");
  });
  it("QUANTITY_UNIT_SHORT is a record", () => {
    expect(typeof QUANTITY_UNIT_SHORT).toBe("object");
  });
  it("quantityUnitLabel returns a string", () => {
    expect(typeof quantityUnitLabel("bags")).toBe("string");
  });
  it("quantityUnitShort returns a string", () => {
    expect(typeof quantityUnitShort("bags")).toBe("string");
  });
});

describe("extended-units — getSupportedLengthUnits", () => {
  it("returns array for painting context", () => {
    const units = getSupportedLengthUnits("painting");
    expect(Array.isArray(units)).toBe(true);
    expect(units.length).toBeGreaterThan(0);
    expect(units).toContain("meters");
  });
});

describe("extended-units — getSupportedQuantityUnits", () => {
  it("returns array for painting context", () => {
    const units = getSupportedQuantityUnits("painting");
    expect(Array.isArray(units)).toBe(true);
    expect(units.length).toBeGreaterThan(0);
  });
});

describe("extended-units — isLengthUnitSupported", () => {
  it("true for meters in painting", () => {
    expect(isLengthUnitSupported("painting", "meters")).toBe(true);
  });
  it("false for unsupported unit", () => {
    expect(isLengthUnitSupported("painting", "lightyears" as never)).toBe(
      false,
    );
  });
});

describe("extended-units — isQuantityUnitSupported", () => {
  it("returns boolean", () => {
    expect(typeof isQuantityUnitSupported("painting", "bags")).toBe("boolean");
  });
});

describe("extended-units — toSqMetersExtended", () => {
  it("returns value as-is for sqm", () => {
    expect(toSqMetersExtended(10, "sqm")).toBe(10);
  });
  it("converts sqcm to sqm", () => {
    expect(toSqMetersExtended(10000, "sqcm")).toBe(1);
  });
  it("converts sqmm to sqm", () => {
    expect(toSqMetersExtended(1000000, "sqmm")).toBe(1);
  });
});

describe("extended-units — fromSqMetersExtended", () => {
  it("returns value as-is for sqm", () => {
    expect(fromSqMetersExtended(10, "sqm")).toBe(10);
  });
  it("converts sqm to sqcm", () => {
    expect(fromSqMetersExtended(1, "sqcm")).toBe(10000);
  });
  it("converts sqm to sqmm", () => {
    expect(fromSqMetersExtended(1, "sqmm")).toBe(1000000);
  });
});

describe("extended-units — extendedAreaUnitLabel", () => {
  it("returns label", () => {
    expect(extendedAreaUnitLabel("sqm")).toBeTruthy();
    expect(extendedAreaUnitLabel("sqft")).toBeTruthy();
  });
});

describe("extended-units — defaultLengthUnitForSystem", () => {
  it("meters for metric", () =>
    expect(defaultLengthUnitForSystem("metric")).toBe("meters"));
  it("feet for imperial", () =>
    expect(defaultLengthUnitForSystem("imperial")).toBe("feet"));
  it("meters for mixed", () =>
    expect(defaultLengthUnitForSystem("mixed")).toBe("meters"));
});

describe("extended-units — defaultAreaUnitForSystem", () => {
  it("sqm for metric", () =>
    expect(defaultAreaUnitForSystem("metric")).toBe("sqm"));
  it("sqft for imperial", () =>
    expect(defaultAreaUnitForSystem("imperial")).toBe("sqft"));
  it("sqm for mixed", () =>
    expect(defaultAreaUnitForSystem("mixed")).toBe("sqm"));
});

describe("extended-units — defaultVolumeUnitForSystem", () => {
  it("litres for metric", () =>
    expect(defaultVolumeUnitForSystem("metric")).toBe("litres"));
  it("cubic_feet for imperial", () =>
    expect(defaultVolumeUnitForSystem("imperial")).toBe("cubic_feet"));
  it("litres for mixed", () =>
    expect(defaultVolumeUnitForSystem("mixed")).toBe("litres"));
});
