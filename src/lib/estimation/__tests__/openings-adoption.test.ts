// =========================================================
// SHARED SCHEDULE ADOPTION: ICF AND EIFS
//
// Both engines now accept the shared opening schedule as well as their legacy
// metre list. These tests pin two things: the schedule wins when both are
// supplied, and the same openings produce the same quantities whichever shape
// they arrive in. The second matters more, because a migration that quietly
// changes numbers is worse than no migration.
// =========================================================

import { describe, it, expect } from "vitest";
import { calculateIcfWall } from "../icf-engine";
import { calculateEifsWall } from "../eifs-engine";
import { fromDisplayOpenings, fromMetreOpenings } from "../openings";

const icfBase = {
  wallLengthM: 40,
  wallHeightM: 3,
  coreThicknessMm: 200,
  marketCode: "US",
  corners90Count: 4,
  verticalRebarSpacingMm: 400,
  horizontalRebarCourses: "every_course",
  wasteFactorPercent: 4,
  concreteWastePercent: 5,
};

const eifsBase = {
  wallLengthM: 40,
  wallHeightM: 3,
  insulationThicknessMm: 50,
  marketCode: "US",
  wasteFactorPercent: 6,
  impactMeshHeightM: 2,
  finishTexture: "medium_swirl",
  substrateType: "exterior_sheathing",
  systemType: "drainable_eifs",
  attachmentMethod: "adhesive_and_mechanical",
};

describe("ICF accepts the shared schedule", () => {
  it("prices the same wall from the schedule and from the legacy list", () => {
    const legacy = calculateIcfWall({
      ...icfBase,
      openings: [
        { id: "o1", label: "Window", widthM: 1.8, heightM: 1.5, count: 4 },
        { id: "o2", label: "Door", widthM: 0.9, heightM: 2.1, count: 2 },
      ],
    } as never);
    const shared = calculateIcfWall({
      ...icfBase,
      openingGroups: [
        { category: "window", widthMm: 1800, heightMm: 1500, count: 4 },
        { category: "entrance_door", widthMm: 900, heightMm: 2100, count: 2 },
      ],
    } as never);

    expect(shared.geometry.netWallAreaM2).toBeCloseTo(
      legacy.geometry.netWallAreaM2,
      3,
    );
    expect(shared.blocks.totalBlocksCount).toBe(legacy.blocks.totalBlocksCount);
    expect(shared.concrete.totalVolumeM3).toBeCloseTo(
      legacy.concrete.totalVolumeM3,
      3,
    );
  });

  it("lets the schedule win when both shapes are supplied", () => {
    const both = calculateIcfWall({
      ...icfBase,
      openings: [{ id: "legacy", widthM: 5, heightM: 2, count: 4 }],
      openingGroups: [
        { category: "window", widthMm: 1200, heightMm: 1200, count: 1 },
      ],
    } as never);
    // 1.44 m2 deducted, not 40 m2: the schedule is authoritative.
    expect(both.geometry.openingsAreaM2).toBeCloseTo(1.44, 3);
  });

  it("counts several window sizes in one wall", () => {
    const r = calculateIcfWall({
      ...icfBase,
      openingGroups: [
        { category: "window", widthMm: 1800, heightMm: 1500, count: 2 },
        { category: "window", widthMm: 600, heightMm: 600, count: 6 },
      ],
    } as never);
    expect(r.geometry.openingsAreaM2).toBeCloseTo(2 * 2.7 + 6 * 0.36, 3);
  });
});

describe("EIFS accepts the shared schedule", () => {
  it("prices the same facade from the schedule and from the legacy list", () => {
    const legacy = calculateEifsWall({
      ...eifsBase,
      openings: [
        {
          id: "o1",
          label: "Window",
          widthM: 1.8,
          heightM: 1.5,
          count: 4,
          revealDepthMm: 80,
        },
      ],
    } as never);
    const shared = calculateEifsWall({
      ...eifsBase,
      openingGroups: [
        {
          category: "window",
          widthMm: 1800,
          heightMm: 1500,
          count: 4,
          revealDepthMm: 80,
        },
      ],
    } as never);

    expect(shared.geometry.openingsAreaM2).toBeCloseTo(
      legacy.geometry.openingsAreaM2,
      3,
    );
    expect(shared.geometry.revealAreaM2).toBeCloseTo(
      legacy.geometry.revealAreaM2,
      3,
    );
    expect(shared.insulation.boardsCount).toBe(legacy.insulation.boardsCount);
  });

  it("carries a per-opening reveal depth through the schedule", () => {
    const shallow = calculateEifsWall({
      ...eifsBase,
      openingGroups: [
        {
          category: "window",
          widthMm: 1800,
          heightMm: 1500,
          count: 1,
          revealDepthMm: 50,
        },
      ],
    } as never);
    const deep = calculateEifsWall({
      ...eifsBase,
      openingGroups: [
        {
          category: "window",
          widthMm: 1800,
          heightMm: 1500,
          count: 1,
          revealDepthMm: 200,
        },
      ],
    } as never);
    expect(deep.geometry.revealAreaM2).toBeGreaterThan(
      shallow.geometry.revealAreaM2,
    );
  });
});

describe("legacy adapters", () => {
  it("converts paint's display-unit list, honouring feet", () => {
    const metres = fromDisplayOpenings(
      [{ quantity: 2, width: 1.2, height: 1.2 }],
      "m",
    );
    const feet = fromDisplayOpenings(
      [{ quantity: 2, width: 1.2, height: 1.2 }],
      "ft",
    );
    expect(metres[0].widthMm).toBe(1200);
    // 1.2 ft is 365.76 mm, not 1200 mm: reading feet as metres triples it.
    expect(feet[0].widthMm).toBe(366);
  });

  it("converts drywall and EIFS metre lists with their counts", () => {
    const groups = fromMetreOpenings([
      { widthM: 0.9, heightM: 2.1, quantity: 3 },
    ]);
    expect(groups[0]).toMatchObject({ widthMm: 900, heightMm: 2100, count: 3 });
  });

  it("keeps a label so a migrated schedule stays readable", () => {
    const groups = fromMetreOpenings([
      { widthM: 0.6, heightM: 0.6, count: 2, label: "Toilet window" },
    ]);
    expect(groups[0].label).toBe("Toilet window");
  });
});
