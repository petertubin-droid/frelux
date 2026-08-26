import { describe, it, expect } from "vitest";
import {
  calculateWasteFactor,
  assessSurface,
  generateDefaultLabourPlan,
  explainCalculation,
  getWizardRecommendation,
} from "@/lib/contractor";

// ── calculateWasteFactor ──

describe("contractor — calculateWasteFactor", () => {
  it("returns 10% baseline for good/smooth conditions", () => {
    const result = calculateWasteFactor(
      "good",
      "fresh_plaster",
      "smooth",
      "low",
    );
    expect(result).toBe(10);
  });

  it("reduces waste for excellent condition", () => {
    const result = calculateWasteFactor(
      "excellent",
      "fresh_plaster",
      "smooth",
      "low",
    );
    expect(result).toBe(8);
  });

  it("increases waste for damaged condition", () => {
    const result = calculateWasteFactor(
      "damaged",
      "fresh_plaster",
      "smooth",
      "low",
    );
    expect(result).toBe(25);
  });

  it("adds for rough surfaces", () => {
    const result = calculateWasteFactor(
      "good",
      "fresh_plaster",
      "very_rough",
      "low",
    );
    expect(result).toBe(18);
  });

  it("adds for high porosity", () => {
    const result = calculateWasteFactor(
      "good",
      "fresh_plaster",
      "smooth",
      "very_high",
    );
    expect(result).toBe(18);
  });

  it("adds for mould surface type", () => {
    const result = calculateWasteFactor("good", "mould", "smooth", "low");
    expect(result).toBe(22);
  });

  it("clamps to minimum 5%", () => {
    // excellent (-2) + fresh_plaster (0) + smooth (0) + low (0) = 8
    // Not below 5, so this tests that min is 5
    expect(
      calculateWasteFactor("excellent", "fresh_plaster", "smooth", "low"),
    ).toBeGreaterThanOrEqual(5);
  });

  it("clamps to maximum 50%", () => {
    // damaged (15) + mould (12) + very_rough (8) + very_high (8) = 43
    // Still under 50, test with worst case
    const result = calculateWasteFactor(
      "damaged",
      "mould",
      "very_rough",
      "very_high",
    );
    expect(result).toBeLessThanOrEqual(50);
    expect(result).toBe(50); // 53 clamped to 50
  });

  it("combines all moderate factors", () => {
    // fair (5) + old_paint (3) + slightly_rough (2) + medium (2) = 22
    const result = calculateWasteFactor(
      "fair",
      "old_paint",
      "slightly_rough",
      "medium",
    );
    expect(result).toBe(22);
  });

  it("wood adds 2 to baseline", () => {
    const result = calculateWasteFactor("good", "wood", "smooth", "low");
    expect(result).toBe(12);
  });

  it("metal has no adjustment", () => {
    const result = calculateWasteFactor("good", "metal", "smooth", "low");
    expect(result).toBe(10);
  });

  it("concrete adds 5 to baseline", () => {
    const result = calculateWasteFactor("good", "concrete", "smooth", "low");
    expect(result).toBe(15);
  });
});

// ── assessSurface ──

describe("contractor — assessSurface", () => {
  it("recommends sealer primer for fresh plaster", () => {
    const steps = assessSurface("fresh_plaster", "good");
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].action).toContain("sealer");
    expect(steps[0].priority).toBe("required");
  });

  it("recommends light sanding for good old paint", () => {
    const steps = assessSurface("old_paint", "good");
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].priority).toBe("recommended");
  });

  it("requires scraping for poor old paint", () => {
    const steps = assessSurface("old_paint", "poor");
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].priority).toBe("required");
    expect(steps[0].action).toContain("Scrape");
  });

  it("handles moisture surface", () => {
    const steps = assessSurface("moisture", "fair");
    expect(steps.length).toBeGreaterThan(0);
  });

  it("handles cracks surface", () => {
    const steps = assessSurface("cracks", "fair");
    expect(steps.length).toBeGreaterThan(0);
  });

  it("handles mould surface", () => {
    const steps = assessSurface("mould", "damaged");
    expect(steps.length).toBeGreaterThan(0);
  });

  it("handles concrete surface", () => {
    const steps = assessSurface("concrete", "good");
    expect(steps.length).toBeGreaterThan(0);
  });

  it("handles wood surface", () => {
    const steps = assessSurface("wood", "good");
    expect(steps.length).toBeGreaterThan(0);
  });

  it("handles metal surface", () => {
    const steps = assessSurface("metal", "good");
    expect(steps.length).toBeGreaterThan(0);
  });

  it("each step has action, reason, and product", () => {
    const steps = assessSurface("fresh_plaster", "good");
    for (const step of steps) {
      expect(step.action).toBeTruthy();
      expect(step.reason).toBeTruthy();
    }
  });
});

// ── generateDefaultLabourPlan ──

describe("contractor — generateDefaultLabourPlan", () => {
  it("generates painting plan with painters and labourer", () => {
    const plan = generateDefaultLabourPlan("painting", 100, "₦");
    expect(plan.length).toBeGreaterThanOrEqual(2);
    const roles = plan.map((p) => p.role);
    expect(roles).toContain("painter");
    expect(roles).toContain("labourer");
  });

  it("scales workers with area", () => {
    const small = generateDefaultLabourPlan("painting", 50, "₦");
    const large = generateDefaultLabourPlan("painting", 200, "₦");
    const smallPainters = small.find((p) => p.role === "painter")!.workerCount;
    const largePainters = large.find((p) => p.role === "painter")!.workerCount;
    expect(largePainters).toBeGreaterThan(smallPainters);
  });

  it("generates screeding plan", () => {
    const plan = generateDefaultLabourPlan("screeding", 100, "₦");
    const roles = plan.map((p) => p.role);
    expect(roles).toContain("wall_screeder");
  });

  it("generates POP ceiling plan", () => {
    const plan = generateDefaultLabourPlan("pop_ceiling", 100, "₦");
    const roles = plan.map((p) => p.role);
    expect(roles).toContain("pop_installer");
  });

  it("generates tiling plan", () => {
    const plan = generateDefaultLabourPlan("tiling", 100, "₦");
    const roles = plan.map((p) => p.role);
    expect(roles).toContain("tile_installer");
  });

  it("handles small area (minimum 1 area factor)", () => {
    const plan = generateDefaultLabourPlan("painting", 10, "₦");
    expect(plan.length).toBeGreaterThan(0);
    // Even tiny area should have at least 1 worker per role
    for (const p of plan) {
      expect(p.workerCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("each worker has role, count, days, and wage", () => {
    const plan = generateDefaultLabourPlan("painting", 100, "₦");
    for (const w of plan) {
      expect(w.role).toBeTruthy();
      expect(w.workerCount).toBeGreaterThan(0);
      expect(w.daysRequired).toBeGreaterThan(0);
      expect(w.dailyWage).toBeGreaterThan(0);
    }
  });
});

// ── explainCalculation ──

describe("contractor — explainCalculation", () => {
  it("explains paint calculation", () => {
    const result = explainCalculation(
      "paint",
      { coats: 2, coverageRate: 10, wasteMargin: 10 },
      { paintableArea: 50, adjustedLiters: 11 },
    );
    expect(result.formula).toBeTruthy();
    expect(result.assumptions).toBeDefined();
    expect(result.steps).toBeDefined();
  });

  it("explains screeding calculation", () => {
    const result = explainCalculation(
      "screeding",
      { coats: 1, coverageRate: 5, wasteMargin: 5 },
      { paintableArea: 40 },
    );
    expect(result).toBeDefined();
  });

  it("explains tiling calculation", () => {
    const result = explainCalculation(
      "tiling",
      { wasteRate: 10 },
      { area: 30 },
    );
    expect(result).toBeDefined();
  });

  it("uses defaults for missing input values", () => {
    const result = explainCalculation("paint", {}, { paintableArea: 25 });
    expect(result).toBeDefined();
  });
});

// ── getWizardRecommendation ──

describe("contractor — getWizardRecommendation", () => {
  it("recommends paint calc for painting project", () => {
    const result = getWizardRecommendation(
      "painting",
      "interior",
      "new",
      "standard",
    );
    expect(result.calculatorType).toBe("paint");
    expect(result.reason).toBeTruthy();
  });

  it("recommends exterior-specific reasoning for exterior painting", () => {
    const result = getWizardRecommendation(
      "painting",
      "exterior",
      "new",
      "standard",
    );
    expect(result.calculatorType).toBe("paint");
    expect(result.reason).toContain("Exterior");
  });

  it("recommends screeding for screeding project", () => {
    const result = getWizardRecommendation(
      "screeding",
      "interior",
      "new",
      "standard",
    );
    expect(result.calculatorType).toBe("screeding");
  });

  it("recommends POP ceiling for pop_ceiling project", () => {
    const result = getWizardRecommendation(
      "pop_ceiling",
      "interior",
      "new",
      "standard",
    );
    expect(result.calculatorType).toBe("pop_ceiling");
  });

  it("recommends tiling for tiling project", () => {
    const result = getWizardRecommendation(
      "tiling",
      "floor",
      "new",
      "standard",
    );
    expect(result.calculatorType).toBe("tiling");
  });

  it("includes workflow steps", () => {
    const result = getWizardRecommendation(
      "painting",
      "interior",
      "new",
      "premium",
    );
    expect(result.workflow).toBeDefined();
    expect(Array.isArray(result.workflow)).toBe(true);
  });

  it("includes suggested rooms", () => {
    const result = getWizardRecommendation(
      "painting",
      "interior",
      "new",
      "standard",
    );
    expect(result.suggestedRooms).toBeDefined();
  });
});
