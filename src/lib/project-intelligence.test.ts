import { describe, it, expect } from "vitest";
import {
  calculateShoppingTotals,
  hasPriceChanged,
  calculateProgressPercentage,
  getSurfaceRecommendations,
  analyzeProjectDescription,
  type ShoppingItemWithActual,
} from "@/lib/project-intelligence";

describe("calculateShoppingTotals", () => {
  it("calculates totals for items with actual prices", () => {
    const items: ShoppingItemWithActual[] = [
      {
        name: "Paint",
        quantity: 3,
        estimated_price: 5000,
        actual_price: 4500,
        is_purchased: true,
      },
      {
        name: "Brush",
        quantity: 2,
        estimated_price: 500,
        actual_price: 600,
        is_purchased: true,
      },
    ];
    const result = calculateShoppingTotals(items);
    expect(result.estimatedTotal).toBe(16000); // (5000*3) + (500*2)
    expect(result.actualTotal).toBe(14700); // (4500*3) + (600*2)
    expect(result.difference).toBe(14700 - 16000);
    expect(result.itemCount).toBe(2);
    expect(result.purchasedCount).toBe(2);
    expect(result.pendingCount).toBe(0);
  });

  it("handles items with null actual_price", () => {
    const items: ShoppingItemWithActual[] = [
      {
        name: "Primer",
        quantity: 1,
        estimated_price: 3000,
        actual_price: null,
        is_purchased: false,
      },
    ];
    const result = calculateShoppingTotals(items);
    expect(result.estimatedTotal).toBe(3000);
    expect(result.actualTotal).toBe(0);
    expect(result.purchasedCount).toBe(0);
    expect(result.pendingCount).toBe(1);
  });

  it("handles empty list", () => {
    const result = calculateShoppingTotals([]);
    expect(result.estimatedTotal).toBe(0);
    expect(result.actualTotal).toBe(0);
    expect(result.itemCount).toBe(0);
    expect(result.pendingCount).toBe(0);
  });

  it("handles mixed purchased and not purchased", () => {
    const items: ShoppingItemWithActual[] = [
      {
        name: "A",
        quantity: 1,
        estimated_price: 100,
        actual_price: 100,
        is_purchased: true,
      },
      {
        name: "B",
        quantity: 2,
        estimated_price: 200,
        actual_price: null,
        is_purchased: false,
      },
      {
        name: "C",
        quantity: 1,
        estimated_price: 300,
        actual_price: 350,
        is_purchased: true,
      },
    ];
    const result = calculateShoppingTotals(items);
    expect(result.purchasedCount).toBe(2);
    expect(result.pendingCount).toBe(1);
    expect(result.estimatedTotal).toBe(100 + 400 + 300);
    expect(result.actualTotal).toBe(100 + 350);
  });
});

describe("hasPriceChanged", () => {
  it("returns false for identical prices", () => {
    expect(hasPriceChanged(5000, 5000)).toBe(false);
  });
  it("returns true for different prices", () => {
    expect(hasPriceChanged(5000, 5001)).toBe(true);
  });
  it("returns false for prices within 0.01", () => {
    expect(hasPriceChanged(5000.001, 5000.009)).toBe(false);
  });
  it("returns true for significant change", () => {
    expect(hasPriceChanged(5000, 6000)).toBe(true);
  });
});

describe("calculateProgressPercentage", () => {
  it("returns 0 for empty stages", () => {
    expect(calculateProgressPercentage([])).toBe(0);
  });
  it("returns 100 when all completed", () => {
    const stages = [
      { is_completed: true } as never,
      { is_completed: true } as never,
    ];
    expect(calculateProgressPercentage(stages)).toBe(100);
  });
  it("returns 0 when none completed", () => {
    const stages = [
      { is_completed: false } as never,
      { is_completed: false } as never,
    ];
    expect(calculateProgressPercentage(stages)).toBe(0);
  });
  it("returns 50 for half completed", () => {
    const stages = [
      { is_completed: true } as never,
      { is_completed: false } as never,
    ];
    expect(calculateProgressPercentage(stages)).toBe(50);
  });
  it("rounds correctly", () => {
    const stages = [
      { is_completed: true } as never,
      { is_completed: true } as never,
      { is_completed: false } as never,
    ];
    expect(calculateProgressPercentage(stages)).toBe(67);
  });
});

describe("getSurfaceRecommendations", () => {
  it("returns recommendations for new_wall", () => {
    const recs = getSurfaceRecommendations("new_wall");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.priority === "high")).toBe(true);
  });
  it("returns empty array for unknown condition", () => {
    expect(getSurfaceRecommendations("unknown_condition")).toEqual([]);
  });
  it("recommendations have recommendation and priority", () => {
    const recs = getSurfaceRecommendations("new_wall");
    recs.forEach((r) => {
      expect(r.recommendation).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(r.priority);
    });
  });
});

describe("analyzeProjectDescription", () => {
  it("detects matt paint project", () => {
    const result = analyzeProjectDescription(
      "I want to paint my 2 bedroom flat with matt emulsion",
    );
    expect(result.understanding).toContain("Matt paint");
    expect(result.understanding).toContain("Emulsion");
    expect(result.understanding).toContain("bedroom");
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "paint-calculator",
      ),
    ).toBe(true);
  });

  it("detects exterior/tyrolene", () => {
    const result = analyzeProjectDescription(
      "Paint the exterior walls with tyrolene",
    );
    expect(result.understanding).toContain("Tyrolene");
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "tyrolene-estimator",
      ),
    ).toBe(true);
  });

  it("detects screeding", () => {
    const result = analyzeProjectDescription(
      "I need to screed the walls before painting",
    );
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "screeding-calculator",
      ),
    ).toBe(true);
  });

  it("detects POP ceiling", () => {
    const result = analyzeProjectDescription(
      "Install pop ceiling in the living room",
    );
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "pop-ceiling-calculator",
      ),
    ).toBe(true);
  });

  it("detects tiling", () => {
    const result = analyzeProjectDescription(
      "Tile the kitchen and bathroom floors",
    );
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "tile-calculator",
      ),
    ).toBe(true);
  });

  it("flags missing measurements", () => {
    const result = analyzeProjectDescription("Paint my house with matt paint");
    expect(result.missingInfo.some((m) => m.includes("dimensions"))).toBe(true);
  });

  it("does not flag measurements when provided", () => {
    const result = analyzeProjectDescription(
      "Paint 5m x 4m living room with satin paint",
    );
    expect(result.missingInfo.some((m) => m.includes("dimensions"))).toBe(
      false,
    );
  });

  it("flags missing quality level", () => {
    const result = analyzeProjectDescription("Paint 3m x 4m room");
    expect(result.missingInfo.some((m) => m.includes("quality"))).toBe(true);
  });

  it("does not flag quality when mentioned", () => {
    const result = analyzeProjectDescription(
      "Paint 3m x 4m room with premium quality satin",
    );
    expect(result.missingInfo.some((m) => m.includes("quality"))).toBe(false);
  });

  it("always returns a workflow with steps", () => {
    const result = analyzeProjectDescription("Paint a room");
    expect(result.workflow.length).toBeGreaterThan(3);
    expect(result.workflow[0]).toContain("Create a project");
  });

  it("returns materials needed", () => {
    const result = analyzeProjectDescription("Paint with matt emulsion");
    expect(result.materialsNeeded).toContain("Primer");
  });

  it("handles empty input gracefully", () => {
    const result = analyzeProjectDescription("");
    expect(result.understanding).toBeTruthy();
    expect(result.missingInfo.length).toBeGreaterThan(0);
    expect(result.workflow.length).toBeGreaterThan(0);
  });

  it("detects living room", () => {
    const result = analyzeProjectDescription("Paint the living room 4m x 5m");
    expect(result.understanding).toContain("living room");
  });

  it("detects sitting room as living room", () => {
    const result = analyzeProjectDescription("Paint the sitting room 4m x 5m");
    expect(result.understanding).toContain("living room");
  });

  it("detects kitchen", () => {
    const result = analyzeProjectDescription("Tile the kitchen floor 3m x 3m");
    expect(result.understanding).toContain("kitchen");
  });

  it("detects bathroom", () => {
    const result = analyzeProjectDescription("Tile the bathroom 2m x 2m");
    expect(result.understanding).toContain("bathroom");
  });
});
