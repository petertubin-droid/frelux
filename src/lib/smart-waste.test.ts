import { describe, it, expect } from "vitest";
import { calculateSmartWaste } from "./smart-waste";

describe("calculateSmartWaste", () => {
  it("computes the base margin for a smooth-surface room with roller and 2 coats", () => {
    const result = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "smooth",
      applicationMethod: "roller",
      coats: 2,
    });
    // base 8, smooth -2, roller 0 => 6
    expect(result.wasteMargin).toBe(6);
  });

  it("increases margin for rough surfaces and spray application", () => {
    const result = calculateSmartWaste({
      projectType: "exterior",
      surfaceCondition: "rough",
      applicationMethod: "spray",
      coats: 1,
    });
    // base 15 + rough 6 + spray 5 = 26
    expect(result.wasteMargin).toBe(26);
  });

  it("adds extra margin for repair work", () => {
    const withoutRepair = calculateSmartWaste({
      projectType: "house",
      surfaceCondition: "textured",
      coats: 1,
    });
    const withRepair = calculateSmartWaste({
      projectType: "house",
      surfaceCondition: "textured",
      coats: 1,
      isRepair: true,
    });
    expect(withRepair.wasteMargin).toBe(withoutRepair.wasteMargin + 5);
  });

  it("gives an efficiency discount for 3+ coats", () => {
    const twoCoats = calculateSmartWaste({
      projectType: "fence",
      surfaceCondition: "smooth",
      coats: 2,
    });
    const threeCoats = calculateSmartWaste({
      projectType: "fence",
      surfaceCondition: "smooth",
      coats: 3,
    });
    expect(threeCoats.wasteMargin).toBe(twoCoats.wasteMargin - 2);
  });

  it("clamps the margin between 0 and 30", () => {
    const result = calculateSmartWaste({
      projectType: "exterior",
      surfaceCondition: "rough",
      applicationMethod: "spray",
      coats: 1,
      isRepair: true,
    });
    expect(result.wasteMargin).toBeLessThanOrEqual(30);
    expect(result.wasteMargin).toBeGreaterThanOrEqual(0);
  });

  it("defaults to roller when no application method is given", () => {
    const withDefault = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "smooth",
      coats: 1,
    });
    const withRoller = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "smooth",
      applicationMethod: "roller",
      coats: 1,
    });
    expect(withDefault.wasteMargin).toBe(withRoller.wasteMargin);
  });

  it("produces a human-readable reason string mentioning the margin", () => {
    const result = calculateSmartWaste({
      projectType: "fence",
      surfaceCondition: "smooth",
      coats: 1,
    });
    expect(result.reason).toContain(`${result.wasteMargin}%`);
  });

  it("includes a breakdown entry for the base margin", () => {
    const result = calculateSmartWaste({
      projectType: "room",
      surfaceCondition: "smooth",
      coats: 1,
    });
    expect(result.breakdown[0].factor).toContain("Base");
  });
});
