import { describe, it, expect } from "vitest";
import {
  createSpace,
  createOpening,
  createSpaceCollection,
  calculateSpace,
  groupSpacesByType,
  totalAreaByFinishType,
  spaceSummary,
  FINISH_TYPE_LABELS,
} from "./space-engine";

describe("measurement/space-engine", () => {
  it("createSpace creates with defaults", () => {
    const s = createSpace();
    expect(s.name).toBe("New Space");
    expect(s.type).toBe("other");
    expect(s.unit).toBe("feet");
    expect(s.quantity).toBe(1);
    expect(s.length).toBe(0);
    expect(s.openings).toEqual([]);
    expect(s.id).toBeTruthy();
  });

  it("createSpace respects partial overrides", () => {
    const s = createSpace({
      name: "Living Room",
      type: "living_room",
      length: 10,
      width: 12,
      unit: "feet",
    });
    expect(s.name).toBe("Living Room");
    expect(s.type).toBe("living_room");
    expect(s.length).toBe(10);
    expect(s.width).toBe(12);
  });

  it("createOpening creates with defaults", () => {
    const o = createOpening();
    expect(o).toBeTruthy();
    expect(o.width).toBeGreaterThanOrEqual(0);
  });

  it("createSpaceCollection creates with defaults", () => {
    const c = createSpaceCollection();
    expect(c.name).toBe("New Collection");
    expect(c.spaces).toEqual([]);
    expect(c.id).toBeTruthy();
  });

  it("calculateSpace computes area for wall surface", () => {
    const s = createSpace({
      length: 10,
      width: 8,
      height: 10,
      unit: "feet",
      surfaceType: "wall",
    });
    const result = calculateSpace(s);
    expect(result.totalAreaM2).toBeGreaterThan(0);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("calculateSpace computes area for floor surface", () => {
    const s = createSpace({
      length: 10,
      width: 8,
      unit: "feet",
      surfaceType: "floor",
    });
    const result = calculateSpace(s);
    expect(result.totalAreaM2).toBeGreaterThan(0);
    // 10ft × 8ft = 80 sq ft ≈ 7.43 m²
    expect(result.totalAreaM2).toBeCloseTo(7.43, 0);
  });

  it("groupSpacesByType groups by type", () => {
    const spaces = [
      createSpace({ name: "LR1", type: "living_room" }),
      createSpace({ name: "LR2", type: "living_room" }),
      createSpace({ name: "BR1", type: "bedroom" }),
    ];
    const groups = groupSpacesByType(spaces);
    expect(groups.length).toBe(2);
    const lr = groups.find(
      (g) => g.label.includes("Living") || g.spaces[0].type === "living_room",
    );
    expect(lr!.spaces.length).toBe(2);
  });

  it("totalAreaByFinishType sums matching results", () => {
    const mockResults = [
      { finishType: "paint", totalAreaM2: 100 } as unknown as never,
      { finishType: "paint", totalAreaM2: 50 } as unknown as never,
      { finishType: "tiling", totalAreaM2: 200 } as unknown as never,
    ];
    expect(totalAreaByFinishType(mockResults, "paint")).toBe(150);
    expect(totalAreaByFinishType(mockResults, "tiling")).toBe(200);
  });

  it("spaceSummary aggregates by type", () => {
    const mockResults = [
      { type: "living_room", totalAreaM2: 50 } as unknown as never,
      { type: "living_room", totalAreaM2: 30 } as unknown as never,
      { type: "bedroom", totalAreaM2: 20 } as unknown as never,
    ];
    const summary = spaceSummary(mockResults);
    expect(summary.length).toBe(2);
    const lr = summary.find((s) => s.type === "living_room");
    expect(lr!.areaM2).toBe(80);
    expect(lr!.count).toBe(2);
  });

  it("FINISH_TYPE_LABELS has entries", () => {
    expect(Object.keys(FINISH_TYPE_LABELS).length).toBeGreaterThan(3);
  });
});
