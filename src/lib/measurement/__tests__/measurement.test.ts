/**
 * FRELUX Measurement Architecture — Tests
 *
 * Validates the core acceptance criteria from the specification.
 */

import { describe, test, expect } from "vitest";
import {
  toMeters,
  fromMeters,
  sqftToSqm,
  sqmToSqft,
  getAllowedUnits,
  isInchesAllowed,
  tileAreaM2,
  calculateMeasurementProject,
  calculateMeasurementEntry,
  calculateTileRequirement,
  validateMeasurementEntry,
  validateMeasurementProject,
  createMeasurementProject,
  createMeasurementSection,
  createMeasurementGroup,
  createMeasurementEntry,
} from "../index";

// =========================================================
// 1. Unit Conversions (spec section 24, acceptance #7–8)
// =========================================================

describe("Unit Conversion Engine", () => {
  test("feet → metres: 10 ft = 3.048 m (exact)", () => {
    expect(toMeters(10, "feet")).toBeCloseTo(3.048, 10);
  });

  test("metres → metres: 5 m = 5 m (identity)", () => {
    expect(toMeters(5, "meters")).toBe(5);
  });

  test("inches → metres: 12 in = 0.3048 m (exact)", () => {
    expect(toMeters(12, "inches")).toBeCloseTo(0.3048, 10);
  });

  test("fromMeters round-trip: 10 ft → m → ft", () => {
    const m = toMeters(10, "feet");
    const ft = fromMeters(m, "feet");
    expect(ft).toBeCloseTo(10, 6);
  });

  test("sqft → sqm: 100 ft² = 9.2903... m²", () => {
    expect(sqftToSqm(100)).toBeCloseTo(9.290304, 6);
  });

  test("sqm → sqft round-trip: 50 m² → ft² → m²", () => {
    const ft2 = sqmToSqft(50);
    const m2 = sqftToSqm(ft2);
    expect(m2).toBeCloseTo(50, 4);
  });

  test("Never relabel area: 10 ft² is NOT 10 m²", () => {
    const wrong = 10; // if someone just relabels
    const correct = sqftToSqm(10);
    expect(correct).not.toBe(wrong);
    expect(correct).toBeCloseTo(0.9290304, 6);
  });
});

// =========================================================
// 2. Context-Aware Unit Selector (spec section 22, acceptance #27–28)
// =========================================================

describe("Context-Aware Units", () => {
  test("painting allows feet and metres only", () => {
    expect(getAllowedUnits("painting")).toEqual(["feet", "meters"]);
  });

  test("screeding allows feet and metres only", () => {
    expect(getAllowedUnits("screeding")).toEqual(["feet", "meters"]);
  });

  test("tiling allows feet and metres only", () => {
    expect(getAllowedUnits("tiling")).toEqual(["feet", "meters"]);
  });

  test("grafitex allows feet and metres only", () => {
    expect(getAllowedUnits("grafitex")).toEqual(["feet", "meters"]);
  });

  test("block allows feet, metres, and inches", () => {
    expect(getAllowedUnits("block")).toEqual(["feet", "meters", "inches"]);
  });

  test("inches allowed ONLY in block calculator", () => {
    expect(isInchesAllowed("block")).toBe(true);
    expect(isInchesAllowed("painting")).toBe(false);
    expect(isInchesAllowed("screeding")).toBe(false);
    expect(isInchesAllowed("tiling")).toBe(false);
    expect(isInchesAllowed("grafitex")).toBe(false);
  });
});

// =========================================================
// 3. Single Room Calculation (acceptance #1)
// =========================================================

describe("Single Room Calculation", () => {
  test("room 12×12 ft, 8 ft height → wall area in m²", () => {
    const entry = createMeasurementEntry({
      length: 12,
      width: 12,
      height: 8,
      unit: "feet",
      quantity: 1,
      surfaceType: "wall",
    });

    const result = calculateMeasurementEntry(entry);
    const lengthM = toMeters(12, "feet"); // 3.6576
    const widthM = toMeters(12, "feet");
    const heightM = toMeters(8, "feet"); // 2.4384
    const perimeter = 2 * (lengthM + widthM);
    const expectedArea = perimeter * heightM;

    expect(result.areaM2).toBeCloseTo(expectedArea, 4);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  test("metre measurements work directly (acceptance #8)", () => {
    const entry = createMeasurementEntry({
      length: 4,
      width: 3,
      height: 2.5,
      unit: "meters",
      quantity: 1,
      surfaceType: "wall",
    });

    const result = calculateMeasurementEntry(entry);
    // 2 * (4 + 3) * 2.5 = 35 m²
    expect(result.areaM2).toBeCloseTo(35, 4);
  });
});

// =========================================================
// 4. Multiple Identical Rooms (acceptance #2)
// =========================================================

describe("Multiple Identical Rooms", () => {
  test("12×12 ft bedroom × 2 = double the area", () => {
    const entry1 = createMeasurementEntry({
      length: 12,
      width: 12,
      height: 8,
      unit: "feet",
      quantity: 2,
      surfaceType: "wall",
    });

    const result1 = calculateMeasurementEntry(entry1);
    const singleResult = calculateMeasurementEntry({
      ...entry1,
      quantity: 1,
    });

    expect(result1.totalAreaM2).toBeCloseTo(singleResult.areaM2 * 2, 4);
  });
});

// =========================================================
// 5. Different Room Types (acceptance #3–4, #6)
// =========================================================

describe("Different Room Types", () => {
  test("bedroom and kitchen with different dimensions remain separate", () => {
    const project = createMeasurementProject("screeding", "feet");
    project.projectMode = "house_building";

    const bedroomEntry = createMeasurementEntry({
      length: 12,
      width: 12,
      height: 8,
      unit: "feet",
      quantity: 2,
      surfaceType: "wall",
      spaceType: "bedroom",
    });
    const kitchenEntry = createMeasurementEntry({
      length: 10,
      width: 10,
      height: 8,
      unit: "feet",
      quantity: 1,
      surfaceType: "wall",
      spaceType: "kitchen",
    });

    project.sections = [
      createMeasurementSection("Bedrooms", [
        createMeasurementGroup("12×12 ft Bedroom ×2", bedroomEntry),
      ]),
      createMeasurementSection("Kitchen", [
        createMeasurementGroup("10×10 ft Kitchen", kitchenEntry),
      ]),
    ];

    const result = calculateMeasurementProject(project);
    expect(result.sectionResults.length).toBe(2);
    expect(result.sectionResults[0].totalAreaM2).not.toBeCloseTo(
      result.sectionResults[1].totalAreaM2,
      1,
    );
    expect(result.totalAreaM2).toBeCloseTo(
      result.sectionResults[0].totalAreaM2 +
        result.sectionResults[1].totalAreaM2,
      6,
    );
  });
});

// =========================================================
// 6. Screeding in m² (acceptance #6, #15)
// =========================================================

describe("Screeding Calculation", () => {
  test("screeding result is in m²", () => {
    const entry = createMeasurementEntry({
      length: 10,
      width: 7,
      height: 8,
      unit: "feet",
      quantity: 1,
      surfaceType: "wall",
    });

    const result = calculateMeasurementEntry(entry);
    expect(result.areaM2).toBeGreaterThan(0);
    // Verify it's in m², not ft²
    const ft2Area = 2 * (10 + 7) * 8; // 272 ft²
    expect(result.areaM2).toBeLessThan(ft2Area); // m² should be smaller number than ft²
  });

  test("feet-to-metre conversion is mathematically correct", () => {
    const entry = createMeasurementEntry({
      length: 10,
      width: 7,
      unit: "feet",
      quantity: 1,
      surfaceType: "floor",
    });

    const result = calculateMeasurementEntry(entry);
    const lengthM = toMeters(10, "feet");
    const widthM = toMeters(7, "feet");
    const expected = lengthM * widthM;
    expect(result.areaM2).toBeCloseTo(expected, 6);
  });
});

// =========================================================
// 7. Fence Calculation (acceptance #9–15)
// =========================================================

describe("Fence Calculation", () => {
  test("fence with multiple dimensions, different partitions", () => {
    const project = createMeasurementProject("screeding", "feet");
    project.projectMode = "fence";

    const dim1Entry = createMeasurementEntry({
      length: 10,
      height: 7,
      unit: "feet",
      quantity: 1,
      partitionCount: 3,
      surfaceType: "fence",
    });
    const dim2Entry = createMeasurementEntry({
      length: 12,
      height: 8,
      unit: "feet",
      quantity: 1,
      partitionCount: 4,
      surfaceType: "fence",
    });

    project.sections = [
      createMeasurementSection("Fence Dimensions", [
        createMeasurementGroup("Dimension 1: 3×10ft×7ft", dim1Entry),
        createMeasurementGroup("Dimension 2: 4×12ft×8ft", dim2Entry),
      ]),
    ];

    const result = calculateMeasurementProject(project);

    // Dimension 1: 3 partitions × (10ft × 7ft) = 3 × (3.048 × 2.1336) = 3 × 6.5032... = 19.509...
    const d1LengthM = toMeters(10, "feet");
    const d1HeightM = toMeters(7, "feet");
    const d1Expected = d1LengthM * d1HeightM * 3;

    // Dimension 2: 4 partitions × (12ft × 8ft) = 4 × (3.6576 × 2.4384) = 4 × 8.9186... = 35.674...
    const d2LengthM = toMeters(12, "feet");
    const d2HeightM = toMeters(8, "feet");
    const d2Expected = d2LengthM * d2HeightM * 4;

    const totalExpected = d1Expected + d2Expected;

    expect(result.totalAreaM2).toBeCloseTo(totalExpected, 4);
    expect(result.sectionResults[0].groupResults[0].totalAreaM2).toBeCloseTo(
      d1Expected,
      4,
    );
    expect(result.sectionResults[0].groupResults[1].totalAreaM2).toBeCloseTo(
      d2Expected,
      4,
    );
  });

  test("final fence screeding quantity is in m²", () => {
    const entry = createMeasurementEntry({
      length: 10,
      height: 7,
      unit: "feet",
      quantity: 1,
      partitionCount: 3,
      surfaceType: "fence",
    });

    const result = calculateMeasurementEntry(entry);
    expect(result.areaM2).toBeGreaterThan(0);
    // Check it's m², not ft²
    const ft2 = 10 * 7 * 3; // 210 ft²
    expect(result.areaM2).toBeLessThan(ft2);
  });
});

// =========================================================
// 8. Tiling Calculation (acceptance #22–26)
// =========================================================

describe("Tiling Calculation", () => {
  test("Method A: tiles per carton", () => {
    const areaM2 = 9; // 9 m² surface
    const tileConfig = {
      tileLength: 600,
      tileWidth: 600,
      tileUnit: "mm" as const,
      packagingMethod: "tiles_per_carton" as const,
      tilesPerCarton: 4,
    };

    const result = calculateTileRequirement(areaM2, tileConfig);

    // Tile area: 0.6 × 0.6 = 0.36 m²
    const expectedTileArea = 0.36;
    expect(result.tileAreaM2).toBeCloseTo(expectedTileArea, 4);

    // Tiles required: 9 / 0.36 = 25
    expect(result.tilesRequired).toBeCloseTo(25, 4);

    // Cartons: ceil(25 / 4) = 7
    expect(result.cartonsRequired).toBe(7);
  });

  test("Method B: carton coverage", () => {
    const areaM2 = 15; // 15 m² surface
    const tileConfig = {
      tileLength: 600,
      tileWidth: 600,
      tileUnit: "mm" as const,
      packagingMethod: "carton_coverage" as const,
      cartonCoverageM2: 1.44,
    };

    const result = calculateTileRequirement(areaM2, tileConfig);

    // Cartons: ceil(15 / 1.44) = ceil(10.42) = 11
    expect(result.cartonsRequired).toBe(11);
  });

  test("custom tile size works (not hardcoded)", () => {
    const areaM2 = 10;
    const tileConfig = {
      tileLength: 300,
      tileWidth: 600,
      tileUnit: "mm" as const,
      packagingMethod: "tiles_per_carton" as const,
      tilesPerCarton: 6,
    };

    const result = calculateTileRequirement(areaM2, tileConfig);

    // Tile area: 0.3 × 0.6 = 0.18 m²
    expect(result.tileAreaM2).toBeCloseTo(0.18, 4);
    // Tiles: 10 / 0.18 = 55.56
    expect(result.tilesRequired).toBeCloseTo(55.5556, 2);
    // Cartons: ceil(55.56 / 6) = ceil(9.26) = 10
    expect(result.cartonsRequired).toBe(10);
  });

  test("cartons rounded UP (cannot buy partial carton)", () => {
    const areaM2 = 1; // tiny area
    const tileConfig = {
      tileLength: 600,
      tileWidth: 600,
      tileUnit: "mm" as const,
      packagingMethod: "tiles_per_carton" as const,
      tilesPerCarton: 10,
    };

    const result = calculateTileRequirement(areaM2, tileConfig);
    // Tiles: 1 / 0.36 = 2.78 → 3 tiles, cartons: ceil(2.78/10) = 1
    expect(result.cartonsRequired).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================
// 9. Grafitex (acceptance #20–21)
// =========================================================

describe("Grafitex Calculation", () => {
  test("grafitex surface area is in m²", () => {
    const entry = createMeasurementEntry({
      length: 20,
      height: 10,
      unit: "feet",
      quantity: 1,
      surfaceType: "exterior",
      calculationPurpose: "grafitex",
    });

    const result = calculateMeasurementEntry(entry);
    const lengthM = toMeters(20, "feet");
    const heightM = toMeters(10, "feet");
    const expected = lengthM * heightM;
    expect(result.areaM2).toBeCloseTo(expected, 4);
  });

  test("multiple grafitex surfaces aggregate correctly", () => {
    const project = createMeasurementProject("grafitex", "feet");
    project.projectMode = "exterior";

    const surfaces = [
      createMeasurementEntry({
        length: 40,
        height: 10,
        unit: "feet",
        quantity: 1,
        surfaceType: "exterior",
        description: "Front wall",
      }),
      createMeasurementEntry({
        length: 40,
        height: 10,
        unit: "feet",
        quantity: 1,
        surfaceType: "exterior",
        description: "Rear wall",
      }),
      createMeasurementEntry({
        length: 30,
        height: 10,
        unit: "feet",
        quantity: 1,
        surfaceType: "exterior",
        description: "Left wall",
      }),
      createMeasurementEntry({
        length: 30,
        height: 10,
        unit: "feet",
        quantity: 1,
        surfaceType: "exterior",
        description: "Right wall",
      }),
    ];

    project.sections = [
      createMeasurementSection(
        "Exterior Surfaces",
        surfaces.map((s, i) =>
          createMeasurementGroup(`Surface ${i + 1}: ${s.description}`, s),
        ),
      ),
    ];

    const result = calculateMeasurementProject(project);
    const front = toMeters(40, "feet") * toMeters(10, "feet");
    const left = toMeters(30, "feet") * toMeters(10, "feet");
    const expected = 2 * front + 2 * left;
    expect(result.totalAreaM2).toBeCloseTo(expected, 4);
  });

  test("grafitex does NOT invent material coverage rules", () => {
    // The measurement system only provides the area.
    // It does NOT compute Grafitex material quantity — that's a configurable rule.
    const entry = createMeasurementEntry({
      length: 20,
      height: 10,
      unit: "feet",
      quantity: 1,
      surfaceType: "exterior",
      calculationPurpose: "grafitex",
    });

    const result = calculateMeasurementEntry(entry);
    // Result should have area but NO material quantity
    expect(result.areaM2).toBeGreaterThan(0);
    expect(result).not.toHaveProperty("materialRequired");
    expect(result).not.toHaveProperty("grafitexBuckets");
  });
});

// =========================================================
// 10. Validation (acceptance #37)
// =========================================================

describe("Validation", () => {
  test("rejects zero dimensions", () => {
    const entry = createMeasurementEntry({
      length: 0,
      unit: "feet",
      quantity: 1,
    });
    const result = validateMeasurementEntry(entry, "screeding");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Length"))).toBe(true);
  });

  test("rejects negative dimensions", () => {
    const entry = createMeasurementEntry({
      length: -5,
      unit: "feet",
      quantity: 1,
    });
    const result = validateMeasurementEntry(entry, "screeding");
    expect(result.valid).toBe(false);
  });

  test("rejects inches in painting context", () => {
    const entry = createMeasurementEntry({
      length: 144,
      unit: "inches",
      quantity: 1,
    });
    const result = validateMeasurementEntry(entry, "painting");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("inches"))).toBe(
      true,
    );
  });

  test("allows inches in block context", () => {
    const entry = createMeasurementEntry({
      length: 144,
      unit: "inches",
      quantity: 1,
    });
    const result = validateMeasurementEntry(entry, "block");
    expect(result.valid).toBe(true);
  });

  test("rejects invalid quantity", () => {
    const entry = createMeasurementEntry({
      length: 12,
      unit: "feet",
      quantity: 0,
    });
    const result = validateMeasurementEntry(entry, "screeding");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Quantity"))).toBe(true);
  });

  test("rejects incomplete fence partition", () => {
    const entry = createMeasurementEntry({
      length: 10,
      unit: "feet",
      quantity: 1,
      partitionCount: 0,
    });
    const result = validateMeasurementEntry(entry, "screeding");
    expect(result.valid).toBe(false);
  });

  test("rejects missing tile coverage", () => {
    const entry = createMeasurementEntry({
      length: 10,
      width: 10,
      unit: "feet",
      quantity: 1,
      tileConfig: {
        tileLength: 600,
        tileWidth: 600,
        tileUnit: "mm",
        packagingMethod: "carton_coverage",
        // cartonCoverageM2 missing
      },
    });
    const project = createMeasurementProject("tiling", "feet");
    project.sections = [
      createMeasurementSection("Surfaces", [
        createMeasurementGroup("Test", entry),
      ]),
    ];
    const result = validateMeasurementProject(project);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Carton coverage"))).toBe(true);
  });
});

// =========================================================
// 11. Transparent Breakdown (acceptance #38)
// =========================================================

describe("Transparent Calculation Breakdown", () => {
  test("every result has calculation steps", () => {
    const entry = createMeasurementEntry({
      length: 12,
      width: 12,
      height: 8,
      unit: "feet",
      quantity: 2,
      surfaceType: "wall",
    });

    const result = calculateMeasurementEntry(entry);
    expect(result.steps.length).toBeGreaterThan(0);

    // Should have conversion step
    expect(result.steps.some((s) => s.label.includes("Convert"))).toBe(true);
    // Should have area calculation step
    expect(result.steps.some((s) => s.label.includes("area"))).toBe(true);
    // Should have quantity step
    expect(result.steps.some((s) => s.label.includes("quantity"))).toBe(true);
  });

  test("fence breakdown shows partition-level detail", () => {
    const entry = createMeasurementEntry({
      length: 10,
      height: 7,
      unit: "feet",
      quantity: 1,
      partitionCount: 3,
      surfaceType: "fence",
    });

    const result = calculateMeasurementEntry(entry);
    expect(result.steps.some((s) => s.label.includes("partition"))).toBe(true);
    expect(result.steps.some((s) => s.label.includes("dimension"))).toBe(true);
  });
});

// =========================================================
// 12. Data Model Separation (acceptance #39)
// =========================================================

describe("Measurement/Result Separation", () => {
  test("measurement entry stores original input, not calculated result", () => {
    const entry = createMeasurementEntry({
      length: 12,
      width: 12,
      height: 8,
      unit: "feet",
      quantity: 1,
      surfaceType: "wall",
    });

    // Entry stores user's input
    expect(entry.length).toBe(12);
    expect(entry.unit).toBe("feet");

    // Result is separate
    const result = calculateMeasurementEntry(entry);
    expect(result.entryId).toBe(entry.id);
    expect(result.normalizedLengthM).not.toBe(entry.length); // normalised to metres
    expect(result.areaM2).not.toBe(entry.length); // calculated, not input
  });
});

// =========================================================
// 13. No Premature Rounding (acceptance #35)
// =========================================================

describe("No Premature Rounding", () => {
  test("intermediate calculations maintain precision", () => {
    const entry = createMeasurementEntry({
      length: 7,
      width: 3,
      unit: "feet",
      quantity: 1,
      surfaceType: "floor",
    });

    const result = calculateMeasurementEntry(entry);
    const lengthM = toMeters(7, "feet");
    const widthM = toMeters(3, "feet");
    const expected = lengthM * widthM;

    // Should be exact to 10 decimal places (no premature rounding)
    expect(result.areaM2).toBeCloseTo(expected, 10);
  });
});

// =========================================================
// 14. Shared Measurements for Painting + Screeding (acceptance #18–19)
// =========================================================

describe("Shared Measurements", () => {
  test("same measurement project can feed different calculation engines", () => {
    const project = createMeasurementProject("screeding", "feet");
    project.projectMode = "house_building";

    const bedroom = createMeasurementEntry({
      length: 12,
      width: 12,
      height: 8,
      unit: "feet",
      quantity: 2,
      surfaceType: "wall",
      spaceType: "bedroom",
    });

    project.sections = [
      createMeasurementSection("Bedrooms", [
        createMeasurementGroup("12×12 ft Bedroom ×2", bedroom),
      ]),
    ];

    // Calculate once
    const result = calculateMeasurementProject(project);
    const totalAreaM2 = result.totalAreaM2;

    expect(totalAreaM2).toBeGreaterThan(0);

    // This same areaM2 would be passed to:
    // - Painting engine → FRELUX painting rules → buckets
    // - Screeding engine → m² → screeding materials
    // The measurement system doesn't know or care which engine uses it.
  });
});

// =========================================================
// 15. Tile Dimension Conversion
// =========================================================

describe("Tile Dimensions", () => {
  test("mm tile dimensions convert correctly", () => {
    expect(tileAreaM2(600, 600, "mm")).toBeCloseTo(0.36, 4);
    expect(tileAreaM2(300, 300, "mm")).toBeCloseTo(0.09, 4);
    expect(tileAreaM2(300, 600, "mm")).toBeCloseTo(0.18, 4);
  });

  test("cm tile dimensions convert correctly", () => {
    expect(tileAreaM2(60, 60, "cm")).toBeCloseTo(0.36, 4);
    expect(tileAreaM2(40, 40, "cm")).toBeCloseTo(0.16, 4);
  });

  test("m tile dimensions convert correctly", () => {
    expect(tileAreaM2(0.6, 0.6, "m")).toBeCloseTo(0.36, 4);
  });
});
