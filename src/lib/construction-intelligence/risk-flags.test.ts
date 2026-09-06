/**
 * Construction Intelligence — risk flag tests.
 *
 * Guarantees:
 * - Flags are derived ONLY from evidence passed in — no manufactured scores.
 * - Missing regional price → explicit "price unavailable" flag.
 * - Low-confidence AI detection → flag with the actual confidence in the reason.
 * - Invalid measurements → critical flag.
 * - A clean project produces no flags.
 */

import { describe, it, expect } from "vitest";
import { evaluateRiskFlags, AI_CONFIDENCE_THRESHOLD, type RiskEvaluationInput } from "./risk-flags";
import { buildQuantityTakeoff, type TakeoffInput } from "./takeoff";
import type { ConstructionProjectResult, ProjectElementResult } from "@/lib/measurement";

// =========================================================
// Fixtures
// =========================================================

function makeElement(): ProjectElementResult {
  return {
    elementId: "el-1",
    name: "Interior Spaces",
    elementType: "interior",
    primaryCalculator: "painting",
    spaceResults: [
      {
        spaceId: "space-1",
        name: "Bedroom 1",
        type: "bedroom",
        finishType: "paint",
        areaM2: 15,
        totalAreaM2: 15,
        normalizedLengthM: 5,
        normalizedWidthM: 3,
        quantity: 1,
        steps: [],
      },
    ],
    totalAreaM2: 15,
    steps: [],
  };
}

function makeProject(): ConstructionProjectResult {
  return {
    projectId: "proj-1",
    name: "Test Bungalow",
    elementResults: [makeElement()],
    totalAreaM2: 15,
    areaByFinishType: {},
    areaByElementType: {},
    allSpaceResults: [],
    steps: [],
  };
}

function makeTakeoverInput(extra: Partial<TakeoffInput> = {}): TakeoffInput {
  return {
    project: makeProject(),
    calculations: [],
    ...extra,
  };
}

function evaluate(extra: Partial<RiskEvaluationInput> = {}) {
  return evaluateRiskFlags({
    takeoff: buildQuantityTakeoff(makeTakeoverInput()),
    ...extra,
  });
}

// =========================================================
// Tests
// =========================================================

describe("evaluateRiskFlags", () => {
  it("produces no flags for a clean, calculated, verified project", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProject(),
      calculations: ([
        {
          id: "calc-1",
          calculator_type: "paint",
          calc_title: "Painting",
          materials: [{ name: "Emulsion", category: "Paint", quantity: 4, unit: "litres" }],
          created_at: new Date().toISOString(),
        },
      ] as TakeoffInput["calculations"]),
    });
    const flags = evaluateRiskFlags({
      takeoff,
      aiDetections: [{ id: "d1", label: "Bedroom 1", confidence: 0.95, verified: true }],
      priceEvidence: [
        { materialName: "Emulsion", price: 12000, priceDate: new Date().toISOString(), currency: "NGN" },
      ],
    });
    expect(flags).toHaveLength(0);
  });

  it("flags elements that have measurements but no engine calculation yet", () => {
    const flags = evaluate();
    const pending = flags.find((f) => f.code === "requires_calculation");
    expect(pending).toBeDefined();
    expect(pending?.severity).toBe("warning");
    expect(pending?.reason).toContain("no saved calculation");
    expect(pending?.references).toContain("el-1");
  });

  it("flags low-confidence unverified AI detections with the actual confidence in the reason", () => {
    const flags = evaluate({
      aiDetections: [
        { id: "d1", label: "Living room width", confidence: 0.45, verified: false },
      ],
    });
    const flag = flags.find((f) => f.code === "low_confidence_ai");
    expect(flag).toBeDefined();
    expect(flag?.reason).toContain("45%");
    expect(flag?.reason).toContain(`${AI_CONFIDENCE_THRESHOLD * 100}%`);
    expect(flag?.references).toContain("d1");
  });

  it("flags high-confidence AI detections only as awaiting verification (info)", () => {
    const flags = evaluate({
      aiDetections: [
        { id: "d2", label: "Bedroom length", confidence: 0.92, verified: false },
      ],
    });
    const flag = flags.find((f) => f.code === "unverified_input");
    expect(flag).toBeDefined();
    expect(flag?.severity).toBe("info");
    // NOT flagged as low confidence
    expect(flags.find((f) => f.code === "low_confidence_ai")).toBeUndefined();
  });

  it("does not flag verified AI detections", () => {
    const flags = evaluate({
      aiDetections: [
        { id: "d3", label: "Bedroom length", confidence: 0.55, verified: true },
      ],
    });
    expect(flags.find((f) => f.code === "low_confidence_ai")).toBeUndefined();
    expect(flags.find((f) => f.code === "unverified_input")).toBeUndefined();
  });

  it("flags missing regional prices explicitly — never a borrowed or invented price", () => {
    const flags = evaluate({
      priceEvidence: [{ materialName: "Cement", materialItemId: "mat:1" }],
    });
    const flag = flags.find((f) => f.code === "missing_regional_price");
    expect(flag).toBeDefined();
    expect(flag?.reason).toContain("No verified price");
    expect(flag?.reason).toContain("active region");
    expect(flag?.references).toContain("mat:1");
  });

  it("flags outdated prices with the recorded date in the reason", () => {
    const flags = evaluate({
      priceEvidence: [
        {
          materialName: "Cement",
          price: 8500,
          priceDate: "2025-06-01T00:00:00Z",
          currency: "NGN",
        },
      ],
    });
    const flag = flags.find((f) => f.code === "outdated_price");
    expect(flag).toBeDefined();
    expect(flag?.reason).toContain("2025-06-01");
    expect(flag?.severity).toBe("info");
  });

  it("flags materials with missing specification context", () => {
    const takeoff = buildQuantityTakeoff({
      project: makeProject(),
      calculations: ([
        {
          id: "calc-1",
          calculator_type: "paint",
          calc_title: "Painting",
          materials: [{ name: "Emulsion", category: "Paint", quantity: 4, unit: "" }],
          created_at: new Date().toISOString(),
        },
      ] as TakeoffInput["calculations"]),
    });
    const flags = evaluateRiskFlags({ takeoff });
    const flag = flags.find((f) => f.code === "missing_material_specification");
    expect(flag).toBeDefined();
    expect(flag?.reason).toContain("missing unit");
  });
});
