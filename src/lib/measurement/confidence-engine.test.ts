import { describe, it, expect } from "vitest";
import {
  CONFIDENCE_LEVEL_LABELS,
  CONFIDENCE_LEVEL_COLORS,
  assessCalculationConfidence,
  assessPriceConfidence,
  combineConfidence,
} from "@/lib/measurement/confidence-engine";
import type { SpaceResult } from "@/lib/measurement/space-engine";

// Minimal valid SpaceResult for tests
function makeSpaceResult(overrides: Partial<SpaceResult> = {}): SpaceResult {
  return {
    spaceId: "space-1",
    name: "Test Space",
    type: "room" as never,
    finishType: "paint" as never,
    areaM2: 20,
    totalAreaM2: 20,
    normalizedLengthM: 4,
    normalizedWidthM: 5,
    normalizedHeightM: 3,
    quantity: 1,
    steps: [],
    ...overrides,
  };
}

describe("confidence-engine — constants", () => {
  it("CONFIDENCE_LEVEL_LABELS has all 4 levels", () => {
    expect(CONFIDENCE_LEVEL_LABELS.high).toBeTruthy();
    expect(CONFIDENCE_LEVEL_LABELS.medium).toBeTruthy();
    expect(CONFIDENCE_LEVEL_LABELS.low).toBeTruthy();
    expect(CONFIDENCE_LEVEL_LABELS.review_required).toBeTruthy();
  });

  it("CONFIDENCE_LEVEL_COLORS has all 4 levels", () => {
    expect(CONFIDENCE_LEVEL_COLORS.high).toBeTruthy();
    expect(CONFIDENCE_LEVEL_COLORS.medium).toBeTruthy();
    expect(CONFIDENCE_LEVEL_COLORS.low).toBeTruthy();
    expect(CONFIDENCE_LEVEL_COLORS.review_required).toBeTruthy();
  });
});

describe("confidence-engine — assessCalculationConfidence", () => {
  it("returns a ConfidenceAssessment object", () => {
    const result = assessCalculationConfidence(makeSpaceResult());
    expect(result).toHaveProperty("level");
    expect(result).toHaveProperty("factors");
    expect(result).toHaveProperty("calculationConfidence");
    expect(result).toHaveProperty("summary");
  });

  it("has factors array", () => {
    const result = assessCalculationConfidence(makeSpaceResult());
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("each factor has name, passed, detail, weight", () => {
    const result = assessCalculationConfidence(makeSpaceResult());
    for (const f of result.factors) {
      expect(f.name).toBeTruthy();
      expect(typeof f.passed).toBe("boolean");
      expect(typeof f.detail).toBe("string");
      expect(typeof f.weight).toBe("number");
    }
  });

  it("high confidence for valid dimensions + approved rule", () => {
    const result = assessCalculationConfidence(makeSpaceResult(), {
      hasValidDimensions: true,
      hasRequiredInputs: true,
      hasApprovedRule: true,
    });
    expect(result.calculationConfidence).toBe("high");
  });

  it("lower confidence when dimensions are zero", () => {
    const result = assessCalculationConfidence(
      makeSpaceResult({ normalizedLengthM: 0, normalizedWidthM: 0 }),
    );
    expect(["low", "medium", "review_required"]).toContain(
      result.calculationConfidence,
    );
  });
});

describe("confidence-engine — assessPriceConfidence", () => {
  it("returns a ConfidenceAssessment object", () => {
    const result = assessPriceConfidence({});
    expect(result).toHaveProperty("level");
    expect(result).toHaveProperty("factors");
    expect(result).toHaveProperty("priceConfidence");
  });

  it("high confidence with approved+verified price", () => {
    const result = assessPriceConfidence({
      hasApprovedPrice: true,
      hasPriceSource: true,
      isSourceVerified: true,
      hasProductMatch: true,
      priceAgeDays: 5,
    });
    expect(result.priceConfidence).toBe("high");
  });

  it("low/review confidence with no price data", () => {
    const result = assessPriceConfidence({});
    expect(["low", "review_required", "unavailable"]).toContain(
      result.priceConfidence,
    );
  });
});

describe("confidence-engine — combineConfidence", () => {
  it("returns a combined assessment", () => {
    const calc = assessCalculationConfidence(makeSpaceResult());
    const price = assessPriceConfidence({ hasApprovedPrice: true });
    const combined = combineConfidence(calc, price);
    expect(combined).toHaveProperty("level");
    expect(combined).toHaveProperty("factors");
    expect(combined.factors.length).toBeGreaterThanOrEqual(calc.factors.length);
  });

  it("takes the lower of calc/price confidence", () => {
    const calc = assessCalculationConfidence(makeSpaceResult(), {
      hasValidDimensions: true,
      hasRequiredInputs: true,
      hasApprovedRule: true,
    });
    const price = assessPriceConfidence({});
    const combined = combineConfidence(calc, price);
    // Combined should not be higher than the lower of the two
    const levelOrder = { high: 0, medium: 1, low: 2, review_required: 3 };
    expect(levelOrder[combined.level]).toBeGreaterThanOrEqual(
      Math.max(
        levelOrder[calc.calculationConfidence],
        levelOrder[
          combined.priceConfidence === "unavailable"
            ? "review_required"
            : combined.priceConfidence
        ],
      ),
    );
  });
});
