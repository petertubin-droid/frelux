import { describe, it, expect } from "vitest";
import {
  calculateSmartWaste,
  type SurfaceCondition,
  type ApplicationMethod,
} from "./smart-waste";
import type { ProjectType } from "@/types";

describe("smart-waste", () => {
  it("returns base waste for smooth room with roller", () => {
    const result = calculateSmartWaste({
      projectType: "room" as ProjectType,
      surfaceCondition: "smooth" as SurfaceCondition,
      coats: 2,
    });
    // room=8, smooth=-2, roller=0 => 6
    expect(result.wasteMargin).toBe(6);
    expect(result.breakdown.length).toBeGreaterThanOrEqual(2);
  });

  it("adds waste for rough surface", () => {
    const result = calculateSmartWaste({
      projectType: "room" as ProjectType,
      surfaceCondition: "rough" as SurfaceCondition,
      coats: 1,
    });
    // room=8, rough=+6 => 14
    expect(result.wasteMargin).toBe(14);
  });

  it("adds waste for spray application", () => {
    const result = calculateSmartWaste({
      projectType: "room" as ProjectType,
      surfaceCondition: "smooth" as SurfaceCondition,
      applicationMethod: "spray" as ApplicationMethod,
      coats: 1,
    });
    // room=8, smooth=-2, spray=+5 => 11
    expect(result.wasteMargin).toBe(11);
  });

  it("adds waste for repair work", () => {
    const result = calculateSmartWaste({
      projectType: "room" as ProjectType,
      surfaceCondition: "smooth" as SurfaceCondition,
      coats: 1,
      isRepair: true,
    });
    // room=8, smooth=-2, repair=+5 => 11
    expect(result.wasteMargin).toBe(11);
  });

  it("reduces waste for 3+ coats", () => {
    const result = calculateSmartWaste({
      projectType: "room" as ProjectType,
      surfaceCondition: "smooth" as SurfaceCondition,
      coats: 3,
    });
    // room=8, smooth=-2, coats_eff=-2 => 4
    expect(result.wasteMargin).toBe(4);
  });

  it("exterior has higher base waste", () => {
    const result = calculateSmartWaste({
      projectType: "exterior" as ProjectType,
      surfaceCondition: "smooth" as SurfaceCondition,
      coats: 2,
    });
    // exterior=15, smooth=-2 => 13
    expect(result.wasteMargin).toBe(13);
  });

  it("fence has lowest base waste", () => {
    const result = calculateSmartWaste({
      projectType: "fence" as ProjectType,
      surfaceCondition: "smooth" as SurfaceCondition,
      coats: 1,
    });
    // fence=5, smooth=-2 => 3
    expect(result.wasteMargin).toBe(3);
  });

  it("generates reason string", () => {
    const result = calculateSmartWaste({
      projectType: "exterior" as ProjectType,
      surfaceCondition: "rough" as SurfaceCondition,
      coats: 2,
    });
    expect(result.reason).toContain("waste margin");
    expect(result.reason).toContain("Exterior");
    expect(result.reason).toContain("rough");
  });

  it("clamps waste between 0 and 30", () => {
    // Very low: fence=5, smooth=-2, 3+ coats=-2 => 1 (still > 0)
    const low = calculateSmartWaste({
      projectType: "fence" as ProjectType,
      surfaceCondition: "smooth" as SurfaceCondition,
      coats: 5,
    });
    expect(low.wasteMargin).toBeGreaterThanOrEqual(0);

    // Very high: exterior=15, rough=+6, spray=+5, repair=+5 => 31 -> 30
    const high = calculateSmartWaste({
      projectType: "exterior" as ProjectType,
      surfaceCondition: "rough" as SurfaceCondition,
      applicationMethod: "spray" as ApplicationMethod,
      coats: 1,
      isRepair: true,
    });
    expect(high.wasteMargin).toBeLessThanOrEqual(30);
  });

  it("breakdown contains factor and adjustment for each step", () => {
    const result = calculateSmartWaste({
      projectType: "room" as ProjectType,
      surfaceCondition: "textured" as SurfaceCondition,
      applicationMethod: "brush" as ApplicationMethod,
      coats: 1,
      isRepair: true,
    });
    const factors = result.breakdown.map((b) => b.factor);
    expect(factors).toContain("Base (room)");
    expect(factors).toContain("Surface (textured)");
    expect(factors).toContain("Method (brush)");
    expect(factors).toContain("Repair work");
  });
});
