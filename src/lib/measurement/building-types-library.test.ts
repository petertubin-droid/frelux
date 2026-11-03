import { describe, expect, it } from "vitest";
import {
  BUILDING_TYPE_CATALOGUE,
  buildingTypeFloorAreaM2,
  buildingTypeSlugs,
  buildingTypeWallAreaM2,
  buildingTypeProgrammeSummary,
  findBuildingTypeProgramme,
} from "@/lib/measurement/building-type-catalogue";

describe("building type library", () => {
  it("exposes every type on a unique, URL-safe slug", () => {
    const slugs = buildingTypeSlugs();
    expect(slugs).toHaveLength(BUILDING_TYPE_CATALOGUE.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("finds every type by its slug and rejects unknown slugs", () => {
    for (const type of BUILDING_TYPE_CATALOGUE) {
      expect(findBuildingTypeProgramme(type.key)?.label).toBe(type.label);
    }
    expect(findBuildingTypeProgramme("no-such-building")).toBeUndefined();
  });

  it("gives every type a description worth indexing", () => {
    for (const type of BUILDING_TYPE_CATALOGUE) {
      expect(type.description.length).toBeGreaterThan(15);
      expect(type.rooms.length).toBeGreaterThan(0);
      expect(type.wallHeightM).toBeGreaterThan(2);
    }
  });

  it("computes floor and wall area from the room schedule", () => {
    const type = findBuildingTypeProgramme("4br-bungalow");
    expect(type).toBeDefined();
    if (!type) return;

    const floor = type.rooms.reduce(
      (total, room) =>
        total + room.l * room.w * Math.max(1, room.quantity ?? 1),
      0,
    );
    const wall = type.rooms.reduce(
      (total, room) =>
        total +
        2 *
          (room.l + room.w) *
          type.wallHeightM *
          Math.max(1, room.quantity ?? 1),
      0,
    );
    expect(buildingTypeFloorAreaM2(type)).toBeCloseTo(floor, 6);
    expect(buildingTypeWallAreaM2(type)).toBeCloseTo(wall, 6);
    expect(floor).toBeGreaterThan(40);
    expect(wall).toBeGreaterThan(floor);
  });

  it("summarises a type for its page and its prerendered metadata", () => {
    const summary = buildingTypeProgrammeSummary("office-suite");
    expect(summary).not.toBeNull();
    expect(summary?.path).toBe("/building-types/office-suite");
    expect(summary?.title).toContain("Office Suite");
    expect(summary?.description.length).toBeLessThanOrEqual(160);
    expect(summary?.spaces).toBeGreaterThan(0);
    expect(buildingTypeProgrammeSummary("not-a-building")).toBeNull();
  });
});
