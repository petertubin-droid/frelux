import { describe, it, expect, vi } from "vitest";

// Mock supabase
vi.mock("@/lib/supabase", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    then: undefined,
  };

  const mockFrom = vi.fn(() => {
    const chain = { ...mockChain };
    // Make each method return the chain for chaining
    Object.keys(chain).forEach((k) => {
      if (typeof chain[k as keyof typeof chain] === "function") {
        // @ts-expect-error mock type mismatch is expected
        chain[k as keyof typeof chain] = vi.fn(() => chain);
      }
    });
    // Make single() return a promise
    chain.single = vi.fn(() =>
      Promise.resolve({ data: { id: "test-id" }, error: null }),
    );
    return chain;
  });

  return {
    supabase: { from: mockFrom },
  };
});

import {
  calculateShoppingTotals,
  getSurfaceRecommendations,
  analyzeProjectDescription,
  calculateProgressPercentage,
  hasPriceChanged,
} from "@/lib/project-intelligence";

describe("Project Intelligence — Shopping List", () => {
  it("calculates shopping totals correctly with actual prices", () => {
    const items = [
      {
        id: "1",
        project_id: "p1",
        category: "paint",
        name: "Satin",
        quantity: 4,
        unit: "bucket",
        estimated_price: 15000,
        actual_price: 16000,
        total_price: 60000,
        supplier: null,
        notes: null,
        is_purchased: true,
        sort_order: 1,
      },
      {
        id: "2",
        project_id: "p1",
        category: "paint",
        name: "Matt",
        quantity: 3,
        unit: "bucket",
        estimated_price: 12000,
        actual_price: null,
        total_price: 36000,
        supplier: null,
        notes: null,
        is_purchased: false,
        sort_order: 2,
      },
    ];

    const totals = calculateShoppingTotals(items);
    expect(totals.estimatedTotal).toBe(96000); // (15000*4) + (12000*3)
    expect(totals.actualTotal).toBe(64000); // 16000*4 only (Matt has no actual price)
    expect(totals.difference).toBe(-32000); // 64000 - 96000
    expect(totals.itemCount).toBe(2);
    expect(totals.purchasedCount).toBe(1);
    expect(totals.pendingCount).toBe(1);
  });

  it("handles empty shopping list", () => {
    const totals = calculateShoppingTotals([]);
    expect(totals.estimatedTotal).toBe(0);
    expect(totals.actualTotal).toBe(0);
    expect(totals.difference).toBe(0);
    expect(totals.itemCount).toBe(0);
  });

  it("handles all items purchased with actual prices", () => {
    const items = [
      {
        id: "1",
        project_id: "p1",
        category: "paint",
        name: "Satin",
        quantity: 2,
        unit: "bucket",
        estimated_price: 10000,
        actual_price: 12000,
        total_price: 20000,
        supplier: "Shop A",
        notes: null,
        is_purchased: true,
        sort_order: 1,
      },
    ];
    const totals = calculateShoppingTotals(items);
    expect(totals.estimatedTotal).toBe(20000);
    expect(totals.actualTotal).toBe(24000);
    expect(totals.difference).toBe(4000);
    expect(totals.purchasedCount).toBe(1);
    expect(totals.pendingCount).toBe(0);
  });
});

describe("Project Intelligence — Surface Assessment", () => {
  it("returns recommendations for new_wall", () => {
    const recs = getSurfaceRecommendations("new_wall");
    expect(recs.length).toBeGreaterThan(0);
    expect(
      recs.some((r) => r.recommendation.toLowerCase().includes("primer")),
    ).toBe(true);
    expect(
      recs.some((r) => r.recommendation.toLowerCase().includes("cure")),
    ).toBe(true);
  });

  it("returns recommendations for previously_painted", () => {
    const recs = getSurfaceRecommendations("previously_painted");
    expect(recs.length).toBeGreaterThan(0);
    expect(
      recs.some((r) => r.recommendation.toLowerCase().includes("clean")),
    ).toBe(true);
  });

  it("returns recommendations for damp", () => {
    const recs = getSurfaceRecommendations("damp");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.priority === "high")).toBe(true);
    expect(
      recs.some((r) => r.recommendation.toLowerCase().includes("moisture")),
    ).toBe(true);
  });

  it("returns recommendations for cracked", () => {
    const recs = getSurfaceRecommendations("cracked");
    expect(recs.length).toBeGreaterThan(0);
    expect(
      recs.some((r) => r.recommendation.toLowerCase().includes("fill")),
    ).toBe(true);
  });

  it("returns recommendations for all 7 conditions", () => {
    const conditions = [
      "new_wall",
      "previously_painted",
      "smooth",
      "rough",
      "dirty",
      "damp",
      "cracked",
    ];
    for (const cond of conditions) {
      const recs = getSurfaceRecommendations(cond);
      expect(recs.length).toBeGreaterThan(0);
    }
  });

  it("returns empty array for unknown condition", () => {
    const recs = getSurfaceRecommendations("unknown");
    expect(recs).toEqual([]);
  });

  it("rough surface mentions increased paint absorption", () => {
    const recs = getSurfaceRecommendations("rough");
    expect(
      recs.some((r) => r.recommendation.toLowerCase().includes("30%")),
    ).toBe(true);
  });
});

describe("Project Intelligence — AI Project Assistant", () => {
  it("analyzes a complete project description", () => {
    const input =
      "I have a 3-bedroom house and want Matt in the bedrooms, Satin in the living room, and Tyrolene outside.";
    const result = analyzeProjectDescription(input);

    expect(result.understanding).toContain("Matt");
    expect(result.understanding).toContain("Satin");
    expect(result.understanding).toContain("Tyrolene");
    expect(result.understanding).toContain("bedroom");
    expect(result.understanding).toContain("living room");
    expect(result.understanding).toContain("exterior");

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "paint-calculator",
      ),
    ).toBe(true);
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "tyrolene-estimator",
      ),
    ).toBe(true);

    expect(result.materialsNeeded.length).toBeGreaterThan(0);
    expect(result.materialsNeeded).toContain("Primer");
    expect(result.materialsNeeded).toContain("Tyrolene paint");

    expect(result.workflow.length).toBeGreaterThan(0);
    expect(result.workflow[0]).toContain("Create a project");
  });

  it("identifies missing measurements", () => {
    const input = "I want to paint my living room with Satin";
    const result = analyzeProjectDescription(input);
    expect(result.missingInfo.some((m) => m.includes("dimensions"))).toBe(true);
  });

  it("identifies missing quality level", () => {
    const input = "Paint my bedroom 5m x 4m with Matt";
    const result = analyzeProjectDescription(input);
    expect(result.missingInfo.some((m) => m.includes("quality"))).toBe(true);
  });

  it("does not fabricate quantities", () => {
    const input = "I want to paint 3 rooms";
    const result = analyzeProjectDescription(input);
    // The AI should NOT return any quantity or bucket count
    expect(JSON.stringify(result)).not.toMatch(
      /\d+\s*(bucket|litre|gallon|carton)/i,
    );
  });

  it("recommends correct calculator for screeding", () => {
    const input = "I need to screed my walls before painting";
    const result = analyzeProjectDescription(input);
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "screeding-calculator",
      ),
    ).toBe(true);
    expect(result.materialsNeeded).toContain("Cement");
  });

  it("recommends correct calculator for tiling", () => {
    const input = "I want to tile my bathroom floor";
    const result = analyzeProjectDescription(input);
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "tile-calculator",
      ),
    ).toBe(true);
    expect(result.materialsNeeded).toContain("Tiles");
  });

  it("recommends correct calculator for POP ceiling", () => {
    const input = "I need a POP ceiling for my living room";
    const result = analyzeProjectDescription(input);
    expect(
      result.recommendations.some(
        (r) => r.calculator_slug === "pop-ceiling-calculator",
      ),
    ).toBe(true);
    expect(result.materialsNeeded).toContain("POP boards");
  });
});

describe("Project Intelligence — Progress Tracker", () => {
  it("calculates 0% with no stages", () => {
    expect(calculateProgressPercentage([])).toBe(0);
  });

  it("calculates 50% with half completed", () => {
    const stages = [
      {
        id: "1",
        project_id: "p1",
        stage_key: "planning",
        stage_name: "Planning",
        description: null,
        sort_order: 1,
        is_completed: true,
        completed_at: null,
        notes: null,
        photo_url: null,
        created_at: "",
        updated_at: "",
      },
      {
        id: "2",
        project_id: "p1",
        stage_key: "materials",
        stage_name: "Materials",
        description: null,
        sort_order: 2,
        is_completed: false,
        completed_at: null,
        notes: null,
        photo_url: null,
        created_at: "",
        updated_at: "",
      },
      {
        id: "3",
        project_id: "p1",
        stage_key: "prep",
        stage_name: "Prep",
        description: null,
        sort_order: 3,
        is_completed: true,
        completed_at: null,
        notes: null,
        photo_url: null,
        created_at: "",
        updated_at: "",
      },
      {
        id: "4",
        project_id: "p1",
        stage_key: "painting",
        stage_name: "Painting",
        description: null,
        sort_order: 4,
        is_completed: false,
        completed_at: null,
        notes: null,
        photo_url: null,
        created_at: "",
        updated_at: "",
      },
    ];
    expect(calculateProgressPercentage(stages)).toBe(50);
  });

  it("calculates 100% when all completed", () => {
    const stages = [
      {
        id: "1",
        project_id: "p1",
        stage_key: "a",
        stage_name: "A",
        description: null,
        sort_order: 1,
        is_completed: true,
        completed_at: null,
        notes: null,
        photo_url: null,
        created_at: "",
        updated_at: "",
      },
      {
        id: "2",
        project_id: "p1",
        stage_key: "b",
        stage_name: "B",
        description: null,
        sort_order: 2,
        is_completed: true,
        completed_at: null,
        notes: null,
        photo_url: null,
        created_at: "",
        updated_at: "",
      },
    ];
    expect(calculateProgressPercentage(stages)).toBe(100);
  });
});

describe("Project Intelligence — Price Tracker", () => {
  it("detects price changes", () => {
    expect(hasPriceChanged(100, 150)).toBe(true);
    expect(hasPriceChanged(100, 100)).toBe(false);
    expect(hasPriceChanged(100, 100.001)).toBe(false);
    expect(hasPriceChanged(100, 100.02)).toBe(true);
  });

  it("handles zero prices", () => {
    expect(hasPriceChanged(0, 0)).toBe(false);
    expect(hasPriceChanged(0, 100)).toBe(true);
  });
});
