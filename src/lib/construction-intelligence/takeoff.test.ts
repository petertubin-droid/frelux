/**
 * Construction Intelligence, quantity takeoff tests.
 *
 * Guarantees:
 * - Measurement items come from the Project Engine (no new math).
 * - Material quantities REFERENCE saved engine calculations (never recreated).
 * - Elements without an engine run are `requires_calculation`, not invented.
 * - Waste is additive and transparent: base + waste = purchase.
 * - Invalid quantities never propagate.
 */

import { describe, it, expect } from "vitest";
import {
  buildQuantityTakeoff,
  calculatorTypeToDiscipline,
  summarizeTakeoffByDiscipline,
  type TakeoffInput,
} from "./takeoff";
import type { ConstructionProjectResult, ProjectElementResult, SpaceResult } from "@/lib/measurement";
import type { WasteResolution } from "@/lib/measurement/waste-config";

// =========================================================
// Fixtures, minimal deterministic Project Engine results
// =========================================================

function makeSpaceResult(overrides: Partial<SpaceResult> = {}): SpaceResult {
  return {
    spaceId: "space-1",
    name: "Bedroom 1",
    type: "bedroom",
    finishType: "paint",
    areaM2: 15,
    totalAreaM2: 15,
    normalizedLengthM: 5,
    normalizedWidthM: 3,
    quantity: 1,
    steps: [{ label: "Wall area", formula: "5 m × 3 m", value: "15 m²" }],
    ...overrides,
  };
}

function makeElementResult(overrides: Partial<ProjectElementResult> = {}): ProjectElementResult {
  return {
    elementId: "el-1",
    name: "Interior Spaces",
    elementType: "interior",
    primaryCalculator: "painting",
    spaceResults: [makeSpaceResult()],
    totalAreaM2: 15,
    steps: [],
    ...overrides,
  };
}

function makeProjectResult(
  elements: ProjectElementResult[],
): ConstructionProjectResult {
  return {
    projectId: "proj-1",
    name: "Test Bungalow",
    elementResults: elements,
    totalAreaM2: elements.reduce((sum, e) => sum + e.totalAreaM2, 0),
    areaByFinishType: {},
    areaByElementType: {},
    allSpaceResults: elements.flatMap((e) => e.spaceResults),
    steps: [],
  };
}

type CalcRecord = TakeoffInput["calculations"][number];

function makeCalc(overrides: Partial<CalcRecord> = {}): CalcRecord {
  return {
    id: "calc-1",
    calculator_type: "paint",
    calc_title: "Bedroom painting",
    materials: [
      {
        name: "Premium Emulsion",
        category: "Paint",
        quantity: 4.5,
        unit: "litres",
        estimated_price: 12000,
      },
    ],
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

// =========================================================
// Discipline routing
// =========================================================

describe("calculatorTypeToDiscipline", () => {
  it("routes every calculation type to its discipline", () => {
    expect(calculatorTypeToDiscipline("paint")).toBe("painting");
    expect(calculatorTypeToDiscipline("tile")).toBe("tiling");
    expect(calculatorTypeToDiscipline("pop_ceiling")).toBe("pop_ceiling");
    expect(calculatorTypeToDiscipline("build_to_roof")).toBe("roofing");
    expect(calculatorTypeToDiscipline("tyrolene")).toBe("tyrolene");
    expect(calculatorTypeToDiscipline("finish")).toBe("grafitex");
  });
});

// =========================================================
// Takeoff building
// =========================================================

describe("buildQuantityTakeoff", () => {
  it("creates measurement items from the Project Engine result with traceable steps", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProjectResult([makeElementResult()]),
      calculations: [],
    });

    expect(takeoff.measurementItems).toHaveLength(1);
    const item = takeoff.measurementItems[0];
    expect(item.baseQuantity).toBe(15);
    expect(item.unit).toBe("m²");
    expect(item.quantitySource).toBe("project_engine");
    expect(item.engine).toBe("FRELUX Project Engine");
    expect(item.steps).toEqual([
      { label: "Wall area", formula: "5 m × 3 m", value: "15 m²" },
    ]);
  });

  it("references saved engine calculations for materials, never recreates them", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProjectResult([makeElementResult()]),
      calculations: [makeCalc()],
    });

    expect(takeoff.materialItems).toHaveLength(1);
    const item = takeoff.materialItems[0];
    expect(item.material.baseQuantity).toBe(4.5); // exactly the engine's value
    expect(item.calculation.id).toBe("calc-1");
    expect(item.calculation.calculatorType).toBe("paint");
    expect(item.status).toBe("calculated");
    // No engine was re-run: the quantity came from the referenced calculation.
    expect(item.material.purchaseQuantity).toBe(4.5); // no waste → unchanged
  });

  it("marks elements without a matching engine run as requires_calculation instead of inventing quantities", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProjectResult([
        makeElementResult(),
        makeElementResult({
          elementId: "el-2",
          name: "Bathroom",
          primaryCalculator: "tiling",
        }),
      ]),
      calculations: [makeCalc()], // painting only, nothing for tiling
    });

    expect(takeoff.requiresCalculation).toEqual([
      { elementId: "el-2", elementName: "Bathroom", discipline: "tiling" },
    ]);
    // And no tiling material items were fabricated.
    expect(
      takeoff.materialItems.filter((m) => m.discipline === "tiling"),
    ).toHaveLength(0);
  });

  it("applies waste transparently: base + waste allowance = purchase quantity", () => {
    const waste: WasteResolution = {
      wastePercent: 10,
      source: "rule",
      explanation: "FRELUX painting rule: 10% for application losses",
      isOverride: false,
    };
    const takeoff = buildQuantityTakeoff({
      project: makeProjectResult([makeElementResult()]),
      calculations: [makeCalc()],
      resolveWaste: () => waste,
    });

    const item = takeoff.materialItems[0];
    expect(item.material.baseQuantity).toBe(4.5); // base stays visible
    expect(item.material.waste).toEqual({
      percent: 10,
      source: "rule",
      reason: waste.explanation,
    });
    // 4.5 + 10% = 4.95 (engine waste application reused, same formula)
    expect(item.material.purchaseQuantity).toBeCloseTo(4.95, 10);
  });

  it("never adds waste when no resolver is provided, waste is not arbitrary", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProjectResult([makeElementResult()]),
      calculations: [makeCalc()],
    });
    expect(takeoff.materialItems[0].material.waste).toBeUndefined();
    expect(takeoff.materialItems[0].material.purchaseQuantity).toBe(4.5);
  });

  it("excludes invalid quantities instead of propagating them", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProjectResult([
        makeElementResult({
          spaceResults: [
            makeSpaceResult({ spaceId: "bad", totalAreaM2: -5 }),
            makeSpaceResult({ spaceId: "good", totalAreaM2: 12 }),
          ],
        }),
      ]),
      calculations: [
        makeCalc({
          id: "calc-bad",
          materials: [
            { name: "Broken", category: "X", quantity: Number.NaN, unit: "l" },
          ],
        }),
      ],
    });

    expect(
      takeoff.measurementItems.map((m) => m.baseQuantity),
    ).toEqual([12]);
    expect(takeoff.materialItems).toHaveLength(0);
  });

  it("rolls measurements up by discipline", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProjectResult([
        makeElementResult(),
        makeElementResult({
          elementId: "el-2",
          name: "Fence",
          primaryCalculator: "fence_screeding",
          spaceResults: [
            makeSpaceResult({ spaceId: "s2", name: "Fence wall", totalAreaM2: 40 }),
          ],
        }),
      ]),
      calculations: [],
    });

    expect(takeoff.areaByDiscipline["painting"]).toBe(15);
    expect(takeoff.areaByDiscipline["screeding"]).toBe(40);
  });
});

// =========================================================
// Summaries
// =========================================================

describe("summarizeTakeoffByDiscipline", () => {
  it("groups items by discipline in stable order", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProjectResult([
        makeElementResult(),
        makeElementResult({
          elementId: "el-2",
          name: "Bathroom",
          primaryCalculator: "tiling",
          spaceResults: [makeSpaceResult({ spaceId: "t1", name: "Bathroom floor", totalAreaM2: 6 })],
        }),
      ]),
      calculations: [makeCalc()],
    });

    const summary = summarizeTakeoffByDiscipline(takeoff);
    const painting = summary.find((s) => s.discipline === "painting");
    expect(painting).toMatchObject({
      measurementCount: 1,
      totalMeasurements: 15,
      materialCount: 1,
    });
    expect(summary.find((s) => s.discipline === "tiling")?.totalMeasurements).toBe(6);
    // stable discipline ordering
    const disciplines = summary.map((s) => s.discipline);
    expect(disciplines.indexOf("painting")).toBeLessThan(disciplines.indexOf("tiling"));
  });
});
