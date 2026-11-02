import { describe, it, expect } from "vitest";
import { calculateSmartWaste } from "@/lib/smart-waste";

describe("calculateSmartWaste", () => {
  it("returns base waste for smooth room with roller", () => {
    const result = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "smooth",
      applicationMethod: "roller",
      coats: 2,
    });
    // Base 8 + smooth -2 = 6
    expect(result.wasteMargin).toBe(6);
    expect(result.reason).toBeTruthy();
    expect(result.breakdown.length).toBeGreaterThanOrEqual(2);
  });

  it("adds waste for textured surface", () => {
    const result = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "textured",
      applicationMethod: "roller",
      coats: 2,
    });
    // Base 8 + textured 3 = 11
    expect(result.wasteMargin).toBe(11);
  });

  it("adds waste for rough surface", () => {
    const result = calculateSmartWaste({
      projectType: "house",
      surfaceCondition: "rough",
      applicationMethod: "roller",
      coats: 2,
    });
    // Base 10 + rough 6 = 16
    expect(result.wasteMargin).toBe(16);
  });

  it("adds waste for brush application", () => {
    const result = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "smooth",
      applicationMethod: "brush",
      coats: 1,
    });
    // Base 8 + smooth -2 + brush 2 = 8
    expect(result.wasteMargin).toBe(8);
  });

  it("adds waste for spray application", () => {
    const result = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "smooth",
      applicationMethod: "spray",
      coats: 1,
    });
    // Base 8 + smooth -2 + spray 5 = 11
    expect(result.wasteMargin).toBe(11);
  });

  it("defaults to roller when no method specified", () => {
    const result = calculateSmartWaste({
      projectType: "fence",
      surfaceCondition: "smooth",
      coats: 1,
    });
    // Base 5 + smooth -2 = 3
    expect(result.wasteMargin).toBe(3);
  });

  it("includes breakdown with factors", () => {
    const result = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "textured",
      applicationMethod: "spray",
      coats: 2,
      isRepair: true,
    });
    expect(result.breakdown.some((b) => b.factor.includes("Base"))).toBe(true);
    expect(result.breakdown.some((b) => b.factor.includes("Surface"))).toBe(true);
    expect(result.breakdown.some((b) => b.factor.includes("Method"))).toBe(true);
  });

  it("returns a human-readable reason", () => {
    const result = calculateSmartWaste({
      projectType: "exterior",
      surfaceCondition: "rough",
      coats: 2,
    });
    expect(result.reason).toContain("Exterior");
  });
});
